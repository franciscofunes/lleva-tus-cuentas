import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ReceiptDetailsView from './ReceiptDetailsView';

const evidence = {
  documents:[{type:'non_fiscal',operationNumber:'1-72',issuedAt:'2026-11-07'}],
  items:[{description:'MILA CARNE OFERTA',quantity:2.015,total:18034}],
};

test('receipt numbers and line items follow native currency and current theme', () => {
  render(<ReceiptDetailsView value={evidence} currency='USD'/>);
  const details = screen.getByLabelText('Comprobantes de la compra');
  expect(details).toHaveClass('bg-slate-50', 'dark:bg-slate-900/70');
  expect(screen.getByText(/Operación 1-72/)).toBeInTheDocument();
  expect(screen.getByText(/USD 18\.034/)).toBeInTheDocument();
});

test('privacy masks the entire evidence subtree, not just the amount', () => {
  const {rerender} = render(<ReceiptDetailsView value={evidence} hidden/>);
  expect(screen.queryByText(/MILA CARNE OFERTA/)).not.toBeInTheDocument();
  expect(screen.queryByText(/1-72/)).not.toBeInTheDocument();
  rerender(<ReceiptDetailsView value={evidence}/>);
  expect(screen.getByText(/MILA CARNE OFERTA/)).toBeInTheDocument();
});
