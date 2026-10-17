// Suggestions are never saved automatically. Only an unambiguous card of the
// expected brand at the named bank can be proposed to the user.
export const normalizedBankTokens = (value) =>
  String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR').replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter((word) => word && !['banco','de','del','la','el','sa'].includes(word))
    .join(' ');

export const suggestCardForImportedStatement = (statement, banks, cards) => {
  const institution = normalizedBankTokens(statement?.institution);
  const brand = String(statement?.cardBrand || '').trim().toLowerCase();
  if (!institution || !brand) return null;
  const exactBanks = (banks || []).filter((bank) =>
    normalizedBankTokens(bank?.name) === institution);
  if (exactBanks.length !== 1) return null;
  const candidate = (cards || []).filter((card) =>
    card?.bankId === exactBanks[0].code &&
    String(card?.brand || '').toLowerCase() === brand);
  return candidate.length === 1 ? { bankId: exactBanks[0].code, cardId: candidate[0].id } : null;
};
