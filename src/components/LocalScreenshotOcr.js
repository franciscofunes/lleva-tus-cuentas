import React, { useEffect, useRef, useState } from 'react';
import { FiCamera, FiImage, FiLoader, FiShield, FiUploadCloud, FiX } from 'react-icons/fi';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const action = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-violet-400 px-3 py-2 text-sm font-semibold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 dark:border-violet-600 dark:text-violet-200';
const mobileBrowser = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

function ocrFailureMessage(error, stage) {
  const message = String(error?.message || '').toLowerCase();
  // Stable, non-sensitive codes allow debugging user reports without logging
  // financial screenshots, OCR text or raw browser error messages.
  if (message.includes('no pudimos leer texto')) return '[OCR-TEXT] No se encontró texto legible. Probá con otra foto, mejor luz o más cerca.';
  if (/memory|allocation|out of bounds|out of memory/.test(message)) return '[OCR-MEM] El dispositivo se quedó sin memoria. Elegí el modelo liviano y cerrá otras pestañas.';
  if (/fetch|network|cors|http|download|could not load|failed to load|dictionary/.test(message)) return '[OCR-NET] No se pudo descargar el modelo. Revisá la conexión y reintentá; la imagen no se envió.';
  if (/wasm|backend|webgpu|inference|mismatch|compile|instantiate/.test(message)) return '[OCR-MOTOR] No se pudo iniciar el lector local. Recargá esta página y reintentá con el modelo liviano.';
  if (stage === 'reading') return '[OCR-IMG] El modelo se preparó, pero no pudo leer esta imagen. Probá otra foto.';
  return '[OCR-INIT] No se pudo iniciar la lectura local. Recargá esta página y reintentá.';
}

/** Explicitly opt-in, image-only OCR. No image or recognized text is sent to Lita or Firestore. */
export default function LocalScreenshotOcr({ onRecognized, privacyHidden = false, disabled = false, allowCamera = false }) {
  const [file, setFile] = useState(null);
  const [engine, setEngine] = useState(() => mobileBrowser() ? 'compatible' : 'advanced');
  const [modelSize, setModelSize] = useState(() => mobileBrowser() ? 'tiny' : 'small');
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPending, setCameraPending] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const mounted = useRef(true);
  const hiddenRef = useRef(privacyHidden);
  hiddenRef.current = privacyHidden;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const stopCamera = () => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraPending(false);
  };

  useEffect(() => {
    if (privacyHidden || disabled) {
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOpen(false);
      setCameraPending(false);
      setFile(null);
      setError('');
    }
  }, [privacyHidden, disabled]);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => setCameraError('No se pudo mostrar la cámara. Podés elegir una imagen de tu galería.'));
    }
  }, [cameraOpen]);

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

  const openCamera = async () => {
    if (disabled || privacyHidden || cameraPending || cameraOpen) return;
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    const request = ++cameraRequestRef.current;
    setCameraPending(true);
    try {
      // Explicit owner gesture: the browser asks permission only here.
      const stream = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: 'environment'}}});
      if (!mounted.current || privacyHidden || disabled || request !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (caught) {
      if (mounted.current && request === cameraRequestRef.current) {
        setCameraError(caught?.name === 'NotAllowedError'
          ? 'No se autorizó la cámara. Habilitá el permiso en Chrome o elegí una imagen.'
          : 'No se pudo abrir la cámara. Podés elegir una imagen de tu galería.');
      }
    } finally {
      if (mounted.current && request === cameraRequestRef.current) setCameraPending(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Esperá a que la cámara muestre una imagen para sacar la foto.');
      return;
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!mounted.current || privacyHidden || !blob) {
        if (!blob && mounted.current) setCameraError('No se pudo capturar la foto. Probá nuevamente.');
        return;
      }
      setFile(new File([blob], 'ticket-capturado.jpg', {type: 'image/jpeg'}));
      setError('');
      setStatus('idle');
    }, 'image/jpeg', 0.86);
    stopCamera();
  };

  const recognize = async () => {
    if (!file || disabled || hiddenRef.current || status === 'loading' || status === 'reading') return;
    let reader;
    let stage = 'loading';
    setStatus('loading');
    setError('');
    setProgress(0);
    try {
      let result;
      if (engine === 'compatible') {
        // Tesseract is a separate browser worker, so a broken ONNX/WASM
        // backend cannot prevent mobile users from reading a screenshot.
        const {recognizeWithCompatibleOcr} = await import('../utils/localOcrFallback');
        result = await recognizeWithCompatibleOcr(file, {
          onProgress: (percent) => {
            if (mounted.current && !hiddenRef.current) setProgress(percent);
          },
          onReading: () => {
            stage = 'reading';
            if (mounted.current && !hiddenRef.current) setStatus('reading');
          },
        });
      } else {
        // Keep runonweb available for users who explicitly choose advanced OCR.
        const { OCR } = await import('../generated/browser-ai/ocr');
        reader = new OCR({
          size: modelSize,
          device: mobileBrowser() ? 'wasm' : 'auto',
          onProgress: (info) => {
            if (mounted.current && !hiddenRef.current && typeof info.progress === 'number') {
              setProgress(Math.min(100, Math.max(0, Math.round(info.progress))));
            }
          },
        });
        await reader.load();
        if (!mounted.current || hiddenRef.current) return;
        setStatus('reading');
        stage = 'reading';
        result = await reader.read(file);
      }
      if (!mounted.current || hiddenRef.current) return;
      if (!result.text?.trim()) throw new Error('No pudimos leer texto de esta captura.');
      onRecognized({ text: result.text, lines: result.lines || [] });
      setStatus('done');
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (caught) {
      if (mounted.current && !hiddenRef.current) {
        setStatus('error');
        setError(engine === 'compatible' && !String(caught?.message || '').includes('No pudimos leer texto')
          ? '[OCR-COMPAT] El lector compatible no pudo procesar esta foto. Probá nuevamente o elegí el motor avanzado.'
          : ocrFailureMessage(caught, stage));
      }
    } finally {
      if (reader) await reader.dispose().catch(() => {});
    }
  };

  const working = status === 'loading' || status === 'reading';
  return <section aria-label='Lectura local de capturas' className='space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-50'>
    <div className='flex items-start gap-2'>
      <FiShield aria-hidden='true' className='mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400'/>
      <p className='text-xs text-slate-700 dark:text-slate-200'>Lector local v3 · {engine === 'compatible' ? 'Modo compatible con celulares: el motor y el idioma español se descargan la primera vez.' : `Modo avanzado: modelo ${modelSize === 'tiny' ? '6 MB' : '31 MB'}.`} Tu imagen no se envía ni se guarda.</p>
    </div>
    {privacyHidden ? (
      <p role='status' className='text-sm font-semibold text-amber-700 dark:text-amber-300'>Mostrá los importes para analizar y revisar una captura.</p>
    ) : <>
      {allowCamera && <div className='space-y-2'>
        <button type='button' onClick={openCamera} disabled={disabled || working || cameraOpen || cameraPending} className={action}>
          {cameraPending ? <FiLoader className='animate-spin' aria-hidden='true'/> : <FiCamera aria-hidden='true'/>}
          {cameraPending ? 'Solicitando permiso…' : 'Abrir cámara para sacar foto'}
        </button>
        <input ref={cameraInputRef} aria-label='Tomar foto con cámara del dispositivo' type='file' accept='image/*' capture='environment'
          className='sr-only' tabIndex={-1} onChange={chooseFile}/>
        {cameraOpen && <div className='space-y-2 rounded-xl border border-slate-300 bg-slate-950 p-2 dark:border-slate-600'>
          <video ref={videoRef} muted playsInline autoPlay aria-label='Vista previa de la cámara' className='max-h-64 w-full rounded-lg object-contain'/>
          <div className='flex flex-wrap gap-2'>
            <button type='button' onClick={capturePhoto} className={action}><FiCamera aria-hidden='true'/> Tomar foto</button>
            <button type='button' onClick={stopCamera} className={action}><FiX aria-hidden='true'/> Cerrar cámara</button>
          </div>
        </div>}
        {cameraError && <p role='alert' className='text-xs text-rose-700 dark:text-rose-300'>{cameraError}</p>}
      </div>}
      <label className='block text-sm font-semibold text-slate-900 dark:text-slate-50'>{allowCamera ? 'O elegir foto de galería' : 'Elegir captura'} (PNG, JPG o WEBP)
        <input ref={inputRef} aria-label='Elegir captura para lectura local' type='file' accept='image/png,image/jpeg,image/webp' onChange={chooseFile}
          className='mt-2 block min-h-[44px] w-full min-w-0 cursor-pointer text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:font-semibold file:text-violet-800 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-violet-200'
          disabled={disabled || working}/>
      </label>
      <label className='flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200'>Modo de lectura
        <select aria-label='Modo de lectura OCR' value={engine} onChange={(event) => {setEngine(event.target.value); setStatus('idle'); setError(''); setProgress(0);}} disabled={working}
          className='min-h-[44px] w-full max-w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50'>
          <option value='compatible'>Compatible con celulares · recomendado</option>
          <option value='advanced'>Avanzado · ONNX experimental</option>
        </select>
      </label>
      {engine === 'advanced' && <label className='flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200'>Precisión del modelo
        <select aria-label='Precisión del modelo OCR' value={modelSize} onChange={(event) => setModelSize(event.target.value)} disabled={working}
          className='min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50'>
          <option value='tiny'>Liviano · 6 MB</option><option value='small'>Más precisión · 31 MB</option>
        </select>
      </label>}
      {file && <p className='flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300'><FiImage aria-hidden='true'/> <span className='min-w-0 break-all'>{file.name}</span></p>}
      <button type='button' onClick={recognize} disabled={!file || disabled || working} className={action}>
        {working ? <FiLoader aria-hidden='true' className='animate-spin motion-reduce:animate-none'/> : <FiUploadCloud aria-hidden='true'/>}
        {status === 'loading' ? 'Preparando modelo…' : status === 'reading' ? 'Leyendo captura…' : 'Leer captura en este dispositivo'}
      </button>
      {status === 'loading' && <div role='status' className='space-y-1 text-xs text-slate-600 dark:text-slate-300'>
        <p>Preparación del lector: {progress}%</p>
        <progress aria-label='Progreso de preparación del lector OCR' value={progress} max='100' className='h-2 w-full accent-violet-600'/>
      </div>}
      {status === 'reading' && <p role='status' className='text-xs text-slate-600 dark:text-slate-300'>Reconociendo texto. No cierres esta ventana todavía.</p>}
      {status === 'done' && <p role='status' className='text-xs font-semibold text-emerald-700 dark:text-emerald-400'>Texto detectado. Revisá cada cifra antes de aplicar cambios.</p>}
    </>}
    {error && !privacyHidden && <p role='alert' className='rounded-lg border border-rose-400/60 p-2 text-xs text-rose-700 dark:text-rose-300'>{error}</p>}
  </section>;
}
