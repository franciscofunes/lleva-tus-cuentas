import moment from 'moment';
import { toast } from 'react-toastify';
import { firestore } from '../shared/config/firebase/firebase.config';
import {
	CREATE_TRANSACTION_SUCCESS_MESSAGE,
	DELETE_TRANSACTION_WARNING_MESSAGE,
	UPDATE_TRANSACTION_SUCCESS_MESSAGE,
	CREATE_SUBSCRIPTION_SUCCESS_MESSAGE,
	SUBSCRIBED_ERROR_MESSAGE,
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

export const storeSubscriptionAction = (data) => {
	return (dispatch) => {
		const subscribersCollection = firestore.collection('subscribers');

		// Query to check if a document with the same 'userId' exists
		const query = subscribersCollection.where('userId', '==', data.userId);

		query
			.get()
			.then((querySnapshot) => {
				if (!querySnapshot.empty) {
					// A document with the same 'userId' already exists, update it

					// Get the first matching document
					const docRef = querySnapshot.docs[0].ref;

					// Update the subscription data
					const expirationDate = new Date();
					expirationDate.setMonth(expirationDate.getMonth() + 1);

					// Increment the renewal counter
					const renewalCounter =
						querySnapshot.docs[0].data().renewalCounter || 0;
					const updatedData = {
						payment_id: data.payment_id,
						collection_status: data.collection_status,
						merchant_order_id: data.merchant_order_id,
						payment_type: data.payment_type,
						subscriptionExpirationDate: expirationDate,
						renewalCounter: renewalCounter + 1,
					};

					// Update the document with the new data
					return docRef.update(updatedData);
				}

				// The document with the same 'userId' does not exist; create a new one

				// Calculate the subscription expiration date (one month from now)
				const expirationDate = new Date();
				expirationDate.setMonth(expirationDate.getMonth() + 1);

				// Now, add the subscription data to the 'subscribers' collection
				return subscribersCollection.add({
					userId: data.userId,
					payment_id: data.payment_id,
					collection_status: data.collection_status,
					merchant_order_id: data.merchant_order_id,
					payment_type: data.payment_type,
					subscriptionExpirationDate: expirationDate,
					createdAt: new Date(),
				});
			})
			.then(() => {
				toast.success(CREATE_SUBSCRIPTION_SUCCESS_MESSAGE);
				dispatch({ type: 'STORE_SUBSCRIPTION_SUCCESS' });
			})
			.catch((err) => {
				if (err.message === 'An error happened while subscribing') {
					// Handle the case where the user already has a subscription
					toast.error(SUBSCRIBED_ERROR_MESSAGE);
				} else {
					toast.error(err.message);
				}
				dispatch({ type: 'STORE_SUBSCRIPTION_ERROR', err });
			});
	};
};

export const getPaymentDataAction = (userId) => {
	return (dispatch) => {
		// 1. Access the 'subscribers' collection
		const subscribersCollection = firestore.collection('subscribers');

		// 2. Query to get the document with a matching 'userId'
		const query = subscribersCollection.where('userId', '==', userId);

		// 3. Dispatch an action to indicate that you're requesting payment data (optional but useful for loading indicators)
		dispatch({ type: 'GET_PAYMENT_DATA_REQUEST' });

		query
			.get()
			.then((querySnapshot) => {
				if (!querySnapshot.empty) {
					// 4. Return the data from the first matching document
					const data = querySnapshot.docs[0].data();

					// 5. Check if the subscription has not expired
					const currentTimestamp = new Date();
					const expirationTimestamp = data.subscriptionExpirationDate.toDate();

					if (currentTimestamp <= expirationTimestamp) {
						// The subscription is still valid
						dispatch({ type: 'GET_PAYMENT_DATA_SUCCESS', data });
					} else {
						// The subscription has expired
						// Display a toast error message

						dispatch({
							type: 'GET_PAYMENT_DATA_ERROR',
							err: { message: 'Su subscripción expiró' },
						});
					}
				} else {
					// 6. Handle the case where no matching document is found
					dispatch({ type: 'GET_PAYMENT_DATA_NOT_FOUND' });
				}
			})
			.catch((err) => {
				// 7. Handle any errors that occur during the request
				// Display a toast error message for other errors
				toast.error(err.message);
				dispatch({ type: 'GET_PAYMENT_DATA_ERROR', err });
			});
	};
};
