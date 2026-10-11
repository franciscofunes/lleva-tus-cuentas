import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TransactionsExportReady from './TransactionsExportReady';

jest.mock('../utils/transactionsPdf', () => ({
  buildTransactionsPdf: jest.fn(() => new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' })),
}));

const prepared = {
  count: 2408,
  filename: 'transacciones-ltc-v2-2026-10-10-2408-movimientos.xlsx',
  csvFilename: 'transacciones-ltc-v2-2026-10-10-2408-movimientos.csv',
  xlsxUrl: 'blob:ltc-excel-file',
  csvUrl: 'blob:ltc-csv-file',
  xlsxBlob: new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  csvBlob: new Blob(['test'], { type: 'text/csv;charset=utf-8' }),
  pdfSource: { docs: [{ id: 1 }], categories: [], filters: { period: 'month' } },
};

let originalCreate, originalRevoke, originalShare, originalCanShare;
beforeEach(() => {
  originalCreate = URL.createObjectURL;
  originalRevoke = URL.revokeObjectURL;
  originalShare = navigator.share;
  originalCanShare = navigator.canShare;
  URL.createObjectURL = jest.fn(() => 'blob:ltc-pdf-file');
  URL.revokeObjectURL = jest.fn();
});
afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  Object.defineProperty(navigator, 'share', { configurable: true, value: originalShare });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: originalCanShare });
});

test('opens a general LTC$ modal with persistent Excel/CSV native links', () => {
  render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
  const dialog = screen.getByRole('dialog', { name: 'Opciones de exportación' });
  expect(dialog).toContainElement(screen.getByRole('region', { name: 'Archivo de transacciones preparado' }));
  expect(screen.getByRole('heading', { name: 'Exportar movimientos' })).toBeInTheDocument();
  expect(screen.getAllByText(/LTC\$/).length).toBeGreaterThan(0);
  expect(screen.getByText(/2408 movimientos/)).toBeInTheDocument();
  const excel = screen.getByRole('link', { name: /Descargar Excel/ });
  expect(excel).toHaveAttribute('href', prepared.xlsxUrl);
  expect(excel).toHaveAttribute('download', prepared.filename);
  expect(screen.getByRole('link', { name: /Descargar CSV/ })).toHaveAttribute('href', prepared.csvUrl);
  expect(screen.getByRole('button', { name: /Preparar PDF/ })).toBeInTheDocument();
  expect(screen.getByLabelText('Formato para compartir')).toHaveValue('xlsx');
  expect(screen.getByText(/Instagram y Facebook pueden no aceptar/)).toBeInTheDocument();
});

test('PDF is generated only after explicitly tapping prepare, then downloadable without upload', async () => {
  const { buildTransactionsPdf } = require('../utils/transactionsPdf');
  buildTransactionsPdf.mockClear();
  const { unmount } = render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
  expect(buildTransactionsPdf).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Preparar PDF' }));
  await waitFor(() => expect(screen.getByRole('link', { name: /Descargar PDF/ })).toBeInTheDocument());
  expect(buildTransactionsPdf).toHaveBeenCalledWith(prepared.pdfSource.docs, [], prepared.pdfSource.filters);
  expect(screen.getByRole('link', { name: /Descargar PDF/ })).toHaveAttribute('download', prepared.filename.replace('.xlsx', '.pdf'));
  fireEvent.click(screen.getByRole('link', { name: /Descargar PDF/ }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ltc-pdf-file');
});

test('sharing PDF without preparing it first gives actionable feedback', async () => {
  render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Formato para compartir'), { target: { value: 'pdf' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compartir con otra aplicación' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Primero tocá Preparar PDF'));
});

test('native share passes the selected Excel file with LTC$ title to Android', async () => {
  const share = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn(() => true) });
  render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Formato para compartir'), { target: { value: 'xlsx' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compartir con otra aplicación' }));
  await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
    title: 'LTC$ · Movimientos',
    files: [expect.objectContaining({ name: prepared.filename })],
  })));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Confirmá el envío'));
});

test('unsupported native file sharing provides fallback instead of doing nothing', async () => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: jest.fn() });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn(() => false) });
  render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Formato para compartir'), { target: { value: 'csv' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compartir con otra aplicación' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Descargalo y adjuntalo'));
  expect(navigator.share).not.toHaveBeenCalled();
});

test('rejected share is visible, cancelled share is treated separately', async () => {
  const share = jest.fn().mockRejectedValue({ name: 'NotAllowedError' });
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn(() => true) });
  render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Formato para compartir'), { target: { value: 'xlsx' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compartir con otra aplicación' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Android no pudo abrir'));
  share.mockRejectedValue({ name: 'AbortError' });
  fireEvent.click(screen.getByRole('button', { name: 'Compartir con otra aplicación' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Se canceló'));
});

test('closing the overlay cleans up without falsely claiming file download', () => {
  const onClose = jest.fn();
  render(<TransactionsExportReady prepared={prepared} onClose={onClose} />);
  fireEvent.click(screen.getByRole('link', { name: /Descargar Excel/ }));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('modal remains detached from dashboard and supports Escape/outside click', () => {
  const onClose = jest.fn();
  const { rerender } = render(
    <div data-testid='dashboard-view'>
      <p>Movimientos de un vistazo</p>
      <TransactionsExportReady prepared={prepared} onClose={onClose} />
      <p>Tu economía en ARS y USD</p>
    </div>
  );
  expect(screen.getByRole('dialog').closest('.fixed.inset-0')).toBeInTheDocument();
  expect(screen.getByText('Tu economía en ARS y USD')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  rerender(<TransactionsExportReady prepared={null} onClose={onClose} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('no modal without a prepared file', () => {
  render(<TransactionsExportReady prepared={null} onClose={jest.fn()} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('a prepared PDF can also be shared as a real file', async () => {
  const share = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: jest.fn(() => true) });
  render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Preparar PDF' }));
  await waitFor(() => expect(screen.getByRole('link', { name: /Descargar PDF/ })).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Formato para compartir'), { target: { value: 'pdf' } });
  fireEvent.click(screen.getByRole('button', { name: 'Compartir con otra aplicación' }));
  await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
    files: [expect.objectContaining({ name: expect.stringMatching(/[.]pdf$/), type: 'application/pdf' })],
  })));
});
