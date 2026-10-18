import {bucketSpendingByZoom,h3ResolutionForZoom,projectSpendingPoint,fitSpendingMapZoom,geographicCenter,wrappedWorldDeltaX,movedMapCenter,wrapLongitude} from './geoSpendingMap';
const row=(id,latitude,longitude)=>({id,amount:100,location:{source:'search',latitude,longitude}});
test('H3 uses valid cell indexes, real hex boundaries and increasing resolution',()=>{
 const dataset=[row('AR',-34.603,-58.381),row('US',40.712,-74.006)];
 const globe=bucketSpendingByZoom(dataset,0),city=bucketSpendingByZoom(dataset,12);
 expect(h3ResolutionForZoom(0)).toBe(0);
 expect(h3ResolutionForZoom(12)).toBeGreaterThan(h3ResolutionForZoom(3));
 expect(globe.reduce((n,g)=>n+g.count,0)).toBe(2);
 expect(city.reduce((n,g)=>n+g.count,0)).toBe(2);
 expect(city.every(g=>/^[0-9a-f]+$/.test(g.id)&&g.boundary.length>=5)).toBe(true);
});
test('world zoom fits Argentina and the United States without zoom >= 2 floor',()=>{
 const dataset=[row('BA',-34.603,-58.381),row('NYC',40.712,-74.006)];
 expect(fitSpendingMapZoom(dataset,350,352)).toBeLessThanOrEqual(2);
 expect(fitSpendingMapZoom(dataset,800,550)).toBeGreaterThanOrEqual(1);
});
test('map wraps around the anti-meridian while panning across international borders',()=>{
 const dataset=[row('Fiji',-16.8,179.9),row('Samoa',-13.8,-179.9)];
 const c=geographicCenter(dataset);
 expect(Math.abs(c.longitude)).toBeGreaterThan(170);
 const f=fitSpendingMapZoom(dataset,350,352);
 expect(f).toBeGreaterThanOrEqual(4);
 const x=projectSpendingPoint(-16.8,179.9,3).x;
 const y=projectSpendingPoint(-13.8,-179.9,3).x;
 expect(Math.abs(wrappedWorldDeltaX(x,y,3))).toBeLessThan(20);
 const next=movedMapCenter({latitude:0,longitude:179},2,-50,0);
 expect(next.longitude).toBeLessThan(0);
 expect(wrapLongitude(540)).toBe(-180);
});
