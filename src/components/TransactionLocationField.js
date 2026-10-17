import React, { useEffect, useId, useRef, useState } from 'react';
import { FiMapPin, FiNavigation, FiX } from 'react-icons/fi';
import { searchLitaPlaces } from '../services/litaPlacesService';

const DEBOUNCE_MS = 400;

export default function TransactionLocationField({ value, onChange }) {
  const [query, setQuery] = useState(value?.label || '');
  const [searching, setSearching] = useState(false);
  const [suggest, setSuggest] = useState(false);
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  const listId = useId();
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const hasCoords = ['device','search'].includes(value?.source) &&
    Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude);

  useEffect(() => {
    if (!suggest || query.trim().length < 3) {
      setSearching(false);
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    setSearching(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const found = await searchLitaPlaces(query, { signal: controller.signal });
        if (!controller.signal.aborted && active.current) {
          setResults(found);
          setActiveIndex(-1);
        }
      } catch (failure) {
        if (!controller.signal.aborted && active.current) {
          setResults([]);
          setError(failure?.message || 'No pudimos buscar lugares. Escribí el nombre manualmente.');
        }
      } finally {
        if (!controller.signal.aborted && active.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, suggest]);

  const typeLabel = (next) => {
    setQuery(next);
    setError('');
    setResults([]);
    setActiveIndex(-1);
    setSuggest(next.trim().length >= 3 && next.length <= 80);
    // Once a user edits the name, old device/search coordinates are no longer
    // assumed to describe the new place. Selection is required to set a pin.
    onChange(next.trim() ? { label: next, source: 'manual' } : null);
  };

  const choose = (place) => {
    setQuery(place.label);
    setSuggest(false);
    setResults([]);
    setError('');
    setActiveIndex(-1);
    onChange({
      label: place.label.slice(0, 100),
      source: 'search',
      latitude: Number(place.latitude.toFixed(3)),
      longitude: Number(place.longitude.toFixed(3)),
    });
  };

  const capture = () => {
    setError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation || !window.isSecureContext) {
      setError('Para obtener la ubicación necesitás HTTPS y permisos del navegador.');
      return;
    }
    setBusy(true);
    setSuggest(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active.current) return;
        setBusy(false);
        onChange({
          label: query.slice(0, 100), source: 'device',
          latitude: Number(position.coords.latitude.toFixed(3)),
          longitude: Number(position.coords.longitude.toFixed(3)),
        });
      },
      (failure) => {
        if (!active.current) return;
        setBusy(false);
        setError(failure?.code === 1 ? 'Permiso denegado. Podés escribir el lugar manualmente.' :
          'No pudimos obtener la ubicación. Podés escribir el lugar manualmente.');
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 12000 }
    );
  };
  const clear = () => {
    setQuery('');
    setSuggest(false);
    setError('');
    setResults([]);
    onChange(null);
  };
  const onKeyDown = (event) => {
    if (!results.length || !suggest) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setSuggest(false);
      setResults([]);
    }
  };
  return <section aria-label='Ubicación opcional' className='space-y-2 rounded-xl border border-slate-300 bg-slate-50/60 p-3 dark:border-slate-600 dark:bg-slate-900/40'>
    <h3 className='flex items-center gap-2 text-sm font-bold dark:text-white'><FiMapPin aria-hidden='true'/> Ubicación de la transacción (opcional)</h3>
    <div className='relative'>
      <label htmlFor='txLocationLabel' className='block text-xs font-semibold text-slate-700 dark:text-slate-300'>Buscar un comercio, dirección o lugar
        <input id='txLocationLabel' maxLength={100} value={query} role='combobox' aria-autocomplete='list'
          aria-expanded={suggest && results.length > 0} aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? listId + '-' + activeIndex : undefined}
          onKeyDown={onKeyDown} onChange={event => typeLabel(event.target.value)}
          placeholder='Ej.: Café de la esquina, Caballito'
          className='mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white'/>
      </label>
      {suggest && <div id={listId} role='listbox' aria-label='Lugares sugeridos'
        className='mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800'>
        {searching && <p role='status' className='p-3 text-xs text-slate-600 dark:text-slate-300'>Buscando lugares…</p>}
        {!searching && results.map((place, index) => <button type='button' role='option'
          id={listId + '-' + index} aria-selected={activeIndex === index}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(place)}
          className='block min-h-[44px] w-full border-b border-slate-200 px-3 py-2 text-left text-xs last:border-0 hover:bg-purple-50 focus:bg-purple-50 dark:border-slate-700 dark:hover:bg-slate-700 dark:focus:bg-slate-700'
          key={place.id || place.label + index}>
            <span className='block font-bold'>{place.label}</span>
            {place.detail && <span className='block text-slate-600 dark:text-slate-300'>{place.detail}</span>}
          </button>)}
        {!searching && !error && results.length === 0 && <p className='p-3 text-xs text-slate-600 dark:text-slate-300'>No encontramos coincidencias. Podés ingresar el lugar manualmente.</p>}
      </div>}
    </div>
    <div className='flex flex-wrap gap-2'>
      <button type='button' onClick={capture} disabled={busy} className='inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-purple-500/60 px-3 text-xs font-bold text-purple-700 disabled:opacity-50 dark:text-purple-300'>
        <FiNavigation aria-hidden='true'/>{busy ? 'Obteniendo ubicación…' : value?.source === 'device' ? 'Actualizar ubicación' : 'Usar ubicación actual'}
      </button>
      {(query || hasCoords) && <button type='button' onClick={clear} className='inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300'><FiX aria-hidden='true'/> Quitar</button>}
    </div>
    {hasCoords && <p role='status' className='text-xs font-semibold text-purple-700 dark:text-purple-300'>Lugar listo para el mapa · posición aproximada ({value.latitude.toFixed(3)}, {value.longitude.toFixed(3)}).</p>}
    {error && <p role='alert' className='text-xs text-rose-700 dark:text-rose-300'>{error}</p>}
    <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>
      Buscar lugares envía solo el texto escrito al proveedor. Se guardan coordenadas aproximadas únicamente cuando elegís una sugerencia o autorizás el GPS. Podés escribir un lugar sin mapa.
    </p>
    <p className='text-[11px] text-slate-600 dark:text-slate-400'>Búsqueda: <a href='https://www.geoapify.com/' target='_blank' rel='noreferrer' className='underline'>Geoapify</a> · Datos: <a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noreferrer' className='underline'>© OpenStreetMap contributors</a></p>
  </section>;
}
