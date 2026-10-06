const CANONICAL_FIELDS = [
	'institution', 'name', 'category', 'currency', 'balance', 'annualRate', 'rateType',
	'liquidity', 'fees', 'principal', 'realizedEarnings', 'lastEarning', 'effectiveRate',
	'startDate', 'maturityDate', 'notes', 'trackingMode', 'appUrl', 'webUrl', 'infoUrl',
	'ticker', 'shares', 'nav', 'navDate', 'redemptionPeriod', 'minimumInvestment',
	'performance1D', 'performance1W', 'performance1M', 'performanceYTD', 'performance1Y',
	'fundType', 'investmentHorizon', 'fundStartDate', 'rating', 'volatility21dAnnualized', 'publishedYtdReturn',
	'sourceUrl', 'sourceCheckedAt', 'rateVerifiedAt', 'interestCalculationBasis', 'interestAccrual', 'maxInterestBearingBalance',
	'accountHolder', 'accountNumber', 'accountType', 'cbu', 'alias', 'routingNumber', 'swift', 'bankName', 'bankAddress', 'depositInstructions',
];

const FIELD_MAP = {
	'institucion': 'institution', 'institución': 'institution', 'plataforma': 'institution',
	'producto': 'name', 'cuenta': 'name', 'nombre': 'name',
	'categoria': 'category', 'categoría': 'category', 'moneda': 'currency',
	'capital actual': 'balance', 'saldo': 'balance', 'balance': 'balance',
	'tasa anual': 'annualRate', 'tasa anual %': 'annualRate', 'tasa': 'annualRate',
	'tipo de tasa': 'rateType', 'tracking': 'trackingMode', 'modo de tracking': 'trackingMode',
	'liquidez': 'liquidity', 'comisiones': 'fees', 'principal': 'principal',
	'ganancias realizadas': 'realizedEarnings', 'ultimo rendimiento': 'lastEarning', 'último rendimiento': 'lastEarning', 'tasa efectiva': 'effectiveRate',
	'fecha inicio': 'startDate', 'fecha de inicio': 'startDate',
	'vencimiento': 'maturityDate', 'fecha vencimiento': 'maturityDate',
	'notas': 'notes', 'acceso app/web': 'appUrl', 'acceso app': 'appUrl', 'app url': 'appUrl', 'deep link': 'appUrl', 'url': 'appUrl',
	'web fallback': 'webUrl', 'web oficial': 'webUrl', 'web url': 'webUrl',
	'info': 'infoUrl', 'informacion': 'infoUrl', 'información': 'infoUrl', 'pagina de informacion': 'infoUrl', 'página de información': 'infoUrl',
	'fuente': 'sourceUrl', 'fuente oficial': 'sourceUrl', 'source url': 'sourceUrl',
	'verificado': 'sourceCheckedAt', 'fecha verificacion': 'sourceCheckedAt', 'fecha verificación': 'sourceCheckedAt', 'checked at': 'sourceCheckedAt',
	'tasa verificada': 'rateVerifiedAt', 'fecha tasa verificada': 'rateVerifiedAt', 'rate verified at': 'rateVerifiedAt',
	'base de calculo': 'interestCalculationBasis', 'base de cálculo': 'interestCalculationBasis', 'metodologia de calculo': 'interestCalculationBasis', 'metodología de cálculo': 'interestCalculationBasis',
	'acreditacion': 'interestAccrual', 'acreditación': 'interestAccrual', 'devengamiento': 'interestAccrual', 'interest accrual': 'interestAccrual',
	'saldo maximo remunerado': 'maxInterestBearingBalance', 'saldo máximo remunerado': 'maxInterestBearingBalance',
	'titular': 'accountHolder', 'titular de la cuenta': 'accountHolder', 'account holder': 'accountHolder',
	'numero de cuenta': 'accountNumber', 'número de cuenta': 'accountNumber', 'account number': 'accountNumber',
	'tipo de cuenta': 'accountType', 'account type': 'accountType', 'cbu': 'cbu', 'alias': 'alias',
	'routing': 'routingNumber', 'routing number': 'routingNumber', 'numero de ruta': 'routingNumber', 'número de ruta': 'routingNumber',
	'swift': 'swift', 'banco receptor': 'bankName', 'banco': 'bankName', 'bank name': 'bankName',
	'direccion del banco': 'bankAddress', 'dirección del banco': 'bankAddress', 'bank address': 'bankAddress',
	'instrucciones de deposito': 'depositInstructions', 'instrucciones de depósito': 'depositInstructions', 'instrucciones de transferencia': 'depositInstructions',
	'ticker': 'ticker', 'clase': 'ticker', 'cuotapartes': 'shares', 'shares': 'shares',
	'nav': 'nav', 'valor cuotaparte': 'nav', 'valor de cuotaparte': 'nav', 'fecha nav': 'navDate', 'fecha valuacion': 'navDate', 'fecha valuación': 'navDate',
	'rescate': 'redemptionPeriod', 'plazo rescate': 'redemptionPeriod', 'inversion minima': 'minimumInvestment', 'inversión mínima': 'minimumInvestment',
	'rendimiento 1d': 'performance1D', 'performance1d': 'performance1D', 'rendimiento 1s': 'performance1W', 'rendimiento 1w': 'performance1W', 'performance1w': 'performance1W',
	'rendimiento 1m': 'performance1M', 'performance1m': 'performance1M', 'rendimiento ytd': 'performanceYTD', 'performanceytd': 'performanceYTD', 'rendimiento 1a': 'performance1Y', 'rendimiento 1y': 'performance1Y', 'performance1y': 'performance1Y',
	'total ytd publicado': 'publishedYtdReturn', 'ytd publicado': 'publishedYtdReturn', 'total publicado': 'publishedYtdReturn',
	'tipo de fondo': 'fundType', 'horizonte': 'investmentHorizon', 'inicio del fondo': 'fundStartDate', 'calificacion': 'rating', 'calificación': 'rating', 'volatilidad 21d anualizada': 'volatility21dAnnualized',
};

const MONTH_MAP = {
	ene: 'jan', enero: 'jan', jan: 'jan', january: 'jan',
	feb: 'feb', febrero: 'feb', february: 'feb',
	mar: 'mar', marzo: 'mar', march: 'mar',
	abr: 'apr', abril: 'apr', apr: 'apr', april: 'apr',
	may: 'may', mayo: 'may',
	jun: 'jun', junio: 'jun', june: 'jun',
	jul: 'jul', julio: 'jul', july: 'jul',
	ago: 'aug', agosto: 'aug', aug: 'aug', august: 'aug',
	sep: 'sep', sept: 'sep', septiembre: 'sep', set: 'sep', setiembre: 'sep', september: 'sep',
	oct: 'oct', octubre: 'oct', october: 'oct',
	nov: 'nov', noviembre: 'nov', november: 'nov',
	dic: 'dec', diciembre: 'dec', dec: 'dec', december: 'dec',
};

const NUMBER_FIELDS = [
	'balance', 'annualRate', 'fees', 'principal', 'realizedEarnings', 'lastEarning',
	'effectiveRate', 'shares', 'nav', 'minimumInvestment', 'performance1D',
	'performance1W', 'performance1M', 'performanceYTD', 'performance1Y',
	'volatility21dAnnualized', 'publishedYtdReturn', 'maxInterestBearingBalance',
];

const DATE_FIELDS = [
	'startDate', 'maturityDate', 'navDate', 'fundStartDate',
	'sourceCheckedAt', 'rateVerifiedAt',
];

const strip = (value) => value.replace(/^\*\*|\*\*$/g, '').trim();

const normalizeKey = (value) =>
	strip(value)
		.toLowerCase()
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const normalizeDate = (value) => {
	const clean = strip(value);
	const match = clean.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
	if (!match) return clean;
	const year = match[3].length === 2 ? `20${match[3]}` : match[3];
	return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
};

const normalizeNumber = (value) => {
	let clean = strip(value)
		.replace(/(?:US\$|U\$S|USD|ARS|EUR|USDT)/gi, '')
		.replace(/[%$]/g, '')
		.replace(/\s/g, '');
	if (clean.includes(',') && clean.includes('.')) {
		clean = clean.lastIndexOf(',') > clean.lastIndexOf('.')
			? clean.replace(/\./g, '').replace(',', '.')
			: clean.replace(/,/g, '');
	} else if (clean.includes(',')) clean = clean.replace(',', '.');
	return clean;
};

const assignField = (parsed, field, value) => {
	if (field.startsWith('monthlyReturns.')) {
		const month = field.split('.')[1];
		parsed.monthlyReturns = {
			...(parsed.monthlyReturns || {}),
			[month]: normalizeNumber(value),
		};
		return;
	}

	if (NUMBER_FIELDS.includes(field)) parsed[field] = normalizeNumber(value);
	else if (DATE_FIELDS.includes(field)) parsed[field] = normalizeDate(value);
	else if (field === 'currency') parsed[field] = strip(value).toUpperCase();
	else if (field === 'rateType') parsed[field] = strip(value).toUpperCase();
	else if (field === 'trackingMode') parsed[field] = strip(value).toUpperCase().replace(/[ -]+/g, '_');
	else parsed[field] = strip(value);
};

const canonicalOrMappedField = (rawKey) => {
	const normalized = normalizeKey(rawKey);
	const canonicalField = CANONICAL_FIELDS.find(
		(item) => item.toLowerCase() === normalized.replace(/\s/g, '')
			|| item.toLowerCase() === normalized
	);
	if (canonicalField) return canonicalField;
	return FIELD_MAP[normalized];
};

const directMonthlyField = (rawKey) => {
	const clean = strip(rawKey).toLowerCase().trim();
	const dottedMatch = clean.match(/^monthlyreturns[.\s_-]+([a-záéíóú]+)$/i);
	if (dottedMatch) {
		const month = MONTH_MAP[normalizeKey(dottedMatch[1])] || dottedMatch[1].toLowerCase();
		if (Object.values(MONTH_MAP).includes(month)) return 'monthlyReturns.' + month;
	}

	const monthlyMatch = clean.match(/^(?:rentabilidad|rendimiento)?\s*(?:mensual\s*)?([a-záéíóú]+)$/i);
	if (monthlyMatch) {
		const month = MONTH_MAP[normalizeKey(monthlyMatch[1])];
		if (month) return 'monthlyReturns.' + month;
	}

	return null;
};

const isPublishedTotalLabel = (rawKey, inMonthlySection) => {
	const key = normalizeKey(rawKey);
	if (/^(total ytd(?: publicado)?|ytd(?: publicado)?|total publicado)$/.test(key)) return true;
	return inMonthlySection && /^total(?:\s+\d{4})?$/.test(key);
};

const parseMarkdownTableRow = (line, parsed, inMonthlySection) => {
	if (!line.includes('|')) return false;

	const cells = line
		.split('|')
		.map((cell) => strip(cell))
		.filter(Boolean);

	if (cells.length < 2) return false;
	if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return true;

	let consumed = false;
	for (let index = 0; index + 1 < cells.length; index += 2) {
		const label = cells[index];
		const value = cells[index + 1];
		if (/^(mes|rentabilidad|rendimiento|valor|porcentaje|%)$/i.test(normalizeKey(label))) continue;
		if (/^:?-{2,}:?$/.test(label) || /^:?-{2,}:?$/.test(value)) continue;

		const monthlyField = directMonthlyField(label);
		if (monthlyField) {
			assignField(parsed, monthlyField, value);
			consumed = true;
			continue;
		}

		if (isPublishedTotalLabel(label, inMonthlySection)) {
			assignField(parsed, 'publishedYtdReturn', value);
			consumed = true;
			continue;
		}

		const field = canonicalOrMappedField(label);
		if (field) {
			assignField(parsed, field, value);
			consumed = true;
		}
	}

	return consumed;
};

const parseInlineMonthlyPairs = (line, parsed) => {
	const regex = /(?:^|[|,;\s])(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:t(?:iembre)?)?|set(?:iembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?|jan(?:uary)?|february|march|apr(?:il)?|june|july|aug(?:ust)?|september|october|november|december)\s*(?::|=|-)?\s*(-?\d+(?:[.,]\d+)?)\s*%?/gi;
	let consumed = false;
	let match;

	while ((match = regex.exec(line)) !== null) {
		const month = MONTH_MAP[normalizeKey(match[1])];
		if (!month) continue;
		assignField(parsed, 'monthlyReturns.' + month, match[2]);
		consumed = true;
	}

	return consumed;
};

const parseInlinePublishedTotal = (line, parsed, inMonthlySection) => {
	const match = strip(line).match(/^(total(?:\s+ytd)?(?:\s+publicado)?|ytd(?:\s+publicado)?)\s*(?::|=|-)?\s*(-?\d+(?:[.,]\d+)?)\s*%?$/i);
	if (!match || !isPublishedTotalLabel(match[1], inMonthlySection)) return false;
	assignField(parsed, 'publishedYtdReturn', match[2]);
	return true;
};

export const parsePortfolioMarkdown = (markdown) => {
	const parsed = {};
	const unknown = [];
	let section = null;

	markdown.split(/\r?\n/).forEach((rawLine) => {
		const trimmed = rawLine.trim();
		if (!trimmed) return;

		const heading = trimmed.replace(/^#+\s*/, '');
		if (/^rentabilidad mensual(?:\s+anualizada)?(?:\s+\d{4})?\s*:?\s*$/i.test(heading)) {
			section = 'monthlyReturns';
			return;
		}

		const line = trimmed.replace(/^[-*+]\s*/, '');
		if (!line || line.startsWith('#')) return;

		if (parseMarkdownTableRow(line, parsed, section === 'monthlyReturns')) return;
		if (parseInlineMonthlyPairs(line, parsed)) return;
		if (parseInlinePublishedTotal(line, parsed, section === 'monthlyReturns')) return;

		const separator = line.indexOf(':');
		if (separator < 1) return;

		const rawKey = strip(line.slice(0, separator));
		const value = strip(line.slice(separator + 1));

		if (!value && /^rentabilidad mensual(?:\s+anualizada)?(?:\s+\d{4})?$/i.test(rawKey)) {
			section = 'monthlyReturns';
			return;
		}

		const monthlyField =
			directMonthlyField(rawKey) ||
			(section === 'monthlyReturns'
				? (() => {
					const month = MONTH_MAP[normalizeKey(rawKey)];
					return month ? `monthlyReturns.${month}` : null;
				})()
				: null);

		if (monthlyField) {
			assignField(parsed, monthlyField, value);
			return;
		}

		if (isPublishedTotalLabel(rawKey, section === 'monthlyReturns')) {
			assignField(parsed, 'publishedYtdReturn', value);
			return;
		}

		const field = canonicalOrMappedField(rawKey);
		if (!field) {
			unknown.push(normalizeKey(rawKey));
			return;
		}

		assignField(parsed, field, value);
	});

	if (!Object.keys(parsed).length) {
		throw new Error('No se reconocieron campos del portfolio');
	}

	return { parsed, unknown };
};
