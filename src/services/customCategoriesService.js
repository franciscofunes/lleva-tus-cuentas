import firebase from 'firebase/compat/app';
import { firestore } from '../shared/config/firebase/firebase.config';
import { categoryDocumentId, validateCustomCategory } from '../utils/customCategories';
import { validateCategoryExtraFields } from '../utils/categoryExtraFields';

const collectionForUser = (uid) => firestore.collection('users').doc(uid).collection('customCategories');

export const saveCustomCategory = async (uid, draft, categories = []) => {
  if (!uid) throw new Error('Iniciá sesión para guardar categorías.');
  const name = String(draft.name || '').replace(/\s+/g, ' ').trim();
  const extraFieldIds = draft.extraFieldIds || [];
  const invalid = validateCustomCategory({ name, isExpense: draft.isExpense }, categories)
    || validateCategoryExtraFields(extraFieldIds);
  if (invalid) throw new Error(invalid);
  const id = categoryDocumentId(name);
  // Deterministic ID plus create() prevents racing tabs creating duplicate categories.
  await collectionForUser(uid).doc(id).set({
    name, isExpense: draft.isExpense, active: true,
    ...(extraFieldIds.length ? { extraFieldIds } : {}),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return id;
};

export const setCustomCategoryActive = async (uid, id, active) => {
  if (!uid || !id || typeof active !== 'boolean') throw new Error('Categoría inválida.');
  await collectionForUser(uid).doc(id).update({
    active, updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
};
