import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TransactionsExportReady from './TransactionsExportReady';

const prepared = {
  count: 2408,
  filename: 'transacciones-ltc-v2-2026-10-10-2408-movimientos.xlsx',
  csvFilename: 'transacciones-ltc-v2-2026-10-10-2408-movimientos.csv',
  xlsxUrl: 'blob:ltc-excel-file',
  csvUrl: 'blob:ltc-csv-file',
  xlsxBlob: new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
};

test('prepares persistent native links to save Excel and CSV, without falsely claiming success', () => {
  render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
  const dialog = screen.getByRole('dialog', { name: 'Opciones de exportación' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toContainElement(screen.getByRole('region', { name: 'Archivo de transacciones preparado' }));
  expect(screen.getByRole('heading', { name: 'Exportar movimientos' })).toBeInTheDocument();
  expect(screen.getByText(/2408 movimientos/)).toBeInTheDocument();
  const excel = screen.getByRole('link', { name: /Descargar Excel/ });
  expect(excel).toHaveAttribute('href', prepared.xlsxUrl);
  expect(excel).toHaveAttribute('download', prepared.filename);
  const csv = screen.getByRole('link', { name: /Descargar CSV/ });
  expect(csv).toHaveAttribute('href', prepared.csvUrl);
  expect(csv).toHaveAttribute('download', prepared.csvFilename);
  expect(screen.getByText(/LTC no puede confirmar/)).toBeInTheDocument();
  expect(screen.queryByText(/Excel v2 generado/)).not.toBeInTheDocument();
});

test('the user can dismiss the prepared download and cleanup its resources', () => {
  const onClose = jest.fn();
  render(<TransactionsExportReady prepared={prepared} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('does not display a download section until a file was prepared', () => {
  render(<TransactionsExportReady prepared={null} onClose={jest.fn()} />);
  expect(screen.queryByRole('dialog', { name: 'Opciones de exportación' })).not.toBeInTheDocument();
});

test('export options are an overlay, not a new inline widget that changes the dashboard layout', () => {
  const { container } = render(
    <div data-testid='dashboard-view'>
      <p>Movimientos de un vistazo</p>
      <TransactionsExportReady prepared={prepared} onClose={jest.fn()} />
      <p>Tu economía en ARS y USD</p>
    </div>
  );
  const dialog = screen.getByRole('dialog', { name: 'Opciones de exportación' });
  expect(dialog.closest('.fixed.inset-0')).toBeInTheDocument();
  expect(dialog).toHaveClass('dark:bg-slate-900');
  expect(container.querySelectorAll('[role="region"][aria-label="Archivo de transacciones preparado"]')).toHaveLength(1);
  expect(screen.getByText('Tu economía en ARS y USD')).toBeInTheDocument();
});

test('Escape and outside click both close the export modal using the supplied cleanup callback', () => {
  const onClose = jest.fn();
  const { rerender } = render(<TransactionsExportReady prepared={prepared} onClose={onClose} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  rerender(<TransactionsExportReady prepared={null} onClose={onClose} />);
  expect(screen.queryByRole('dialog', { name: 'Opciones de exportación' })).not.toBeInTheDocument();
  rerender(<TransactionsExportReady prepared={prepared} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('download links stay available without dismissing the modal or claiming that a download succeeded', () => {
  const onClose = jest.fn();
  render(<TransactionsExportReady prepared={prepared} onClose={onClose} />);
  fireEvent.click(screen.getByRole('link', { name: /Descargar Excel/ }));
  expect(screen.getByRole('dialog', { name: 'Opciones de exportación' })).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test('native Android file sharing remains an optional third action', async () => {
  const originalShare = navigator.share;
  const originalCanShare = navigator.canShare;
  const share = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: jest.fn().mockReturnValue(true), configurable: true });
  try {
    render(<TransactionsExportReady prepared={prepared} onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Compartir / Guardar' }));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Movimientos de LTC',
      files: [expect.objectContaining({ name: prepared.filename })],
    })));
  } finally {
    Object.defineProperty(navigator, 'share', { value: originalShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: originalCanShare, configurable: true });
  }
});
