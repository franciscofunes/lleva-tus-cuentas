import Navbar from './components/Navbar';
import { ToastContainer } from 'react-toastify';

function App() {
	return (
		<div className='max-w-full max-h-full flex flex-col relative'>
			<Navbar />
			<ToastContainer
				position='bottom-center'
				autoClose={500}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme='dark'
			/>
		</div>
	);
}

export default App;
