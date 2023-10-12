import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import App from './App';
import './index.css';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import LogIn from './pages/LogIn';
import SignUp from './pages/SignUp';
import rootReducer from './reducers/rootReducer';
import SubscriptionCard from './pages/Subscription';

const store = createStore(rootReducer, applyMiddleware(thunk));

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
	<React.StrictMode>
		<Router>
			<Provider store={store}>
				<App />
				<Routes>
					<Route exact path='/' element={<Home />} />
					<Route path='/registrarse' element={<SignUp />} />
					<Route path='/ingresar' element={<LogIn />} />
					<Route path='/transacciones' element={<Dashboard />} />
					<Route path='/recupero' element={<ForgotPassword />} />
					<Route path='/subscripcion' element={<SubscriptionCard />} />
				</Routes>
			</Provider>
		</Router>
	</React.StrictMode>
);
