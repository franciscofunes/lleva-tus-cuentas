import { firestore } from '../config/firebase.config';

export const storeDataAction = (data) => {
	return (dispatch) => {
		firestore
			.collection('users')
			.doc(data.userId)
			.collection('expenses')
			.add({
				amount: data.amount,
				date: new Date(),
				expenseName: data.name,
				comment: data.comment,
				category: data.category,
				selectedDate: data.selectedDate,
			})
			.then((res) => {
				dispatch({ type: 'STORE_DATA', res });
			})
			.catch((err) => {
				dispatch({ type: 'STORE_ERROR', err });
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
				dispatch({ type: 'DELETE_DOC', docId });
			})
			.catch((err) => {
				console.log(err.message);
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
				amount: data.amount,
				date: new Date(),
				expenseName: data.name,
				comment: data.comment,
				category: data.category,
				selectedDate: data.selectedDate,
			})
			.then(() => {
				dispatch({ type: 'UPDATE_DATA', docId });
			})
			.catch((err) => {
				console.log(err.message);
			});
	};
};
