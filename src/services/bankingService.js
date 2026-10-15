import { auth, firestore } from '../shared/config/firebase/firebase.config';
import { validBankId, validateBankName, validateBankAccount, validateBankCard, validateBankCharge } from '../utils/bankingModel';

const mine = (uid) => {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error('Iniciá sesión para consultar tus bancos.');
  return firestore.collection('users').doc(uid);
};
const collection = (uid, name) => mine(uid).collection(name);
const observable = (uid, name, onData, onError) =>
  collection(uid, name).onSnapshot(
    (snapshot) => onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
    (error) => onError?.(error)
  );
export const subscribeBanks = (uid, onData, onError) => observable(uid, 'banks', onData, onError);
export const subscribeBankAccounts = (uid, onData, onError) => observable(uid, 'bankAccounts', onData, onError);
export const subscribeBankCards = (uid, onData, onError) => observable(uid, 'bankCards', onData, onError);
export const subscribeBankCharges = (uid, onData, onError) => observable(uid, 'bankCardCharges', onData, onError);
export const subscribeBankStatementLinks = (uid, onData, onError) => observable(uid, 'bankStatementLinks', onData, onError);
export const subscribeImportedStatements = (uid, onData, onError) => observable(uid, 'cardStatements', onData, onError);

// Atomic first-time bank onboarding: account/card docs reference the new bank.
// Firestore rules use existsAfter for owner-scoped child writes in the same batch.
// No expenses/transactions/portfolio writes and no banking API calls.
export const createBankBundle = async (uid, { name, accounts = [], cards = [] }) => {
  const bankName = validateBankName(name);
  if (!Array.isArray(accounts) || !Array.isArray(cards) || accounts.length + cards.length > 20)
    throw new Error('Importá hasta 20 cuentas y tarjetas por banco.');
  const user = mine(uid);
  const bankRef = user.collection('banks').doc();
  const id = bankRef.id;
  const validAccounts = accounts.map((a) => validateBankAccount({ ...a, bankId: id }));
  const validCards = cards.map((c) => validateBankCard({ ...c, bankId: id }));
  const batch = firestore.batch();
  const now = new Date();
  batch.set(bankRef, { name: bankName, code: id, active: true, updatedAt: now });
  validAccounts.forEach((account) => {
    batch.set(user.collection('bankAccounts').doc(), {
      ...account, createdAt: now, updatedAt: now, balanceUpdatedAt: now,
    });
  });
  validCards.forEach((card) => {
    batch.set(user.collection('bankCards').doc(), {
      ...card, createdAt: now, updatedAt: now,
    });
  });
  await batch.commit();
  return id;
};

// IDs are generated per owner; the user chooses the name and we never seed any institution.
export const addUserBank = async (uid, nameInput) => {
  const name = validateBankName(nameInput);
  const ref = collection(uid, 'banks').doc();
  await ref.set({ name, code: ref.id, active: true, updatedAt: new Date() });
  return ref.id;
};
export const renameUserBank = (uid, bankId, nameInput) => {
  if (!validBankId(bankId)) throw new Error('Banco inválido.');
  return collection(uid, 'banks').doc(bankId).update({
    name: validateBankName(nameInput), updatedAt: new Date(),
  });
};
export const saveBankAccount = (uid, values, id) => {
  const data = validateBankAccount(values);
  if (id) return collection(uid, 'bankAccounts').doc(id).update({ ...data, updatedAt: new Date(), balanceUpdatedAt: new Date() });
  return collection(uid, 'bankAccounts').add({ ...data, createdAt: new Date(), updatedAt: new Date(), balanceUpdatedAt: new Date() });
};
export const saveBankCard = (uid, values, id) => {
  const data = validateBankCard(values);
  if (id) return collection(uid, 'bankCards').doc(id).update({ ...data, updatedAt: new Date() });
  return collection(uid, 'bankCards').add({ ...data, createdAt: new Date(), updatedAt: new Date() });
};
export const saveManualCardCharge = async (uid, values) => {
  const data = validateBankCharge(values);
  const card = await collection(uid, 'bankCards').doc(data.cardId).get();
  if (!card.exists || card.data().bankId !== data.bankId) throw new Error('La tarjeta ya no pertenece a ese banco.');
  return collection(uid, 'bankCardCharges').add({ ...data, createdAt: new Date(), updatedAt: new Date() });
};
export const deleteManualCardCharge = async (uid, id) => {
  const ref = collection(uid, 'bankCardCharges').doc(id);
  const current = await ref.get();
  if (!current.exists || current.data().source !== 'manual') throw new Error('Solo se pueden borrar consumos manuales.');
  await ref.delete();
};
export const getStatementLink = async (uid, expenseId) => {
  if (!expenseId || !/^[A-Za-z0-9_-]{1,128}$/.test(expenseId)) return null;
  const doc = await collection(uid, 'bankStatementLinks').doc(expenseId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};
// Separate owner-owned link records leave legacy transaction schema and amounts untouched.
export const saveStatementBankLink = async (uid, expenseId, bankId, cardId) => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(expenseId || '')) || !validBankId(bankId) || !cardId)
    throw new Error('Elegí un banco y una tarjeta válidos.');
  const user = mine(uid);
  const [bank, card, expense] = await Promise.all([
    user.collection('banks').doc(bankId).get(),
    user.collection('bankCards').doc(cardId).get(),
    user.collection('expenses').doc(expenseId).get(),
  ]);
  if (!bank.exists || !card.exists || card.data().bankId !== bankId ||
      !expense.exists || !/Resumen tarjeta/i.test(String(expense.data().category || ''))) {
    throw new Error('Banco, tarjeta o resumen no válidos para asociar.');
  }
  return user.collection('bankStatementLinks').doc(expenseId).set({
    expenseId, bankId, cardId, updatedAt: new Date(),
  });
};
export const unlinkStatementBank = async (uid, expenseId) =>
  collection(uid, 'bankStatementLinks').doc(expenseId).delete();
