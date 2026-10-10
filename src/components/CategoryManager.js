import React, { useMemo, useState } from 'react';
import { FaCheck, FaPlus, FaTag } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { saveCustomCategory, setCustomCategoryActive } from '../services/customCategoriesService';
import { normalizeCategoryName, validateCustomCategory } from '../utils/customCategories';
import { CATEGORY_EXTRA_FIELD_CATALOG, MAX_EXTRA_FIELDS, validateCategoryExtraFields } from '../utils/categoryExtraFields';

const fieldClass = 'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

const CategoryManager = ({ userId, categories = [], onCreated }) => {
  const [name, setName] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [extraFieldIds, setExtraFieldIds] = useState([]);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const customCategories = useMemo(() =>
    categories.filter((entry) => entry.isCustom && entry.origin === 'custom')
      .sort((a, b) => a.name.localeCompare(b.name, 'es-AR')), [categories]);

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
      || validateCategoryExtraFields(extraFieldIds);
    if (validation) { setError(validation); return; }
    setWorking('create');
    setError('');
    try {
      await saveCustomCategory(userId, { name, isExpense, ...(extraFieldIds.length ? { extraFieldIds } : {}) }, categories);
      setName('');
      setExtraFieldIds([]);
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
          Las categorías generales son compartidas y no se pueden modificar. Las tuyas son privadas y aparecen en transacciones, filtros y Lita.
        </p>
      </header>

      <form className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60' onSubmit={create}>
        <label htmlFor='personal-category-name' className='block text-sm font-semibold'>Nombre de la categoría</label>
        <input id='personal-category-name' value={name} maxLength={50} placeholder='Ej.: Mascotas, Educación, Freelance…'
          autoComplete='off' onChange={(event) => { setName(event.target.value); setError(''); }} className={fieldClass} />
        <fieldset className='flex gap-3'>
          <legend className='mb-1 text-sm font-semibold'>Tipo de movimiento</legend>
          <label className='flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-600'>
            <input type='radio' checked={isExpense} onChange={() => setIsExpense(true)} name='personal-category-type' /> Gasto
          </label>
          <label className='flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-600'>
            <input type='radio' checked={!isExpense} onChange={() => setIsExpense(false)} name='personal-category-type' /> Ingreso
          </label>
        </fieldset>
        <section aria-label='Campos de la categoría' className='space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/70'>
          <h3 className='text-sm font-bold text-slate-900 dark:text-white'>Campos de la transacción</h3>
          <p className='text-xs leading-5 text-slate-600 dark:text-slate-300'>
            Incluidos en todas las categorías: nombre, categoría, monto, fecha y descripción.
          </p>
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
          <div key={entry.id} className='flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700'>
            <div className='min-w-0'>
              <p className='break-words text-sm font-bold text-slate-900 dark:text-white'>{entry.name}</p>
              <p className='text-xs text-slate-500 dark:text-slate-400'>{entry.isExpense ? 'Gasto' : 'Ingreso'} · {entry.active === false ? 'Archivada' : 'Activa'}</p>
              {Array.isArray(entry.extraFieldIds) && entry.extraFieldIds.length > 0 && (
                <p className='mt-1 text-xs text-purple-700 dark:text-purple-300'>{entry.extraFieldIds.length} campos adicionales</p>
              )}
            </div>
            <button type='button' disabled={Boolean(working)} onClick={() => toggleActive(entry)}
              aria-label={entry.active === false ? `Reactivar ${entry.name}` : `Archivar ${entry.name}`}
              className='flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:border-purple-500 dark:border-slate-600 dark:text-slate-100'>
              {entry.active === false ? <><FaCheck aria-hidden='true' /> Reactivar</> : 'Archivar'}
            </button>
          </div>
        ))}
        <p className='text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
          Archivar oculta la categoría al cargar nuevos movimientos. Los anteriores conservan su categoría, gráficos y reportes. Para evitar cambios retroactivos, el nombre y el tipo no se editan.
        </p>
      </section>
    </div>
  );
};
export default CategoryManager;
