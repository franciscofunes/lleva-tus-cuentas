import React from 'react';
import '@testing-library/jest-dom';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import TransactionLocationField from './TransactionLocationField';
import {searchLitaPlaces} from '../services/litaPlacesService';

jest.mock('../services/litaPlacesService',()=>({searchLitaPlaces:jest.fn()}));
beforeEach(()=>{jest.clearAllMocks();});
test('typing a place debounces, selecting a suggestion sets source search and a map pin',async()=>{
 const onChange=jest.fn();
 searchLitaPlaces.mockResolvedValue([{id:'1',label:'Café Plaza',detail:'Buenos Aires',latitude:-34.603,longitude:-58.381}]);
 render(<TransactionLocationField value={null} onChange={onChange}/>);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'Café'}});
 expect(searchLitaPlaces).not.toHaveBeenCalled();
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,470));});
 expect(searchLitaPlaces).toHaveBeenCalledTimes(1);
 fireEvent.click(await screen.findByRole('option',{name:/Café Plaza/}));
 expect(onChange).toHaveBeenLastCalledWith({
  label:'Café Plaza',source:'search',latitude:-34.603,longitude:-58.381
 });
});
test('editing a previously selected place clears old geographic coordinates',()=>{
 const onChange=jest.fn();
 render(<TransactionLocationField value={{label:'Old place',source:'search',latitude:-34.6,longitude:-58.4}} onChange={onChange}/>);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'Otro lugar'}});
 expect(onChange).toHaveBeenLastCalledWith({label:'Otro lugar',source:'manual'});
});
test('manual entry remains available when searching is disabled or unconfigured',async()=>{
 searchLitaPlaces.mockRejectedValue(new Error('Buscador no configurado'));
 const onChange=jest.fn();
 render(<TransactionLocationField value={null} onChange={onChange}/>);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'Kiosco de barrio'}});
 expect(onChange).toHaveBeenLastCalledWith({label:'Kiosco de barrio',source:'manual'});
 expect(await screen.findByRole('alert')).toHaveTextContent('Buscador no configurado');
});
