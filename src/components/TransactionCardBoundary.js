import React from 'react';

/** A single legacy/corrupt record must never take down all of Transactions. */
export default class TransactionCardBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Do not log the record, its identifier or the exception message: these
    // can contain private financial information. The page remains available.
    console.error('[ltc-transaction-card] render failed', {
      type: /^[A-Za-z]+Error$/.test(error?.name || '') ? error.name : 'Error',
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role='alert' className='ltc-transaction-card mb-3 rounded-2xl border border-amber-400 bg-white p-4 text-slate-900 dark:border-amber-600 dark:bg-slate-800 dark:text-slate-50'>
        <p className='font-semibold'>No pudimos mostrar un movimiento</p>
        <p className='mt-1 text-sm text-slate-700 dark:text-slate-200'>Los demás movimientos siguen disponibles. No se modificaron tus datos.</p>
        <button type='button' onClick={() => this.setState({ failed: false })}
          className='mt-3 min-h-[44px] rounded-xl border border-violet-500 px-4 py-2 text-sm font-semibold text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-200'>
          Reintentar movimiento
        </button>
      </div>
    );
  }
}
