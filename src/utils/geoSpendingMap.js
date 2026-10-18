import { hasTransactionCoordinates } from './transactionLocation';

/** Web Mercator screen projection; locations are already rounded at persistence. */
export const GEO_TILE_SIZE = 256;
const WEB_MERCATOR_LIMIT = 85.05112878;
export function projectSpendingPoint(latitude, longitude, zoom) {
  const safeLatitude = Math.max(-WEB_MERCATOR_LIMIT, Math.min(WEB_MERCATOR_LIMIT, latitude));
  const sine = Math.sin(safeLatitude * Math.PI / 180);
  const size = GEO_TILE_SIZE * (2 ** zoom);
  return { x: (longitude + 180) / 360 * size, y: (0.5 - Math.log((1+sine)/(1-sine)) / (4*Math.PI)) * size };
}
export function unprojectSpendingPoint(x,y,zoom) {
  const size=GEO_TILE_SIZE*(2**zoom);
  return { latitude: 180/Math.PI*Math.atan(Math.sinh(Math.PI*(1-2*y/size))),
    longitude: x/size*360-180 };
}
export const validLocatedSpending = (row) => hasTransactionCoordinates(row?.location) &&
  Number.isFinite(Number(row.amount)) && Number(row.amount) >= 0;

/** Grids are approximate zoom-dependent geographic groupings, NOT administrative boundaries. */
export function bucketSpendingByZoom(rows, zoom, cellPixels=108) {
  const grouped = new Map();
  (rows||[]).filter(validLocatedSpending).forEach((row,index)=>{
    const point=projectSpendingPoint(row.location.latitude,row.location.longitude,zoom);
    const key=Math.floor(point.x/cellPixels)+':'+Math.floor(point.y/cellPixels);
    const group=grouped.get(key)||{id:key,count:0,total:0,x:0,y:0,records:[]};
    group.count+=1;group.total+=Number(row.amount);
    group.x+=point.x;group.y+=point.y;
    group.records.push({...row, _mapKey:row.id||row.expenseId||'movement-'+index});
    grouped.set(key,group);
  });
  return [...grouped.values()].map(group=>{
    const center=unprojectSpendingPoint(group.x/group.count,group.y/group.count,zoom);
    return {id:group.id,count:group.count,total:group.total,
      latitude:center.latitude,longitude:center.longitude,records:group.records};
  }).sort((a,b)=>b.count-a.count);
}
export function locatedSpendingCoverage(allExpenses, locatedExpenses) {
  const count=(allExpenses||[]).length;
  const located=(locatedExpenses||[]).length;
  return {total:count,located,unlocated:Math.max(0,count-located),
    percentage:count?Math.round(located/count*100):0};
}
export function fitSpendingMapZoom(rows,width,height) {
  if (!rows?.length) return 4;
  if (rows.length===1) return 12;
  const usableWidth=Math.max(80,width-80),usableHeight=Math.max(80,height-80);
  for(let zoom=15;zoom>=2;zoom--){
    const points=rows.map(row=>projectSpendingPoint(row.location.latitude,row.location.longitude,zoom));
    const spanX=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));
    const spanY=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
    if(spanX<=usableWidth && spanY<=usableHeight)return zoom;
  }
  return 2;
}
export function calculateSpendingMetric(group,metric='count') {
  return metric==='amount'?group.total:group.count;
}
