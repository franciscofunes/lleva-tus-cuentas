export default function AdvicesAccordion() {
	return (
		<div className='container flex flex-col justify-center md:p-8'>
			<p className='mt-4 mb-8 text-gray-600 dark:text-gray-400'>
				Aprende de estos consejos financieros para el día a día 💪
			</p>
			<div className='space-y-4'>
				<details className='rounded-lg ring-1 ring-purple-600'>
					<summary className='px-4 py-6 text-black-800 dark:text-zinc-300'>
						Conocer mis ingresos y egresos como la palma de la mano
					</summary>
					<p className='px-4 py-6 pt-0 ml-4  text-gray-600 dark:text-gray-400'>
						Esto no implica controlar estrictamente cada centavo que sale de
						nuestra cuenta. Es importante entender que hay gastos que son
						prioritarios y otros que no son necesarios y tienen claras
						alternativas.
					</p>
				</details>
				<details className='rounded-lg ring-1 ring-purple-600 dark:text-zinc-300'>
					<summary className='px-4 py-6 text-black-800'>Haga una lista</summary>
					<p className='px-4 py-6 pt-0 ml-4 -mt-4 text-gray-600 dark:text-gray-400'>
						Hacer una lista conteniendo solamente lo que está en falta garantiza
						que no se distraiga con facilidad de los estantes del mercado y
						compre más allá de lo necesario.
					</p>
				</details>
				<details className='rounded-lg ring-1 ring-purple-600 dark:text-zinc-300'>
					<summary className='px-4 py-6 text-black-800'>
						Comer antes de ir al supermercado
					</summary>
					<p className='px-4 py-6 pt-0 ml-4 -mt-4 text-gray-600 dark:text-gray-400'>
						Al hacer compras con el estómago vacío, es fácil dejarse seducir por
						los dulces y otros alimentos que no necesita comprar en este
						momento.
					</p>
				</details>
			</div>
		</div>
	);
}
