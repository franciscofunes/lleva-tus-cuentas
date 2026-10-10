import React, { useState } from "react";
import { toast } from "react-toastify";
import CardStatementPdfReview from "./CardStatementPdfReview";
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
import { CATEGORY_INFO_TOOLTIP_MESSAGE } from "../shared/constants/tooltip-messages.const";
import { INGRESO_DIVISAS_CATEGORY } from "../shared/constants/category.const";
import { categoriesForNewTransactions } from "../utils/customCategories";
import { parseTransactionsMarkdown } from "../utils/transactionsMarkdown";
import {
  getNotificationSettings,
  resolveTransactionDueDate,
  usesSelectedDateAsDueDate,
} from "../utils/transactionDueDates";

const TransactionForm = ({
  amount,
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
  setIsOpen,
}) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isDataFetching = useSelector((state) => state.database.isDataFetching);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [isParsingMarkdown, setIsParsingMarkdown] = useState(false);
  const [markdownMessage, setMarkdownMessage] = useState("");
  const [statementDraft, setStatementDraft] = useState(null);
  const [draftExpenseId, setDraftExpenseId] = useState(null);
  const selectedDateIsDueDate = usesSelectedDateAsDueDate(category, categories);
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


  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

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
      setSelectedDate(item.selectedDate || "");
      setSelectedExpirationDate(item.selectedExpirationDate || "");
      setSelectedCloseDate(item.selectedCloseDate || "");
      setComment(item.comment || "");
      setCurrencyQuantity(item.currencyQuantity || "");
      setCurrencyExchangeRate(item.currencyExchangeRate !== "" ? item.currencyExchangeRate : "");
      if (item.amount !== "") setAmount(item.amount);
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

  const applyStatement = (statement) => {
    // Explicit button: never overwrite an existing card transaction silently.
    setName((statement.institution + " " + statement.cardBrand).slice(0, 30));
    setAmount(statement.totals.ARS);
    setSelectedDate(statement.dueDate);
    setSelectedCloseDate(statement.closingDate);
    setSelectedExpirationDate(statement.dueDate);
    setComment(("Resumen " + statement.period + " - USD " + statement.totals.USD).slice(0, 70));
  };

  const onSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMarkdownMessage("");
    try {
      let savedId = edit ? expenseId : draftExpenseId;
      if (statementDraft && isCreditCardCategory) {
        verifyStatementDraft(statementDraft);
        const existing = await getImportedStatement(user.uid, statementDraft.fileSha256);
        // Never create a second card-payment expense for an imported PDF.
        if (existing && existing.expenseId !== savedId) {
          throw new Error("Este PDF ya está vinculado a otro resumen. Abrí esa transacción para revisarlo.");
        }
      }
      const data = {
        userId: user?.uid,
        name, amount, comment, category, selectedDate,
        selectedExpirationDate, selectedCloseDate,
        currencyQuantity, currencyExchangeRate, dueDate,
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
      setStatementDraft(null);
      setDraftExpenseId(null);
      setName("");
      setAmount("");
      setComment("");
      setCategory("");
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
      setMarkdownMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        className="mb-0 mt-0 flex flex-col gap-y-1.5 space-y-0.5 sm:gap-y-2 sm:space-y-1"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h1 className="font-Nunito font-semibold text-lg sm:text-xl dark:text-purple-500 underline">
          {edit ? "Editar transacción" : "Crear transacción"}
        </h1>
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
            pattern: /^[A-Za-z0-9].{2,30}$/,
            onChange: (e) => {
              setName(e.target.value);
            },
          })}
          placeholder="Nombre de transacción"
          autoComplete="on"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">
            Ingrese un nombre de transacción válido
          </p>
        )}

        <div className="flex flex-row items-center justify-between gap-2">
          <label
            htmlFor="category"
            className="text-sm font-medium text-gray-700 dark:text-white"
          >
            Categoría <InfoTooltip content={CATEGORY_INFO_TOOLTIP_MESSAGE} />
          </label>
          {onManageCategories && (
            <button type="button" onClick={onManageCategories}
              className="rounded-lg px-2 py-1 text-xs font-bold text-purple-600 hover:bg-purple-500/10 dark:text-purple-300">
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
              setCategory(e.target.value);

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
          <option className="dark:text-white">Elegí una categoría</option>
          <optgroup label="Gastos">
            {categoriesForNewTransactions(categories, category)
              .filter((entry) => entry.isExpense)
              .map((category) => {
                return (
                  <option key={category.id}>
                    {isDataFetching ? "Cargando ..." : category.name}
                  </option>
                );
              })}
          </optgroup>
          <optgroup label="Ingresos">
            {categoriesForNewTransactions(categories, category)
              .filter((entry) => !entry.isExpense)
              .map((category) => {
                return (
                  <option key={category.id}>
                    {isDataFetching ? "Cargando ..." : category.name}
                  </option>
                );
              })}
          </optgroup>
        </select>
        {errors.category && (
          <p className="text-red-500 text-sm">
            Es obligatorio ingresar una categoría
          </p>
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
                  required: true,
                  onChange: (e) => {
                    setSelectedExpirationDate(e.target.value);
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
              Fecha de Cierre
              <input
                className="w-full border border-gray-300 mt-2 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
                value={selectedCloseDate}
                type="date"
                id="selectedCloseDate"
                {...register("selectedCloseDate", {
                  required: true,
                  onChange: (e) => {
                    setSelectedCloseDate(e.target.value);
                  },
                })}
              />
              {errors.selectedCloseDate && (
                <p className="text-red-500 text-sm">
                  Ingrese una fecha de cierre válida
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
                type="number"
                value={currencyQuantity}
                id="currencyQuantity"
                {...register("currencyQuantity", {
                  required: true,
                  pattern: /^\d+(\.\d{1,2})?$/,
                  onChange: (e) => {
                    setCurrencyQuantity(e.target.value);
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
                type="number"
                id="currencyExchangeRate"
                {...register("currencyExchangeRate", {
                  required: true,
                  pattern: /^\d+(\.\d{1,20})?$/,
                  onChange: (e) => {
                    setCurrencyExchangeRate(e.target.value);
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
                type="number"
                step="any"
                value={currencyQuantity}
                id="currencyQuantity"
                {...register("currencyQuantity", {
                  required: true,
                  pattern: /^\d+(\.\d{1,8})?$/,
                  onChange: (e) => {
                    setCurrencyQuantity(e.target.value);
                    // Recompute only after manual edits; a Markdown import may contain the exact ARS amount.
                    const quantity = Number(e.target.value);
                    const rate = Number(currencyExchangeRate);
                    setAmount(e.target.value !== "" && currencyExchangeRate !== "" && Number.isFinite(quantity) && Number.isFinite(rate)
                      ? Number((quantity * rate).toFixed(2)) : "");
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
                type="number"
                step="any"
                id="currencyExchangeRate"
                {...register("currencyExchangeRate", {
                  required: true,
                  pattern: /^\d+(\.\d{1,20})?$/,
                  onChange: (e) => {
                    setCurrencyExchangeRate(e.target.value);
                    const quantity = Number(currencyQuantity);
                    const rate = Number(e.target.value);
                    setAmount(e.target.value !== "" && currencyQuantity !== "" && Number.isFinite(quantity) && Number.isFinite(rate)
                      ? Number((quantity * rate).toFixed(2)) : "");
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
                type="number"
                value={currencyQuantity}
                id="currencyQuantity"
                {...register("currencyQuantity", {
                  required: true,
                  pattern: /^\d+(\.\d{1,30})?$/,
                  onChange: (e) => {
                    setCurrencyQuantity(e.target.value);
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

        {!(isCurrencyIncomeCategory || isSellCurrenciesCategory) && (
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
                value={
                  category.includes("Compra divisas")
                    ? currencyQuantity * currencyExchangeRate
                    : amount
                }
                type="number"
                id="amount"
                {...register("amount", {
                  required: true,
                  pattern: /^\d+(\.\d{1,30})?$/,
                  onChange: category.includes("Compra divisas")
                    ? (e) => {
                        setAmount(currencyQuantity * currencyExchangeRate);
                      }
                    : (e) => {
                        setAmount(e.target.value);
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
                value={amount ?? ""}
                type="number"
                id="amount"
                step="0.01"
                readOnly
                {...register("amount", {
                  required: true,
                  pattern: /^\d+(\.\d{1,30})?$/,
                  onChange: category.includes("Venta divisas")
                    ? (e) => {
                        setAmount(currencyQuantity * currencyExchangeRate);
                      }
                    : (e) => {
                        setAmount(e.target.value);
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

        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 dark:text-white"
        >
          {selectedDateIsDueDate ? "Fecha de vencimiento" : "Fecha"}
        </label>
        <input
          className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
          value={selectedDate}
          type="date"
          id="selectedDate"
          {...register("selectedDate", {
            required: true,
            onChange: (e) => {
              setSelectedDate(e.target.value);
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

        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-700 dark:text-white"
        >
          Descripción
        </label>
        <textarea
          className="w-full border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:outline-none focus:border-indigo-600 focus:ring-1 dark:bg-slate-800 dark:border-purple-600 dark:text-white"
          value={comment}
          type="text"
          id="comment"
          {...register("comment", {
            required: true,
            pattern: /^[A-Za-z0-9].{2,70}$/,
            onChange: (e) => {
              setComment(e.target.value);
            },
          })}
          placeholder="e.g. Información adicional"
          autoComplete="on"
        />
        {errors.comment && (
          <p className="text-red-500 text-sm">
            Ingrese una descripción de transacción válida
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="sticky bottom-0 z-10 mt-2 w-full py-3 disabled:opacity-60 disabled:cursor-wait border border-transparent shadow-lg bg-primary hover:opacity-95 font-Roboto font-medium text-white text-center text-lg rounded-lg focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-indigo-600 hover:shadow-md "
        >
          {isSubmitting ? (<span className="inline-flex items-center justify-center gap-2"><span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />{edit ? "Guardando…" : "Añadiendo…"}</span>) : (edit ? "Guardar" : "Añadir")}
        </button>
      </form>
    </>
  );
};

export default TransactionForm;
