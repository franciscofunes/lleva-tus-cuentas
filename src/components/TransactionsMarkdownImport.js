import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { importTransactionsAction } from '../actionCreators/databaseActions';
import { parseTransactionsMarkdown } from '../utils/transactionsMarkdown';

export default function TransactionsMarkdownImport({ closeModal }) {
	const dispatch = useDispatch(); const user = useSelector((state) => state.auth.user);
	const [markdown,setMarkdown]=useState(''); const [rows,setRows]=useState([]); const [loading,setLoading]=useState(false);
	const selected=useMemo(()=>rows.filter((row)=>row.selected && !row.errors.length),[rows]);
	const total=selected.reduce((sum,row)=>sum+Number(row.currencyQuantity||0),0);
	const preview=()=>{ const parsed=parseTransactionsMarkdown(markdown); setRows(parsed); if(!parsed.length) toast.info('No se encontraron transacciones en el Markdown'); };
	const toggle=(index)=>setRows((current)=>current.map((row,i)=>i===index?{...row,selected:!row.selected}:row));
	const run=async()=>{ if(!selected.length||loading)return; setLoading(true); try { const result=await dispatch(importTransactionsAction(user.uid,selected)); toast.success(`${result.imported} transacción(es) importadas${result.duplicates ? ` · ${result.duplicates} duplicada(s) omitidas` : ''}`); closeModal(); } catch(error){ toast.error(error.message||'No se pudieron importar las transacciones'); } finally { setLoading(false); } };
	return <div className='text-white max-h-[78dvh] overflow-y-auto pr-3'>
		<h2 className='text-xl font-bold pr-10'>Importar transacciones con Markdown</h2>
		<p className='mt-2 text-sm text-gray-300'>Pegá el Markdown generado desde extractos o capturas. LTC lo interpreta y pre-rellena las transacciones en un preview editable/seleccionable antes de guardar.</p>
		<textarea className='w-full min-h-[180px] mt-4 rounded-lg border border-purple-600 bg-slate-800 p-3 text-sm' value={markdown} onChange={(e)=>{setMarkdown(e.target.value);setRows([]);}} placeholder={'### LTC Transactions Import\n\n- name: Rendimiento Prex\n  category: Ingreso divisas\n  date: 2026-07-31\n  currencyQuantity: 18.42\n  institution: Prex\n  period: 2026-07'} />
		<button type='button' disabled={!markdown.trim()||loading} onClick={preview} className='w-full mt-3 py-2.5 rounded-lg bg-secondary disabled:opacity-40 font-semibold'>{loading?<span className='inline-flex items-center gap-2'><span className='w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin' />Procesando…</span>:'Pre-rellenar desde Markdown'}</button>
		{rows.length>0 && <div className='mt-4 space-y-2'>
			<div className='flex justify-between text-sm'><strong>{selected.length} seleccionada(s)</strong><strong>Total divisas: {total.toFixed(2)}</strong></div>
			{rows.map((row,index)=><label key={row.importKey+index} className='flex gap-3 rounded-lg border border-slate-700 p-3 cursor-pointer'>
				<input type='checkbox' checked={row.selected} disabled={row.errors.length>0||loading} onChange={()=>toggle(index)} />
				<span className='min-w-0 text-sm'><strong>{row.name}</strong><span className='block text-gray-300'>{row.selectedDate} · {row.category} · {row.currencyQuantity}</span><span className='block text-xs text-gray-400'>{row.institution} {row.period}</span>{row.errors.length>0&&<span className='block text-xs text-red-400'>{row.errors.join(' · ')}</span>}</span>
			</label>)}
			<button type='button' disabled={!selected.length||loading} onClick={run} className='w-full mt-3 py-3 rounded-lg bg-ltc-green disabled:opacity-40 disabled:cursor-wait font-bold'>
				{loading?<span className='inline-flex items-center gap-2'><span className='w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin' />Importando…</span>:`Importar ${selected.length} transacción(es)`}
			</button>
		</div>}
	</div>;
}
