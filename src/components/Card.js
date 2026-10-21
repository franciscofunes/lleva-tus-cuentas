import { displayCategoryName, categoryDescription } from '../utils/customCategories';
import moment from 'moment';
import React, { useId, useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';
import { FiChevronDown, FiEdit3, FiTrash2 } from 'react-icons/fi';
import InfoTooltip from '../components/InfoTooltip';
import { FINANCIAL_ITEM_SURFACE_STYLES } from './CollapsibleHeading';
import { INGRESO_DIVISAS_CATEGORY } from '../shared/constants/category.const';
import { usesSelectedDateAsDueDate, usesSeparateDueDate } from '../utils/transactionDueDates';
import { displayTransactionCustomDetails } from '../utils/categoryExtraFields';
import CardStatementDetails from './CardStatementDetails';

function Card({
	id,
	expenseId,
	amount,
	hideValues = false,
	transactionCurrency,
	setTransactionCurrency = () => {},
	selectedDate,
	selectedCloseDate,
	selectedExpirationDate,
	currencyQuantity,
	currencyExchangeRate,
	paymentStatus,
	paidAt,
	paidDueDate,
	comment,
	category,
	customDetails = {},
	location = null,
	setTransactionLocation = () => {},
	setCustomDetails = () => {},
	setHasSavedCustomDetails = () => {},
	name,
	setName,
	setAmount,
	setComment,
	setCategory,
	setSelectedDate,
	setIsCreditCardCategory,
	setIsBuyCurrenciesCategory,
	setIsCurrencyIncomeCategory,
	setIsSellCurrenciesCategory,
	setSelectedCloseDate,
	setSelectedExpirationDate,
	setCurrencyQuantity,
	setCurrencyExchangeRate,
	setEdit,
	setExpenseId,
	categories,
	openModal,
	onRequestDelete,
}) {
	// Historical imports may omit a category while Firestore categories are still loading.
	const safeCategory = typeof category === 'string' ? category : '';
	const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];
	const isExpense = safeCategories.some((entry) => entry?.isExpense && entry.name === safeCategory);
	const infoText = categoryDescription(safeCategory, safeCategories);
	const selectedDateIsDueDate = usesSelectedDateAsDueDate(safeCategory, safeCategories);
	const hasSeparateDueDate = usesSeparateDueDate(safeCategory, safeCategories);
	const isPaidBill = paymentStatus === 'paid';
	const paidAtDate =
		paidAt && typeof paidAt.toDate === 'function'
			? paidAt.toDate()
			: paidAt
				? new Date(paidAt)
				: null;

  const handleDelete = () => {
    // The page owns the destructive confirmation; never delete on first tap.
    onRequestDelete?.({ id, name: name || 'Sin nombre', isCardSummary: safeCategory.includes('Resumen tarjeta') });
  };

	const handleEdit = () => {
		openModal();
		setName(name);
		setAmount(amount);
		setTransactionCurrency(transactionCurrency === 'USD' ? 'USD' : 'ARS');
		setComment(comment);
		setCategory(safeCategory);
		setCustomDetails(customDetails);
		setTransactionLocation(location);
		setHasSavedCustomDetails(Boolean(Object.keys(customDetails || {}).length));
		setSelectedDate(selectedDate);
		setSelectedCloseDate(selectedCloseDate);
		setSelectedExpirationDate(selectedExpirationDate);
		setCurrencyQuantity(currencyQuantity);
		setCurrencyExchangeRate(currencyExchangeRate);
		setIsCreditCardCategory(safeCategory.includes('Resumen tarjeta'));
		setIsBuyCurrenciesCategory(safeCategory.includes('Compra divisas'));
		setIsCurrencyIncomeCategory(safeCategory.includes(INGRESO_DIVISAS_CATEGORY));
		setIsSellCurrenciesCategory(safeCategory.includes('Venta divisas'));
		setExpenseId(id);
		setEdit(true);
	};

  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const detailsId = useId();
  const isCardSummary = safeCategory.includes('Resumen tarjeta');
  const isCurrencyPurchase = safeCategory.includes('Compra divisas');
  const hasValidPaidAt = paidAtDate && !Number.isNaN(paidAtDate.getTime());
  const extraDetails = displayTransactionCustomDetails(customDetails);
  const hasSecondaryDetails = Boolean(
    comment || isCardSummary || isCurrencyPurchase
    || (!hideValues && extraDetails.length > 0)
    || (isPaidBill && (paidDueDate || hasValidPaidAt))
  );

  return (
    <motion.div
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.4, type: 'tween', delay: 0.2 }}
      role='article'
      aria-label={'Movimiento: ' + (name || 'Sin nombre')}
      className={FINANCIAL_ITEM_SURFACE_STYLES + ' mb-3'}
    >
      <div className='min-w-0'>
        <div className='flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
          <h3 className='min-w-0 flex-1 break-words text-base font-bold leading-relaxed text-slate-900 dark:text-slate-50'>{name || 'Sin nombre'}</h3>
          <p className={'min-w-0 break-all text-left text-lg font-bold leading-6 tabular-nums sm:max-w-[48%] sm:break-words sm:text-right sm:text-xl ' +
            (isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
            {hideValues
              ? '••••••'
              : safeCategory.includes(INGRESO_DIVISAS_CATEGORY)
                ? '$USD ' + currencyQuantity
                : (transactionCurrency === 'USD' ? '$USD' : '$AR') + ' ' + (isExpense ? '-' : '+') + parseFloat(amount)?.toLocaleString()}
          </p>
        </div>

        <div className='mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200 sm:text-sm'>
          <span className='min-w-0 break-words'>
            <span className='font-semibold text-violet-700 dark:text-violet-200'>Categoría: </span>
            {displayCategoryName(safeCategory, safeCategories) || 'Sin categoría'}{' '}
            {infoText && <InfoTooltip placement='top' content={infoText} />}
          </span>
          <span className='min-w-0 break-words'>
            <span className='font-semibold text-violet-700 dark:text-violet-200'>
              {selectedDateIsDueDate ? 'Fecha de vencimiento' : 'Fecha transacción'}:{' '}
            </span>
            {moment(selectedDate).format('DD/MM/YYYY')}
          </span>
          {isCardSummary && selectedExpirationDate && (
            <span className='min-w-0 break-words'>
              <span className='font-semibold text-violet-700 dark:text-violet-200'>Fecha de vencimiento: </span>
              {moment(selectedExpirationDate).format('DD/MM/YYYY')}
            </span>
          )}
          {hasSeparateDueDate && selectedExpirationDate && (
            <span className='min-w-0 break-words'>
              <span className='font-semibold text-violet-700 dark:text-violet-200'>Fecha de vencimiento: </span>
              {moment(selectedExpirationDate).format('DD/MM/YYYY')}
            </span>
          )}
          {isPaidBill && (
            <span className='inline-flex min-h-[28px] items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300'>
              <FaCheckCircle className='h-3.5 w-3.5' aria-hidden='true' /> Pagado
            </span>
          )}
        </div>

        <div className='mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-700'>
          {hasSecondaryDetails ? (
            <button type='button'
              onClick={() => setDetailsExpanded((expanded) => !expanded)}
              aria-expanded={detailsExpanded}
              aria-controls={detailsId}
              aria-label={(detailsExpanded ? 'Ocultar detalles de ' : 'Ver detalles de ') + (name || 'movimiento')}
              className='inline-flex min-h-[44px] min-w-0 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200 dark:hover:bg-slate-900/70'>
              <FiChevronDown aria-hidden='true' className={'h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ' + (detailsExpanded ? 'rotate-180' : '')} />
              <span>{detailsExpanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
            </button>
          ) : <span aria-hidden='true' />}
          <div className='ml-auto flex shrink-0 items-center gap-2'>
            <button type='button' onClick={handleDelete} aria-label={'Eliminar ' + (name || 'movimiento')} title='Eliminar movimiento'
              className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 transition-colors hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-rose-500/70 dark:hover:bg-rose-500/10 dark:hover:text-rose-300'>
              <FiTrash2 className='h-[18px] w-[18px]' aria-hidden='true' />
            </button>
            <button type='button' onClick={handleEdit} aria-label={'Editar ' + (name || 'movimiento')} title='Editar movimiento'
              className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-violet-400/70 dark:hover:bg-violet-500/10 dark:hover:text-violet-300'>
              <FiEdit3 className='h-[18px] w-[18px]' aria-hidden='true' />
            </button>
          </div>
        </div>

        {hasSecondaryDetails && detailsExpanded && (
          <section id={detailsId} aria-label={'Detalles de ' + (name || 'movimiento')}
            className='mt-3 min-w-0 space-y-2 border-t border-slate-200 pt-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200'>
            {comment && (
              <p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200'>
                <span className='font-semibold text-violet-700 dark:text-violet-200'>Descripción: </span>{comment}
              </p>
            )}
            {isCardSummary && selectedCloseDate && (
              <p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200'>
                <span className='font-semibold text-violet-700 dark:text-violet-200'>Fecha de Cierre: </span>
                {moment(selectedCloseDate).format('DD/MM/YYYY')}
              </p>
            )}
            {isCurrencyPurchase && (
              <>
                <p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200'>
                  <span className='font-semibold text-violet-700 dark:text-violet-200'>Cantidad: </span>
                  {hideValues ? '••••••' : '$USD ' + currencyQuantity}
                </p>
                <p className='min-w-0 break-words text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200'>
                  <span className='font-semibold text-violet-700 dark:text-violet-200'>Cotización: </span>
                  {hideValues ? '••••••' : '$AR ' + currencyExchangeRate}
                </p>
              </>
            )}
            {!hideValues && extraDetails.length > 0 && (
              <div className='mt-2 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200'
                aria-label='Datos adicionales de la transacción'>
                {extraDetails.map((detail) => (
                  <p key={detail.id} className='break-words'><span className='font-bold'>{detail.label}: </span>{detail.value}</p>
                ))}
              </div>
            )}
            {isPaidBill && (
              <>
                {paidDueDate && (
                  <p className='break-words text-sm text-slate-700 dark:text-slate-200'>
                    <span className='font-semibold text-violet-700 dark:text-violet-200'>Vencía </span>
                    {moment(paidDueDate).format('DD/MM/YYYY')}
                  </p>
                )}
                {hasValidPaidAt && (
                  <p className='break-words text-sm text-slate-700 dark:text-slate-200'>
                    <span className='font-semibold text-violet-700 dark:text-violet-200'>Pagado </span>
                    {moment(paidAtDate).format('DD/MM/YYYY')}
                  </p>
                )}
              </>
            )}
            {!hideValues && isCardSummary && (
              <div className='min-w-0 border-t border-slate-200 pt-2 dark:border-slate-700'>
                <CardStatementDetails expenseId={id} />
              </div>
            )}
          </section>
        )}
      </div>
    </motion.div>
  );
}

export default Card;
