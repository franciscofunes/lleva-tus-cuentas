import React from 'react';

// Preserve navigation and the other financial widgets when one data-heavy
// component cannot render a legacy record. Never log financial values.
export default class FinancialWidgetBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('[ltc-widget] render failed', {
      area: this.props.area,
      type: /^[A-Za-z]+Error$/.test(error?.name || '') ? error.name : 'Error',
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role='alert' className='min-w-0 rounded-xl border border-amber-400 bg-amber-50 p-4 text-slate-900 dark:border-amber-600 dark:bg-slate-900/70 dark:text-slate-50'>
        <p className='font-semibold'>No pudimos mostrar {this.props.label || 'este panel'}</p>
        <p className='mt-1 text-sm text-slate-700 dark:text-slate-200'>Podés seguir usando las demás secciones. Tus datos no se modificaron.</p>
        <button type='button' onClick={() => this.setState({failed:false})}
          className='mt-3 min-h-[44px] rounded-xl border border-violet-500 px-4 py-2 text-sm font-semibold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200'>
          Reintentar panel
        </button>
      </div>
    );
  }
}
