import { firestore } from '../shared/config/firebase/firebase.config';

const notificationsCollection = (userId) =>
	firestore.collection('users').doc(userId).collection('notifications');

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
