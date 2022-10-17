const initState = {
	error: null,
	docs: null,
	isDataFetching: true,
};

export const databaseReducer = (state = initState, action) => {
	switch (action.type) {
		case 'STORE_DATA':
			break;
		case 'GOT_DATA':
			return { ...state, docs: action.data, isDataFetching: false };
		case 'STORE_ERROR':
			return { ...state, error: action.err.message };
		case 'DELETE_DOC':
			return {
				...state,
				docs: state.docs.filter((doc) => doc.id !== action.docId),
			};
		case 'UPDATE_DATA':
			break;
		default:
			return state;
	}
};
