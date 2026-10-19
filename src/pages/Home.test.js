import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import fs from 'fs';
import path from 'path';

let mockCurrentUser = null;
jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ auth: { user: mockCurrentUser } }),
}));

const renderHome = () => render(<MemoryRouter><Home /></MemoryRouter>);

describe('LTC editorial landing', () => {
  beforeEach(() => { mockCurrentUser = null; });

  it('leads with a clear everyday finance promise, not AI-first language', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 }))
      .toHaveTextContent('Tus cuentas, un poco más claras.');
    expect(screen.getByRole('link', { name: /Empezar a organizar mis cuentas/i }))
      .toHaveAttribute('href', '/registrarse');
    expect(screen.getByRole('link', { name: /Ver cómo funciona/i }))
      .toHaveAttribute('href', '#como-funciona');
    expect(screen.getByRole('heading', { name: 'Cuando necesitás otra mirada.' })).toBeInTheDocument();
  });

  it('keeps authenticated CTAs routed to existing LTC modules', () => {
    mockCurrentUser = { uid: 'sample-user' };
    renderHome();
    expect(screen.getByRole('link', { name: /Ir a mis movimientos/i }))
      .toHaveAttribute('href', '/transacciones');
    expect(screen.getByRole('link', { name: /Ir al control de tarjetas/i }))
      .toHaveAttribute('href', '/bancos');
    expect(screen.getByRole('link', { name: /Abrir Lleva Tus Cuentas/i }))
      .toHaveAttribute('href', '/transacciones');
  });

  it('preserves every current product capability without a repetitive card grid', () => {
    const { container } = renderHome();
    [
      'Movimientos en ARS y USD',
      'Bancos y tarjetas organizados',
      'Inversiones y portfolio',
      'Resúmenes y capturas',
      'Vencimientos y recordatorios',
      'Mapa mundial de movimientos',
      'Gráficos, métricas y exportación',
    ].forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Que la tarjeta no te tome por sorpresa.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Un poco más que anotar gastos.' })).toBeInTheDocument();
    expect(container.querySelectorAll('#como-funciona article')).toHaveLength(3);
    expect(container.querySelectorAll('#como-funciona .rounded-3xl')).toHaveLength(0);
  });

  it('distinguishes illustrative amounts from actual user account data', () => {
    renderHome();
    expect(screen.getByText('Vista ilustrativa')).toBeInTheDocument();
    expect(screen.getByText(/No muestra datos reales de ninguna cuenta/)).toBeInTheDocument();
    expect(screen.getByText(/un ejemplo ilustrativo/)).toBeInTheDocument();
    expect(screen.getByText(/todavía no hay push con la app cerrada/)).toBeInTheDocument();
    expect(screen.queryByText(/ganancias garantizadas/i)).not.toBeInTheDocument();
  });

  it('supports light and dark themes with readable sections and visible focus styles', () => {
    const { container } = renderHome();
    expect(container.querySelector('main')).toHaveClass('bg-slate-50','dark:bg-gray-900');
    expect(container.querySelector('#conoce-lita')).toHaveClass('bg-white','dark:bg-gray-900');
    expect(screen.getByRole('link', { name: /Empezar a organizar mis cuentas/i }))
      .toHaveClass('bg-purple-600','text-white','focus-visible:ring-4');
    expect(screen.getByRole('contentinfo')).toHaveClass('dark:bg-gray-900');
  });

  it('keeps Lita as a supporting feature and gives useful prompts', () => {
    renderHome();
    expect(screen.getByText(/¿En qué categorías estoy gastando más/)).toBeInTheDocument();
    expect(screen.getByText(/¿Cómo se distribuyen mis inversiones/)).toBeInTheDocument();
    expect(screen.getByText(/¿Qué tope mensual me conviene para mis tarjetas/)).toBeInTheDocument();
    expect(screen.getByText(/LITA no reemplaza asesoramiento financiero profesional/)).toBeInTheDocument();
  });
});

describe('Landing finishing details', () => {
  it('labels its financial illustration and exposes the example progress to assistive technology', () => {
    const { container } = renderHome();
    const preview = container.querySelector('figure[aria-label="Vista ilustrativa del control de tarjetas"]');
    expect(preview).toBeInTheDocument();
    expect(preview.querySelector('figcaption')).toHaveTextContent('No muestra datos reales de ninguna cuenta');
    const progress = screen.getByRole('progressbar', { name: 'Presupuesto utilizado en el ejemplo' });
    expect(progress).toHaveAttribute('aria-valuenow', '72');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
  });

  it('keeps named anchors clear of the navbar and text links keyboard accessible', () => {
    const { container } = renderHome();
    ['como-funciona','control-de-tarjetas','conoce-lita'].forEach(id => {
      expect(container.querySelector('#' + id)).toHaveClass('scroll-mt-24');
    });
    expect(screen.getByRole('link', { name: /Ver cómo funciona/i })).toHaveClass('focus-visible:ring-2');
    expect(screen.getByRole('link', { name: /Empezar a organizar mis cuentas/i })).toHaveClass('w-full','sm:w-auto');
  });

  it('uses product-first footer and public share metadata without financial details', () => {
    renderHome();
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Movimientos, bancos, tarjetas e inversiones en un solo lugar.');
    const source = fs.readFileSync(path.join(process.cwd(),'public','index.html'),'utf8');
    expect(source).toContain('property="og:title"');
    expect(source).toContain('property="og:description"');
    expect(source).toContain('name="twitter:card"');
    expect(source).not.toContain('property="og:image"');
  });
});
