import React from 'react';
import { Link } from 'react-router-dom';

/** Keep the navigation usable if a malformed transaction causes a render error. */
export default class RouteErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Never log account, movement or other personal financial data.
    console.error('[ltc-route] render failure', {
      route: window.location.pathname,
      name: error?.name || 'Error',
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className='min-h-[calc(100dvh-72px)] bg-slate-50 px-4 py-12 text-slate-900 dark:bg-gray-900 dark:text-slate-100'>
        <section role='alert' className='mx-auto max-w-lg rounded-2xl border border-amber-300 bg-white p-6 shadow-sm dark:border-amber-700 dark:bg-slate-800'>
          <h1 className='text-xl font-extrabold'>No pudimos mostrar esta sección</h1>
          <p className='mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300'>
            Ocurrió un error al cargar la información. Tus movimientos y tu portfolio no se modificaron.
          </p>
          <div className='mt-5 flex flex-wrap gap-3'>
            <Link to='/portfolio' className='inline-flex min-h-[44px] items-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white'>
              Ir al portfolio
            </Link>
            <button type='button' onClick={() => window.location.reload()}
              className='min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-600'>
              Reintentar carga
            </button>
          </div>
        </section>
      </main>
    );
  }
}
