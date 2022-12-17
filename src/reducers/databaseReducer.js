const initState = {
	error: null,
	docs: null,
	categories: null,
	isDataFetching: true,
};

export const databaseReducer = (state = initState, action) => {
	switch (action.type) {
		case 'STORE_DATA':
			return {
				...state,
			};
			break;
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
			break;
		default:
			return state;
	}
};
