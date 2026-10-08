import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import PortfolioHistoryModal from './PortfolioHistoryModal';

const verification = {
	id: 'snapshot-1',
	capturedAt: new Date('2026-10-08T14:41:23Z'),
	balance: 11000,
	observedEarning: -128.53,
	changeType: 'withdrawal',
	note: 'Retiro de fondos',
};

const setup = (overrides = {}) => {
	const onClose = jest.fn();
	const onSave = jest.fn();
	const onDelete = jest.fn();
	const onChange = jest.fn();
	const props = {
		mode: 'edit',
		item: verification,
		isFci: false,
		currency: 'USD',
		onClose,
		onSave,
		onDelete,
		onChange,
		...overrides,
	};
	return { ...render(<PortfolioHistoryModal {...props} />), ...props };
};

describe('PortfolioHistoryModal', () => {
	afterEach(() => {
		document.body.style.overflow = '';
	});

	test('editing opens a centered dialog, keeps financial evidence read-only, and submits changes', () => {
		const { onChange, onSave } = setup();
		const dialog = screen.getByRole('dialog', { name: 'Editar verificación' });
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(dialog).toHaveTextContent('11.000');
		expect(dialog).toHaveTextContent('128,53');
		expect(document.body.style.overflow).toBe('hidden');

		fireEvent.change(screen.getByLabelText('Tipo de movimiento'), { target: { value: 'earning' } });
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
			id: 'snapshot-1',
			balance: 11000,
			observedEarning: -128.53,
			changeType: 'earning',
		}));
		fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'Nueva nota' } });
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ note: 'Nueva nota' }));
		fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
		expect(onSave).toHaveBeenCalledTimes(1);
	});

	test('delete requires explicit confirmation and cancellation is safe', () => {
		const { onClose, onDelete } = setup({ mode: 'delete' });
		expect(screen.getByRole('dialog', { name: 'Eliminar verificación' })).toBeInTheDocument();
		expect(onDelete).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onDelete).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: 'Eliminar verificación' }));
		expect(onDelete).toHaveBeenCalledTimes(1);
	});

	test('Escape closes the modal, focus returns to the opener and scrolling is restored', () => {
		const opener = document.createElement('button');
		opener.textContent = 'Opener';
		document.body.appendChild(opener);
		opener.focus();
		const { unmount, onClose } = setup();
		expect(document.body.style.overflow).toBe('hidden');
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(onClose).toHaveBeenCalledTimes(1);
		unmount();
		expect(document.body.style.overflow).toBe('');
		expect(document.activeElement).toBe(opener);
		opener.remove();
	});

	test('FCI valuation only exposes the editable note', () => {
		setup({ isFci: true, item: { ...verification, nav: 5.19 } });
		expect(screen.getByRole('dialog', { name: 'Editar nota de valuación' })).toBeInTheDocument();
		expect(screen.queryByLabelText('Tipo de movimiento')).not.toBeInTheDocument();
		expect(screen.getByLabelText('Nota')).toBeInTheDocument();
		expect(screen.getByText('NAV')).toBeInTheDocument();
	});

	test('busy operations cannot be dismissed or submitted again', () => {
		const { onClose, onDelete } = setup({ mode: 'delete', busy: true });
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
		expect(onDelete).not.toHaveBeenCalled();
	});
});
