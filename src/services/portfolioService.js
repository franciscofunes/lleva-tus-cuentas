import { firestore } from '../shared/config/firebase/firebase.config';

const positions = (userId) =>
	firestore.collection('users').doc(userId).collection('portfolioPositions');

const snapshots = (userId) =>
	firestore.collection('users').doc(userId).collection('portfolioSnapshots');

const reconciliations = (userId) =>
	firestore.collection('users').doc(userId).collection('portfolioReconciliations');

export const subscribePortfolioPositions = (userId, onData, onError) =>
	positions(userId).orderBy('updatedAt', 'desc').onSnapshot(
		(res) => onData(res.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
		onError
	);

const normalize = (data) => ({
	...data,
	balance: Number(data.balance),
	principal: Number(data.principal || data.balance || 0),
	annualRate: Number(data.annualRate || 0),
	effectiveRate: Number(data.effectiveRate || 0),
	fees: Number(data.fees || 0),
	realizedEarnings: Number(data.realizedEarnings || 0),
	lastEarning: Number(data.lastEarning || 0),
	trackingMode: data.trackingMode || 'MANUAL',
	shares: data.shares === '' ? null : Number(data.shares || 0),
	nav: data.nav === '' ? null : Number(data.nav || 0),
	minimumInvestment: data.minimumInvestment === '' ? null : Number(data.minimumInvestment || 0),
	performance1D: data.performance1D === '' ? null : Number(data.performance1D || 0),
	performance1W: data.performance1W === '' ? null : Number(data.performance1W || 0),
	performance1M: data.performance1M === '' ? null : Number(data.performance1M || 0),
	performanceYTD: data.performanceYTD === '' ? null : Number(data.performanceYTD || 0),
	performance1Y: data.performance1Y === '' ? null : Number(data.performance1Y || 0),
	volatility21dAnnualized: data.volatility21dAnnualized === '' ? null : Number(data.volatility21dAnnualized || 0),
	maxInterestBearingBalance: data.maxInterestBearingBalance === '' ? null : (/^sin tope$/i.test(String(data.maxInterestBearingBalance).trim()) ? 'Sin tope' : (Number.isFinite(Number(data.maxInterestBearingBalance)) ? Number(data.maxInterestBearingBalance) : data.maxInterestBearingBalance)),
});

export const createPortfolioPosition = (userId, data) =>
	positions(userId).add({ ...normalize(data), lastVerifiedAt: null, createdAt: new Date(), updatedAt: new Date() });

export const updatePortfolioPosition = (userId, positionId, data) =>
	positions(userId).doc(positionId).update({ ...normalize(data), updatedAt: new Date() });

export const deletePortfolioPosition = (userId, positionId) =>
	positions(userId).doc(positionId).delete();

export const createPortfolioSnapshot = (userId, position, overrides = {}) =>
	snapshots(userId).add({
		positionId: position.id,
		institution: position.institution,
		name: position.name,
		category: position.category,
		currency: position.currency,
		balance: Number(overrides.balance ?? position.balance),
		annualRate: Number(position.annualRate || 0),
		nav: overrides.nav == null ? (position.nav == null ? null : Number(position.nav)) : Number(overrides.nav),
		reportedEarnings: overrides.reportedEarnings == null ? null : Number(overrides.reportedEarnings),
		shares: position.shares == null ? null : Number(position.shares),
		expectedEarning: Number(overrides.expectedEarning || 0),
		observedEarning: Number(overrides.observedEarning || 0),
		changeType: overrides.changeType || 'unclassified',
		cashFlow: Number(overrides.cashFlow || 0),
		confirmedEarning: Number(overrides.confirmedEarning || 0),
		note: overrides.note || '',
		source: overrides.source || 'manual',
		capturedAt: new Date(),
	});

export const verifyPortfolioPosition = async (userId, position, balance, metadata = {}) => {
	const nextBalance = Number(balance);
	const previousBalance = Number(position.balance || 0);
	const observedEarning = nextBalance - previousBalance;
	const annualRate = Number(position.annualRate || 0) / 100;
	const isNav = position.trackingMode === 'NAV';
	const changeType = isNav ? 'valuation' : (metadata.changeType || 'unclassified');
	const confirmedEarning = changeType === 'earning' ? observedEarning : 0;
	const cashFlow = changeType === 'deposit' ? Math.max(observedEarning, 0) : changeType === 'withdrawal' ? Math.min(observedEarning, 0) : 0;
	const expectedEarning = position.trackingMode === 'DAILY_RATE'
		? previousBalance * annualRate / 365
		: 0;

	await createPortfolioSnapshot(userId, position, {
		balance: nextBalance,
		expectedEarning,
		observedEarning,
		source: 'verification',
		changeType,
		confirmedEarning,
		cashFlow,
		note: metadata.note || '',
		nav: metadata.nav,
		reportedEarnings: metadata.reportedEarnings,
	});

	const positionUpdate = {
		balance: nextBalance,
		lastEarning: isNav ? Number(metadata.reportedEarnings ?? position.lastEarning ?? 0) : (changeType === 'earning' ? observedEarning : 0),
		...(isNav && metadata.reportedEarnings !== '' && metadata.reportedEarnings != null ? { realizedEarnings: Number(metadata.reportedEarnings) } : {}),
		...(isNav && metadata.nav !== '' && metadata.nav != null ? { nav: Number(metadata.nav), navDate: new Date().toISOString().slice(0, 10) } : {}),
		lastVerifiedAt: new Date(),
		updatedAt: new Date(),
	};
	return positions(userId).doc(position.id).update(positionUpdate);
};

export const subscribePortfolioSnapshots = (userId, onData, onError) =>
	snapshots(userId).orderBy('capturedAt', 'asc').onSnapshot(
		(res) => onData(res.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
		onError
	);


export const updatePortfolioSnapshot = (userId, snapshotId, data) =>
	snapshots(userId).doc(snapshotId).update({
		changeType: data.changeType || 'unclassified',
		confirmedEarning: Number(data.changeType === 'earning' ? data.observedEarning : 0),
		cashFlow: Number(data.changeType === 'deposit' ? Math.max(Number(data.observedEarning || 0), 0) : data.changeType === 'withdrawal' ? Math.min(Number(data.observedEarning || 0), 0) : 0),
		note: data.note || '',
		updatedAt: new Date(),
	});

export const deletePortfolioSnapshot = (userId, snapshotId) =>
	snapshots(userId).doc(snapshotId).delete();


export const subscribePortfolioReconciliations = (userId, onData, onError) =>
	reconciliations(userId).orderBy('month', 'desc').onSnapshot(
		(res) => onData(res.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
		onError
	);

export const savePortfolioReconciliation = (userId, position, month, snapshotRows) => {
	const earningRows = snapshotRows.filter((row) => row.changeType === 'earning');
	const amount = earningRows.reduce((sum, row) => sum + Number(row.confirmedEarning ?? row.observedEarning ?? 0), 0);
	const snapshotIds = earningRows.map((row) => row.id).sort();
	const id = `${position.id}_${month}`;
	return reconciliations(userId).doc(id).set({
		positionId: position.id,
		institution: position.institution,
		name: position.name,
		currency: position.currency,
		month,
		amount,
		snapshotIds,
		verificationCount: earningRows.length,
		status: 'pending_transaction',
		transactionId: null,
		updatedAt: new Date(),
		createdAt: new Date(),
	}, { merge: true });
};


export const registerReconciliationTransaction = async (userId, reconciliation) => {
	const reconciliationRef = reconciliations(userId).doc(reconciliation.id);
	return firestore.runTransaction(async (transaction) => {
		const fresh = await transaction.get(reconciliationRef);
		if (!fresh.exists) throw new Error('El cierre mensual ya no existe.');
		const data = fresh.data();
		if (data.transactionId) return { transactionId: data.transactionId, alreadyRegistered: true };
		if (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0) throw new Error('El cierre no tiene un rendimiento positivo para registrar.');
		const expenseRef = firestore.collection('users').doc(userId).collection('expenses').doc();
		const selectedDate = `${data.month}-01`;
		transaction.set(expenseRef, {
			date: new Date(),
			expenseName: `Rendimiento ${data.institution || data.name || 'Portfolio'}`,
			comment: `Rendimiento de ${data.name || data.institution || 'Portfolio'} correspondiente a ${data.month}`,
			category: 'Ingreso divisas',
			selectedDate,
			currencyQuantity: Number(data.amount),
			portfolioPositionId: data.positionId,
			portfolioReconciliationId: reconciliation.id,
			portfolioPeriod: data.month,
			portfolioCurrency: data.currency || 'USD',
			importSource: 'portfolio-reconciliation',
		});
		transaction.update(reconciliationRef, { status: 'registered', transactionId: expenseRef.id, registeredAt: new Date(), updatedAt: new Date() });
		return { transactionId: expenseRef.id, alreadyRegistered: false };
	});
};
