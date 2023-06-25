import { auth } from '../shared/config/firebase/firebase.config';

const initState = {
	user: null,
	isFetching: true,
	signUpError: null,
	logInError: null,
	resetPasswordError: null,
};

export const authReducer = (state = initState, action) => {
	switch (action.type) {
		case 'SIGN_UP':
			return {
				...state,
				user: action.res.user,
				signUpError: null,
			};
		case 'SET_USER':
			return { ...state, user: action.payload, isFetching: false };
		case 'SIGN_UP_ERROR':
			return { ...state, signUpError: action.err.message };
		case 'LOG_IN':
			return {
				...state,
				logInError: null,
				user: action.res.user,
			};
		case 'LOG_IN_ERROR':
			return {
				...state,
				logInError: action.err.message,
			};
		case 'LOG_IN_GOOGLE':
			return {
				...state,
				logInError: null,
				user: action.res.user,
				isFetching: false,
			};
		case 'LOG_IN_ERROR_GOOGLE':
			return { ...state, logInError: action.err.message };
		case 'LOG_OUT':
			auth.signOut();
			return {
				...state,
				isFetching: false,
				user: null,
				database: null,
			};
		case 'RESET_PASSWORD':
			return {
				...state,
				user: action.res.user,
				resetPasswordError: null,
			};
		case 'RESET_PASSWORD_ERROR':
			return {
				...state,
				user: action.res.user,
				resetPasswordError: action.err.message,
			};
		default:
			return state;
	}
};
