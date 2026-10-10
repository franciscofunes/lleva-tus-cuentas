import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import AnimatedRoutes from './components/AnimatedRoutes';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import App from './App';
import AuthSessionBootstrap from './components/AuthSessionBootstrap';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import LogIn from './pages/LogIn';
import SignUp from './pages/SignUp';
import rootReducer from './reducers/rootReducer';
import SubscriptionCard from './pages/Subscription';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import Portfolio from './pages/Portfolio';
import PortfolioDetail from './pages/PortfolioDetail';

const store = createStore(rootReducer, applyMiddleware(thunk));

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
	<React.StrictMode>
		<Router>
			<Provider store={store}>
				<AuthSessionBootstrap>
					<App />
					<AnimatedRoutes>
						<Route exact path='/' element={<Home />} />
						<Route path='/registrarse' element={<SignUp />} />
						<Route path='/ingresar' element={<LogIn />} />
						<Route path='/recupero' element={<ForgotPassword />} />
						<Route
							path='/transacciones'
							element={
								<ProtectedRoute>
									<Dashboard />
								</ProtectedRoute>
							}
						/>
						<Route
							path='/portfolio'
							element={
								<ProtectedRoute>
									<Portfolio />
								</ProtectedRoute>
							}
						/>
						<Route
							path='/portfolio/:positionId'
							element={
								<ProtectedRoute>
									<PortfolioDetail />
								</ProtectedRoute>
							}
						/>
						<Route
							path='/subscripcion'
							element={
								<ProtectedRoute>
									<SubscriptionCard />
								</ProtectedRoute>
							}
						/>
						<Route
							path='/pago-exitoso'
							element={
								<ProtectedRoute>
									<PaymentSuccess />
								</ProtectedRoute>
							}
						/>
						<Route
							path='/pago-fallido'
							element={
								<ProtectedRoute>
									<PaymentFailed />
								</ProtectedRoute>
							}
						/>
					</AnimatedRoutes>
				</AuthSessionBootstrap>
			</Provider>
		</Router>
	</React.StrictMode>
);
