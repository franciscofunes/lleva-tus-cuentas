import { auth } from '../config/firebase.config';
import { toast } from 'react-toastify';
import {
	ERROR_MESSAGE,
	SUCCESS_MESSAGE,
} from '../shared/constants/toast-messages.const';

export const signUpAction = (creds) => {
	return (dispatch) => {
		auth
			.createUserWithEmailAndPassword(creds.email, creds.password)
			.then((res) => {
				res.user.updateProfile({ displayName: creds.username });
			})
			.then(() => {
				dispatch({
					type: 'SIGN_UP',
					res: auth.currentUser,
				});
			})
			.catch((err) => {
				dispatch({ type: 'SIGN_UP_ERROR', err });
			});
	};
};

export const logInAction = (creds) => {
	return (dispatch) => {
		auth
			.signInWithEmailAndPassword(creds.email, creds.password)
			.then((res) => {
				toast.success(SUCCESS_MESSAGE);

				dispatch({ type: 'LOG_IN', res });
			})
			.catch((err) => {
				toast.error(ERROR_MESSAGE);

				dispatch({ type: 'LOG_IN_ERROR', err });
			});
	};
};

export const signInWithGoogleAction = (googleProvider) => {
	return (dispatch) => {
		auth
			.signInWithPopup(googleProvider)
			.then((res) => {
				toast.success(SUCCESS_MESSAGE);

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
				dispatch({ type: 'RESET_PASSWORD', res });
			})
			.catch((err) => {
				dispatch({ type: 'RESET_PASSWORD_ERROR', err });
			});
	};
};

export const logOutAction = () => {
	return { type: 'LOG_OUT' };
};
