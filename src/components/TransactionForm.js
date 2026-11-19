import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import CardStatementPdfReview from "./CardStatementPdfReview";
import BankStatementSelector from "./BankStatementSelector";
import { saveStatementBankLink } from "../services/bankingService";
import { getImportedStatement, saveReviewedStatement, verifyStatementDraft } from "../services/cardStatementService";
import { useForm } from "react-hook-form";
import "react-loading-skeleton/dist/skeleton.css";
import { useDispatch, useSelector } from "react-redux";
import "tippy.js/dist/tippy.css"; // optional
import {
  storeDataAction,
  updateDataAction,
} from "../actionCreators/databaseActions";
import InfoTooltip from "../components/InfoTooltip";
import TransactionLocationField from "./TransactionLocationField";
import ReceiptOcrImport from './ReceiptOcrImport';
import ReceiptDetailsEditor from './ReceiptDetailsEditor';
import { mergeReceiptDetails, sanitizeReceiptDetails } from '../utils/receiptDetails';
import { receiptCategorySuggestions } from '../utils/receiptCategoryMapping';
import { CATEGORY_INFO_TOOLTIP_MESSAGE } from "../shared/constants/tooltip-messages.const";
import { INGRESO_DIVISAS_CATEGORY } from "../shared/constants/category.const";
import { categoriesForNewTransactions, categoryLabel, getCategoryCurrency, categoryDescription } from "../utils/customCategories";
import { getCategoryExtraFields, sanitizeTransactionCustomDetails } from "../utils/categoryExtraFields";
import { parseTransactionsMarkdown } from "../utils/transactionsMarkdown";
import { isValidTransactionDate, parseTransactionNumber, validTransactionName } from "../utils/transactionFormValidation";
import {
  getNotificationSettings,
  resolveTransactionDueDate,
  usesSelectedDateAsDueDate,
  usesSeparateDueDate,
  isHomeCategory,
} from "../utils/transactionDueDates";

// A command inside the native category picker, never a category persisted to Firestore.
export const CREATE_CATEGORY_OPTION = "__ltc_create_personal_category__";

const TransactionForm = ({
  amount,
  transactionCurrency = 'ARS',
  setTransactionCurrency = () => {},
  selectedDate,
  selectedCloseDate,
  selectedExpirationDate,
  currencyQuantity,
  currencyExchangeRate,
  comment,
  category,
  name,
  expenseId,
  isCreditCardCategory,
  isBuyCurrenciesCategory,
  isCurrencyIncomeCategory,
  isSellCurrenciesCategory, // Add this line
  setName,
  setAmount,
  setComment,
  setCategory,
  setSelectedDate,
  setIsCreditCardCategory,
  setIsBuyCurrenciesCategory,
  setIsCurrencyIncomeCategory,
  setIsSellCurrenciesCategory, // Add this line
  setSelectedCloseDate,
  setSelectedExpirationDate,
  setCurrencyQuantity,
  setCurrencyExchangeRate,
  edit,
  setEdit,
  categories,
  onManageCategories,
  transactionLocation = null,
  setTransactionLocation = () => {},
  customDetails = {},
  setCustomDetails = () => {},
  receiptDetails = null,
  setReceiptDetails = () => {},
  hasSavedCustomDetails = false,
  startWithReceiptScanner = false,
  initialReceiptCurrency = null,
  privacyHidden = false,
  setIsOpen,
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isDataFetching = useSelector((state) => state.database.isDataFetching);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(Boolean(startWithReceiptScanner));
  const [receiptCurrency, setReceiptCurrency] = useState(initialReceiptCurrency);
  const [markdown, setMarkdown] = useState("");
  const [isParsingMarkdown, setIsParsingMarkdown] = useState(false);
  const [markdownMessage, setMarkdownMessage] = useState("");
  const [statementDraft, setStatementDraft] = useState(null);
  const [draftExpenseId, setDraftExpenseId] = useState(null);
  const [statementBankId, setStatementBankId] = useState("");
  const [statementCardId, setStatementCardId] = useState("");
  const selectedDateIsDueDate = usesSelectedDateAsDueDate(category, categories);
  const hasSeparateDueDate = usesSeparateDueDate(category, categories);
  const categoryDefinition = categories?.find((entry) => entry.name === category);
  // Old expenses always remain ARS unless they explicitly saved USD.
  // New expenses inherit the selected category's currency; conversion
  // categories continue using their dedicated ARS + USD quantity fields.
  const isFxCategory = /(?:Compra|Venta|Ingreso) divisas/i.test(category || '');
  const effectiveCurrency = isFxCategory ? 'ARS' : edit
    ? (transactionCurrency === 'USD' ? 'USD' : 'ARS')
    : getCategoryCurrency(category, categories);
  const selectedExtraFields = getCategoryExtraFields(categoryDefinition);
  const notificationSettings = getNotificationSettings(category, categories);
  const dueDate = resolveTransactionDueDate({
    category,
    categories,
    selectedDate,
    selectedExpirationDate,
  });
  const notificationEnabled =
    Boolean(dueDate) &&
    (notificationSettings.enabled || isCreditCardCategory);


  const quantityValue = parseTransactionNumber(currencyQuantity, 8);
  const exchangeRateValue = parseTransactionNumber(currencyExchangeRate, 10);
  const computedFxAmount = quantityValue !== null && exchangeRateValue !== null
    ? Math.round(quantityValue * exchangeRateValue * 100) / 100 : null;
  const derivedFxAmount = isBuyCurrenciesCategory || isSellCurrenciesCategory;
  const shownAmount = derivedFxAmount ? (computedFxAmount ?? "") : amount;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ mode: "onSubmit", reValidateMode: "onChange", shouldFocusError: true, shouldUnregister: true });

  // Parent state changes without DOM change events during edit, Markdown/OCR and
  // category creation. Keep validation values identical to the rendered values.
  useEffect(() => {
    const values = {
      name, category, amount: shownAmount, comment, selectedDate,
      selectedCloseDate, selectedExpirationDate, currencyQuantity, currencyExchangeRate,
    };
    Object.entries(values).forEach(([field, value]) => {
      setValue(field, value ?? "", { shouldValidate: hasAttemptedSave });
    });
  }, [name, category, shownAmount, comment, selectedDate, selectedCloseDate,
      selectedExpirationDate, currencyQuantity, currencyExchangeRate, setValue, hasAttemptedSave]);

  const invalidLabels = {
    name: "nombre", category: "categoría", amount: "monto",
    selectedDate: "fecha", selectedCloseDate: "cierre",
    selectedExpirationDate: "vencimiento", currencyQuantity: "cantidad de divisas",
    currencyExchangeRate: "cotización",
  };
  const onInvalid = (invalid) => {
    setHasAttemptedSave(true);
    const missing = Object.keys(invalid).map((key) => invalidLabels[key] || key);
    setSubmitError("Revisá " + (missing.length ? missing.join(", ") : "los datos del formulario") + " para poder guardar.");
  };

  const applyMarkdown = () => {
    if (!markdown.trim() || isParsingMarkdown) return;
    setIsParsingMarkdown(true);
    setMarkdownMessage("");
    try {
      const parsed = parseTransactionsMarkdown(markdown);
      if (!parsed.length || parsed[0].errors.length) {
        setMarkdownMessage(parsed[0]?.errors?.join(" · ") || "No se encontró una transacción válida.");
        return;
      }
      const item = parsed[0];
      const importedCategory = item.category || INGRESO_DIVISAS_CATEGORY;
      // Select the configured category value even when its display name ends with an emoji.
      const exactCategory = categories?.find((entry) => entry.name === importedCategory);
      const prefixedCategories = categories?.filter((entry) => entry.name?.startsWith(`${importedCategory} `)) || [];
      const nextCategory = exactCategory?.name || (prefixedCategories.length === 1 ? prefixedCategories[0].name : importedCategory);
      setName(item.name || "");
      setCategory(nextCategory);
      setCustomDetails({});
      setSelectedDate(item.selectedDate || "");
      setSelectedExpirationDate(item.selectedExpirationDate || "");
      setSelectedCloseDate(item.selectedCloseDate || "");
      setComment(item.comment || "");
      setCurrencyQuantity(item.currencyQuantity || "");
      setCurrencyExchangeRate(item.currencyExchangeRate !== "" ? item.currencyExchangeRate : "");
      setAmount(item.amount ?? ""); // A missing amount must not inherit the previous transaction.
      setIsCreditCardCategory(nextCategory.includes("Resumen tarjeta"));
      setIsBuyCurrenciesCategory(nextCategory.includes("Compra divisas"));
      setIsCurrencyIncomeCategory(nextCategory.includes(INGRESO_DIVISAS_CATEGORY));
      setIsSellCurrenciesCategory(nextCategory.includes("Venta divisas"));
      setMarkdownMessage(parsed.length > 1
        ? edit
          ? `Se aplicó la primera de ${parsed.length} transacciones al formulario de edición.`
          : `Formulario completado con la primera de ${parsed.length} transacciones. Importá las restantes de a una.`
        : edit
          ? "Datos aplicados desde Markdown. Revisalos antes de guardar los cambios."
          : "Formulario pre-rellenado. Revisá los datos antes de añadir.");
      setShowMarkdown(false);
    } finally {
      setIsParsingMarkdown(false);
    }
  };

  const applyReceipt = (fields) => {
    // New entries derive the currency from the category. Never turn a USD
    // receipt into an ARS expense or invent an FX transaction.
    if (/(?:Compra|Venta|Ingreso) divisas|Resumen tarjeta/i.test(category || '')) {
      setMarkdownMessage('El ticket representa un gasto individual, no una operación de divisas ni un resumen de tarjeta. Elegí una categoría de gasto.');
      return;
    }
    const chosenCurrency = edit ? (transactionCurrency === 'USD' ? 'USD' : 'ARS') : getCategoryCurrency(category, categories);
    if (fields.currency && category && chosenCurrency !== fields.currency) {
      setMarkdownMessage(`La categoría elegida usa ${chosenCurrency}, pero el ticket indica ${fields.currency}. Elegí una categoría de esa moneda antes de aplicar.`);
      return;
    }
    if (fields.merchant) {
      setName(fields.merchant);
      setValue('name', fields.merchant, {shouldValidate: true});
    }
    if (!comment.trim()) {
      const items = fields.receiptDetails?.items || [];
      const description = (items.length
        ? `Compra: ${items.map((item) => item.description).join(', ')}`
        : `Compra en ${fields.merchant || 'comercio'}`);
      setComment(description);
      setValue('comment', description, {shouldValidate: true});
    }
    if (fields.amount != null) {
      setAmount(fields.amount);
      setValue('amount', fields.amount, {shouldValidate: true});
    }
    if (fields.date && !selectedDateIsDueDate) {
      setSelectedDate(fields.date);
      setValue('selectedDate', fields.date, {shouldValidate: true});
    }
    const nextReceiptDetails = mergeReceiptDetails(receiptDetails, fields.receiptDetails);
    if (nextReceiptDetails) setReceiptDetails(nextReceiptDetails);
    const extraSuggestions = receiptCategorySuggestions(categoryDefinition, nextReceiptDetails, fields.merchant, fields.date);
    if (Object.keys(extraSuggestions).length) setCustomDetails((previous) => ({...extraSuggestions, ...previous}));
    if (!edit && fields.currency) setTransactionCurrency(fields.currency);
    setReceiptCurrency(fields.currency || null);
    setMarkdownMessage(selectedDateIsDueDate && fields.date
      ? 'La fecha del ticket quedó asociada al comprobante: esta categoría usa Fecha como vencimiento. Revisá los datos antes de guardar.'
      : fields.ocrMissingFields?.length
      ? `Lectura parcial: completá ${fields.ocrMissingFields.join(', ')} manualmente. Revisá moneda y categoría antes de guardar.`
      : 'Datos detectados. Revisá el importe, la moneda y la categoría antes de guardar.');
    setShowReceiptScanner(false);
  };

  const applyStatement = (statement) => {
    // Explicit button: never overwrite an existing card transaction silently.
    setName((statement.institution + " " + statement.cardBrand).slice(0, 30));
    setAmount(statement.totals.ARS);
    setSelectedDate(statement.dueDate);
    setSelectedCloseDate(statement.closingDate);
    setSelectedExpirationDate(statement.dueDate);
    setComment("Resumen " + statement.period + " - USD " + statement.totals.USD);
  };

  const onSubmit = async () => {
    if (isSubmitting) return;
    setHasAttemptedSave(true);
    setSubmitError("");
    setIsSubmitting(true);
    setMarkdownMessage("");
    try {
      // Validate the actual parent-controlled values at the persistence boundary.
      if (!validTransactionName(name)) throw new Error("Ingresá un nombre de hasta 200 caracteres.");
      if (!category || category === CREATE_CATEGORY_OPTION) throw new Error("Elegí una categoría.");
      if (!isValidTransactionDate(selectedDate)) throw new Error("Ingresá una fecha de transacción válida.");
      if (isCreditCardCategory && !isValidTransactionDate(selectedExpirationDate))
        throw new Error("Completá una fecha de vencimiento válida para la tarjeta.");
      if (isCreditCardCategory && selectedCloseDate && !isValidTransactionDate(selectedCloseDate))
        throw new Error("La fecha de cierre de la tarjeta no es válida.");
      if (hasSeparateDueDate && selectedExpirationDate && !isValidTransactionDate(selectedExpirationDate))
        throw new Error("La fecha de vencimiento opcional no es válida.");
      const amountValue = parseTransactionNumber(shownAmount, 2);
      if (!isCurrencyIncomeCategory && amountValue === null)
        throw new Error("Ingresá un monto positivo válido, con hasta dos decimales.");
      if (isFxCategory && quantityValue === null)
        throw new Error("Ingresá una cantidad de divisas válida.");
      if (derivedFxAmount && exchangeRateValue === null)
        throw new Error("Ingresá una cotización válida.");
      if (receiptCurrency && effectiveCurrency !== receiptCurrency) {
        throw new Error(`El ticket indica ${receiptCurrency}, pero la categoría seleccionada guarda en ${effectiveCurrency}. Corregí la categoría antes de continuar.`);
      }
      if (isCreditCardCategory && statementBankId && !statementCardId) {
        throw new Error("Elegí una tarjeta o dejá el banco sin asignar.");
      }
      let savedId = edit ? expenseId : draftExpenseId;
      if (statementDraft && isCreditCardCategory) {
        verifyStatementDraft(statementDraft);
        const existing = await getImportedStatement(user.uid, statementDraft.fileSha256);
        // Never create a second card-payment expense for an imported PDF.
        if (existing && existing.expenseId !== savedId) {
          throw new Error("Este PDF ya está vinculado a otro resumen. Abrí esa transacción para revisarlo.");
        }
      }
      const safeDetails = sanitizeTransactionCustomDetails(customDetails, selectedExtraFields.map((field) => field.id));
      const data = {
        userId: user?.uid,
        customDetails: safeDetails,
        receiptDetails: sanitizeReceiptDetails(receiptDetails),
        clearReceiptDetails: edit && !sanitizeReceiptDetails(receiptDetails),
        clearCustomDetails: edit && hasSavedCustomDetails && !Object.keys(safeDetails).length,
        name: name.trim(), amount: isCurrencyIncomeCategory ? amount : amountValue,
        comment: typeof comment === "string" ? comment : "", category, selectedDate,
        location: transactionLocation,
        transactionCurrency: effectiveCurrency,
        selectedExpirationDate, selectedCloseDate,
        currencyQuantity: isFxCategory ? quantityValue : currencyQuantity,
        currencyExchangeRate: derivedFxAmount ? exchangeRateValue : currencyExchangeRate,
        dueDate,
        notificationEnabled, notificationLeadDays: notificationSettings.leadDays,
      };
      if (!edit && !savedId) {
        savedId = await dispatch(storeDataAction(data));
        // Retain this ID if detail persistence fails. Retrying must update
        // the existing transaction, not create another payment expense.
        setDraftExpenseId(savedId);
      } else {
        await dispatch(updateDataAction(data, savedId));
      }
      if (statementDraft && isCreditCardCategory) {
        await saveReviewedStatement({ uid: user.uid, expenseId: savedId, draft: statementDraft });
      }
      if (isCreditCardCategory && statementBankId && statementCardId) {
        // Owner-verified association, never another expense or extra spending.
        await saveStatementBankLink(user.uid, savedId, statementBankId, statementCardId);
      }
      setStatementBankId("");
      setStatementCardId("");
      setStatementDraft(null);
      setReceiptCurrency(null);
      setDraftExpenseId(null);
      setName("");
      setAmount("");
      setComment("");
      setCategory("");
      setCustomDetails({});
      setReceiptDetails(null);
      setSelectedDate("");
      setSelectedExpirationDate("");
      setSelectedCloseDate("");
      setCurrencyQuantity("");
      setCurrencyExchangeRate("");
      setIsBuyCurrenciesCategory(false);
      setIsCreditCardCategory(false);
      setIsCurrencyIncomeCategory(false);
      setIsSellCurrenciesCategory(false);
      if (edit) setEdit(false);
      setIsOpen(false);
    } catch (error) {
      // In particular, NEVER close the form after a failed detail save.
      const message = error?.message || "No se pudo guardar el resumen.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        className="mb-0 mt-0 flex flex-col gap-y-1.5 space-y-0.5 sm:gap-y-2 sm:space-y-1"
        noValidate
        onSubmit={handleSubmit(onSubmit, onInvalid)}
      >
        <h1 className="font-Nunito font-semibold text-lg sm:text-xl dark:text-purple-500 underline">
          {edit ? "Editar transacción" : "Crear transacción"}
        </h1>
        <div className='rounded-xl border border-violet-300 bg-violet-50 p-3 dark:border-violet-600/60 dark:bg-slate-800'>
          <button type='button' aria-expanded={showReceiptScanner} onClick={() => setShowReceiptScanner((open) => !open)}
            className='flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg text-left text-sm font-bold text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200'>
            <span>Escanear ticket con cámara o foto</span><span aria-hidden='true'>{showReceiptScanner ? '−' : '+'}</span>
          </button>
          {showReceiptScanner && <div className='mt-3'><ReceiptOcrImport onApply={applyReceipt} privacyHidden={privacyHidden} disabled={isSubmitting}/></div>}
        </div>
        <div className="rounded-lg border border-purple-500/50 bg-purple-500/5 p-2.5 sm:p-3">
          <button type="button" onClick={() => setShowMarkdown((value) => !value)} className="w-full flex items-center justify-between text-sm font-semibold text-purple-600 dark:text-purple-300">
            <span>{edit ? "Actualizar desde Markdown" : "Pre-rellenar desde Markdown"}</span><span>{showMarkdown ? "−" : "+"}</span>
          </button>
          {showMarkdown && (
            <div className="mt-3">
              <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} className="w-full min-h-[130px] rounded-lg border border-purple-600 bg-white dark:bg-slate-800 p-3 text-sm dark:text-white" placeholder={"- name: Rendimiento Prex\n  category: Ingreso divisas\n  date: 2026-09-30\n  currencyQuantity: 18.42\n  institution: Prex\n  period: 2026-09"} />
              <button type="button" disabled={!markdown.trim() || isParsingMarkdown} onClick={applyMarkdown} className="w-full mt-2 py-2.5 rounded-lg bg-secondary text-white disabled:opacity-50 disabled:cursor-wait font-semibold">
                {isParsingMarkdown ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Procesando…</span> : edit ? "Aplicar a esta transacción" : "Pre-rellenar formulario"}
              </button>
            </div>
          )}
          {markdownMessage && <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">{markdownMessage}</p>}
        </div>

        <label
          htmlFor="name"
          className="text-sm font-medium text-gray-700 dark:text-white"
        >
          Nombre transacción
        </label>

        <input
          className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
          value={name}
          type="text"
          id="name"
          {...register("name", {
            required: true,
            validate: validTransactionName,
            onChange: (e) => {
              setName(e.target.value);
              setSubmitError("");
            },
          })}
          placeholder="Nombre de transacción"
          aria-describedby="name-hint"
          autoComplete="on"
        />
        <p id="name-hint" className="text-xs text-slate-500 dark:text-slate-300">Admite acentos, símbolos y emojis · hasta 200 caracteres.</p>
        {errors.name && (
          <p role="alert" className="text-red-500 text-sm">
            El nombre no puede quedar vacío ni superar 200 caracteres.
          </p>
        )}

        <div className="flex flex-row items-center justify-between gap-2">
          <label
            htmlFor="category"
            className="text-sm font-medium text-gray-700 dark:text-white"
          >
            Categoría <InfoTooltip content={categoryDescription(category, categories) || CATEGORY_INFO_TOOLTIP_MESSAGE} />
          </label>
          {onManageCategories && (
            <button type="button" onClick={onManageCategories} disabled={!categories}
              className="rounded-lg disabled:opacity-50 px-2 py-1 text-xs font-bold text-purple-600 hover:bg-purple-500/10 dark:text-purple-300">
              + Personalizar
            </button>
          )}
        </div>
        <select
          className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
          value={category}
          id="category"
          {...register("category", {
            required: true,
            onChange: (e) => {
              if (e.target.value === CREATE_CATEGORY_OPTION) {
                // Restore the original value so the command is never submitted
                // as a financial category. Keep the current draft intact.
                setValue("category", category || "");
                onManageCategories?.();
                return;
              }
              const nextIsFx = /(?:Compra|Venta|Ingreso) divisas/i.test(e.target.value);
              if (category !== e.target.value && (isFxCategory || nextIsFx)) {
                // A category change must not carry a previously derived ARS
                // amount or USD quantity into a different financial operation.
                setCurrencyQuantity("");
                setCurrencyExchangeRate("");
                setAmount("");
              }
              setCategory(e.target.value);
              setSubmitError("");
              setTransactionCurrency(getCategoryCurrency(e.target.value, categories));
              const nextCategory = categories?.find((entry) => entry.name === e.target.value);
              setCustomDetails(receiptCategorySuggestions(nextCategory, receiptDetails, name, selectedDate));
              // A scanned purchase date must never silently become the legacy
              // category's payment deadline when the category changes later.
              if (!edit && usesSelectedDateAsDueDate(e.target.value, categories)
                && receiptDetails?.documents?.some((document) => document.issuedAt === selectedDate)) {
                setSelectedDate('');
                setValue('selectedDate', '');
              }
              // Avoid leaking a different category's expiration date.
              setSelectedExpirationDate("");
              setValue("selectedExpirationDate", "");

              setIsCreditCardCategory(
                e.target.value.includes("Resumen tarjeta")
              );

              setIsBuyCurrenciesCategory(
                e.target.value.includes("Compra divisas")
              );

              setIsCurrencyIncomeCategory(
                e.target.value.includes(INGRESO_DIVISAS_CATEGORY)
              );
              setIsSellCurrenciesCategory(
                e.target.value.includes("Venta divisas")
              );
            },
          })}
          autoComplete="on"
        >
          <option value="" disabled className="dark:text-white">Elegí una categoría</option>
          {onManageCategories && categories && (
            <optgroup label="Acciones">
              <option value={CREATE_CATEGORY_OPTION}>＋ Crear nueva categoría…</option>
            </optgroup>
          )}
          <optgroup label="Gastos">
            {categoriesForNewTransactions(categories, category)
              .filter((entry) => entry.isExpense)
              .map((category) => {
                return (
                  <option key={category.id || category.name} value={category.name}>
                    {isDataFetching ? "Cargando ..." : categoryLabel(category)}
                  </option>
                );
              })}
          </optgroup>
          <optgroup label="Ingresos">
            {categoriesForNewTransactions(categories, category)
              .filter((entry) => !entry.isExpense)
              .map((category) => {
                return (
                  <option key={category.id || category.name} value={category.name}>
                    {isDataFetching ? "Cargando ..." : categoryLabel(category)}
                  </option>
                );
              })}
          </optgroup>
        </select>
        {selectedExtraFields.length > 0 && (
          <section aria-label='Datos adicionales de la categoría' className='mt-2 space-y-2 rounded-xl border border-purple-300/60 bg-purple-50/40 p-3 dark:border-purple-500/40 dark:bg-purple-500/5'>
            <h2 className='text-sm font-bold text-slate-800 dark:text-white'>Datos adicionales</h2>
            <p className='text-xs text-slate-600 dark:text-slate-300'>Opcionales · no modifican el importe ni los cálculos de esta transacción.</p>
            {selectedExtraFields.map((field) => (
              <label key={field.id} className='block space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200'>
                <span>{field.label}</span>
                {field.type === 'select' ? (
                  <select aria-label={field.label} value={customDetails?.[field.id] || ''}
                    onChange={(event) => setCustomDetails((previous) => ({ ...previous, [field.id]: event.target.value }))}
                    disabled={isSubmitting} className='w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white'>
                    <option value=''>Sin especificar</option>
                    {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <input aria-label={field.label} type={field.type === 'date' ? 'date' : 'text'}
                    maxLength={field.maxLength} autoComplete='off'
                    value={customDetails?.[field.id] || ''} disabled={isSubmitting}
                    onChange={(event) => setCustomDetails((previous) => ({ ...previous, [field.id]: event.target.value }))}
                    className='w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white' />
                )}
              </label>
            ))}
          </section>
        )}
        {errors.category && (
          <p className="text-red-500 text-sm">
            Es obligatorio ingresar una categoría
          </p>
        )}

        {isCreditCardCategory && (
          <BankStatementSelector
            uid={user?.uid} expenseId={edit ? expenseId : null}
            bankId={statementBankId} cardId={statementCardId}
            onBankChange={setStatementBankId} onCardChange={setStatementCardId}
            disabled={isSubmitting}
          />
        )}
        {isCreditCardCategory && (
          <CardStatementPdfReview
            categories={categories}
            onDraft={setStatementDraft}
            onApply={applyStatement}
            disabled={isSubmitting}
          />
        )}
        {isCreditCardCategory && (
          <div className="ml-0 sm:ml-3">
            <label
              htmlFor="selectedExpirationDate"
              className="relative text-sm font-medium text-gray-600 dark:text-zinc-300 block"
            >
              Fecha de Vencimiento
              <input
                className="w-full border border-gray-300 px-3 mt-2 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                value={selectedExpirationDate}
                type="date"
                id="selectedExpirationDate"
                {...register("selectedExpirationDate", {
                  validate: isValidTransactionDate,
                  onChange: (e) => {
                    setSelectedExpirationDate(e.target.value);
                    setSubmitError("");
                  },
                })}
              />
              {errors.selectedExpirationDate && (
                <p className="text-red-500 text-sm">
                  Ingrese una fecha de vencimiento válida
                </p>
              )}
            </label>
            <label
              htmlFor="selectedCloseDate"
              className="relative text-sm font-medium text-gray-600 dark:text-zinc-300 block mt-2"
            >
              Fecha de cierre (opcional)
              <input
                className="w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                value={selectedCloseDate}
                type="date"
                id="selectedCloseDate"
                {...register("selectedCloseDate", {
                  validate: (date) => !date || isValidTransactionDate(date),
                  onChange: (e) => {
                    setSelectedCloseDate(e.target.value);
                    setSubmitError("");
                  },
                })}
              />
              {errors.selectedCloseDate && (
                <p className="text-red-500 text-sm">
                  Ingresá una fecha de cierre válida, o dejala vacía
                </p>
              )}
            </label>
          </div>
        )}

        {isBuyCurrenciesCategory && (
          <div className="ml-0 sm:ml-3">
            <label
              htmlFor="currencyQuantity"
              className="relative text-sm font-medium text-gray-700 dark:text-white block"
            >
              Cantidad
              <input
                className="w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                type="text"
                inputMode="decimal"
                value={currencyQuantity}
                id="currencyQuantity"
                {...register("currencyQuantity", {
                  required: true,
                  validate: (value) => parseTransactionNumber(value, 8) !== null,
                  onChange: (e) => {
                    setCurrencyQuantity(e.target.value);
                    setSubmitError("");
                  },
                })}
                placeholder="e.g. 1000"
              />
              {errors.currencyQuantity && (
                <p className="text-red-500 text-sm">
                  Ingrese una cantidad válida
                </p>
              )}
            </label>

            <label
              htmlFor="currencyExchangeRate"
              className="relative text-sm font-medium text-gray-700 dark:text-white block mt-2"
            >
              Cotización
              <input
                className="w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                value={currencyExchangeRate}
                type="text"
                inputMode="decimal"
                id="currencyExchangeRate"
                {...register("currencyExchangeRate", {
                  required: true,
                  validate: (value) => parseTransactionNumber(value, 10) !== null,
                  onChange: (e) => {
                    setCurrencyExchangeRate(e.target.value);
                    setSubmitError("");
                  },
                })}
                placeholder="e.g. 330"
              />
              {errors.currencyExchangeRate && (
                <p className="text-red-500 text-sm">
                  Ingrese una tasa de cambio válida
                </p>
              )}
            </label>
          </div>
        )}

        {isSellCurrenciesCategory && (
          <div className="ml-0 sm:ml-3">
            <label
              htmlFor="currencyQuantity"
              className="relative text-sm font-medium text-gray-700 dark:text-white block"
            >
              Cantidad a vender
              <input
                className="w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                type="text"
                inputMode="decimal"
                step="any"
                value={currencyQuantity}
                id="currencyQuantity"
                {...register("currencyQuantity", {
                  required: true,
                  validate: (value) => parseTransactionNumber(value, 8) !== null,
                  onChange: (e) => {
                    setCurrencyQuantity(e.target.value);
                    setSubmitError("");
                    // Recompute only after manual edits; a Markdown import may contain the exact ARS amount.
                    const quantity = parseTransactionNumber(e.target.value, 8);
                    const rate = parseTransactionNumber(currencyExchangeRate, 10);
                    setAmount(quantity !== null && rate !== null ? Math.round(quantity * rate * 100) / 100 : "");
                    setSubmitError("");
                  },
                })}
                placeholder="e.g. 500"
              />
              {errors.currencyQuantity && (
                <p className="text-red-500 text-sm">
                  Ingrese una cantidad válida
                </p>
              )}
            </label>

            <label
              htmlFor="currencyExchangeRate"
              className="relative text-sm font-medium text-gray-700 dark:text-white block mt-2"
            >
              Cotización de venta
              <input
                className="w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                value={currencyExchangeRate}
                type="text"
                inputMode="decimal"
                step="any"
                id="currencyExchangeRate"
                {...register("currencyExchangeRate", {
                  required: true,
                  validate: (value) => parseTransactionNumber(value, 10) !== null,
                  onChange: (e) => {
                    setCurrencyExchangeRate(e.target.value);
                    setSubmitError("");
                    const quantity = parseTransactionNumber(currencyQuantity, 8);
                    const rate = parseTransactionNumber(e.target.value, 10);
                    setAmount(quantity !== null && rate !== null ? Math.round(quantity * rate * 100) / 100 : "");
                    setSubmitError("");
                  },
                })}
                placeholder="e.g. 350"
              />
              {errors.currencyExchangeRate && (
                <p className="text-red-500 text-sm">
                  Ingrese una tasa de cambio de venta válida
                </p>
              )}
            </label>
          </div>
        )}

        {isCurrencyIncomeCategory && (
          <>
            <label
              htmlFor="currencyQuantity"
              className="relative text-sm font-medium text-gray-700 dark:text-white block"
            >
              Monto divisa
              <input
                className="w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                type="text"
                inputMode="decimal"
                value={currencyQuantity}
                id="currencyQuantity"
                {...register("currencyQuantity", {
                  required: true,
                  validate: (value) => parseTransactionNumber(value, 8) !== null,
                  onChange: (e) => {
                    setCurrencyQuantity(e.target.value);
                    setSubmitError("");
                  },
                })}
                placeholder="e.g. 1000"
              />
              {errors.currencyQuantity && (
                <p className="text-red-500 text-sm">Ingrese un monto valido</p>
              )}
            </label>
          </>
        )}

        {!isFxCategory && category && (
          <p className="text-xs text-slate-600 dark:text-slate-300" role="status">
            Moneda del movimiento: <strong>{effectiveCurrency}</strong>.
            {effectiveCurrency === 'USD' ? ' Gasto o ingreso en dólares, sin cotización ni venta de divisas.' : ''}
          </p>
        )}
        {!(isCurrencyIncomeCategory || isSellCurrenciesCategory) && (
          <>
            <label
              htmlFor="amount"
              className=" text-sm font-medium text-gray-700 dark:text-white block"
            >
              Monto ({effectiveCurrency})
            </label>

            <div className="relative">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className={`pointer-events-none shadow-none w-7 h-7 absolute top-5 transform -translate-y-1/2 right-2 ${
                  categories
                    ?.filter((c) => c.isExpense)
                    .map((c) => c.name)
                    .includes(category)
                    ? ` text-red-500`
                    : `text-green-500`
                } `}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <input
                className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                value={shownAmount ?? ""}
                readOnly={isBuyCurrenciesCategory}
                type="text"
                inputMode="decimal"
                id="amount"
                {...register("amount", {
                  required: true,
                  validate: (value) => parseTransactionNumber(value, 2) !== null,
                  onChange: (e) => {
                    if (!isBuyCurrenciesCategory) { setAmount(e.target.value); setSubmitError(""); }
                  },
                })}
                placeholder="e.g. 5000"
              />
            </div>

            {errors.amount && (
              <p className="text-red-500 text-sm">
                Ingrese un monto de transacción válido
              </p>
            )}
          </>
        )}

        {isSellCurrenciesCategory && (
          <>
            <label
              htmlFor="amount"
              className=" text-sm font-medium text-gray-700 dark:text-white block"
            >
              Monto
            </label>

            <div className="relative">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className={`pointer-events-none shadow-none w-7 h-7 absolute top-5 transform -translate-y-1/2 right-2 ${
                  categories
                    ?.filter((c) => c.isExpense)
                    .map((c) => c.name)
                    .includes(category)
                    ? ` text-red-500`
                    : `text-green-500`
                } `}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <input
                className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                value={shownAmount ?? ""}
                type="text"
                inputMode="decimal"
                id="amount"
                step="0.01"
                readOnly
                {...register("amount", {
                  required: true,
                  validate: (value) => parseTransactionNumber(value, 2) !== null,
                  onChange: () => {},
                })}
                placeholder="e.g. 5000"
              />
            </div>

            {errors.amount && (
              <p className="text-red-500 text-sm">
                Ingrese un monto de transacción válido
              </p>
            )}
          </>
        )}

        <label
          htmlFor="selectedDate"
          className="block text-sm font-medium text-gray-700 dark:text-white"
        >
          {selectedDateIsDueDate ? "Fecha de vencimiento" : hasSeparateDueDate ? "Fecha de transacción" : "Fecha"}
        </label>
        <input
          className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
          value={selectedDate}
          type="date"
          id="selectedDate"
          {...register("selectedDate", {
            validate: isValidTransactionDate,
            onChange: (e) => {
              setSelectedDate(e.target.value);
              setSubmitError("");
            },
          })}
        />
        {errors.selectedDate && (
          <p className="text-red-500 text-sm ">
            {selectedDateIsDueDate
              ? "Ingrese una fecha de vencimiento válida"
              : "Ingrese una fecha válida"}
          </p>
        )}
        {selectedDateIsDueDate && (
          <p className="text-xs text-purple-500 dark:text-purple-300">
            Esta categoría usa la fecha como vencimiento
            {notificationEnabled
              ? ` y te avisará con ${notificationSettings.leadDays} día${notificationSettings.leadDays === 1 ? "" : "s"} de anticipación.`
              : "."}
          </p>
        )}

        {hasSeparateDueDate && (
          <div className="space-y-1.5">
            <label htmlFor="customCategoryDueDate"
              className="block text-sm font-medium text-gray-700 dark:text-slate-100">
              Fecha de vencimiento (opcional)
            </label>
            <input
              id="customCategoryDueDate"
              type="date"
              value={selectedExpirationDate || ""}
              onChange={(event) => setSelectedExpirationDate(event.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {isHomeCategory(category, categories)
                ? 'Para expensas, alquiler u otros gastos del hogar, mantené la fecha del movimiento y agregá el vencimiento solo si lo necesitás. '
                : 'La fecha de la transacción se mantiene. '}
              {notificationSettings.enabled
                ? `LTC te avisará ${notificationSettings.leadDays} día${notificationSettings.leadDays === 1 ? '' : 's'} antes si ingresás una fecha.`
                : 'Los avisos para esta categoría están desactivados.'}
              {' '}Podés marcarlo como pagado desde Notificaciones.
            </p>
          </div>
        )}

        <TransactionLocationField value={transactionLocation} onChange={setTransactionLocation}/>
        <ReceiptDetailsEditor value={receiptDetails} onChange={setReceiptDetails} disabled={isSubmitting}/>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-700 dark:text-white"
        >
          Descripción (opcional)
        </label>
        <textarea
          className="w-full min-h-[110px] resize-y border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
          value={comment}
          rows={4}
          id="comment"
          aria-describedby="comment-hint"
          {...register("comment", {
            // Optional free-form notes. React escapes output; Firestore
            // stores Unicode strings, including newlines, without changing the content.
            validate: (value) => value == null || typeof value === "string",
            onChange: (e) => {
              setComment(e.target.value);
              setSubmitError("");
            },
          })}
          placeholder="Ej.: Detalle, referencias, varios párrafos…"
          autoComplete="on"
        />
        <p id="comment-hint" className="text-xs text-gray-600 dark:text-gray-300">
          Podés dejarla vacía. Admite textos extensos, saltos de línea, acentos y emojis.
        </p>
        {errors.comment && (
          <p className="text-red-500 text-sm">
            La descripción debe ser texto válido.
          </p>
        )}

        {submitError && <div role="alert" className="rounded-xl border border-rose-400/60 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-950/25 dark:text-rose-200">
          No se pudo guardar: {submitError}
        </div>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-3 min-h-[44px] w-full py-3 disabled:opacity-60 disabled:cursor-wait border border-transparent shadow-lg bg-primary hover:opacity-95 font-Roboto font-medium text-white text-center text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md"
        >
          {isSubmitting ? (<span className="inline-flex items-center justify-center gap-2"><span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />{edit ? "Guardando…" : "Añadiendo…"}</span>) : (edit ? "Guardar" : "Añadir")}
        </button>
      </form>
    </>
  );
};

export default TransactionForm;
