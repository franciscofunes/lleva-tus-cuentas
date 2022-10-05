import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: 'AIzaSyDKhprZJp4JDrXykBsWr_dT45CK5-g15o0',
	authDomain: 'lleva-tus-cuentas.firebaseapp.com',
	projectId: 'lleva-tus-cuentas',
	storageBucket: 'lleva-tus-cuentas.appspot.com',
	messagingSenderId: '360305712897',
	appId: '1:360305712897:web:c8109de7823e8bfd1c8500',
	measurementId: 'G-WZ89FCV9EW',
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
firebase.firestore().settings({ timestampsInSnapshots: true });
export const auth = app.auth();
export const firestore = app.firestore();

export default firebaseConfig;
