import React, { useState, useEffect } from 'react';
import { FaSearch, FaTrash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import {
	getTotalBalance,
	searchExpenses,
} from '../actionCreators/databaseActions';

function SearchBar() {
	const [searchTerm, setSearchTerm] = useState('');
	const [categoriesNames, setCategoriesNames] = useState([]);

	const dispatch = useDispatch();

	const user = useSelector((state) => state.auth.user);
	const categories = useSelector((state) => state.database.categories);

	const handleSubmit = (event) => {
		event.preventDefault();
		dispatch(searchExpenses(searchTerm, user.uid));
	};

	const handleClearSearch = () => {
		setSearchTerm('');
		dispatch(getTotalBalance(user.uid));
	};

	useEffect(() => {
		if (categories) {
			setCategoriesNames(categories.map((category) => category.name));
		}
	}, [categories]);

	return (
		<form onSubmit={handleSubmit}>
			<div className='ml-2 mb-2 flex relative w-4/5 sm:w-4/5 md:w-4/5'>
				<input
					type='text'
					className='bg-gray-200 rounded-md py-2 px-4 flex-1 appearance-none leading-normal'
					list='expense-names'
					value={searchTerm}
					placeholder='Busca por categoría'
					onChange={(e) => setSearchTerm(e.target.value)}
				/>
				<datalist id='expense-names'>
					{categoriesNames
						.filter((name, index, self) => self.indexOf(name) === index)
						.map((name) => (
							<option key={name} value={name} />
						))}
				</datalist>
				<div className='absolute top-0 right-0 flex justify-center items-center mt-1'>
					<button type='submit' className='p-2 text-gray-400'>
						<FaSearch />
					</button>
					<button
						type='button'
						className='p-2 text-gray-400'
						onClick={handleClearSearch}
					>
						<FaTrash />
					</button>
				</div>
			</div>
		</form>
	);
}

export default SearchBar;
