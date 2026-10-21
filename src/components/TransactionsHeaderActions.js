import React from 'react';
import FinancialHeaderActions from './FinancialHeaderActions';

// Keep public props for existing Dashboard and regression tests.
export default function TransactionsHeaderActions({ onAdd, valuesVisible, onTogglePrivacy, visibleIcon, hiddenIcon }) {
  return (
    <FinancialHeaderActions
      currentSection='transactions'
      primaryLabel='Agregar movimiento'
      onPrimaryAction={onAdd}
      valuesVisible={valuesVisible}
      onTogglePrivacy={onTogglePrivacy}
      visibleIcon={visibleIcon}
      hiddenIcon={hiddenIcon}
    />
  );
}
