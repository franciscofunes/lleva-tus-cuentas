import { useDispatch } from 'react-redux';
import { signInWithGoogleAction } from '../actionCreators/authActions';
import { googleProvider } from '../shared/config/firebase/firebase.config';
import googleLogo from '../imgs/googleLogo.svg';

function GoogleLoginButton() {
	const dispatch = useDispatch();

	const handleSignInWithGoogleClick = () => {
		dispatch(signInWithGoogleAction(googleProvider));
	};

	return (
		<>
			<button
				className='flex w-full mt-2 flex justify-center py-2 px-2 border
							border-transparent shadow-sm dark:bg-white bg-zinc-100 hover:opacity-95 font-Roboto
							font-medium text-black text-center text-lg rounded-lg focus:ring-2
							focus:outline-none focus:ring-offset-2 focus:ring-red-600
							hover:shadow-md'
				onClick={handleSignInWithGoogleClick}
			>
				<img src={googleLogo} alt='google icon' className='h-8 mr-5' />
				Ingresa con Gmail
			</button>
		</>
	);
}

export default GoogleLoginButton;
