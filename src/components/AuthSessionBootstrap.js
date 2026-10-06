import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { auth } from '../shared/config/firebase/firebase.config';

function AuthSessionBootstrap({ children }) {
	const dispatch = useDispatch();

	useEffect(() => {
		const unsubscribe = auth.onAuthStateChanged((currentUser) => {
			dispatch({
				type: 'SET_USER',
				payload: currentUser,
			});
		});

		return unsubscribe;
	}, [dispatch]);

	return children;
}

export default AuthSessionBootstrap;
