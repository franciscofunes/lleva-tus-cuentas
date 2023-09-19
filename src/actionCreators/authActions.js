import Cookies from 'js-cookie';
import { toast } from 'react-toastify';
import { auth } from '../shared/config/firebase/firebase.config';
import {
	LOGIN_ERROR_MESSAGE,
	LOGIN_SUCCESS_MESSAGE,
	LOGOUT_MESSAGE,
	RESET_PASSWORD_SUCCESS_MESSAGE,
	SIGNUP_ERROR_MESSAGE,
	SIGNUP_ERROR_MESSAGE_EMAIL_EXISTS,
	SIGNUP_SUCCESS_MESSAGE,
} from '../shared/constants/toast-messages.const';

export const signUpAction = (creds) => {
	return (dispatch) => {
		auth
			.createUserWithEmailAndPassword(creds.email, creds.password)
			.then((res) => {
				res.user.sendEmailVerification();
				res.user.updateProfile({ displayName: creds.username });
			})
			.then(() => {
				toast.success(SIGNUP_SUCCESS_MESSAGE);

				dispatch({
					type: 'SIGN_UP',
					res: auth.currentUser,
				});
			})
			.catch((err) => {
				err.toString().includes('already')
					? toast.error(SIGNUP_ERROR_MESSAGE_EMAIL_EXISTS)
					: toast.error(SIGNUP_ERROR_MESSAGE);

				dispatch({ type: 'SIGN_UP_ERROR', err });
			});
	};
};

export const logInAction = (creds) => {
	return (dispatch) => {
		auth
			.signInWithEmailAndPassword(creds.email, creds.password)
			.then((res) => {
				toast.success(LOGIN_SUCCESS_MESSAGE);

				dispatch({ type: 'LOG_IN', res });
			})
			.catch((err) => {
				toast.error(LOGIN_ERROR_MESSAGE);

				dispatch({ type: 'LOG_IN_ERROR', err });
			});
	};
};

export const signInWithGoogleAction = (googleProvider) => {
	return async (dispatch) => {
		try {
			const result = await auth.signInWithPopup(googleProvider);
			const user = result.user;

			// Store user information in a cookie
			Cookies.set('userContext', JSON.stringify(user)); // Store user object as JSON

			// Dispatch action and handle success
			toast.success(LOGIN_SUCCESS_MESSAGE);
			dispatch({ type: 'LOG_IN_GOOGLE', res: result });
		} catch (error) {
			// Handle error if Google Auth fails
			console.error('Google Auth error:', error);
			dispatch({ type: 'LOG_IN_ERROR_GOOGLE', err: error.message });
		}
	};
};

export const resetPassword = (creds) => {
	return (dispatch) => {
		auth
			.sendPasswordResetEmail(creds.email)
			.then((res) => {
				toast.success(RESET_PASSWORD_SUCCESS_MESSAGE);

				dispatch({ type: 'RESET_PASSWORD', res });
			})
			.catch((err) => {
				dispatch({ type: 'RESET_PASSWORD_ERROR', err });
			});
	};
};

export const logOutAction = () => {
	toast.warn(LOGOUT_MESSAGE);

	// Remove the 'userContext' cookie from the browser when the user logs out
	Cookies.remove('userContext');

	return { type: 'LOG_OUT' };
};
