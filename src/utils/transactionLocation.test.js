import {normalizeTransactionLocation,hasTransactionCoordinates} from './transactionLocation';
test('manual label is optional and device coordinates are rounded',()=>{
 expect(normalizeTransactionLocation({label:' Café ',source:'manual'})).toEqual({label:'Café',source:'manual'});
 expect(normalizeTransactionLocation({label:'Farmacia',source:'device',latitude:-34.6514,longitude:-58.6124}))
   .toEqual({label:'Farmacia',source:'device',latitude:-34.651,longitude:-58.612});
 expect(normalizeTransactionLocation(null)).toBeNull();
 expect(hasTransactionCoordinates({label:'Shopping',source:'manual'})).toBe(false);
});
test('invalid geographic data fails closed',()=>{
 expect(()=>normalizeTransactionLocation({latitude:100,longitude:10,source:'device'})).toThrow();
 expect(()=>normalizeTransactionLocation({latitude:0,source:'device'})).toThrow();
 expect(()=>normalizeTransactionLocation({label:'<script>',source:'manual'})).toThrow();
});

test('selected autocomplete place contributes approximate coordinates to the spending map', () => {
  const picked=normalizeTransactionLocation({label:'Café San Martín',source:'search',latitude:-34.60375,longitude:-58.38162});
  expect(picked).toEqual({label:'Café San Martín',source:'search',latitude:-34.604,longitude:-58.382});
  expect(hasTransactionCoordinates(picked)).toBe(true);
  expect(()=>normalizeTransactionLocation({label:'Unsafe',source:'search',latitude:200,longitude:0})).toThrow();
});
