import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import App from './App';
import './index.css';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import LogIn from './pages/LogIn';
import SignUp from './pages/SignUp';
import rootReducer from './reducers/rootReducer';

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
					<Route path='/signup' element={<SignUp />} />
					<Route path='/login' element={<LogIn />} />
					<Route path='/dashboard' element={<Dashboard />} />
				</Routes>
			</Provider>
		</Router>
	</React.StrictMode>
);
