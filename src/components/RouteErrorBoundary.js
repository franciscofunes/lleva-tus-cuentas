import React from 'react';
import { Link } from 'react-router-dom';

// React component names alone are enough to find a failing module. Never collect
// Firestore values, users, error messages, stack arguments or URLs with IDs.
const screenName = () => window.location.pathname === '/transacciones'
  ? 'transacciones' : window.location.pathname.startsWith('/portfolio') ? 'portfolio' : 'otra';
const componentNames = (stack = '') => String(stack).split('\n')
  .map((line) => line.match(/^\s*at ([A-Za-z_$][\w$]*)/))
  .filter(Boolean).slice(0, 5).map((match) => match[1]);

/** Keep the navigation usable if a malformed transaction causes a render error. */
export default class RouteErrorBoundary extends React.Component {
  state = { hasError: false, diagnostic: null };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const diagnostic = {
      screen: screenName(),
      type: /^[A-Za-z]+Error$/.test(error?.name || '') ? error.name : 'Error',
      components: componentNames(info?.componentStack),
    };
    // Local browser console only. Netlify build logs cannot see client exceptions.
    // The user may copy this sanitized diagnostic to report a problem.
    console.error('[ltc-route] render failure', diagnostic);
    this.setState({ diagnostic });
  }

  copyDiagnostic = async () => {
    const value = this.state.diagnostic || { screen: screenName(), type: 'Error', components: [] };
    try {
      await navigator.clipboard.writeText('LTC render diagnostic: ' + JSON.stringify(value));
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: false });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className='min-h-[calc(100dvh-72px)] bg-slate-50 px-4 py-12 text-slate-900 dark:bg-gray-900 dark:text-slate-100'>
        <section role='alert' className='mx-auto max-w-lg rounded-2xl border border-amber-300 bg-white p-6 shadow-sm dark:border-amber-700 dark:bg-slate-800'>
          <h1 className='text-xl font-extrabold'>No pudimos mostrar esta sección</h1>
          <p className='mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300'>
            Ocurrió un error al cargar la información. Tus movimientos y tu portfolio no se modificaron.
          </p>
          <p className='mt-2 text-xs text-slate-500 dark:text-slate-400'>
            Error técnico: {this.state.diagnostic?.type || 'Error'} · Componente: {this.state.diagnostic?.components?.[0] || 'sin identificar'}
          </p>
          <div className='mt-5 flex flex-wrap gap-3'>
            <Link to='/portfolio' className='inline-flex min-h-[44px] items-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white'>
              Ir al portfolio
            </Link>
            <button type='button' onClick={() => window.location.reload()}
              className='min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold dark:border-slate-600'>
              Reintentar carga
            </button>
            <button type='button' onClick={this.copyDiagnostic}
              className='min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600'>
              {this.state.copied ? 'Diagnóstico copiado' : 'Copiar diagnóstico'}
            </button>
          </div>
        </section>
      </main>
    );
  }
}
