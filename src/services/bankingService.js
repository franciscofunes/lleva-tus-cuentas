import { auth, firestore } from '../shared/config/firebase/firebase.config';
import { BANK_OPTIONS, validBankId, validateBankAccount, validateBankCard, validateBankCharge } from '../utils/bankingModel';

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

// Deterministic ids make repeated taps idempotent and avoid duplicate banks.
export const addUserBank = (uid, bankId) => {
  if (!validBankId(bankId)) throw new Error('Banco no admitido.');
  return collection(uid, 'banks').doc(bankId).set({
    name: BANK_OPTIONS.find((bank) => bank.id === bankId).name,
    code: bankId, active: true, updatedAt: new Date(),
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
