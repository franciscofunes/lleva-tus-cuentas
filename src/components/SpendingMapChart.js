import React, { useEffect, useMemo, useRef, useState } from 'react';
import { expensesForInsight, geoInsight } from '../utils/spendingInsights';
import { ChartCurrencySwitch, ChartMoney, TransactionChartEmpty } from './TransactionChartSurface';
import TransactionChartSurface from './TransactionChartSurface';
import {
  bucketSpendingByZoom, calculateSpendingMetric, fitSpendingMapZoom,
  locatedSpendingCoverage, projectSpendingPoint, GEO_TILE_SIZE,
} from '../utils/geoSpendingMap';

// Approximate zone clusters are based on screen-space grids. Not official
// neighborhoods or precise address boundaries. Device/search pins are rounded.
const HEIGHT = 352;
const modeOptions = [
  { key:'zones', label:'Zonas', description:'Agrupación aproximada por escala del mapa' },
  { key:'density', label:'Concentración', description:'Intensidad relativa de gastos por zona' },
  { key:'points', label:'Movimientos', description:'Detalle por posición aproximada guardada' },
];
const safeMax = (numbers) => Math.max(1,...numbers);
const cap = (x,min,max) => Math.max(min,Math.min(max,x));
const normalize = (location) => location.source === 'search' ? 'Lugar buscado' : 'Ubicación del dispositivo';

export default function SpendingMapChart({ chartData, categories }) {
  const [currency,setCurrency] = useState('ARS');
  const [mode,setMode] = useState('zones');
  const [metric,setMetric] = useState('count');
  const [opened,setOpened] = useState(false);
  const [width,setWidth] = useState(350);
  const [delta,setDelta] = useState(0);
  const [focus,setFocus] = useState(null);
  const [selection,setSelection] = useState(null);
  const mapRef = useRef(null);

  const all = useMemo(()=>expensesForInsight(chartData,categories,currency),[chartData,categories,currency]);
  const located = useMemo(()=>geoInsight(chartData,categories,currency),[chartData,categories,currency]);
  const coverage = useMemo(()=>locatedSpendingCoverage(all,located),[all,located]);
  const reset = () => { setDelta(0);setFocus(null);setSelection(null); };
  const onCurrency = (next) => {setCurrency(next);reset();};
  const onMode = (next) => {setMode(next);setSelection(null);};

  useEffect(()=>{
    if(!opened || !mapRef.current || typeof ResizeObserver === 'undefined')return undefined;
    const observer=new ResizeObserver(([entry])=>{
      const next=entry?.contentRect?.width;
      if(Number.isFinite(next) && next>0)setWidth(next);
    });
    observer.observe(mapRef.current);
    return ()=>observer.disconnect();
  },[opened]);

  // Date/filter changes keep the modal and chosen layer but reset prior
  // geographical focus, avoiding a stale map center for another period.
  useEffect(()=>{setFocus(null);setDelta(0);setSelection(null);},[chartData,currency]);

  const fitted=useMemo(()=>fitSpendingMapZoom(located,width,HEIGHT),[located,width]);
  const zoom=cap(fitted+delta,2,16);
  const center=useMemo(()=>focus || (located.length?{
    latitude:located.reduce((n,row)=>n+row.location.latitude,0)/located.length,
    longitude:located.reduce((n,row)=>n+row.location.longitude,0)/located.length
  }:{latitude:0,longitude:0}),[focus,located]);

  const groups=useMemo(()=>bucketSpendingByZoom(located,zoom,110),[located,zoom]);
  // In detail mode, overlapping records from the same rounded coordinate share
  // a pin with a list, so repeated visits are still individually discoverable.
  const pins=useMemo(()=>{
    const grouped=new Map();
    located.forEach((row,index)=>{
      const location=row.location;
      const key=location.latitude+':'+location.longitude;
      const item=grouped.get(key)||{id:key,latitude:location.latitude,longitude:location.longitude,records:[],count:0,total:0};
      item.records.push({...row,_mapKey:row.id||row.expenseId||index});
      item.count++;item.total+=Number(row.amount)||0;
      grouped.set(key,item);
    });
    return [...grouped.values()];
  },[located]);

  const overlay=useMemo(()=>{
    if(!opened||!located.length)return {tiles:[],groups:[],pins:[]};
    const c=projectSpendingPoint(center.latitude,center.longitude,zoom);
    const x0=c.x-width/2, y0=c.y-HEIGHT/2;
    const count=2**zoom,tiles=[];
    for(let x=Math.floor(x0/GEO_TILE_SIZE);x<=Math.floor((x0+width)/GEO_TILE_SIZE);x++){
      for(let y=Math.floor(y0/GEO_TILE_SIZE);y<=Math.floor((y0+HEIGHT)/GEO_TILE_SIZE);y++){
        if(y<0||y>=count)continue;
        tiles.push({id:x+':'+y, url:'https://tile.openstreetmap.org/'+zoom+'/'+((x%count+count)%count)+'/'+y+'.png',
          left:x*GEO_TILE_SIZE-x0,top:y*GEO_TILE_SIZE-y0});
      }
    }
    const where=location=>{
      const p=projectSpendingPoint(location.latitude,location.longitude,zoom);
      return {left:p.x-x0,top:p.y-y0};
    };
    return {tiles,groups:groups.map(group=>({...group,...where(group)})),
      pins:pins.map(pin=>({...pin,...where(pin)}))};
  },[opened,located,center,zoom,width,groups,pins]);

  const maxValue=safeMax(groups.map(item=>calculateSpendingMetric(item,metric)));
  const description=modeOptions.find(item=>item.key===mode)?.description;
  const drill = (group) => {
    setFocus({latitude:group.latitude,longitude:group.longitude});
    setSelection(null);
    if(group.count===1 || zoom>=14) {
      setMode('points');
      if(zoom<14)setDelta(v=>cap(v+2,2-fitted,16-fitted));
    } else {
      setDelta(v=>cap(v+2,2-fitted,16-fitted));
    }
  };

  return <TransactionChartSurface title='Mapa de consumos'
    description='Gastos con ubicación del período seleccionado · ARS y USD por separado'
    actions={<ChartCurrencySwitch currency={currency} onChange={onCurrency} label='Moneda del mapa'/>}
    footer='Zonas y concentración usan cuadrículas aproximadas, no límites de barrios. Las ubicaciones se guardan redondeadas; los gastos sin coordenadas no aparecen en el mapa.'>
    <div className='grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/70' role='group' aria-label='Capa del mapa'>
      {modeOptions.map(item=><button type='button' key={item.key} aria-pressed={mode===item.key}
        onClick={()=>onMode(item.key)} className={'min-h-[42px] rounded-lg px-1 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 sm:px-3 '+
          (mode===item.key?'bg-white text-purple-700 shadow-sm dark:bg-slate-700 dark:text-purple-200':'text-slate-700 dark:text-slate-300')}>
        {item.label}</button>)}
    </div>
    <p className='mt-2 text-xs text-slate-600 dark:text-slate-300'>{description}</p>

    <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
      <div>
        <span className='text-sm font-extrabold tabular-nums'>{coverage.located} de {coverage.total}</span>
        <span className='ml-1 text-xs text-slate-600 dark:text-slate-300'>gastos ubicados ({coverage.percentage}%)</span>
      </div>
      <div role='group' aria-label='Métrica geográfica' className='inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800'>
        {[{key:'count',label:'Cantidad'},{key:'amount',label:'Importe'}].map(item=>
          <button type='button' key={item.key} aria-pressed={metric===item.key} onClick={()=>setMetric(item.key)}
            className={'min-h-[36px] rounded-lg px-3 text-xs font-bold focus-visible:ring-2 focus-visible:ring-purple-500 '+
              (metric===item.key?'bg-purple-600 text-white':'text-slate-700 dark:text-slate-200')}>{item.label}</button>)}
      </div>
    </div>

    {!located.length?<div className='mt-4'><TransactionChartEmpty>
      No hay consumos ubicados en {currency} para este período. Editá una transacción y elegí un lugar del buscador o usá tu ubicación actual.
    </TransactionChartEmpty></div>:
      !opened?<div className='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50'>
        <p className='text-sm leading-relaxed'>Para ver las zonas del mapa, se cargarán mosaicos de OpenStreetMap. El proveedor verá la zona cartográfica solicitada, no los nombres ni los importes de tus transacciones.</p>
        <button type='button' onClick={()=>setOpened(true)} className='mt-3 min-h-[44px] rounded-xl bg-purple-600 px-4 text-sm font-bold text-white'>Mostrar mapa</button>
      </div>:
      <div className='mt-4'>
        <div ref={mapRef} className='relative h-[352px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
          aria-label='Mapa interactivo de gastos por ubicación aproximada'>
          {overlay.tiles.map(tile=><img key={tile.id} alt='' draggable={false} loading='lazy' src={tile.url}
            height='256' width='256' style={{position:'absolute',left:tile.left,top:tile.top,width:256,height:256,maxWidth:'none'}} />)}
          {(mode==='zones')&&overlay.groups.map(group=>{
            const weight=calculateSpendingMetric(group,metric)/maxValue;
            const size=cap(38+weight*29,38,67);
            return <button key={group.id} type='button'
              aria-label={'Acercar zona: '+group.count+' consumos en '+currency}
              onClick={()=>drill(group)}
              title={group.count+' consumos; acercar para ver detalle'}
              style={{position:'absolute',left:group.left,top:group.top,width:size,height:size,transform:'translate(-50%,-50%)'}}
              className='flex items-center justify-center rounded-full border-[3px] border-white bg-purple-700/90 text-xs font-extrabold text-white shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400'>
              {metric==='count'?group.count:(group.total>=1000?Math.round(group.total/1000)+'k':Math.round(group.total))}
            </button>;
          })}
          {mode==='density'&&overlay.groups.map(group=>{
            const strength=calculateSpendingMetric(group,metric)/maxValue;
            const diameter=cap(90+Math.sqrt(strength)*110,90,200);
            return <div key={group.id} aria-hidden='true' style={{
              position:'absolute',pointerEvents:'none',left:group.left,top:group.top,
              width:diameter,height:diameter,transform:'translate(-50%,-50%)',
              background:'radial-gradient(circle,rgba(190,24,93,'+(0.25+0.5*strength)+') 0%,rgba(234,88,12,'+(0.1+0.25*strength)+') 35%,rgba(234,88,12,0) 75%)'
            }}/>;
          })}
          {mode==='points'&&overlay.pins.map(pin=>
            <button key={pin.id} type='button' aria-label={'Ver '+pin.count+' movimiento(s) en esta ubicación'}
              onClick={()=>setSelection(pin)}
              style={{position:'absolute',left:pin.left,top:pin.top,transform:'translate(-50%,-100%)'}}
              className='flex h-9 min-w-9 items-center justify-center rounded-full border-[3px] border-white bg-purple-700 px-1 text-xs font-extrabold text-white shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-400'>
              {pin.count>1?pin.count:'●'}
            </button>)}

          <div className='absolute right-2 top-2 flex flex-col gap-1'>
            <button type='button' aria-label='Acercar mapa' onClick={()=>setDelta(v=>cap(v+1,2-fitted,16-fitted))}
              className='h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-900 shadow'>+</button>
            <button type='button' aria-label='Alejar mapa' onClick={()=>setDelta(v=>cap(v-1,2-fitted,16-fitted))}
              className='h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-900 shadow'>−</button>
            <button type='button' aria-label='Mostrar todas las ubicaciones' onClick={reset}
              className='min-h-[36px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 shadow'>Todo</button>
          </div>
          {selection&&mode==='points'&&<div className='absolute bottom-9 left-2 right-2 z-10 max-h-40 overflow-y-auto rounded-xl border border-purple-300 bg-white/95 p-3 text-slate-900 shadow-lg dark:bg-slate-900/95 dark:text-white'>
            <button type='button' aria-label='Cerrar detalle del gasto' className='float-right text-sm font-bold' onClick={()=>setSelection(null)}>✕</button>
            <p className='text-xs font-bold'>{selection.count} movimiento(s) en una ubicación aproximada</p>
            {selection.records.map(row=><div key={row._mapKey} className='mt-2 border-t border-slate-200 pt-2 text-xs dark:border-slate-700'>
              <p className='font-bold'>{row.expenseName||'Gasto'} · <ChartMoney value={row.amount} currency={currency}/></p>
              <p className='text-slate-600 dark:text-slate-300'>{row.location?.label||normalize(row.location)} · {row.selectedDate||'Sin fecha'}</p>
            </div>)}
          </div>}
          <a href='https://www.openstreetmap.org/copyright' target='_blank' rel='noreferrer'
            className='absolute bottom-0 right-0 z-10 rounded-tl-md bg-white/90 px-2 py-1 text-[10px] text-slate-900'>© OpenStreetMap contributors</a>
        </div>
        <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300'>
          <span>{mode==='density'?'Mayor intensidad = más '+(metric==='count'?'operaciones':'importe') :
            mode==='zones'?'Tocá una zona para acercarte':'Tocá un punto para ver sus movimientos'}</span>
          <span>Zoom {zoom} · {metric==='count'?'Cantidad':'Importe '+currency}</span>
        </div>
      </div>}
  </TransactionChartSurface>;
}
