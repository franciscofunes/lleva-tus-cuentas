import firebase from 'firebase/compat/app';
import { firestore } from '../shared/config/firebase/firebase.config';
import { categoryDocumentId, validateCategoryDisplayName, validateCustomCategory, validateCustomCategoryDateBehavior, CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR, LEGACY_CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR } from '../utils/customCategories';
import { validateCategoryExtraFields } from '../utils/categoryExtraFields';

const collectionForUser = (uid) => firestore.collection('users').doc(uid).collection('customCategories');

export const saveCustomCategory = async (uid, draft, categories = []) => {
  if (!uid) throw new Error('Iniciá sesión para guardar categorías.');
  const name = String(draft.name || '').replace(/\s+/g, ' ').trim();
  const extraFieldIds = draft.extraFieldIds || [];
  const invalid = validateCustomCategory({ name, isExpense: draft.isExpense }, categories)
    || validateCategoryExtraFields(extraFieldIds)
    || validateCustomCategoryDateBehavior(draft.dateBehavior);
  if (invalid) throw new Error(invalid);
  const id = categoryDocumentId(name);
  // Deterministic ID plus create() prevents racing tabs creating duplicate categories.
  await collectionForUser(uid).doc(id).set({
    name, isExpense: draft.isExpense, active: true,
    ...(extraFieldIds.length ? { extraFieldIds } : {}),
    ...([CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR, LEGACY_CUSTOM_CATEGORY_DUE_DATE_BEHAVIOR].includes(draft.dateBehavior)
      ? { dateBehavior: draft.dateBehavior } : {}),
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

/**
 * Safe rename: the immutable canonical name remains the Firestore reference
 * used by old expenses, charts and reminders. Only the visible label changes.
 * No data migration, reclassification or extra write quota is required.
 */
export const updateCustomCategoryLabel = async (uid, entry, nextLabel, categories = []) => {
  if (!uid || !entry?.id || entry?.origin !== 'custom' || entry?.isCustom !== true)
    throw new Error('Solo podés editar categorías personales.');
  const label = String(nextLabel || '').replace(/\\s+/g, ' ').trim();
  const error = validateCategoryDisplayName(label, categories, entry.id);
  if (error) throw new Error(error);
  // A label matching the canonical name resets the visual override.
  const displayName = label === entry.name ? entry.name : label;
  await collectionForUser(uid).doc(entry.id).update({
    displayName,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return displayName;
};
