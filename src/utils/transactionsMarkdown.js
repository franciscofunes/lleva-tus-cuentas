const FIELD_ALIASES = {
	name: 'name', expenseName: 'name', nombre: 'name',
	category: 'category', categoria: 'category',
	date: 'selectedDate', selectedDate: 'selectedDate', fecha: 'selectedDate',
	currencyQuantity: 'currencyQuantity', cantidadDivisas: 'currencyQuantity', amountUsd: 'currencyQuantity',
	amount: 'amount', monto: 'amount',
	comment: 'comment', description: 'comment', descripcion: 'comment',
	institution: 'institution', institucion: 'institution',
	period: 'period', periodo: 'period',
	source: 'source', fuente: 'source',
};

const clean = (value = '') => value.trim().replace(/^['"]|['"]$/g, '');

export const transactionImportKey = (item) =>
	[item.institution, item.period, item.category, Number(item.currencyQuantity || 0).toFixed(8)].map((v) => String(v || '').trim().toLowerCase()).join('|');

export const parseTransactionsMarkdown = (markdown) => {
	const rows = []; let current = null;
	markdown.split(/\r?\n/).forEach((raw) => {
		const line = raw.trim();
		if (/^-\s+[\wÁÉÍÓÚáéíóúÑñ]+\s*:/.test(line)) {
			if (current && Object.keys(current).length) rows.push(current);
			current = {};
		}
		const match = line.match(/^-?\s*([\wÁÉÍÓÚáéíóúÑñ]+)\s*:\s*(.+)$/);
		if (!match) return;
		if (!current) current = {};
		const field = FIELD_ALIASES[match[1]];
		if (field) current[field] = clean(match[2]);
	});
	if (current && Object.keys(current).length) rows.push(current);
	return rows.map((row, index) => {
		const item = {
			name: row.name || `Rendimiento ${row.institution || ''}`.trim(),
			category: row.category || 'Ingreso divisas',
			selectedDate: row.selectedDate,
			currencyQuantity: Number(row.currencyQuantity || 0),
			amount: row.amount === undefined ? '' : Number(row.amount),
			comment: row.comment || `Rendimiento ${row.institution || ''} ${row.period || ''}`.trim(),
			institution: row.institution || '',
			period: row.period || (row.selectedDate ? row.selectedDate.slice(0, 7) : ''),
			source: row.source || 'markdown-import',
		};
		const errors = [];
		if (!/^\d{4}-\d{2}-\d{2}$/.test(item.selectedDate || '')) errors.push('Fecha inválida');
		if (!Number.isFinite(item.currencyQuantity) || item.currencyQuantity <= 0) errors.push('Cantidad de divisas inválida');
		if (!item.name) errors.push('Falta nombre');
		return { ...item, importKey: transactionImportKey(item), errors, selected: errors.length === 0, row: index + 1 };
	});
};
