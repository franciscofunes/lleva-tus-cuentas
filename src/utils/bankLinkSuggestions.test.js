import { normalizedBankTokens, suggestCardForImportedStatement } from './bankLinkSuggestions';

const banks = [{ code:'city', name:'Banco Ciudad' }, { code:'santander', name:'Banco Santander' }];
const cards = [{ id:'c1', bankId:'city', brand:'Visa', nickname:'Visa 4555' }, { id:'c2', bankId:'santander', brand:'Mastercard', nickname:'MC' }];

test('normalizes only bank display tokens, not an unrelated institution', () => {
  expect(normalizedBankTokens('Banco de la Ciudad')).toBe('ciudad');
  expect(normalizedBankTokens('Banco Ciudad')).toBe('ciudad');
});

test('suggests only a unique matching bank and card brand', () => {
  const statement = { institution:'Banco Ciudad', cardBrand:'Visa' };
  expect(suggestCardForImportedStatement(statement,banks,cards)).toEqual({bankId:'city',cardId:'c1'});
  expect(suggestCardForImportedStatement({...statement,institution:'Otra entidad'},banks,cards)).toBeNull();
  expect(suggestCardForImportedStatement(statement,banks,[...cards,{...cards[0],id:'c3'}])).toBeNull();
  expect(suggestCardForImportedStatement({...statement,cardBrand:'Amex'},banks,cards)).toBeNull();
});
