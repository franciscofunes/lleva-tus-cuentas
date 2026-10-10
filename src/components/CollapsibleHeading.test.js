import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CollapsibleSection from './CollapsibleSection';
import FinancialOverviewPanel from './FinancialOverviewPanel';
import {
  COLLAPSIBLE_HEADER_STYLES,
  CollapsibleHeading,
  CollapsibleChevron,
} from './CollapsibleHeading';

test('portfolio summary and tools share identical heading, eyebrow and paragraph typography', () => {
  render(
    <>
      <CollapsibleSection
        id='portfolio-summary'
        eyebrow='Resumen'
        title='Resumen por moneda'
        description='Saldos, rendimiento estimado y tasa ponderada por moneda.'
        collapsed={false}
        onToggle={() => {}}
      ><div>Resumen cargado</div></CollapsibleSection>
      <FinancialOverviewPanel
        id='portfolio-overview'
        eyebrow='Herramientas y métricas'
        title='Portfolio de un vistazo'
        description='Exportá tus activos o prepará un análisis para Lita.'
        onToggle={() => {}}
      />
    </>
  );

  const summaryTitle = screen.getByRole('heading', { name: 'Resumen por moneda' });
  const overviewTitle = screen.getByRole('heading', { name: 'Portfolio de un vistazo' });
  expect(summaryTitle).toHaveClass(...COLLAPSIBLE_HEADER_STYLES.title.split(' '));
  expect(overviewTitle.className).toBe(summaryTitle.className);

  const summaryEyebrow = screen.getByText('Resumen');
  const overviewEyebrow = screen.getByText('Herramientas y métricas');
  expect(overviewEyebrow.className).toBe(summaryEyebrow.className);
  expect(overviewEyebrow).toHaveClass(...COLLAPSIBLE_HEADER_STYLES.eyebrow.split(' '));

  const summaryParagraph = screen.getByText('Saldos, rendimiento estimado y tasa ponderada por moneda.');
  const overviewParagraph = screen.getByText('Exportá tus activos o prepará un análisis para Lita.');
  expect(overviewParagraph.className).toBe(summaryParagraph.className);
  expect(overviewParagraph).toHaveClass(...COLLAPSIBLE_HEADER_STYLES.description.split(' '));

  const summaryButton = screen.getByRole('button', { name: /Resumen por moneda/ });
  const toolsButton = screen.getByRole('button', { name: /Portfolio de un vistazo/ });
  expect(summaryButton).toHaveAttribute('aria-expanded', 'true');
  expect(toolsButton).toHaveAttribute('aria-expanded', 'true');
  expect(summaryButton.querySelector('svg').getAttribute('class')).toBe(
    toolsButton.querySelector('svg').getAttribute('class')
  );
});

test('detail and section headings use identical typography with or without an eyebrow', () => {
  const { rerender } = render(
    <CollapsibleHeading title='Evolución de la cuotaparte' description='Historial de valuación.' />
  );
  expect(screen.getByRole('heading', { name: 'Evolución de la cuotaparte' }))
    .toHaveClass(...COLLAPSIBLE_HEADER_STYLES.title.split(' '));
  expect(screen.getByText('Historial de valuación.'))
    .toHaveClass(...COLLAPSIBLE_HEADER_STYLES.description.split(' '));

  rerender(<CollapsibleHeading eyebrow='Resumen' title='Resumen por moneda' description='Detalle' />);
  expect(screen.getByRole('heading', { name: 'Resumen por moneda' }))
    .toHaveClass('mt-1');
});

test('chevron rotates consistently and honors reduced-motion settings', () => {
  const { rerender, container } = render(<CollapsibleChevron expanded={false} />);
  const collapsedClass = container.querySelector('svg').getAttribute('class');
  expect(collapsedClass).not.toContain('rotate-180');
  expect(collapsedClass).toContain('motion-reduce:transition-none');
  rerender(<CollapsibleChevron expanded />);
  expect(container.querySelector('svg')).toHaveClass('rotate-180');
});
