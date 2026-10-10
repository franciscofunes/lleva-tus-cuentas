import { firestore } from '../shared/config/firebase/firebase.config';

const litaChatsCollection = (userId) =>
	firestore.collection('users').doc(userId).collection('litaChats');

const toIsoString = (value) => {
	if (!value) return null;
	if (typeof value.toDate === 'function') return value.toDate().toISOString();
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// Preserve complete LTC analysis exports (up to LITA's 32k input limit) on
// reload. The former 12k per-message truncation silently broke multi-turn
// portfolio approvals. Keep a bounded document to avoid Firestore's 1 MiB cap.
export const normalizeMessages = (messages = []) => {
	const normalized = (Array.isArray(messages) ? messages : [])
		.filter((message) =>
			message && ['user', 'assistant'].includes(message.role) &&
			typeof message.content === 'string'
		)
		.slice(-40)
		.map((message) => ({
			id: String(message.id || ''),
			role: message.role,
			content: message.content.slice(0, 32000),
		}));
	let totalChars = normalized.reduce((total, message) => total + message.content.length, 0);
	while (normalized.length > 2 && totalChars > 90000) {
		totalChars -= normalized.shift().content.length;
	}
	return normalized;
};

export const subscribeLitaChats = (userId, onData, onError = console.error) => {
	if (!userId) return () => {};

	return litaChatsCollection(userId)
		.orderBy('updatedAt', 'desc')
		.limit(20)
		.onSnapshot(
			(snapshot) => {
				onData(
					snapshot.docs.map((doc) => {
						const data = doc.data();
						return {
							id: doc.id,
							title: data.title || 'Conversación con LITA',
							section: data.section || 'financial',
							messages: normalizeMessages(data.messages),
							createdAt: toIsoString(data.createdAt),
							updatedAt: toIsoString(data.updatedAt),
						};
					})
				);
			},
			onError
		);
};

export const saveLitaChat = (userId, chat) => {
	if (!userId || !chat?.id) return Promise.resolve();

	const now = new Date();
	const createdAt = chat.createdAt ? new Date(chat.createdAt) : now;

	return litaChatsCollection(userId).doc(chat.id).set(
		{
			title: String(chat.title || 'Conversación con LITA').slice(0, 100),
			section: String(chat.section || 'financial').slice(0, 32),
			messages: normalizeMessages(chat.messages),
			createdAt:
				Number.isNaN(createdAt.getTime()) ? now : createdAt,
			updatedAt: now,
		},
		{ merge: true }
	);
};

export const deleteLitaChat = (userId, chatId) => {
	if (!userId || !chatId) return Promise.resolve();
	return litaChatsCollection(userId).doc(chatId).delete();
};
