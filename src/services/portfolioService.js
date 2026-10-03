import { firestore } from '../shared/config/firebase/firebase.config';

const positions = (userId) =>
	firestore.collection('users').doc(userId).collection('portfolioPositions');

const snapshots = (userId) =>
	firestore.collection('users').doc(userId).collection('portfolioSnapshots');

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
		nav: position.nav == null ? null : Number(position.nav),
		shares: position.shares == null ? null : Number(position.shares),
		expectedEarning: Number(overrides.expectedEarning || 0),
		observedEarning: Number(overrides.observedEarning || 0),
		source: overrides.source || 'manual',
		capturedAt: new Date(),
	});

export const verifyPortfolioPosition = async (userId, position, balance) => {
	const nextBalance = Number(balance);
	const previousBalance = Number(position.balance || 0);
	const observedEarning = nextBalance - previousBalance;
	const annualRate = Number(position.annualRate || 0) / 100;
	const expectedEarning = position.trackingMode === 'DAILY_RATE'
		? previousBalance * annualRate / 365
		: 0;

	await createPortfolioSnapshot(userId, position, {
		balance: nextBalance,
		expectedEarning,
		observedEarning,
		source: 'verification',
	});

	return positions(userId).doc(position.id).update({
		balance: nextBalance,
		lastEarning: observedEarning,
		lastVerifiedAt: new Date(),
		updatedAt: new Date(),
	});
};

export const subscribePortfolioSnapshots = (userId, onData, onError) =>
	snapshots(userId).orderBy('capturedAt', 'asc').onSnapshot(
		(res) => onData(res.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
		onError
	);
