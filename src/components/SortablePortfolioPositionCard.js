import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { FaGripVertical } from 'react-icons/fa';

function SortablePortfolioPositionCard({
	position,
	children,
	onDragEnd,
	onKeyboardMove,
}) {
	const dragControls = useDragControls();

	const handleKeyDown = (event) => {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			onKeyboardMove?.(position.id, -1);
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			onKeyboardMove?.(position.id, 1);
		}
	};

	return (
		<Reorder.Item
			as='article'
			value={position}
			dragListener={false}
			dragControls={dragControls}
			onDragEnd={onDragEnd}
			layout='position'
			whileDrag={{ scale: 1.01, zIndex: 30 }}
			className='relative bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-5 pt-12 sm:pt-5 shadow-sm'
		>
			<button
				type='button'
				onPointerDown={(event) => dragControls.start(event)}
				onKeyDown={handleKeyDown}
				className='absolute right-4 top-3 inline-flex h-8 w-8 cursor-grab touch-none select-none items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-purple-400 hover:bg-purple-50 hover:text-purple-500 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 dark:border-slate-700 dark:hover:border-purple-500/40 dark:hover:bg-purple-500/10 dark:hover:text-purple-300 sm:right-auto sm:left-4'
				aria-label={`Reordenar ${position.name}. Arrastrá o usá las flechas arriba y abajo.`}
				title='Arrastrar para reordenar'
			>
				<FaGripVertical aria-hidden='true' />
			</button>

			<div className='sm:pl-9'>{children}</div>
		</Reorder.Item>
	);
}

export default SortablePortfolioPositionCard;
