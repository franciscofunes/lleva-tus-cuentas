export const currencyFormater = function (number) {
	return (
		'AR' +
		new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS',
		}).format(number)
	);
};

export const currencyGenericFormater = function (
	currencyName,
	number,
	country,
	currency
) {
	return (
		currencyName +
		' ' +
		new Intl.NumberFormat(country, {
			style: 'currency',
			currency: currency,
		}).format(number)
	);
};
