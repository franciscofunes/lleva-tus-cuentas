import React, { useEffect, useMemo, useRef, useState } from 'react';
import TransactionChartSurface, {ChartCurrencySwitch, ChartMoney, TransactionChartEmpty} from './TransactionChartSurface';
import {geoEligibleRecords,geoLocatedRecords} from '../utils/geoTransactionInsights';
import {bucketSpendingByZoom,geographicCenter,fitSpendingMapZoom,projectSpendingPoint,
  unprojectSpendingPoint,wrappedWorldDeltaX,movedMapCenter,GEO_TILE_SIZE,clamp,h3ResolutionForZoom} from '../utils/geoSpendingMap';

const HEIGHT=352;
const MODES=[
 {key:'zones',label:'Zonas H3',description:'Hexágonos H3: de regiones a zonas más pequeñas al acercarte'},
 {key:'density',label:'Concentración',description:'Intensidad relativa en hexágonos H3, no barrios oficiales'},
 {key:'points',label:'Movimientos',description:'Transacciones con posiciones aproximadas guardadas'},
];
const FLOWS=[{key:'expense',label:'Gastos'},{key:'income',label:'Ingresos'},{key:'all',label:'Ambos'}];
const formatShort=(value)=>new Intl.NumberFormat('es-AR',{notation:'compact',maximumFractionDigits:1}).format(value);
const markerColor=(kind)=>kind==='income'?'bg-emerald-600':kind==='expense'?'bg-rose-600':'bg-purple-700';

export default function SpendingMapChart({chartData,categories}) {
  const [currency,setCurrency]=useState('ARS');
  const [flow,setFlow]=useState('expense');
  const [mode,setMode]=useState('zones');
  const [metric,setMetric]=useState('count');
  const [opened,setOpened]=useState(false);
  const [width,setWidth]=useState(350);
  const [delta,setDelta]=useState(0);
  const [focus,setFocus]=useState(null);
  const [selection,setSelection]=useState(null);
  const mapRef=useRef(null);
  const dragRef=useRef(null);
  const lastMoved=useRef(false);

  const eligible=useMemo(()=>geoEligibleRecords(chartData,categories,currency,flow),[chartData,categories,currency,flow]);
  const located=useMemo(()=>geoLocatedRecords(chartData,categories,currency,flow),[chartData,categories,currency,flow]);
  const coverage=useMemo(()=>({
    total:eligible.length,located:located.length,percentage:eligible.length?Math.round(located.length/eligible.length*100):0
  }),[eligible,located]);
  const fitted=useMemo(()=>fitSpendingMapZoom(located,width,HEIGHT),[located,width]);
  const zoom=clamp(fitted+delta,0,17);
  const center=useMemo(()=>focus||geographicCenter(located),[focus,located]);

  const clearView=()=>{setFocus(null);setDelta(0);setSelection(null);};
  const updateCurrency=value=>{setCurrency(value);clearView();};
  const updateFlow=value=>{setFlow(value);setMetric('count');clearView();};
  const updateMode=value=>{setMode(value);setSelection(null);};
  const worldView=()=>{setFocus({latitude:0,longitude:0});setDelta(-fitted);setSelection(null);};
  const shiftBy=(dx,dy)=>{setFocus(movedMapCenter(center,zoom,dx,dy));setSelection(null);};
  const changeZoom=(amount)=>{setDelta(value=>clamp(value+amount,-fitted,17-fitted));setSelection(null);};

  useEffect(()=>{
    if(!opened||!mapRef.current||typeof ResizeObserver==='undefined')return undefined;
    const observer=new ResizeObserver(([entry])=>{
      const next=entry?.contentRect?.width;
      if(Number.isFinite(next)&&next>0)setWidth(next);
    });
    observer.observe(mapRef.current);
    return ()=>observer.disconnect();
  },[opened]);

  useEffect(()=>{setFocus(null);setDelta(0);setSelection(null);},[chartData,flow,currency]);

  useEffect(()=>{
    const node=mapRef.current;
    if(!opened||!node)return undefined;
    const onWheel=event=>{
      event.preventDefault();
      if(Math.abs(event.deltaY)<1)return;
      changeZoom(event.deltaY>0?-1:1);
    };
    node.addEventListener('wheel',onWheel,{passive:false});
    return ()=>node.removeEventListener('wheel',onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[opened,fitted]);

  const grouped=useMemo(()=>bucketSpendingByZoom(located,zoom),[located,zoom]);
  const points=useMemo(()=>{
    const groupedPoints=new Map();
    located.forEach((row,index)=>{
      const key=row.location.latitude+':'+row.location.longitude;
      const item=groupedPoints.get(key)||{id:key,latitude:row.location.latitude,
        longitude:row.location.longitude,records:[],count:0,kind:row._geoKind};
      item.count++;
      if(item.kind!==row._geoKind)item.kind='all';
      item.records.push({...row,_mapKey:row.id||row.expenseId||index});
      groupedPoints.set(key,item);
    });
    return [...groupedPoints.values()];
  },[located]);

  const overlay=useMemo(()=>{
    if(!opened||!located.length)return {tiles:[],groups:[],pins:[]};
    const cp=projectSpendingPoint(center.latitude,center.longitude,zoom);
    const size=GEO_TILE_SIZE*2**zoom, x0=cp.x-width/2, y0=cp.y-HEIGHT/2;
    const n=2**zoom, tiles=[];
    // Draw only visible tiles. Wrap longitude infinitely; cap latitude at
    // Mercator bounds. Standard browser caching obeys the OSM tile policy.
    for(let x=Math.floor(x0/GEO_TILE_SIZE);x<=Math.floor((x0+width)/GEO_TILE_SIZE);x++){
      for(let y=Math.floor(y0/GEO_TILE_SIZE);y<=Math.floor((y0+HEIGHT)/GEO_TILE_SIZE);y++){
        if(y<0||y>=n)continue;
        tiles.push({id:x+':'+y,url:'https://tile.openstreetmap.org/'+zoom+'/'+((x%n+n)%n)+'/'+y+'.png',
          left:x*GEO_TILE_SIZE-x0,top:y*GEO_TILE_SIZE-y0});
      }
    }
    const position=({latitude,longitude})=>{
      const p=projectSpendingPoint(latitude,longitude,zoom);
      return {left:width/2+wrappedWorldDeltaX(p.x,cp.x,zoom),top:HEIGHT/2+p.y-cp.y};
    };
    const groups=grouped.map(group=>{
      const at=position(group);
      const polygon=group.boundary.map(point=>{
        const p=projectSpendingPoint(point.latitude,point.longitude,zoom);
        const anchor=projectSpendingPoint(group.latitude,group.longitude,zoom);
        return {x:at.left+wrappedWorldDeltaX(p.x,anchor.x,zoom),
          y:at.top+p.y-anchor.y};
      });
      return {...group,...at,polygon};
    });
    const pins=points.map(point=>({...point,...position(point)}));
    return {tiles,groups,pins};
  },[opened,located,center,zoom,width,grouped,points]);

  const max=Math.max(1,...grouped.map(group=>metric==='amount'?group.total:group.count));
  const panStart=event=>{
    if(event.button!==undefined && event.button!==0)return;
    if(event.target.closest('button, a'))return;
    dragRef.current={pointer:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
    lastMoved.current=false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const panMove=event=>{
    const prev=dragRef.current;
    if(!prev||prev.pointer!==event.pointerId)return;
    const dx=event.clientX-prev.x,dy=event.clientY-prev.y;
    if(!dx&&!dy)return;
    if(Math.abs(dx)+Math.abs(dy)>2)prev.moved=true;
    lastMoved.current=prev.moved;
    dragRef.current={...prev,x:event.clientX,y:event.clientY};
    shiftBy(dx,dy);
  };
  const panEnd=event=>{
    if(dragRef.current?.pointer===event.pointerId)dragRef.current=null;
    if(event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const drill=group=>{
    if(lastMoved.current){lastMoved.current=false;return;}
    setFocus({latitude:group.latitude,longitude:group.longitude});
    setSelection(null);
    if(group.count===1||zoom>=14)setMode('points');
    changeZoom(group.count===1?3:2);
  };
  const showAmounts=metric==='amount'&&flow!=='all';
  const chartSubtitle='Datos con ubicación explícita · '+currency+' · Período seleccionado';
  const hasData=located.length>0;

  return <TransactionChartSurface title='Mapa de transacciones · Mundial' description={chartSubtitle}
    actions={<ChartCurrencySwitch currency={currency} onChange={updateCurrency} label='Moneda del mapa'/>}
    footer='Los hexágonos H3 agrupan coordenadas aproximadas, no provincias o países oficiales. La moneda o el país del pagador no determinan el lugar de una operación. Los movimientos sin ubicación no se dibujan.'>
    <div role='group' aria-label='Tipo de movimientos del mapa' className='grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800'>
      {FLOWS.map(item=><button key={item.key} type='button' aria-pressed={flow===item.key}
        onClick={()=>updateFlow(item.key)} className={'min-h-[42px] rounded-lg px-2 text-xs font-bold focus-visible:ring-2 focus-visible:ring-purple-500 '+
          (flow===item.key?'bg-purple-600 text-white':'text-slate-700 dark:text-slate-200')}>{item.label}</button>)}
    </div>
    <div role='group' aria-label='Capa del mapa' className='mt-3 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800'>
      {MODES.map(item=><button key={item.key} type='button' aria-pressed={mode===item.key}
        onClick={()=>updateMode(item.key)} className={'min-h-[42px] rounded-lg px-1 text-xs font-bold focus-visible:ring-2 focus-visible:ring-purple-500 '+
          (mode===item.key?'bg-white text-purple-700 shadow-sm dark:bg-slate-700 dark:text-purple-200':'text-slate-700 dark:text-slate-200')}>{item.label}</button>)}
    </div>
    <p className='mt-2 text-xs text-slate-600 dark:text-slate-300'>{MODES.find(item=>item.key===mode).description}</p>
    <div className='mt-4 flex flex-wrap items-center justify-between gap-2'>
      <p className='text-sm font-bold tabular-nums'>{coverage.located} de {coverage.total}
        <span className='ml-1 text-xs font-normal text-slate-600 dark:text-slate-300'>movimientos ubicados ({coverage.percentage}%)</span>
      </p>
      <div role='group' aria-label='Métrica geográfica' className='inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800'>
        {['count','amount'].map(kind=><button key={kind} type='button'
          disabled={kind==='amount'&&flow==='all'} aria-pressed={metric===kind}
          onClick={()=>setMetric(kind)}
          className={'min-h-[36px] rounded-lg px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 '+
            (metric===kind?'bg-purple-600 text-white':'text-slate-700 dark:text-slate-200')}>
          {kind==='count'?'Cantidad':'Importe'}</button>)}
      </div>
    </div>
    {flow==='all'&&<p className='mt-2 text-xs text-slate-600 dark:text-slate-300'>En «Ambos» se muestra cantidad. Los importes de ingresos y gastos se analizan por separado, nunca se suman.</p>}
    {!hasData?<div className='mt-4'><TransactionChartEmpty>
      No hay {flow==='income'?'ingresos':flow==='expense'?'gastos':'movimientos'} con coordenadas en {currency} durante este período. Para ubicar operaciones internacionales, elegí el lugar real al registrar o editar una transacción; no se infiere por la divisa.
    </TransactionChartEmpty></div>:
    !opened?<div className='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50'>
      <p className='text-sm'>El mapa mundial carga mosaicos de OpenStreetMap solo al abrirlo. El proveedor recibe solicitudes de las zonas visibles, nunca tus importes ni los detalles de tus operaciones.</p>
      <button type='button' onClick={()=>setOpened(true)} className='mt-3 min-h-[44px] rounded-xl bg-purple-600 px-4 text-sm font-bold text-white'>Mostrar mapa mundial</button>
    </div>:
    <div className='mt-4'>
      <div ref={mapRef} onPointerDown={panStart} onPointerMove={panMove} onPointerUp={panEnd}
        onPointerCancel={panEnd} className='relative h-[352px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-800'
        style={{touchAction:'none',cursor:dragRef.current?'grabbing':'grab'}}
        aria-label='Mapa mundial interactivo de transacciones, arrastrable con mouse o dedo'>
        {overlay.tiles.map(tile=><img key={tile.id} alt='' draggable={false} loading='lazy' src={tile.url}
          width={256} height={256} style={{position:'absolute',left:tile.left,top:tile.top,width:256,height:256,maxWidth:'none',pointerEvents:'none'}}/>)}
        {(mode==='zones'||mode==='density')&&
          <svg aria-hidden='true' className='pointer-events-none absolute inset-0' width='100%' height='100%' viewBox={'0 0 '+width+' '+HEIGHT}>
            {overlay.groups.map(group=>{
              const strength=(showAmounts?group.total:group.count)/max;
              const polygon=group.polygon.map(p=>p.x+','+p.y).join(' ');
              return <polygon key={group.id} points={polygon} stroke='#7c3aed' strokeWidth='1.5'
                fill={mode==='density'?'#be185d':'#8b5cf6'}
                fillOpacity={mode==='density'?0.14+0.66*strength:0.08+0.18*strength}/>;
            })}
          </svg>}
        {mode==='zones'&&overlay.groups.map(group=><button key={group.id} type='button'
          aria-label={'Acercar zona H3: '+group.count+' movimiento(s)'} onClick={()=>drill(group)}
          title={group.count+' movimientos · Res. H3 '+group.resolution}
          style={{position:'absolute',left:group.left,top:group.top,transform:'translate(-50%,-50%)'}}
          className='flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-white bg-purple-700 px-1 text-xs font-extrabold text-white shadow-lg focus-visible:ring-4 focus-visible:ring-purple-400'>
          {showAmounts?formatShort(group.total):group.count}
        </button>)}
        {mode==='points'&&overlay.pins.map(pin=><button type='button' key={pin.id}
          aria-label={'Ver '+pin.count+' movimiento(s) de este lugar'}
          onClick={()=>{if(!lastMoved.current)setSelection(pin);lastMoved.current=false;}}
          style={{position:'absolute',left:pin.left,top:pin.top,transform:'translate(-50%,-100%)'}}
          className={'flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-white px-1 text-xs font-extrabold text-white shadow-lg focus-visible:ring-4 focus-visible:ring-purple-400 '+markerColor(pin.kind)}>
          {pin.count>1?pin.count:'●'}
        </button>)}
        {mode==='points'&&selection&&<div className='absolute bottom-9 left-2 right-2 z-10 max-h-40 overflow-y-auto rounded-xl border border-purple-200 bg-white/95 p-3 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900/95 dark:text-white'>
          <button type='button' aria-label='Cerrar detalle del mapa' className='float-right font-bold' onClick={()=>setSelection(null)}>✕</button>
          <p className='text-xs font-bold'>{selection.count} movimiento(s) en ubicación aproximada</p>
          {selection.records.map(row=><div key={row._mapKey} className='mt-2 border-t border-slate-200 pt-2 text-xs dark:border-slate-700'>
            <p className='font-bold'>{row._geoKind==='income'?'Ingreso':'Gasto'} · {row.expenseName||row.category} · <ChartMoney value={row.amount} currency={currency}/></p>
            <p>{row.location?.label||'Lugar sin nombre'} · {row.selectedDate||'Sin fecha'}</p>
          </div>)}
        </div>}
        <div className='absolute right-2 top-2 z-10 flex flex-col gap-1'>
          <button type='button' aria-label='Acercar mapa' onClick={()=>changeZoom(1)}
            className='h-10 w-10 rounded-lg bg-white text-lg font-bold text-slate-900 shadow'>+</button>
          <button type='button' aria-label='Alejar mapa' onClick={()=>changeZoom(-1)}
            className='h-10 w-10 rounded-lg bg-white text-lg font-bold text-slate-900 shadow'>−</button>
          <button type='button' aria-label='Ver mundo completo' onClick={worldView}
            className='min-h-[36px] rounded-lg bg-white px-2 text-xs font-bold text-slate-900 shadow'>Mundo</button>
          <button type='button' aria-label='Ajustar todas las ubicaciones' onClick={clearView}
            className='min-h-[36px] rounded-lg bg-white px-2 text-xs font-bold text-slate-900 shadow'>Todas</button>
        </div>
        <div className='absolute bottom-8 left-2 z-10 grid grid-cols-3 gap-1 rounded-xl bg-white/95 p-1 text-slate-900 shadow'>
          <span/>
          <button type='button' aria-label='Mover mapa al norte' onClick={()=>shiftBy(0,90)} className='h-8 w-8 rounded hover:bg-slate-200'>↑</button>
          <span/>
          <button type='button' aria-label='Mover mapa al oeste' onClick={()=>shiftBy(90,0)} className='h-8 w-8 rounded hover:bg-slate-200'>←</button>
          <span className='self-center text-center text-xs'>✥</span>
          <button type='button' aria-label='Mover mapa al este' onClick={()=>shiftBy(-90,0)} className='h-8 w-8 rounded hover:bg-slate-200'>→</button>
          <span/>
          <button type='button' aria-label='Mover mapa al sur' onClick={()=>shiftBy(0,-90)} className='h-8 w-8 rounded hover:bg-slate-200'>↓</button>
          <span/>
        </div>
        <a href='https://www.openstreetmap.org/copyright' rel='noreferrer' target='_blank'
          className='absolute bottom-0 right-0 z-10 rounded-tl-md bg-white/90 px-2 py-1 text-[10px] text-slate-900'>© OpenStreetMap contributors</a>
      </div>
      <div className='mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-600 dark:text-slate-300'>
        <span>Arrastrá para recorrer el mundo · rueda para zoom · botones táctiles</span>
        <span>Zoom {zoom} · H3 res. {h3ResolutionForZoom(zoom)} · {currency}</span>
      </div>
    </div>}
  </TransactionChartSurface>;
}
