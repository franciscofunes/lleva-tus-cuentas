import { firestore } from '../shared/config/firebase/firebase.config';
import { getNotificationSettings, resolveTransactionDueDate } from '../utils/transactionDueDates';
import { isExpiredReminder } from '../utils/notificationLifecycle';

const notificationsCollection = (userId) =>
	firestore.collection('users').doc(userId).collection('notifications');

export const backfillExpenseNotifications = async (userId, categories = []) => {
	if (!userId) return 0;

	const userRef = firestore.collection('users').doc(userId);
	const expensesRef = userRef.collection('expenses');
	const notificationsRef = userRef.collection('notifications');
	const [expensesSnapshot, notificationsSnapshot] = await Promise.all([
		expensesRef.get(),
		notificationsRef.get(),
	]);
	const existingIds = new Set(notificationsSnapshot.docs.map((doc) => doc.id));
	const writes = [];

	expensesSnapshot.docs.forEach((doc) => {
		if (existingIds.has(doc.id)) return;

		const expense = doc.data();
		const settings = getNotificationSettings(expense.category, categories);
		const dueDate =
			expense.dueDate ||
			resolveTransactionDueDate({
				category: expense.category,
				categories,
				selectedDate: expense.selectedDate,
				selectedExpirationDate: expense.selectedExpirationDate,
			});
		const creditCard = String(expense.category || '').includes('Resumen tarjeta');
		const enabled =
			typeof expense.notificationEnabled === 'boolean'
				? expense.notificationEnabled
				: creditCard || settings.enabled;

		if (!enabled || !dueDate || isExpiredReminder(dueDate)) return;

		writes.push(
			notificationsRef.doc(doc.id).set({
				sourceType: 'expense',
				sourceId: doc.id,
				title: expense.expenseName || 'Vencimiento',
				category: expense.category || '',
				dueDate,
				amount: Number.isFinite(Number(expense.amount))
					? Number(expense.amount)
					: null,
				leadDays: Number(expense.notificationLeadDays ?? settings.leadDays ?? 5),
				status: 'active',
				readAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
		);
	});

	if (!writes.length) return 0;
	await Promise.all(writes);
	return writes.length;
};

export const pruneExpiredNotifications = async (userId) => {
	if (!userId) return 0;

	const snapshot = await notificationsCollection(userId).get();
	const expired = snapshot.docs.filter((doc) => isExpiredReminder(doc.data()?.dueDate));

	if (!expired.length) return 0;

	const batch = firestore.batch();
	expired.forEach((doc) => batch.delete(doc.ref));
	await batch.commit();
	return expired.length;
};

export const subscribeNotifications = (userId, onData, onError = console.error) => {
	if (!userId) return () => {};

	return notificationsCollection(userId)
		.orderBy('dueDate', 'asc')
		.onSnapshot(
			(snapshot) => {
				onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
			},
			onError
		);
};

export const markNotificationRead = (userId, notificationId) => {
	if (!userId || !notificationId) return Promise.resolve();
	return notificationsCollection(userId).doc(notificationId).set(
		{
			readAt: new Date(),
			updatedAt: new Date(),
		},
		{ merge: true }
	);
};

export const markNotificationUnread = (userId, notificationId) => {
	if (!userId || !notificationId) return Promise.resolve();
	return notificationsCollection(userId).doc(notificationId).set(
		{
			readAt: null,
			updatedAt: new Date(),
		},
		{ merge: true }
	);
};
