import React,{useEffect,useRef,useState} from 'react';
import {FiMapPin,FiNavigation,FiX} from 'react-icons/fi';

export default function TransactionLocationField({value,onChange}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const active=useRef(true);
  useEffect(()=>()=>{active.current=false;},[]);
  const hasCoords=value?.source==='device' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
  const capture=()=>{
    setError('');
    if(!navigator?.geolocation || !window.isSecureContext) {
      setError('Para obtener la ubicación necesitás HTTPS y permisos del navegador.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position)=>{
        if(!active.current)return;
        setBusy(false);
        onChange({label:value?.label||'',source:'device',
          latitude:Number(position.coords.latitude.toFixed(3)),
          longitude:Number(position.coords.longitude.toFixed(3))});
      },
      (failure)=>{
        if(!active.current)return;
        setBusy(false);
        setError(failure?.code===1?'Permiso denegado. Podés escribir el lugar manualmente.':
          'No pudimos obtener la ubicación. Podés escribir el lugar manualmente.');
      },
      {enableHighAccuracy:false,maximumAge:0,timeout:12000}
    );
  };
  return <section aria-label='Ubicación opcional' className='space-y-2 rounded-xl border border-slate-300 bg-slate-50/60 p-3 dark:border-slate-600 dark:bg-slate-900/40'>
    <h3 className='flex items-center gap-2 text-sm font-bold dark:text-white'><FiMapPin/> Ubicación de la transacción (opcional)</h3>
    <label htmlFor='txLocationLabel' className='block text-xs font-semibold text-slate-700 dark:text-slate-300'>Lugar o comercio
      <input id='txLocationLabel' maxLength={100} value={value?.label||''} placeholder='Ej.: Supermercado del barrio'
        onChange={e=>onChange(hasCoords?{...value,label:e.target.value}:{label:e.target.value,source:'manual'})}
        className='mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white'/>
    </label>
    <div className='flex flex-wrap gap-2'>
      <button type='button' onClick={capture} disabled={busy} className='inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-purple-500/60 px-3 text-xs font-bold text-purple-700 disabled:opacity-50 dark:text-purple-300'>
        <FiNavigation/>{busy?'Obteniendo ubicación…':hasCoords?'Actualizar ubicación':'Usar ubicación actual'}
      </button>
      {(value?.label || hasCoords) && <button type='button' onClick={()=>{setError('');onChange(null);}} className='inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300'><FiX/> Quitar</button>}
    </div>
    {hasCoords && <p role='status' className='text-xs font-semibold text-purple-700 dark:text-purple-300'>Posición aproximada lista para guardar ({value.latitude.toFixed(3)}, {value.longitude.toFixed(3)}).</p>}
    {error && <p role='alert' className='text-xs text-rose-700 dark:text-rose-300'>{error}</p>}
    <p className='text-xs leading-relaxed text-slate-600 dark:text-slate-300'>Solo se solicita tu ubicación al tocar el botón. Se guarda aproximada al confirmar y no se rastrean recorridos.</p>
  </section>;
}
