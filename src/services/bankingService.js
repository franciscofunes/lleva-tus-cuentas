import { auth, firestore } from '../shared/config/firebase/firebase.config';
import { validBankId, validateBankName, validateBankAccount, validateBankCard, validateBankCharge } from '../utils/bankingModel';
import { duplicateChargeFingerprint } from '../utils/cardConsumptionMarkdown';

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
// Separate owner-owned links leave previous transactions/PDF data untouched.
// Verify all three owner-scoped documents before creating or moving a link.
const verifiedStatementLinkTarget = async (uid, expenseId, bankId, cardId) => {
  if (!validBankId(expenseId) || !validBankId(bankId) || !validBankId(cardId))
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
  return user.collection('bankStatementLinks').doc(expenseId);
};

export const saveStatementBankLink = async (uid, expenseId, bankId, cardId) => {
  const ref = await verifiedStatementLinkTarget(uid, expenseId, bankId, cardId);
  return ref.set({ expenseId, bankId, cardId, updatedAt: new Date() });
};

// update() cannot silently recreate a link if it was removed in another session.
// The target bank/card/expense are verified just like first-time association.
export const reassignStatementBankLink = async (uid, expenseId, bankId, cardId) => {
  const ref = await verifiedStatementLinkTarget(uid, expenseId, bankId, cardId);
  const existing = await ref.get();
  if (!existing.exists) throw new Error('Este resumen ya no está vinculado. Volvé a asociarlo desde los pendientes.');
  if (existing.data().bankId === bankId && existing.data().cardId === cardId)
    throw new Error('El resumen ya está vinculado a esa tarjeta.');
  return ref.update({ bankId, cardId, updatedAt: new Date() });
};

export const unlinkStatementBank = async (uid, expenseId) => {
  if (!validBankId(expenseId)) throw new Error('Resumen inválido.');
  const ref = collection(uid, 'bankStatementLinks').doc(expenseId);
  const existing = await ref.get();
  if (!existing.exists) throw new Error('Este resumen ya no tiene una tarjeta asociada.');
  return ref.delete();
};

// Screenshot-assisted import. ChatGPT only prepares Markdown. The user reviews
// each bank/card association before Firestore sees any data.
// One Firestore transaction ensures duplicate retries never create more charges.
const sha256String = async (text) => {
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : null;
  if (!subtle || typeof TextEncoder === 'undefined') throw new Error('Usá LTC$ por HTTPS para importar consumos de forma segura.');
  const hash = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
};
export async function importReviewedCardConsumptionMarkdown(uid,records) {
  if(!Array.isArray(records)||!records.length||records.length>10)
    throw new Error('Seleccioná entre 1 y 10 registros revisados.');
  const user=mine(uid);
  const snapshots=new Map(),charges=new Map();
  for(const entry of records){
    if(!validBankId(entry.bankId)||!validBankId(entry.cardId))
      throw new Error('Seleccioná el banco y la tarjeta correcta de cada registro.');
    if(entry.type==='snapshot'){
      if(snapshots.has(entry.cardId))throw new Error('Agrupá en un único registro la foto del consumo de cada tarjeta.');
      const input=entry.snapshot;
      if(!input || !/^20\d{2}-\d{2}-\d{2}$/.test(input.asOf))
        throw new Error('Falta la fecha de consulta de consumos.');
      snapshots.set(entry.cardId,entry);
    } else if(entry.type==='charge'){
      const data=validateBankCharge({...entry.charge,bankId:entry.bankId,cardId:entry.cardId});
      const finger=duplicateChargeFingerprint({...data,reference:entry.charge?.reference||''});
      const fingerprint=await sha256String('ltc-card-charge-v1|'+finger);
      const id='import_'+fingerprint.slice(0,48);
      if(charges.has(id))throw new Error('El mismo consumo aparece dos veces en el Markdown. Quitá el duplicado o diferenciá operaciones reales con referencia.');
      charges.set(id,{entry,data});
    }else throw new Error('Tipo de registro inválido.');
  }
  const cardIds=new Set(records.map(entry=>entry.cardId));
  const refs=new Map([...cardIds].map(id=>[id,user.collection('bankCards').doc(id)]));
  const chargeRefs=new Map([...charges.keys()].map(id=>[id,user.collection('bankCardCharges').doc(id)]));
  const now=new Date();
  return firestore.runTransaction(async tx=>{
    // Transaction reads must happen before any writes.
    const [cards,exists]=await Promise.all([
      Promise.all([...refs].map(async ([id,ref])=>[id,await tx.get(ref)])),
      Promise.all([...chargeRefs].map(async ([id,ref])=>[id,await tx.get(ref)]))
    ]);
    const cardDocs=new Map(cards),chargeDocs=new Map(exists);
    const batch=[];
    for(const [id,doc] of cardDocs) {
      if(!doc.exists)throw new Error('Una tarjeta ya no existe. Actualizá Bancos.');
      const ownerBank=doc.data().bankId;
      if(records.some(entry=>entry.cardId===id&&entry.bankId!==ownerBank))
        throw new Error('Revisá la asociación: la tarjeta no pertenece al banco seleccionado.');
      const snapshot=snapshots.get(id);
      if(snapshot){
        const prior=doc.data().statementSnapshot||{},incoming=snapshot.snapshot;
        if(prior.asOf&&incoming.asOf<prior.asOf)
          throw new Error('La captura es anterior a los consumos ya registrados. Revisá la fecha de consulta.');
        const merged={...prior,...incoming};
        if(prior.asOf!==incoming.asOf)for(const key of ['currentConsumptionARS','currentConsumptionUSD']){
          if(!(key in incoming))delete merged[key];
        }
        validateBankCard({...doc.data(),statementSnapshot:undefined,
          ...merged,bankId:ownerBank});
        batch.push({ref:refs.get(id),data:{statementSnapshot:merged,updatedAt:now},type:'update'});
      }
    }
    let imported=0,skipped=0;
    for(const [id,item] of charges){
      if(chargeDocs.get(id)?.exists){skipped++;continue;}
      batch.push({ref:chargeRefs.get(id),data:{...item.data,createdAt:now,updatedAt:now},type:'set'});
      imported++;
    }
    batch.forEach(item=>{
      if(item.type==='set')tx.set(item.ref,item.data);
      else tx.update(item.ref,item.data);
    });
    return {snapshots:snapshots.size,charges:imported,duplicates:skipped};
  });
}
