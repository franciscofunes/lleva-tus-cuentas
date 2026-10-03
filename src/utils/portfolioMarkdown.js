const FIELD_MAP = {
	'institucion': 'institution', 'institución': 'institution', 'plataforma': 'institution',
	'producto': 'name', 'cuenta': 'name', 'nombre': 'name',
	'categoria': 'category', 'categoría': 'category', 'moneda': 'currency',
	'capital actual': 'balance', 'saldo': 'balance', 'balance': 'balance',
	'tasa anual': 'annualRate', 'tasa anual %': 'annualRate', 'tasa': 'annualRate',
	'tipo de tasa': 'rateType', 'tracking': 'trackingMode', 'modo de tracking': 'trackingMode',
	'liquidez': 'liquidity', 'comisiones': 'fees',
	'fecha inicio': 'startDate', 'fecha de inicio': 'startDate',
	'vencimiento': 'maturityDate', 'fecha vencimiento': 'maturityDate',
	'notas': 'notes', 'acceso app/web': 'appUrl', 'acceso app': 'appUrl', 'app url': 'appUrl', 'deep link': 'appUrl', 'url': 'appUrl',
	'web fallback': 'webUrl', 'web oficial': 'webUrl', 'web url': 'webUrl',
};

const strip = (value) => value.replace(/^\*\*|\*\*$/g, '').trim();

const normalizeDate = (value) => {
	const clean = strip(value);
	const match = clean.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
	if (!match) return clean;
	const year = match[3].length === 2 ? `20${match[3]}` : match[3];
	return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
};

const normalizeNumber = (value) => {
	let clean = strip(value).replace(/[%$]/g, '').replace(/\s/g, '');
	if (clean.includes(',') && clean.includes('.')) {
		clean = clean.lastIndexOf(',') > clean.lastIndexOf('.')
			? clean.replace(/\./g, '').replace(',', '.')
			: clean.replace(/,/g, '');
	} else if (clean.includes(',')) clean = clean.replace(',', '.');
	return clean;
};

export const parsePortfolioMarkdown = (markdown) => {
	const parsed = {};
	const unknown = [];
	markdown.split(/\r?\n/).forEach((rawLine) => {
		const line = rawLine.trim().replace(/^[-*]\s*/, '');
		if (!line || line.startsWith('#')) return;
		const separator = line.indexOf(':');
		if (separator < 1) return;
		const rawKey = strip(line.slice(0, separator)).toLowerCase();
		const value = strip(line.slice(separator + 1));
		const field = FIELD_MAP[rawKey];
		if (!field) { unknown.push(rawKey); return; }
		if (['balance', 'annualRate', 'fees'].includes(field)) parsed[field] = normalizeNumber(value);
		else if (['startDate', 'maturityDate'].includes(field)) parsed[field] = normalizeDate(value);
		else if (field === 'currency') parsed[field] = value.toUpperCase();
		else if (field === 'rateType') parsed[field] = value.toUpperCase();
		else if (field === 'trackingMode') parsed[field] = value.toUpperCase().replace(/[ -]+/g, '_');
		else parsed[field] = value;
	});
	if (!Object.keys(parsed).length) throw new Error('No se reconocieron campos del portfolio');
	return { parsed, unknown };
};
