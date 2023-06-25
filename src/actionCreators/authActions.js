import { auth } from '../shared/config/firebase/firebase.config';
import { toast } from 'react-toastify';
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
	return (dispatch) => {
		auth
			.signInWithPopup(googleProvider)
			.then((res) => {
				toast.success(LOGIN_SUCCESS_MESSAGE);

				dispatch({ type: 'LOG_IN_GOOGLE', res });
			})
			.catch((err) => {
				dispatch({ type: 'LOG_IN_ERROR_GOOGLE', err });
			});
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

	return { type: 'LOG_OUT' };
};
