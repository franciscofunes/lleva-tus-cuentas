import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import SearchBar from './SearchBar';

const categories = [
  { name: 'Resumen tarjeta 💳', isExpense: true },
  { name: 'Alimentación', isExpense: true },
];

function TestSearchBar({ onViewAll = () => {}, selectedFilter = 'month' }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('all');
  return (
    <SearchBar
      query={query}
      onQueryChange={setQuery}
      selectedCategory={category}
      onCategoryChange={setCategory}
      transactionType={type}
      onTypeChange={setType}
      categories={categories}
      resultCount={2}
      totalCount={12}
      selectedFilter={selectedFilter}
      onClear={() => { setQuery(''); setCategory(''); setType('all'); }}
      onViewAll={onViewAll}
    />
  );
}

describe('Transactions live search interface', () => {
  it('searches while typing without a submit and clears only the text', () => {
    render(<TestSearchBar />);
    const search = screen.getByRole('searchbox', { name: 'Buscar movimientos' });
    expect(search).toHaveAttribute('placeholder', expect.stringContaining('Nombre'));
    fireEvent.change(search, { target: { value: 'Ciudad' } });
    expect(search).toHaveValue('Ciudad');
    fireEvent.click(screen.getByRole('button', { name: 'Borrar texto de búsqueda' }));
    expect(search).toHaveValue('');
    expect(screen.getByText('2 de 12 movimientos')).toBeInTheDocument();
  });

  it('dismisses Android search keyboard on Enter and clears search on Escape', () => {
    render(<TestSearchBar />);
    const input = screen.getByRole('searchbox');
    input.focus();
    fireEvent.change(input, { target: { value: 'Visa' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(input).toHaveValue('Visa');
    expect(input).not.toHaveFocus();
    input.focus();
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    expect(input).toHaveValue('');
    expect(input).not.toHaveFocus();
  });

  it('keeps filters independent and clears them together without changing period', () => {
    render(<TestSearchBar />);
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'Alimentación' } });
    fireEvent.change(screen.getByLabelText('Tipo de movimiento'), { target: { value: 'expense' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cafe' } });
    expect(screen.getByLabelText('Categoría')).toHaveValue('Alimentación');
    expect(screen.getByLabelText('Tipo de movimiento')).toHaveValue('expense');
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByLabelText('Categoría')).toHaveValue('');
    expect(screen.getByLabelText('Tipo de movimiento')).toHaveValue('all');
    expect(screen.getByText('mes')).toBeInTheDocument();
  });

  it('expands to all history only when user requests it', () => {
    const onViewAll = jest.fn();
    render(<TestSearchBar onViewAll={onViewAll} />);
    expect(onViewAll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver todo el historial' }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('hides all-history action when already showing everything', () => {
    render(<TestSearchBar selectedFilter='total' />);
    expect(screen.queryByRole('button', { name: 'Ver todo el historial' })).not.toBeInTheDocument();
  });
});

function CollapsibleSortFixture() {
  const [collapsed, setCollapsed] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [direction, setDirection] = useState('desc');
  const [query, setQuery] = useState('');
  return (
    <SearchBar query={query} onQueryChange={setQuery}
      selectedCategory='' onCategoryChange={() => {}}
      transactionType='all' onTypeChange={() => {}}
      categories={categories} resultCount={5} totalCount={10}
      selectedFilter='month' onClear={() => setQuery('')}
      onViewAll={() => {}} collapsed={collapsed}
      onToggle={() => setCollapsed((current) => !current)}
      sortBy={sortBy} onSortByChange={setSortBy}
      sortDirection={direction} onSortDirectionChange={setDirection} />
  );
}

describe('collapsible transaction search and sorting', () => {
  it('starts compact without hiding the count and historical scope', () => {
    render(<CollapsibleSortFixture />);
    const toggle = screen.getByRole('button', { name: 'Expandir búsqueda y filtros' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('5 de 10 movimientos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver todo el historial' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('changes both sort criterion and direction then keeps selection after collapse', () => {
    render(<CollapsibleSortFixture />);
    fireEvent.click(screen.getByRole('button', { name: 'Expandir búsqueda y filtros' }));
    expect(screen.getByRole('button', { name: 'Contraer búsqueda y filtros' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'amount' } });
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('amount');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a orden ascendente' }));
    expect(screen.getByRole('button', { name: 'Cambiar a orden descendente' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'banco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Contraer búsqueda y filtros' }));
    expect(screen.getByText(/Filtros aplicados.*Importe ARS.*Ascendente/)).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir búsqueda y filtros' }));
    expect(screen.getByRole('searchbox')).toHaveValue('banco');
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('amount');
  });
});
