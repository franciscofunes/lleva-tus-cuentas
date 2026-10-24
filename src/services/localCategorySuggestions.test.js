import {
  eligibleMerchant, safeCategoryNames, localCategoryCandidateRows,
  validateLocalProposals, localModelAvailability, suggestLocalCategories,
} from './localCategorySuggestions';

const categories=['Alimentación','Transporte','Salud'];
const items=[
  {merchant:'LTC QA Panaderia',amount:'999.00',currency:'ARS',receipt:'secret-1',suggestedCategory:'Sin categorizar'},
  {merchant:'Farmacity',amount:'250.00',suggestedCategory:'Salud'},
  {merchant:'COBRO 1234567890123456',suggestedCategory:'Sin categorizar'},
  {merchant:'LTC QA Transporte',amount:'12.50',currency:'USD',suggestedCategory:'Sin categorizar'},
];

afterEach(()=>{delete window.LanguageModel; jest.restoreAllMocks();});
test('feature detection rejects unsupported browser without fetching model',async()=>{
  expect(await localModelAvailability()).toBe('unavailable');
  expect(localCategoryCandidateRows(items,categories)).toEqual([
    {index:0,merchant:'LTC QA Panaderia'},
    {index:3,merchant:'LTC QA Transporte'},
  ]);
  expect(eligibleMerchant('someone@example.com')).toBe(false);
  expect(eligibleMerchant('AB1234567890')).toBe(false);
  expect(safeCategoryNames(['Salud','Salud','Sin categorizar',''])).toEqual(['Salud']);
});

test('validates strict category allow-list, exact index and no duplicate proposals',()=>{
  const rows=localCategoryCandidateRows(items,categories);
  const result=validateLocalProposals(JSON.stringify({
    proposals:[
      {index:0,category:'Alimentación'},
      {index:0,category:'Transporte'},
      {index:3,category:'Credenciales Bancarias'},
      {index:3,category:'Transporte'},
      {index:1,category:'Salud'},
      {index:'3',category:'Salud'},
    ],
  }),rows,categories);
  expect(result).toEqual([
    {index:0,merchant:'LTC QA Panaderia',category:'Alimentación'},
    {index:3,merchant:'LTC QA Transporte',category:'Transporte'},
  ]);
  expect(validateLocalProposals('not json',rows,categories)).toEqual([]);
  expect(validateLocalProposals({proposals:'bad'},rows,categories)).toEqual([]);
});

test('local only: Prompt API receives merchant descriptions and allow-list, no sensitive fields',async()=>{
  const prompt=jest.fn().mockResolvedValue(JSON.stringify({proposals:[
    {index:0,category:'Alimentación'},{index:3,category:'Transporte'},
  ]}));
  const destroy=jest.fn();
  const create=jest.fn().mockResolvedValue({prompt,destroy});
  const availability=jest.fn().mockResolvedValue('downloadable');
  window.LanguageModel={availability,create};
  expect(await localModelAvailability()).toBe('downloadable');
  const signal=new AbortController().signal;
  const results=await suggestLocalCategories({items,categories,signal});
  expect(results.proposals).toHaveLength(2);
  expect(create).toHaveBeenCalledTimes(1);
  expect(destroy).toHaveBeenCalledTimes(1);
  const input=prompt.mock.calls[0][0];
  expect(input).toContain('LTC QA Panaderia');
  expect(input).toContain('Transporte');
  expect(input).not.toContain('999.00');
  expect(input).not.toContain('12.50');
  expect(input).not.toContain('secret-1');
  expect(input).not.toContain('Farmacity');
  expect(input).not.toContain('1234567890123456');
  expect(prompt.mock.calls[0][1]).toEqual(expect.objectContaining({
    signal,responseConstraint:expect.objectContaining({type:'object'}),
  }));
});

test('aborted result cannot offer categories; session is always destroyed',async()=>{
  const controller=new AbortController();
  const destroy=jest.fn();
  window.LanguageModel={
    availability:jest.fn().mockResolvedValue('available'),
    create:jest.fn().mockImplementation(async()=>({
      prompt:async()=>{controller.abort(); return JSON.stringify({proposals:[{index:0,category:'Salud'}]});},
      destroy,
    })),
  };
  const result=await suggestLocalCategories({items,categories,signal:controller.signal});
  expect(result.proposals).toEqual([]);
  expect(destroy).toHaveBeenCalledTimes(1);
});
