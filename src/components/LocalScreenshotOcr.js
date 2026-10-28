import React, { useEffect, useRef, useState } from 'react';
import { FiImage, FiLoader, FiShield, FiUploadCloud } from 'react-icons/fi';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const action = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-violet-400 px-3 py-2 text-sm font-semibold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:border-violet-600 dark:text-violet-200';

/** Explicitly opt-in, image-only OCR. No image or recognized text is sent to Lita or Firestore. */
export default function LocalScreenshotOcr({ onRecognized, privacyHidden = false, disabled = false }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const mounted = useRef(true);
  const hiddenRef = useRef(privacyHidden);
  hiddenRef.current = privacyHidden;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const chooseFile = (event) => {
    const chosen = event.target.files?.[0] || null;
    setError('');
    setStatus('idle');
    setProgress(0);
    if (!chosen) { setFile(null); return; }
    if (!IMAGE_TYPES.includes(chosen.type) || chosen.size === 0 || chosen.size > MAX_IMAGE_BYTES) {
      setFile(null);
      event.target.value = '';
      setError('Elegí una imagen PNG, JPG o WEBP de hasta 8 MB.');
      return;
    }
    setFile(chosen);
  };

  const recognize = async () => {
    if (!file || disabled || hiddenRef.current || status === 'loading' || status === 'reading') return;
    let reader;
    setStatus('loading');
    setError('');
    setProgress(0);
    try {
      // Lazy-loading prevents the OCR runtime from inflating the normal financial dashboard bundle.
      const { OCR } = await import('../generated/browser-ai/ocr');
      reader = new OCR({
        size: 'small',
        onProgress: (info) => {
          if (mounted.current && !hiddenRef.current && typeof info.progress === 'number') {
            setProgress(Math.min(100, Math.max(0, Math.round(info.progress))));
          }
        },
      });
      await reader.load();
      if (!mounted.current || hiddenRef.current) return;
      setStatus('reading');
      const result = await reader.read(file);
      if (!mounted.current || hiddenRef.current) return;
      if (!result.text?.trim()) throw new Error('No pudimos leer texto de esta captura.');
      onRecognized({ text: result.text, lines: result.lines || [] });
      setStatus('done');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (caught) {
      if (mounted.current && !hiddenRef.current) {
        setStatus('error');
        setError(caught?.message === 'No pudimos leer texto de esta captura.'
          ? caught.message
          : 'No se pudo analizar la captura en este dispositivo. Podés probar otra imagen o usar el importador Markdown.');
      }
    } finally {
      if (reader) await reader.dispose().catch(() => {});
    }
  };

  const working = status === 'loading' || status === 'reading';
  return <section aria-label='Lectura local de capturas' className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-50'>
    <div className='flex items-start gap-2'>
      <FiShield aria-hidden='true' className='mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400'/>
      <p className='text-xs text-slate-700 dark:text-slate-200'>La lectura ocurre acá. La primera vez se descarga el modelo (aprox. 31 megabytes). Tu imagen no se envía ni se guarda.</p>
    </div>
    {privacyHidden ? (
      <p role='status' className='text-sm font-semibold text-amber-700 dark:text-amber-300'>Mostrá los importes para analizar y revisar una captura.</p>
    ) : <>
      <label className='block text-sm font-semibold text-slate-900 dark:text-slate-50'>Elegir captura (PNG, JPG o WEBP)
        <input ref={inputRef} aria-label='Elegir captura para lectura local' type='file' accept='image/png,image/jpeg,image/webp' onChange={chooseFile}
          className='mt-2 block min-h-[44px] w-full min-w-0 cursor-pointer text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:font-semibold file:text-violet-800 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-violet-200'
          disabled={disabled || working}/>
      </label>
      {file && <p className='flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300'><FiImage aria-hidden='true'/> <span className='min-w-0 break-all'>{file.name}</span></p>}
      <button type='button' onClick={recognize} disabled={!file || disabled || working} className={action}>
        {working ? <FiLoader aria-hidden='true' className='animate-spin motion-reduce:animate-none'/> : <FiUploadCloud aria-hidden='true'/>}
        {status === 'loading' ? 'Preparando modelo…' : status === 'reading' ? 'Leyendo captura…' : 'Leer captura en este dispositivo'}
      </button>
      {status === 'loading' && <div role='status' className='space-y-1 text-xs text-slate-600 dark:text-slate-300'>
        <p>Descarga del modelo: {progress}%</p>
        <progress aria-label='Progreso de descarga del modelo OCR' value={progress} max='100' className='h-2 w-full accent-violet-600'/>
      </div>}
      {status === 'reading' && <p role='status' className='text-xs text-slate-600 dark:text-slate-300'>Reconociendo texto. No cierres esta ventana todavía.</p>}
      {status === 'done' && <p role='status' className='text-xs font-semibold text-emerald-700 dark:text-emerald-400'>Texto detectado. Revisá cada cifra antes de aplicar cambios.</p>}
    </>}
    {error && !privacyHidden && <p role='alert' className='rounded-lg border border-rose-400/60 p-2 text-xs text-rose-700 dark:text-rose-300'>{error}</p>}
  </section>;
}
