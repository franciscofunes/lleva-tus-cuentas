import React from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CardStatementDetails from './CardStatementDetails'
import { firestore } from '../shared/config/firebase/firebase.config'

jest.mock('../shared/config/firebase/firebase.config', () => ({
  auth: { currentUser: { uid: 'alice' } },
  firestore: { collection: jest.fn() },
}))

const statement = {
  period: '2026-10',
  totals: { ARS: '48169.00', USD: '0.00' },
}
const purchases = [
  { merchant: 'Farmacity', category: 'Salud', date: '2026-08-27', amount: '35079.00', currency: 'ARS', includeInAnalytics: true },
  { merchant: 'Día Tienda', category: 'Alimentación', date: '2026-08-28', amount: '13090.00', currency: 'ARS', installment: '2 de 3', includeInAnalytics: true },
]

beforeEach(() => {
  const getItems = jest.fn().mockResolvedValue({
    docs: purchases.map((item) => ({ data: () => item })),
  })
  const statementRef = {
    collection: jest.fn(() => ({
      orderBy: jest.fn(() => ({ get: getItems })),
    })),
  }
  const getStatement = jest.fn().mockResolvedValue({
    empty: false,
    docs: [{ data: () => statement, ref: statementRef }],
  })
  firestore.collection.mockImplementation(() => ({
    doc: jest.fn(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({ get: getStatement })),
        })),
      })),
    })),
  }))
})

test('compact input filters statement purchases live, preserving full totals and count', async () => {
  render(<CardStatementDetails expenseId='expense1' />)
  fireEvent.click(screen.getByRole('button', { name: 'Ver consumos del resumen' }))
  expect(await screen.findByText('Farmacity')).toBeInTheDocument()
  expect(screen.getByText('Día Tienda')).toBeInTheDocument()
  expect(screen.getByText(/2 operaciones vinculadas/)).toBeInTheDocument()
  const input = screen.getByRole('searchbox', { name: 'Buscar consumos del resumen' })
  fireEvent.change(input, { target: { value: 'Farmacity' } })
  expect(screen.getByText('Farmacity')).toBeInTheDocument()
  expect(screen.queryByText('Día Tienda')).not.toBeInTheDocument()
  expect(screen.getByText('1 de 2 consumos encontrados')).toBeInTheDocument()
  expect(screen.getByText(/2 operaciones vinculadas/)).toBeInTheDocument()
  fireEvent.change(input, { target: { value: '' } })
  expect(screen.getByText('Día Tienda')).toBeInTheDocument()
})

test('search supports combined terms and displays an empty state', async () => {
  render(<CardStatementDetails expenseId='expense1' />)
  fireEvent.click(screen.getByRole('button', { name: 'Ver consumos del resumen' }))
  const input = await screen.findByRole('searchbox', { name: 'Buscar consumos del resumen' })
  await waitFor(() => expect(screen.getByText('Farmacity')).toBeInTheDocument())
  fireEvent.change(input, { target: { value: 'alimentacion 13.090,00' } })
  expect(screen.getByText('Día Tienda')).toBeInTheDocument()
  expect(screen.queryByText('Farmacity')).not.toBeInTheDocument()
  fireEvent.change(input, { target: { value: 'ninguna compra' } })
  expect(screen.getByText('No se encontraron consumos.')).toBeInTheDocument()
  expect(screen.getByText('0 de 2 consumos encontrados')).toBeInTheDocument()
})
