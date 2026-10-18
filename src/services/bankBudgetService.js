import { auth, firestore } from '../shared/config/firebase/firebase.config';
import { parseAmount } from '../utils/bankingModel';

const mine=(uid)=>{
  if(!uid||auth.currentUser?.uid!==uid)throw new Error('Sesión inválida para configurar alertas.');
  return firestore.collection('users').doc(uid).collection('bankSpendingBudgets');
};
const isCurrency=(value)=>['ARS','USD'].includes(value);
export const validateBankBudget=(currency,value)=>{
  if(!isCurrency(currency))throw new Error('Moneda de presupuesto inválida.');
  const limit=parseAmount(value.limit);
  const warnPercent=Number(value.warnPercent ?? 80);
  if(!Number.isInteger(warnPercent)||warnPercent<50||warnPercent>95)
    throw new Error('Elegí un aviso previo entre 50% y 95%.');
  if(limit<=0)throw new Error('El tope debe ser mayor que cero.');
  return {currency,limit,warnPercent,enabled:value.enabled!==false};
};
export const subscribeBankBudgets=(uid,onData,onError)=>{
  if(!uid)return ()=>{};
  return mine(uid).onSnapshot(s=>onData(s.docs.map(d=>({id:d.id,...d.data()}))),onError);
};
export const saveBankBudget=(uid,currency,values)=>{
  const config=validateBankBudget(currency,values);
  return mine(uid).doc(currency).set({...config,updatedAt:new Date()});
};
