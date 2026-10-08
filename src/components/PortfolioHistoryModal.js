import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes } from 'react-icons/fa';

const money = (value, currency = 'USD') =>
	new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value || 0));

const dateText = (value) => {
	const date = value?.toDate ? value.toDate() : new Date(value);
	return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-AR');
};

const changeTypes = [
	{ value: 'unclassified', label: 'Sin clasificar' },
	{ value: 'earning', label: 'Rendimiento' },
	{ value: 'deposit', label: 'Aporte' },
	{ value: 'withdrawal', label: 'Retiro' },
	{ value: 'adjustment', label: 'Ajuste' },
];

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/** Modal for editing metadata or confirming deletion of a historic snapshot. */
export default function PortfolioHistoryModal({
	mode, item, isFci, currency, onChange, onSave, onDelete, onClose, busy = false,
}) {
	const titleId = useId();
	const descriptionId = useId();
	const modalRef = useRef(null);
	const titleRef = useRef(null);
	const busyRef = useRef(busy);
	const closeRef = useRef(onClose);
	busyRef.current = busy;
	closeRef.current = onClose;

	useEffect(() => {
		const previouslyFocused = document.activeElement;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		titleRef.current?.focus();
		const onKeyDown = (event) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				if (!busyRef.current) closeRef.current();
				return;
			}
			if (event.key !== 'Tab' || !modalRef.current) return;
			const focusable = Array.from(modalRef.current.querySelectorAll(focusableSelector));
			if (!focusable.length) {
				event.preventDefault();
				titleRef.current?.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && (document.activeElement === first || !modalRef.current.contains(document.activeElement))) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && (document.activeElement === last || !modalRef.current.contains(document.activeElement))) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.body.style.overflow = originalOverflow;
			document.removeEventListener('keydown', onKeyDown);
			if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
				previouslyFocused.focus();
			}
		};
	}, []);

	if (!item) return null;
	const isDelete = mode === 'delete';
	const resource = isFci ? 'valuación' : 'verificación';
	const title = isDelete ? 'Eliminar ' + resource
		: isFci ? 'Editar nota de valuación' : 'Editar verificación';

	return createPortal(
		<div
			className='fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-[2px] sm:px-6'
			onMouseDown={(event) => {
				if (event.target === event.currentTarget && !busy) onClose();
			}}
		>
			<div
				ref={modalRef}
				role='dialog'
				aria-modal='true'
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				className='flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white'
				style={{ maxHeight: 'calc(100dvh - 32px)' }}
			>
				<div className='flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700'>
					<div className='min-w-0'>
						<h2 ref={titleRef} tabIndex={-1} id={titleId} className='text-lg font-bold outline-none'>{title}</h2>
						<p id={descriptionId} className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
							{isDelete
								? 'Confirmá esta acción. No se puede deshacer.'
								: isFci
									? 'El NAV, las cuotapartes y la valuación se conservan como evidencia. Solo podés modificar la nota.'
									: 'El saldo, la fecha y el cambio observado se conservan como evidencia. Podés editar la clasificación y la nota.'}
						</p>
					</div>
					<button type='button' onClick={onClose} disabled={busy}
						aria-label='Cerrar modal'
						className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'>
						<FaTimes aria-hidden='true' />
					</button>
				</div>

				<div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4'>
					<dl className='grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800'>
						<div className='col-span-2'>
							<dt className='text-xs text-slate-600 dark:text-slate-300'>Fecha</dt>
							<dd className='mt-1 font-semibold'>{dateText(item.capturedAt)}</dd>
						</div>
						<div>
							<dt className='text-xs text-slate-600 dark:text-slate-300'>{isFci ? 'Valuación' : 'Saldo'}</dt>
							<dd className='mt-1 font-semibold'>{money(item.balance, currency)}</dd>
						</div>
						<div>
							<dt className='text-xs text-slate-600 dark:text-slate-300'>{isFci ? 'NAV' : 'Cambio observado'}</dt>
							<dd className='mt-1 font-semibold'>{isFci ? Number(item.nav || 0).toLocaleString('es-AR', { maximumFractionDigits: 6 }) : money(item.observedEarning, currency)}</dd>
						</div>
					</dl>
					{isDelete ? (
						<p className='mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700/70 dark:bg-red-950/30 dark:text-red-200'>
							{isFci
								? 'Se eliminará esta valuación NAV del historial. No se crean ni eliminan movimientos de Transacciones.'
								: 'Se eliminará esta verificación del historial y de los cálculos de rendimiento. Los movimientos de Transacciones no se modifican.'}
						</p>
					) : (
						<form id='portfolio-history-edit-form' onSubmit={(event) => { event.preventDefault(); if (!busy) onSave(); }} className='mt-4 space-y-4'>
							{!isFci && (
								<div>
									<label htmlFor='portfolio-history-change-type' className='block text-sm font-semibold'>Tipo de movimiento</label>
									<select id='portfolio-history-change-type' value={item.changeType || 'unclassified'}
										onChange={(event) => onChange({ ...item, changeType: event.target.value })}
										disabled={busy}
										className='mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white'>
										{changeTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
										{item.changeType === 'valuation' && <option value='valuation'>Valuación NAV</option>}
									</select>
								</div>
							)}
							<div>
								<label htmlFor='portfolio-history-note' className='block text-sm font-semibold'>Nota</label>
								<textarea id='portfolio-history-note' value={item.note || ''}
									onChange={(event) => onChange({ ...item, note: event.target.value })}
									disabled={busy} rows={3} placeholder='Agregá una observación…'
									className='mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
								/>
							</div>
						</form>
					)}
				</div>
				<div className='flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700 sm:flex-row sm:justify-end'>
					<button type='button' onClick={onClose} disabled={busy}
						className='rounded-xl border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800'>
						Cancelar
					</button>
					<button type={isDelete ? 'button' : 'submit'}
						form={isDelete ? undefined : 'portfolio-history-edit-form'}
						onClick={isDelete ? () => { if (!busy) onDelete(); } : undefined}
						disabled={busy}
						className={['rounded-xl px-5 py-2.5 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60',
							isDelete ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500' : 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500'].join(' ')}>
						{busy ? 'Procesando…' : isDelete ? 'Eliminar ' + resource : 'Guardar cambios'}
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
