import { latLngToCell, cellToLatLng, cellToBoundary } from 'h3-js';
import { hasTransactionCoordinates } from './transactionLocation';

export const GEO_TILE_SIZE=256;
const LAT_LIMIT=85.05112878;
export const clampLatitude=(lat)=>Math.max(-LAT_LIMIT,Math.min(LAT_LIMIT,lat));
export const wrapLongitude=(lng)=>((lng+180)%360+360)%360-180;
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function projectSpendingPoint(latitude,longitude,zoom) {
  const sin=Math.sin(clampLatitude(latitude)*Math.PI/180);
  const size=GEO_TILE_SIZE*2**zoom;
  return {x:(wrapLongitude(longitude)+180)/360*size,y:(0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*size};
}
export function unprojectSpendingPoint(x,y,zoom) {
  const size=GEO_TILE_SIZE*2**zoom;
  const cy=clamp(y,0,size);
  return {latitude:clampLatitude(180/Math.PI*Math.atan(Math.sinh(Math.PI*(1-2*cy/size)))),
    longitude:wrapLongitude(x/size*360-180)};
}
// Works across the anti-meridian, including Alaska, Asia, the Pacific and NZ.
export function wrappedWorldDeltaX(x,centerX,zoom) {
  const size=GEO_TILE_SIZE*2**zoom;
  return ((x-centerX+size/2)%size+size)%size-size/2;
}
export const validLocatedSpending=(row)=>hasTransactionCoordinates(row?.location) &&
  Number.isFinite(Number(row.amount)) && Number(row.amount)>=0;

// Zoom 0 is the entire world. Resolutions grow as the user zooms into cities.
export const h3ResolutionForZoom=(zoom)=>[0,0,1,1,2,2,3,4,5,6,7,8,8,9,10,10,11,12][clamp(Math.round(zoom),0,17)];

export function bucketSpendingByZoom(rows,zoom) {
  const resolution=h3ResolutionForZoom(zoom);
  const groups=new Map();
  (rows||[]).filter(validLocatedSpending).forEach((row,index)=>{
    const {latitude,longitude}=row.location;
    const id=latLngToCell(latitude,longitude,resolution);
    const group=groups.get(id)||{id,count:0,total:0,income:0,expense:0,records:[]};
    const amount=Number(row.amount);
    group.count++;group.total+=amount;
    if(row._geoKind==='income')group.income+=amount;
    else group.expense+=amount;
    group.records.push({...row,_mapKey:row.id||row.expenseId||'movement-'+index});
    groups.set(id,group);
  });
  return [...groups.values()].map(group=>{
    const [latitude,longitude]=cellToLatLng(group.id);
    const boundary=cellToBoundary(group.id).map(([lat,lng])=>({latitude:lat,longitude:lng}));
    return {...group,latitude,longitude,boundary,resolution};
  }).sort((a,b)=>b.count-a.count);
}
export const locatedSpendingCoverage=(all,located)=>{
  const total=(all||[]).length, count=(located||[]).length;
  return {total,located:count,unlocated:Math.max(0,total-count),percentage:total?Math.round(count/total*100):0};
};
export function geographicCenter(rows) {
  if(!rows?.length)return {latitude:0,longitude:0};
  const angles=rows.map(row=>wrapLongitude(row.location.longitude)*Math.PI/180);
  // Largest empty longitude arc determines the minimal span containing every point.
  const ordered=angles.map(a=>wrapLongitude(a*180/Math.PI)).sort((a,b)=>a-b);
  let gap=-1, idx=0;
  for(let i=0;i<ordered.length;i++){
    const next=i===ordered.length-1?ordered[0]+360:ordered[i+1];
    if(next-ordered[i]>gap){gap=next-ordered[i];idx=i;}
  }
  const arcStart=ordered[(idx+1)%ordered.length];
  const span=360-gap;
  const longitude=wrapLongitude(arcStart+span/2);
  const latitude=rows.reduce((sum,row)=>sum+clampLatitude(row.location.latitude),0)/rows.length;
  return {latitude,longitude};
}
export function fitSpendingMapZoom(rows,width,height) {
  if(!rows?.length)return 1;
  if(rows.length===1)return 11;
  const center=geographicCenter(rows);
  const availableX=Math.max(65,width-72), availableY=Math.max(65,height-72);
  for(let zoom=16;zoom>=0;zoom--){
    const cp=projectSpendingPoint(center.latitude,center.longitude,zoom);
    const points=rows.map(row=>projectSpendingPoint(row.location.latitude,row.location.longitude,zoom));
    if(points.every(p=>Math.abs(wrappedWorldDeltaX(p.x,cp.x,zoom))<=availableX/2 &&
      Math.abs(p.y-cp.y)<=availableY/2))return zoom;
  }
  return 0;
}
export function calculateSpendingMetric(group,metric='count') {
  return metric==='amount'?group.total:group.count;
}
export function movedMapCenter(center,zoom,deltaX,deltaY) {
  const p=projectSpendingPoint(center.latitude,center.longitude,zoom);
  return unprojectSpendingPoint(p.x-deltaX,p.y-deltaY,zoom);
}
