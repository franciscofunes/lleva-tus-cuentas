import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PortfolioExportReady from './PortfolioExportReady';

jest.mock('../utils/portfolioPdf', () => ({
  buildPortfolioPdf: jest.fn(() => new Blob(['%PDF-1.4'], { type: 'application/pdf' })),
}));

const positions = [{ id: 'one', name: 'Cuenta remunerada', institution: 'Banco', currency: 'USD', balance: 450 }];
const snapshots = [{ positionId: 'one', balance: 430, currency: 'USD' }];
const prepared = {
  count: 1,
  filename: 'portfolio-ltc-2026-10-11-1-posiciones.xlsx',
  csvFilename: 'portfolio-ltc-2026-10-11-1-posiciones.csv',
  xlsxUrl: 'blob:portfolio-excel',
  csvUrl: 'blob:portfolio-csv',
  xlsxBlob: new Blob(['excel'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  csvBlob: new Blob(['csv'], { type: 'text/csv;charset=utf-8' }),
  pdfSource: { positions, snapshots },
};
const oldCreate = URL.createObjectURL;
const oldRevoke = URL.revokeObjectURL;
const oldShare = navigator.share;
const oldCanShare = navigator.canShare;
beforeEach(() => {
  URL.createObjectURL = jest.fn(() => 'blob:portfolio-pdf');
  URL.revokeObjectURL = jest.fn();
});
afterEach(() => {
  URL.createObjectURL = oldCreate;
  URL.revokeObjectURL = oldRevoke;
  Object.defineProperty(navigator, 'share', { configurable: true, value: oldShare });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: oldCanShare });
});

test('portfolio uses same export-modal structure but with its own title, count and native downloads', () => {
  render(<PortfolioExportReady prepared={prepared} onClose={jest.fn()} />);
  expect(screen.getByRole('dialog', { name: 'Opciones de exportación' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Archivo de portfolio preparado' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Exportar portfolio' })).toBeInTheDocument();
  expect(screen.getByText(/1 posiciones de tu portfolio/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Descargar Excel/ })).toHaveAttribute('href', prepared.xlsxUrl);
  expect(screen.getByRole('link', { name: /Descargar CSV/ })).toHaveAttribute('download', prepared.csvFilename);
  expect(screen.getByLabelText('Formato para compartir')).toHaveValue('xlsx');
  expect(screen.getByText(/importes reales aunque estén ocultos/)).toBeInTheDocument();
});

test('portfolio PDF is lazy-built with the exact positions and snapshots and the modal revokes it', async () => {
  const { buildPortfolioPdf } = require('../utils/portfolioPdf');
  buildPortfolioPdf.mockClear();
  const { unmount } = render(<PortfolioExportReady prepared={prepared} onClose={jest.fn()} />);
  expect(buildPortfolioPdf).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Preparar PDF' }));
  await waitFor(() => expect(screen.getByRole('link', { name: /Descargar PDF/ })).toBeInTheDocument());
  expect(buildPortfolioPdf).toHaveBeenCalledWith(positions, snapshots);
  expect(screen.getByRole('link', { name: /Descargar PDF/ })).toHaveAttribute('download', expect.stringMatching(/portfolio-ltc-.*[.]pdf$/));
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:portfolio-pdf');
});

test('portfolio shares a real Excel file through the same Android native API', async () => {
  const share = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn(() => true) });
  render(<PortfolioExportReady prepared={prepared} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartir con otra aplicación' }));
  await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
    title: 'LTC$ · Portfolio',
    files: [expect.objectContaining({ name: prepared.filename })],
  })));
});

test('portfolio shares clear errors on unsupported browsers, without uploading data', async () => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: jest.fn() });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn(() => false) });
  render(<PortfolioExportReady prepared={prepared} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartir con otra aplicación' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Descargalo y adjuntalo'));
  expect(navigator.share).not.toHaveBeenCalled();
});

test('portfolio modal closes with callback; no modal while unprepared', () => {
  const onClose = jest.fn();
  const { rerender } = render(<PortfolioExportReady prepared={prepared} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  rerender(<PortfolioExportReady prepared={null} onClose={onClose} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
