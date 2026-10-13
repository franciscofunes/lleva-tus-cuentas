import React, { useMemo, useState } from 'react';
import { FaCheck, FaEdit, FaPlus, FaTag } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { saveCustomCategory, setCustomCategoryActive, updateCustomCategoryCurrency, updateCustomCategoryLabel, updateCustomCategoryDescription } from '../services/customCategoriesService';
import { CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR, categoryLabel, normalizeCategoryName, validateCategoryDisplayName, validateCustomCategory, normalizeCategoryDescription, validateCategoryDescription, CATEGORY_DESCRIPTION_LIMIT } from '../utils/customCategories';
import { CATEGORY_EXTRA_FIELD_CATALOG, MAX_EXTRA_FIELDS, validateCategoryExtraFields } from '../utils/categoryExtraFields';

const fieldClass = 'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

const CategoryManager = ({ userId, categories = [], onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [currency, setCurrency] = useState('ARS');
  const [extraFieldIds, setExtraFieldIds] = useState([]);
  const [hasDueDate, setHasDueDate] = useState(false);
  const [working, setWorking] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingCurrency, setEditingCurrency] = useState('ARS');
  const [editError, setEditError] = useState('');
  const [error, setError] = useState('');
  const customCategories = useMemo(() =>
    categories.filter((entry) => entry.isCustom && entry.origin === 'custom')
      .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), 'es-AR')), [categories]);

  const create = async (event) => {
    event.preventDefault();
    if (working) return;
    const normalized = normalizeCategoryName(name);
    const archivedMatch = customCategories.find(
      (entry) => normalizeCategoryName(entry.name) === normalized && entry.active === false
    );
    if (archivedMatch) {
      setError('Esta categoría está archivada. Reactivala desde la lista de abajo.');
      return;
    }
    const validation = validateCustomCategory({ name, isExpense }, categories)
      || validateCategoryExtraFields(extraFieldIds)
      || validateCategoryDescription(description);
    if (validation) { setError(validation); return; }
    setWorking('create');
    setError('');
    try {
      await saveCustomCategory(userId, {
        name, isExpense, currency,
        ...(normalizeCategoryDescription(description) ? { description: normalizeCategoryDescription(description) } : {}),
        ...(extraFieldIds.length ? { extraFieldIds } : {}),
        ...(hasDueDate ? { dateBehavior: CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR } : {}),
      }, categories);
      setName('');
      setDescription('');
      setExtraFieldIds([]);
      setHasDueDate(false);
      setCurrency('ARS');
      toast.success('Categoría personal creada');
      // Only close/select automatically when launched from an active transaction.
      // The callback runs solely after Firestore confirms creation.
      onCreated?.(name.replace(/\s+/g, ' ').trim());
    } catch (err) {
      setError(err.message || 'No se pudo guardar. Verificá las reglas de Firestore.');
    } finally {
      setWorking('');
    }
  };

  const startEditing = (entry) => {
    if (working) return;
    setEditingId(entry.id);
    setEditingLabel(categoryLabel(entry));
    setEditingDescription(entry.description || '');
    setEditingCurrency(entry.currency === 'USD' ? 'USD' : 'ARS');
    setEditError('');
  };
  const cancelEditing = () => {
    setEditingId(null);
    setEditingLabel('');
    setEditingDescription('');
    setEditingCurrency('ARS');
    setEditError('');
  };
  const rename = async (event, entry) => {
    event.preventDefault();
    if (working) return;
    const validation = validateCategoryDisplayName(editingLabel, categories, entry.id)
      || validateCategoryDescription(editingDescription);
    if (validation) { setEditError(validation); return; }
    setWorking(entry.id);
    setEditError('');
    try {
      if (editingLabel.trim().replace(/\s+/g, ' ') !== categoryLabel(entry)) {
        await updateCustomCategoryLabel(userId, entry, editingLabel, categories);
      }
      if (editingCurrency !== (entry.currency === 'USD' ? 'USD' : 'ARS')) {
        await updateCustomCategoryCurrency(userId, entry, editingCurrency);
      }
      if (normalizeCategoryDescription(editingDescription) !== normalizeCategoryDescription(entry.description)) {
        await updateCustomCategoryDescription(userId, entry, editingDescription);
      }
      toast.success('Categoría actualizada');
      cancelEditing();
    } catch (err) {
      setEditError(err.message || 'No se pudo editar. Verificá las reglas de Firestore.');
    } finally {
      setWorking('');
    }
  };

  const toggleActive = async (entry) => {
    if (working) return;
    setWorking(entry.id);
    setError('');
    try {
      await setCustomCategoryActive(userId, entry.id, entry.active === false);
      toast.success(entry.active === false ? 'Categoría reactivada' : 'Categoría archivada');
    } catch {
      setError('No se pudo modificar la categoría. Verificá las reglas de Firestore.');
    } finally { setWorking(''); }
  };

  return (
    <div className='space-y-5 pb-3' aria-label='Administrar categorías personales'>
      <header className='space-y-1'>
        <div className='flex items-center gap-2 text-purple-600 dark:text-purple-300'><FaTag aria-hidden='true' /> <span className='text-xs font-extrabold uppercase tracking-wider'>Mis categorías</span></div>
        <h2 className='text-xl font-extrabold text-slate-900 dark:text-white'>Categorías personalizadas</h2>
        <p className='text-sm text-slate-600 dark:text-slate-300'>
          Las categorías generales son compartidas y no se pueden modificar. Podés renombrar, archivar y reactivar las tuyas sin modificar movimientos históricos.
        </p>
      </header>

      <form className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60' onSubmit={create}>
        <label htmlFor='personal-category-name' className='block text-sm font-semibold'>Nombre de la categoría</label>
        <input id='personal-category-name' value={name} maxLength={50} placeholder='Ej.: Mascotas, Educación, Freelance…'
          autoComplete='off' onChange={(event) => { setName(event.target.value); setError(''); }} className={fieldClass} />
        <label htmlFor='personal-category-description' className='block text-sm font-semibold'>Descripción de la categoría (opcional)</label>
        <textarea id='personal-category-description' value={description}
          maxLength={CATEGORY_DESCRIPTION_LIMIT} rows={3}
          placeholder='Ej.: Gastos mensuales por mantenimiento, comisiones y servicios bancarios.'
          onChange={(event) => { setDescription(event.target.value); setError(''); }}
          className={fieldClass + ' resize-y'} />
        <p className='text-xs text-slate-600 dark:text-slate-300'>
          Se muestra al tocar el ícono de información de la categoría. No es la descripción de una transacción.
          <span className='ml-1 tabular-nums'>{description.length}/{CATEGORY_DESCRIPTION_LIMIT}</span>
        </p>
        <fieldset className='flex gap-3'>
          <legend className='mb-1 text-sm font-semibold'>Tipo de movimiento</legend>
          <label className='flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-600'>
            <input type='radio' checked={isExpense} onChange={() => setIsExpense(true)} name='personal-category-type' /> Gasto
          </label>
          <label className='flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-600'>
            <input type='radio' checked={!isExpense} onChange={() => setIsExpense(false)} name='personal-category-type' /> Ingreso
          </label>
        </fieldset>
        <label htmlFor='personal-category-currency' className='block text-sm font-semibold'>
          Moneda de los movimientos
        </label>
        <select id='personal-category-currency' value={currency} onChange={(event) => setCurrency(event.target.value)}
          className={fieldClass}>
          <option value='ARS'>Pesos argentinos (ARS)</option>
          <option value='USD'>Dólares estadounidenses (USD)</option>
        </select>
        <p className='text-xs text-slate-600 dark:text-slate-300'>La moneda se guarda en cada movimiento. No hace falta cotización para registrar un gasto en dólares.</p>
        <section aria-label='Campos de la categoría' className='space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/70'>
          <h3 className='text-sm font-bold text-slate-900 dark:text-white'>Campos de la transacción</h3>
          <p className='text-xs leading-5 text-slate-600 dark:text-slate-300'>
            Incluidos en todas las categorías: nombre, categoría, monto, fecha y descripción.
          </p>
          <label className='flex min-h-[44px] items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800'>
            <input type='checkbox' aria-label='Fecha de vencimiento' checked={hasDueDate} disabled={Boolean(working)}
              onChange={(event) => setHasDueDate(event.target.checked)}
              className='mt-0.5 h-4 w-4 shrink-0 accent-purple-600' />
            <span className='min-w-0'>
              <span className='block text-sm font-semibold text-slate-900 dark:text-slate-100'>Fecha de vencimiento</span>
              <span className='mt-1 block text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
                Agrega una segunda fecha opcional a tus movimientos, además de la fecha de transacción.
                Si la completás, LTC puede recordarte el vencimiento 5 días antes.
                No consume los 3 campos adicionales.
              </span>
            </span>
          </label>
          <p className='text-xs font-bold text-purple-700 dark:text-purple-300'>
            Adicionales opcionales ({extraFieldIds.length}/{MAX_EXTRA_FIELDS})
          </p>
          <div className='grid gap-1.5 sm:grid-cols-2'>
            {CATEGORY_EXTRA_FIELD_CATALOG.map((field) => {
              const checked = extraFieldIds.includes(field.id);
              return (
                <label key={field.id} className='flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200'>
                  <input type='checkbox' checked={checked} disabled={Boolean(working) || (!checked && extraFieldIds.length >= MAX_EXTRA_FIELDS)}
                    onChange={(event) => setExtraFieldIds((current) => event.target.checked
                      ? [...current, field.id] : current.filter((id) => id !== field.id))}
                    className='h-4 w-4 accent-purple-600' />
                  <span>{field.label}</span>
                </label>
              );
            })}
          </div>
          <p className='text-xs text-slate-500 dark:text-slate-400'>
            Son campos controlados por LTC: no alteran cálculos ni reemplazan los campos especiales de tarjetas o divisas.
            La selección queda fija para proteger los movimientos históricos.
          </p>
        </section>
        {error && <p role='alert' className='text-sm text-red-700 dark:text-red-300'>{error}</p>}
        <button type='submit' disabled={Boolean(working) || !userId}
          className='flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 disabled:opacity-50'>
          <FaPlus aria-hidden='true' /> {working === 'create' ? 'Guardando…' : 'Crear categoría'}
        </button>
      </form>

      <section aria-label='Mis categorías' className='space-y-2'>
        <h3 className='text-sm font-bold text-slate-900 dark:text-white'>Tus categorías ({customCategories.length})</h3>
        {!customCategories.length && <p className='rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-300'>Todavía no creaste categorías personales.</p>}
        {customCategories.map((entry) => (
          <div key={entry.id} className='rounded-xl border border-slate-200 p-3 dark:border-slate-700'>
            <div className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
            <div className='min-w-0'>
              <p className='break-words text-sm font-bold text-slate-900 dark:text-white'>{categoryLabel(entry)}</p>
              {entry.description && <p className='mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300'>{entry.description}</p>}
              <p className='text-xs text-slate-500 dark:text-slate-400'>{entry.isExpense ? 'Gasto' : 'Ingreso'} · {entry.currency === 'USD' ? 'USD' : 'ARS'} · {entry.active === false ? 'Archivada' : 'Activa'}{['due-date', CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR].includes(entry.dateBehavior) ? ' · Con vencimiento' : ''}</p>
              {Array.isArray(entry.extraFieldIds) && entry.extraFieldIds.length > 0 && (
                <p className='mt-1 text-xs text-purple-700 dark:text-purple-300'>{entry.extraFieldIds.length} campos adicionales</p>
              )}
            </div>
            <div className='flex shrink-0 flex-wrap items-center gap-1.5'>
              <button type='button' disabled={Boolean(working)} onClick={() => startEditing(entry)}
                aria-label={`Editar ${categoryLabel(entry)}`}
                className='inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:border-purple-500 dark:border-slate-600 dark:text-slate-100'>
                <FaEdit aria-hidden='true' /> Editar
              </button>
              <button type='button' disabled={Boolean(working)} onClick={() => toggleActive(entry)}
                aria-label={entry.active === false ? `Reactivar ${categoryLabel(entry)}` : `Archivar ${categoryLabel(entry)}`}
                className='inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:border-purple-500 dark:border-slate-600 dark:text-slate-100'>
                {entry.active === false ? <><FaCheck aria-hidden='true' /> Reactivar</> : 'Archivar'}
              </button>
            </div>
            </div>
            {editingId === entry.id && (
              <form onSubmit={(event) => rename(event, entry)}
                aria-label={`Editar categoría ${categoryLabel(entry)}`}
                className='mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700'>
                <label htmlFor='edit-personal-category-name' className='block text-sm font-semibold text-slate-900 dark:text-slate-100'>
                  Nuevo nombre visible
                </label>
                <input id='edit-personal-category-name' autoComplete='off' maxLength={50}
                  disabled={Boolean(working)} value={editingLabel}
                  onChange={(event) => { setEditingLabel(event.target.value); setEditError(''); }}
                  className={fieldClass} />
                <label htmlFor='edit-personal-category-description' className='block text-sm font-semibold'>Descripción de la categoría (opcional)</label>
                <textarea id='edit-personal-category-description' rows={3} maxLength={CATEGORY_DESCRIPTION_LIMIT}
                  value={editingDescription} disabled={Boolean(working)}
                  onChange={(event) => { setEditingDescription(event.target.value); setEditError(''); }}
                  className={fieldClass + ' resize-y'} />
                <p className='text-xs text-slate-600 dark:text-slate-300'>
                  Texto del tooltip de información · {editingDescription.length}/{CATEGORY_DESCRIPTION_LIMIT} caracteres.
                  Podés dejarlo vacío para quitar la descripción.
                </p>
                <label htmlFor='edit-personal-category-currency' className='block text-sm font-semibold'>Moneda para nuevos movimientos</label>
                <select id='edit-personal-category-currency' value={editingCurrency}
                  onChange={(event) => setEditingCurrency(event.target.value)} disabled={Boolean(working)}
                  className={fieldClass}>
                  <option value='ARS'>Pesos argentinos (ARS)</option>
                  <option value='USD'>Dólares estadounidenses (USD)</option>
                </select>
                <p className='text-xs text-slate-600 dark:text-slate-300'>
                  Cambiar la moneda solo afecta los movimientos nuevos. Los anteriores conservan la moneda con la que fueron registrados.
                </p>
                <p className='text-xs text-slate-600 dark:text-slate-300'>
                  Actualiza el nombre que ves en transacciones y filtros. No cambia el tipo de movimiento,
                  las fechas, los campos personalizados ni la identidad de los registros guardados.
                </p>
                {editError && <p role='alert' className='text-sm text-red-700 dark:text-red-300'>{editError}</p>}
                <div className='flex flex-wrap gap-2'>
                  <button type='submit' disabled={Boolean(working)}
                    className='min-h-[44px] rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white disabled:opacity-50'>
                    {working === entry.id ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button type='button' disabled={Boolean(working)} onClick={cancelEditing}
                    className='min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-slate-600'>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
        <p className='text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
          Editar cambia el nombre visible y la descripción del tooltip sin reescribir movimientos anteriores. El tipo, los campos adicionales y la configuración de fechas no cambian. Archivar solo impide seleccionar la categoría para nuevas transacciones.
        </p>
      </section>
    </div>
  );
};
export default CategoryManager;
