import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function TransactionsSkeleton() {
	return <div className='w-full animate-pulse' aria-label='Cargando transacciones'>
		<div className='grid grid-cols-3 gap-3 mb-6'>
			{[0,1,2].map((item)=><div key={item} className='rounded-xl border border-slate-700/40 p-3'><Skeleton height={14}/><Skeleton height={24} className='mt-2'/></div>)}
		</div>
		<div className='rounded-xl border border-slate-700/40 p-4 mb-6'><Skeleton height={190}/></div>
		<Skeleton width={210} height={32} className='mb-4'/>
		<div className='space-y-3'>{[0,1,2,3].map((item)=><div key={item} className='rounded-xl border border-slate-700/40 p-4'><Skeleton width='45%' height={18}/><Skeleton width='70%' height={13} className='mt-2'/><Skeleton width='30%' height={16} className='mt-2'/></div>)}</div>
	</div>;
}
