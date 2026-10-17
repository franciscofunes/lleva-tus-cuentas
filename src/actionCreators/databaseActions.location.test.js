import { firestore } from '../shared/config/firebase/firebase.config';
import { storeDataAction, updateDataAction } from './databaseActions';
import firebase from 'firebase/compat/app';
jest.mock('../shared/config/firebase/firebase.config',()=>({firestore:{collection:jest.fn()}}));
jest.mock('react-toastify',()=>({toast:{success:jest.fn(),error:jest.fn()}}));

let saved,updated;
beforeEach(()=>{
  jest.clearAllMocks();
  saved=jest.fn().mockResolvedValue(undefined);
  updated=jest.fn().mockResolvedValue(undefined);
  const expense={id:'new-transaction',set:saved,update:updated};
  firestore.collection.mockImplementation(()=>({doc:()=>({collection:(name)=>({
    doc:()=>name==='expenses'?expense:{set:jest.fn().mockResolvedValue(undefined),delete:jest.fn().mockResolvedValue(undefined)},
  })})}));
});
const base={userId:'alice',name:'Taxi',category:'Transporte',amount:100,comment:'Recorrido',
 selectedDate:'2026-10-16',transactionCurrency:'ARS',notificationEnabled:false};
test('create persists only user-selected rounded location',async()=>{
 await storeDataAction({...base,location:{label:'Terminal',source:'device',latitude:-34.65143,longitude:-58.72383}})(jest.fn());
 expect(saved.mock.calls[0][0].location).toEqual({label:'Terminal',source:'device',latitude:-34.651,longitude:-58.724});
});
test('legacy create omits location, edit clears it explicitly',async()=>{
 await storeDataAction(base)(jest.fn());
 expect(saved.mock.calls[0][0]).not.toHaveProperty('location');
 await updateDataAction({...base,location:null},'existing')(jest.fn());
 const removed=updated.mock.calls[0][0].location;
 expect(typeof removed.isEqual).toBe('function');
});
test('manual label keeps no false device coordinates',async()=>{
 await updateDataAction({...base,location:{label:'Casa',source:'manual'}},'existing')(jest.fn());
 expect(updated.mock.calls[0][0].location).toEqual({label:'Casa',source:'manual'});
});
