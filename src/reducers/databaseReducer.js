const initState = {
	error: null,
	docs: null,
	categories: null,
	isDataFetching: true,
	selectedFilter: 'month',
	isFilterChanging: false,
	savedSubscription: true,
	hasSubscription: false,
};

export const databaseReducer = (state = initState, action) => {
	switch (action.type) {
		case 'STORE_DATA':
			return {
				...state,
			};
		case 'GOT_DATA':
			return { ...state, docs: action.data, isDataFetching: false };
		case 'GOT_CATEGORY_DATA':
			return { ...state, categories: action.data, isDataFetching: false };
		case 'STORE_ERROR':
			return { ...state, error: action.err.message };
		case 'DELETE_DOC':
			return {
				...state,
				docs: state.docs.filter((doc) => doc.id !== action.docId),
			};
		case 'UPDATE_DATA':
			return {
				...state,
			};
		case 'SET_EXPENSES':
			return {
				...state,
				docs: action.expenses,
				isDataFetching: false,
			};
		case 'SEARCH_EXPENSES':
			return {
				...state,
				docs: action.expenses,
			};
		case 'SET_FETCHING':
			return {
				...state,
				isDataFetching: action.isDataFetching,
			};
		case 'SET_SELECTED_FILTER':
			return {
				...state,
				selectedFilter: action.filter,
			};
		case 'SET_FILTER_CHANGING':
			return {
				...state,
				isFilterChanging: action.isFilterChanging,
			};
		case 'STORE_SUBSCRIPTION_SUCCESS':
			return {
				...state,
				savedSubscription: action.savedSubscription,
			};
		case 'STORE_SUBSCRIPTION_ERROR':
			return {
				...state,
				savedSubscription: !action.savedSubscription,
			};
		case 'USER_HAS_SUBSCRIPTION':
			return {
				...state,
				hasSubscription: action.hasSubscription,
			};
		case 'GET_PAYMENT_DATA_SUCCESS': // Handle the new action
			return {
				...state,
				paymentData: action.data, // Store payment data retrieved from Firestore
			};
		case 'GET_PAYMENT_DATA_NOT_FOUND': // Handle the new action
			return {
				...state,
				paymentData: null, // Reset payment data if not found
			};
		case 'GET_PAYMENT_DATA_ERROR': // Handle the new action
			return {
				...state,
				paymentDataError: action.err.message, // Store error if any
			};
		default:
			return state;
	}
};
