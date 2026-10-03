import { firestore } from '../config/firebase.config';

const positions = (userId) =>
	firestore.collection('users').doc(userId).collection('portfolioPositions');

const snapshots = (userId) =>
	firestore.collection('users').doc(userId).collection('portfolioSnapshots');

export const subscribePortfolioPositions = (userId, onData, onError) =>
	positions(userId)
		.orderBy('updatedAt', 'desc')
		.onSnapshot(
			(res) => onData(res.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
			onError
		);

export const createPortfolioPosition = (userId, data) =>
	positions(userId).add({
		...data,
		balance: Number(data.balance),
		annualRate: Number(data.annualRate || 0),
		fees: Number(data.fees || 0),
		createdAt: new Date(),
		updatedAt: new Date(),
	});

export const updatePortfolioPosition = (userId, positionId, data) =>
	positions(userId).doc(positionId).update({
		...data,
		balance: Number(data.balance),
		annualRate: Number(data.annualRate || 0),
		fees: Number(data.fees || 0),
		updatedAt: new Date(),
	});

export const deletePortfolioPosition = (userId, positionId) =>
	positions(userId).doc(positionId).delete();

export const createPortfolioSnapshot = (userId, position) =>
	snapshots(userId).add({
		positionId: position.id,
		institution: position.institution,
		name: position.name,
		category: position.category,
		currency: position.currency,
		balance: Number(position.balance),
		annualRate: Number(position.annualRate || 0),
		capturedAt: new Date(),
	});
