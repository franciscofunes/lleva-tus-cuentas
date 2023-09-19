import moment from 'moment';
import { toast } from 'react-toastify';
import { firestore } from '../shared/config/firebase/firebase.config';
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
	const currentMonth = moment().month();
	const currentYear = moment().year();

	return (dispatch) => {
		firestore
			.collection('users')
			.doc(userId)
			.collection('expenses')
			.where(
				'selectedDate',
				'>=',
				moment()
					.year(currentYear)
					.month(currentMonth)
					.startOf('month')
					.format('YYYY-MM-DD')
			)
			.where(
				'selectedDate',
				'<=',
				moment()
					.year(currentYear)
					.month(currentMonth)
					.endOf('month')
					.format('YYYY-MM-DD')
			)
			.orderBy('selectedDate', 'desc')
			.onSnapshot((res) => {
				const data = res.docs.map((d) => ({ id: d.id, ...d.data() }));
				dispatch({ type: 'GOT_DATA', data });
			});
	};
};

export const getTotalBalance = (userId) => {
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

export const getCategoriesDataAction = () => {
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

export const filterDataAction = (
	userId,
	filterType,
	year,
	month,
	week,
	day
) => {
	return (dispatch) => {
		let startDate, endDate;

		switch (filterType) {
			case 'month':
				startDate = moment()
					.year(year)
					.month(month)
					.startOf('month')
					.format('YYYY-MM-DD');
				endDate = moment()
					.year(year)
					.month(month)
					.endOf('month')
					.format('YYYY-MM-DD');
				break;
			case 'year':
				startDate = moment().year(year).startOf('year').format('YYYY-MM-DD');
				endDate = moment().year(year).endOf('year').format('YYYY-MM-DD');
				break;
			case 'week':
				startDate = moment()
					.year(year)
					.month(month)
					.week(week)
					.startOf('week')
					.format('YYYY-MM-DD');
				endDate = moment()
					.year(year)
					.month(month)
					.week(week)
					.endOf('week')
					.format('YYYY-MM-DD');
				break;
			case 'day':
				startDate = moment()
					.year(year)
					.month(month)
					.date(day)
					.format('YYYY-MM-DD');
				endDate = moment()
					.year(year)
					.month(month)
					.date(day)
					.format('YYYY-MM-DD');
				break;
			default:
				startDate = moment()
					.year(year)
					.month(month)
					.startOf('month')
					.format('YYYY-MM-DD');
				endDate = moment()
					.year(year)
					.month(month)
					.endOf('month')
					.format('YYYY-MM-DD');
				break;
		}

		firestore
			.collection('users')
			.doc(userId)
			.collection('expenses')
			.where('selectedDate', '>=', startDate)
			.where('selectedDate', '<=', endDate)
			.orderBy('selectedDate', 'desc')
			.get()
			.then((snapshot) => {
				const expenses = [];

				snapshot.forEach((doc) => {
					expenses.push({ id: doc.id, ...doc.data() });
				});

				dispatch({ type: 'SET_EXPENSES', expenses });
			})
			.catch((error) => {
				console.error(error);
			});
	};
};

export const searchExpenses = (searchTerm, userId) => (dispatch) => {
	const escapedSearchTerm = searchTerm.replace('í', '\\í');

	const categoryQuery = firestore
		.collection('users')
		.doc(userId)
		.collection('expenses')
		.where('category', '==', escapedSearchTerm);

	const commentQuery = firestore
		.collection('users')
		.doc(userId)
		.collection('expenses')
		.where('comment', '==', escapedSearchTerm);

	const expenseNameQuery = firestore
		.collection('users')
		.doc(userId)
		.collection('expenses')
		.where('expenseName', '==', escapedSearchTerm);

	Promise.all([categoryQuery.get(), commentQuery.get(), expenseNameQuery.get()])
		.then(([categorySnapshot, commentSnapshot, expenseNameSnapshot]) => {
			const expenses = [];

			categorySnapshot.forEach((doc) => {
				expenses.push({ ...doc.data(), id: doc.id });
			});

			commentSnapshot.forEach((doc) => {
				const existingExpense = expenses.find(
					(expense) => expense.id === doc.id
				);
				if (!existingExpense) {
					expenses.push({ ...doc.data(), id: doc.id });
				}
			});

			expenseNameSnapshot.forEach((doc) => {
				const existingExpense = expenses.find(
					(expense) => expense.id === doc.id
				);
				if (!existingExpense) {
					expenses.push({ ...doc.data(), id: doc.id });
				}
			});

			dispatch({ type: 'SEARCH_EXPENSES', expenses });
		})
		.catch((error) => {
			console.error('Error searching expenses: ', error);
		});
};

export const setSelectedFilter = (filter) => ({
	type: 'SET_SELECTED_FILTER',
	filter,
});

export const setFilterChanging = (isFilterChanging) => {
	return {
		type: 'SET_FILTER_CHANGING',
		isFilterChanging,
	};
};
