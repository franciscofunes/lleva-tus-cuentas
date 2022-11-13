import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
	apiKey: `${process.env.REACT_APP_API_KEY}`,
	authDomain: `${process.env.REACT_APP_AUTH_DOMAIN}`,
	projectId: `${process.env.REACT_APP_PROJECT_ID}`,
	storageBucket: `${process.env.REACT_APP_STORAGE_BUCKET}`,
	messagingSenderId: `${process.env.REACT_APP_MESSAGING_SENDER_ID}`,
	appId: `${process.env.REACT_APP_APP_ID}`,
	measurementId: `${process.env.REACT_APP_MEASUREMENT_ID}`,
};

const app = firebase.initializeApp(firebaseConfig);

firebase.firestore().settings({ timestampsInSnapshots: true });

export const auth = app.auth();
export const firestore = app.firestore();

export const googleProvider = new firebase.auth.GoogleAuthProvider();

export const signInWithGoogle = () => {
	auth
		.signInWithPopup(googleProvider)
		.then((res) => {
			console.log(res.user);
		})
		.catch((error) => {
			console.log(error.message);
		});
};

export const resetPassword = (email) => {
	return firebase
		.auth()
		.sendPasswordResetEmail(email)
		.then((res) => {
			console.log(res, 'Reset succeed');
		})
		.catch((error) => {
			console.log(error.message);
		});
};

export default firebaseConfig;
