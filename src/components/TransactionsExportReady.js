import React from 'react';
import ExportReadyModal from './ExportReadyModal';

const buildPdf = async (source) => {
  const { buildTransactionsPdf } = await import('../utils/transactionsPdf');
  return buildTransactionsPdf(source.docs, source.categories, source.filters);
};

export default function TransactionsExportReady({ prepared, onClose }) {
  return (
    <ExportReadyModal prepared={prepared} onClose={onClose}
      title='Exportar movimientos'
      regionLabel='Archivo de transacciones preparado'
      shareTitle='LTC$ · Movimientos'
      description={(count) => `${count} movimientos según los filtros seleccionados.`}
      buildPdf={buildPdf}
    />
  );
}
