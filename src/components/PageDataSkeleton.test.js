import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PageDataSkeleton from './PageDataSkeleton';

test('transaction loader shows actual content-shaped cards and accessible loading status', () => {
  const { container } = render(<PageDataSkeleton variant='transactions' />);
  expect(screen.getByRole('status', { name: 'Cargando transacciones' })).toBeInTheDocument();
  expect(screen.getByText('Cargando datos de transacciones')).toHaveClass('sr-only');
  expect(container.querySelectorAll('section').length).toBe(3);
  expect(container.querySelector('.motion-reduce\\:animate-none')).toBeInTheDocument();
});

test('portfolio loader shares neutral colors, cards, and reduced motion support', () => {
  const { container } = render(<PageDataSkeleton variant='portfolio' />);
  expect(screen.getByRole('status', { name: 'Cargando portfolio' })).toBeInTheDocument();
  expect(screen.getByText('Cargando datos del portfolio')).toHaveClass('sr-only');
  expect(container.querySelectorAll('section').length).toBe(6);
  expect(container.querySelectorAll('.bg-white').length).toBeGreaterThan(0);
  // No fake zero balances or placeholder prices appear before Firestore responds.
  expect(container.textContent).not.toContain('$0');
});

test('portfolio page loader does not duplicate KPI cards when the overview already renders KPI skeletons', () => {
  const { container } = render(<PageDataSkeleton variant='portfolio' withKpiCards={false} />);
  expect(screen.getByRole('status', { name: 'Cargando portfolio' })).toBeInTheDocument();
  // The overview widget owns three KPI placeholders; the remaining loader
  // only draws the summary, chart and holdings area.
  expect(container.querySelectorAll('section').length).toBe(3);
});
