import React,{useEffect,useMemo,useRef,useState} from 'react';
import {geoInsight} from '../utils/spendingInsights';

// Small OSM slippy-map renderer: no extra SDK, external geocoding, or API keys.
// Tile requests happen only after user explicitly opens the map.
const TILE=256;
const project=(latitude,longitude,zoom)=>{
  const world=TILE*2**zoom, sine=Math.sin(latitude*Math.PI/180);
  return {x:(longitude+180)/360*world,
    y:(0.5-Math.log((1+sine)/(1-sine))/(4*Math.PI))*world};
};
const fittedZoom=(rows,width,height)=>{
  if(rows.length<2)return 12;
  for(let zoom=14;zoom>=2;zoom--){
    const points=rows.map(row=>project(row.location.latitude,row.location.longitude,zoom));
    const dx=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));
    const dy=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
    if(dx<width-90 && dy<height-90)return zoom;
  }
  return 2;
};
const format=(amount,cur)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:cur,maximumFractionDigits:2}).format(amount);

export default function SpendingMapChart({chartData,categories}) {
  const [currency,setCurrency]=useState('ARS');
  const [opened,setOpened]=useState(false);
  const [width,setWidth]=useState(340);
  const [zoomDelta,setZoomDelta]=useState(0);
  const [selected,setSelected]=useState(null);
  const ref=useRef(null),height=350;
  const expenses=useMemo(()=>geoInsight(chartData,categories,currency),[chartData,categories,currency]);
  useEffect(()=>{
    if(!opened || !ref.current || typeof ResizeObserver==='undefined')return undefined;
    const observer=new ResizeObserver(entries=>{
      const next=entries[0]?.contentRect?.width;
      if(Number.isFinite(next)&&next>0)setWidth(next);
    });
    observer.observe(ref.current);
    return ()=>observer.disconnect();
  },[opened]);
  const center=useMemo(()=>expenses.length?{
    lat:expenses.reduce((n,item)=>n+item.location.latitude,0)/expenses.length,
    lng:expenses.reduce((n,item)=>n+item.location.longitude,0)/expenses.length
  }:{lat:0,lng:0},[expenses]);
  const zoom=Math.min(16,Math.max(2,fittedZoom(expenses,width,height)+zoomDelta));
  const shapes=useMemo(()=>{
    if(!opened||!expenses.length)return {tiles:[],markers:[]};
    const centerPoint=project(center.lat,center.lng,zoom);
    const originX=centerPoint.x-width/2,originY=centerPoint.y-height/2;
    const number=2**zoom,tiles=[];
    for(let x=Math.floor(originX/TILE);x<=Math.floor((originX+width)/TILE);x++) {
      for(let y=Math.floor(originY/TILE);y<=Math.floor((originY+height)/TILE);y++){
        if(y<0||y>=number)continue;
        tiles.push({key:x+':'+y,
          url:'https://tile.openstreetmap.org/'+zoom+'/'+((x%number+number)%number)+'/'+y+'.png',
          left:x*TILE-originX,top:y*TILE-originY});
      }
    }
    const markers=expenses.map((item,index)=>{
      const p=project(item.location.latitude,item.location.longitude,zoom);
      return {key:item.id||index,row:item,left:p.x-originX,top:p.y-originY};
    });
    return {tiles,markers};
  },[opened,expenses,center,width,zoom]);
  return <section aria-label='Mapa de consumos' className='space-y-3'>
    <div className='flex flex-wrap items-start justify-between gap-2'>
      <div><h3 className='text-sm font-extrabold'>Mapa de consumos</h3>
        <p className='text-xs text-slate-600 dark:text-slate-300'>{expenses.length} gastos con ubicación guardada</p></div>
      <div role='group' aria-label='Moneda del mapa' className='flex gap-1'>{['ARS','USD'].map(cur=>
        <button type='button' key={cur} aria-pressed={currency===cur}
          onClick={()=>{setCurrency(cur);setSelected(null);setZoomDelta(0);}}
          className={'min-h-[40px] rounded-lg border px-3 text-xs font-bold '+(currency===cur?'border-purple-600 bg-purple-600 text-white':'border-slate-300 dark:border-slate-600')}>{cur}</button>)}</div>
    </div>
    {!expenses.length?<p role='status' className='rounded-xl border border-dashed border-slate-300 p-5 text-sm dark:border-slate-600'>Aún no hay gastos con coordenadas en el período. Editá un movimiento y seleccioná «Usar ubicación actual» para verlo aquí.</p>:
      !opened?<div className='rounded-xl border border-slate-300 p-4 dark:border-slate-600'>
        <p className='text-sm'>Para mostrar cartografía se pedirán mosaicos de la zona visible a OpenStreetMap. Los importes, comercios y el detalle de las transacciones no se enviarán a ese proveedor.</p>
        <button type='button' onClick={()=>setOpened(true)} className='mt-3 min-h-[44px] rounded-lg bg-purple-600 px-4 text-sm font-bold text-white'>Mostrar mapa de consumos</button>
      </div>:
      <div ref={ref} className='relative h-[350px] w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-200 dark:border-slate-600' aria-label='Mapa interactivo de consumos'>
        {shapes.tiles.map(tile=><img key={tile.key} alt='' draggable={false} loading='lazy' src={tile.url}
          width={256} height={256} style={{position:'absolute',left:tile.left,top:tile.top,width:256,height:256,maxWidth:'none'}}/>)}
        {shapes.markers.map(marker=><button type='button' key={marker.key} title={marker.row.expenseName||'Gasto'}
          aria-label={'Ver gasto '+(marker.row.expenseName||'sin nombre')}
          onClick={()=>setSelected(marker.row)}
          style={{position:'absolute',left:marker.left,top:marker.top,transform:'translate(-50%, -100%)'}}
          className='flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-purple-700 text-white shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400'>●</button>)}
        {selected&&<div className='absolute bottom-10 left-2 right-2 z-10 rounded-xl border border-purple-300 bg-white/95 p-3 text-sm text-slate-900 shadow-lg dark:bg-slate-900/95 dark:text-white'>
          <button type='button' onClick={()=>setSelected(null)} aria-label='Cerrar detalle' className='float-right text-xs font-bold'>✕</button>
          <p className='font-bold'>{selected.expenseName} · {format(Number(selected.amount),currency)}</p>
          <p className='text-xs'>{selected.location?.label||'Lugar sin nombre'} · {selected.selectedDate}</p>
        </div>}
        <div className='absolute right-2 top-2 flex flex-col gap-1'>
          <button type='button' aria-label='Acercar mapa' onClick={()=>setZoomDelta(v=>Math.min(4,v+1))} className='h-10 w-10 rounded-lg bg-white text-lg font-bold text-slate-900 shadow'>+</button>
          <button type='button' aria-label='Alejar mapa' onClick={()=>setZoomDelta(v=>Math.max(-10,v-1))} className='h-10 w-10 rounded-lg bg-white text-lg font-bold text-slate-900 shadow'>−</button>
        </div>
        <a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noreferrer' className='absolute bottom-0 right-0 rounded-tl-md bg-white/90 px-2 py-1 text-[10px] text-slate-900'>© OpenStreetMap contributors</a>
      </div>}
    <p className='text-xs text-slate-600 dark:text-slate-300'>Solo gastos individuales con coordenadas aproximadas, sin resúmenes globales de tarjeta ni conversiones de divisas.</p>
  </section>;
}
