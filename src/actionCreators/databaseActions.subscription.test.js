import { getDataAction } from './databaseActions';
import { firestore } from '../shared/config/firebase/firebase.config';
import { databaseReducer } from '../reducers/databaseReducer';

jest.mock('../shared/config/firebase/firebase.config', () => ({
  firestore: { collection: jest.fn() },
}));

test('transactions listener unsubscribes on route exit and updates data on snapshot', () => {
  const stop = jest.fn();
  let onData, onError;
  const query = {
    doc: jest.fn(), collection: jest.fn(), where: jest.fn(),
    orderBy: jest.fn(), onSnapshot: jest.fn(),
  };
  query.doc.mockReturnValue(query);
  query.collection.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  query.onSnapshot.mockImplementation((success, failure) => {
    onData = success; onError = failure; return stop;
  });
  firestore.collection.mockReturnValue(query);
  const dispatch = jest.fn();
  const unsubscribe = getDataAction('current-user')(dispatch);
  expect(unsubscribe).toBe(stop);
  expect(query.doc).toHaveBeenCalledWith('current-user');
  expect(query.collection).toHaveBeenCalledWith('expenses');

  onData({ docs: [{ id: 'a', data: () => ({ category: 'Salud', amount: 120 }) }] });
  expect(dispatch).toHaveBeenCalledWith({
    type: 'GOT_DATA',
    data: [{ id: 'a', category: 'Salud', amount: 120 }],
  });
  onError(new Error('Permission denied'));
  expect(dispatch).toHaveBeenCalledWith({
    type: 'GOT_DATA_ERROR', error: 'No se pudieron cargar los movimientos.',
  });
  unsubscribe();
  expect(stop).toHaveBeenCalledTimes(1);
});

test('Firestore query errors end loading and recovery clears the error', () => {
  const blocked = databaseReducer(undefined, {
    type: 'GOT_DATA_ERROR', error: 'No se pudieron cargar los movimientos.',
  });
  expect(blocked.isDataFetching).toBe(false);
  expect(blocked.docs).toEqual([]);
  expect(blocked.dataError).toMatch(/movimientos/);
  const recovered = databaseReducer(blocked, {
    type: 'GOT_DATA', data: [{ id: 'a', category: 'Salud' }],
  });
  expect(recovered.dataError).toBeNull();
  expect(recovered.docs).toHaveLength(1);
});
