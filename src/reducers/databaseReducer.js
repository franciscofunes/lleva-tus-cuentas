const initState = {
	error: null,
	docs: null,
	categories: null,
	isDataFetching: true,
	selectedFilter: 'month',
	isFilterChanging: false,
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
		default:
			return state;
	}
};
