// Firestore history is a data cache, not the financial source of truth.
// Never truncate an LTC financial report to 12k: approvals after restoring
// a conversation need the complete original portfolio/transactions export.
export const normalizeLitaChatMessages = (messages = []) => {
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
