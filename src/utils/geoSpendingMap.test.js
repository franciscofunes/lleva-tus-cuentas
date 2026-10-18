import {projectSpendingPoint,unprojectSpendingPoint,bucketSpendingByZoom,fitSpendingMapZoom,locatedSpendingCoverage,calculateSpendingMetric} from './geoSpendingMap';
const place=(id,latitude,longitude,amount=100,source='search')=>({id,amount,location:{latitude,longitude,source,label:id}});
const rows=[place('one',-34.601,-58.400,100),place('two',-34.602,-58.401,200),place('far',-31.420,-64.190,500),{id:'manual',amount:900,location:{source:'manual',label:'sin coordenadas'}}];

test('web mercator round trip, bounds and stable approximate zones',()=>{
 const p=projectSpendingPoint(-34.6,-58.4,12);
 const reverse=unprojectSpendingPoint(p.x,p.y,12);
 expect(reverse.latitude).toBeCloseTo(-34.6,5);expect(reverse.longitude).toBeCloseTo(-58.4,5);
 const low=bucketSpendingByZoom(rows,3);
 expect(low.reduce((n,g)=>n+g.count,0)).toBe(3);
 expect(low.reduce((n,g)=>n+g.total,0)).toBe(800);
 const street=bucketSpendingByZoom(rows,15);
 expect(street.length).toBeGreaterThanOrEqual(low.length);
});
test('zones never absorb manually typed locations or invalid coordinates',()=>{
 const zones=bucketSpendingByZoom([place('valid',-34.6,-58.4,20,'device'),
  place('invalid',100,-58.4,40),
  {amount:50,location:{label:'manual',source:'manual'}}],10);
 expect(zones).toHaveLength(1);
 expect(zones[0].count).toBe(1);
 expect(zones[0].records[0].id).toBe('valid');
});
test('density metric and coverage do not combine ARS and USD (caller-filtered records)',()=>{
 const groups=bucketSpendingByZoom(rows,3);
 expect(groups.map(g=>calculateSpendingMetric(g,'count')).reduce((a,b)=>a+b,0)).toBe(3);
 expect(groups.map(g=>calculateSpendingMetric(g,'amount')).reduce((a,b)=>a+b,0)).toBe(800);
 expect(locatedSpendingCoverage(rows,rows.slice(0,3))).toEqual({total:4,located:3,unlocated:1,percentage:75});
 expect(fitSpendingMapZoom(rows.slice(0,3),350,350)).toBeGreaterThanOrEqual(2);
});
