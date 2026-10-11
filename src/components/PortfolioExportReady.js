import React from 'react';
import ExportReadyModal from './ExportReadyModal';

const buildPdf = async (source) => {
  const { buildPortfolioPdf } = await import('../utils/portfolioPdf');
  return buildPortfolioPdf(source.positions, source.snapshots);
};

export default function PortfolioExportReady({ prepared, onClose }) {
  return (
    <ExportReadyModal prepared={prepared} onClose={onClose}
      title='Exportar portfolio'
      regionLabel='Archivo de portfolio preparado'
      shareTitle='LTC$ · Portfolio'
      description={(count) => `${count} posiciones de tu portfolio y su historial de verificaciones.`}
      buildPdf={buildPdf}
    />
  );
}
