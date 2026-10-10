import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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
  expect(screen.getByRole('region', { name: 'Archivo de transacciones preparado' })).toBeInTheDocument();
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
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar opciones de descarga' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('does not display a download section until a file was prepared', () => {
  render(<TransactionsExportReady prepared={null} onClose={jest.fn()} />);
  expect(screen.queryByRole('region', { name: 'Archivo de transacciones preparado' })).not.toBeInTheDocument();
});
