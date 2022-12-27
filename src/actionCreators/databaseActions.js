import { toast } from 'react-toastify';
import { firestore } from '../config/firebase.config';
import {
	CREATE_TRANSACTION_SUCCESS_MESSAGE,
	DELETE_TRANSACTION_WARNING_MESSAGE,
	UPDATE_TRANSACTION_SUCCESS_MESSAGE,
} from '../shared/constants/toast-messages.const';

export const storeDataAction = (data) => {
	return (dispatch) => {
		firestore
			.collection('users')
			.doc(data.userId)
			.collection('expenses')
			.add({
				date: new Date(),
				expenseName: data.name,
				comment: data.comment,
				category: data.category,
				...(data?.amount && {
					amount: data?.amount,
				}),
				selectedDate: data.selectedDate,
				...(data?.selectedExpirationDate && {
					selectedExpirationDate: data?.selectedExpirationDate,
				}),
				...(data?.selectedCloseDate && {
					selectedCloseDate: data?.selectedCloseDate,
				}),
				...(data?.currencyQuantity && {
					currencyQuantity: data?.currencyQuantity,
				}),
				...(data?.currencyExchangeRate && {
					currencyExchangeRate: data?.currencyExchangeRate,
				}),
			})
			.then((res) => {
				toast.success(CREATE_TRANSACTION_SUCCESS_MESSAGE);

				dispatch({ type: 'STORE_DATA', res });
			})
			.catch((err) => {
				dispatch({ type: 'STORE_ERROR', err });
			});
	};
};

export const updateDataAction = (data, docId) => {
	return (dispatch) => {
		firestore
			.collection('users')
			.doc(data.userId)
			.collection('expenses')
			.doc(docId)
			.update({
				date: new Date(),
				expenseName: data.name,
				comment: data.comment,
				category: data.category,
				...(data?.amount && {
					amount: data?.amount,
				}),
				selectedDate: data.selectedDate,
				...(data?.selectedExpirationDate && {
					selectedExpirationDate: data?.selectedExpirationDate,
				}),
				...(data?.selectedCloseDate && {
					selectedCloseDate: data?.selectedCloseDate,
				}),
				...(data?.currencyQuantity && {
					currencyQuantity: data?.currencyQuantity,
				}),
				...(data?.currencyExchangeRate && {
					currencyExchangeRate: data?.currencyExchangeRate,
				}),
			})
			.then((res) => {
				toast.success(UPDATE_TRANSACTION_SUCCESS_MESSAGE);

				dispatch({ type: 'UPDATE_DATA', res });
			})
			.catch((err) => {
				toast.error(err.message);
			});
	};
};

export const getDataAction = (userId) => {
	return (dispatch) => {
		firestore
			.collection('users')
			.doc(userId)
			.collection('expenses')
			.orderBy('date', 'desc')
			.onSnapshot((res) => {
				const data = res.docs.map((d) => ({ id: d.id, ...d.data() }));
				dispatch({ type: 'GOT_DATA', data });
			});
	};
};

export const getCaterogiesDataAction = () => {
	return (dispatch) => {
		firestore
			.collection('categories')
			.orderBy('name', 'asc')
			.onSnapshot((res) => {
				const data = res.docs.map((d) => ({ id: d.id, ...d.data() }));
				dispatch({ type: 'GOT_CATEGORY_DATA', data });
			});
	};
};

export const deleteCardAction = (docId) => {
	return (dispatch, getState) => {
		const userId = getState().auth.user.uid;
		firestore
			.collection('users')
			.doc(userId)
			.collection('expenses')
			.doc(docId)
			.delete()
			.then(() => {
				toast.warn(DELETE_TRANSACTION_WARNING_MESSAGE);

				dispatch({ type: 'DELETE_DOC', docId });
			})
			.catch((err) => {
				toast.error(err.message);
			});
	};
};
