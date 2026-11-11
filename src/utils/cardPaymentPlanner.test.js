import { calculateCardPaymentPlan, parsePlannerCents } from './cardPaymentPlanner';

const statements = [
  { amountArs: '150000.45', amountUsd: '100.20', perceptionArs: '30000.11' },
  { amountArs: '50000.81', amountUsd: '0', perceptionArs: '0' },
];

test('accepts Argentine and US-style thousand/decimal separators without floating money', () => {
  expect(parsePlannerCents('1.234.567,89')).toBe(123456789);
  expect(parsePlannerCents('1,234,567.89')).toBe(123456789);
  expect(parsePlannerCents('1500.57')).toBe(150057);
  expect(parsePlannerCents('1.000')).toBe(100000);
  expect(parsePlannerCents('-123')).toBeNull();
  expect(parsePlannerCents('10.123')).toBe(1012300);
});

test('plans two synthetic cards with separate USD payment and RG 5617 deduction', () => {
  const plan = calculateCardPaymentPlan({
    statements, availableArs: '20000.53', availableUsd: '500',
    fxAvailableUsd: '3000', rateArsPerUsd: '1500.57',
    deductPerceptions: true,
  });
  expect(plan.error).toBeUndefined();
  expect(plan.totalArsCents).toBe(20000126);
  expect(plan.deductedCents).toBe(3000011);
  expect(plan.missingArsCents).toBe(15000062);
  expect(plan.sellUsdCents).toBe(9997);
  expect(plan.proceedsArsCents).toBe(15001198);
  expect(plan.missingUsdCents).toBe(0);
  expect(plan.remainingUsdCents).toBe(39980);
  expect(plan.insufficientFx).toBe(false);
});

test('does not deduct perceptions without confirmation or enough USD to settle', () => {
  const gross = calculateCardPaymentPlan({
    statements, availableArs: '20000.53', availableUsd: '500', rateArsPerUsd: '1500.57',
  });
  expect(gross.sellUsdCents).toBe(11996);
  expect(gross.deductedCents).toBe(0);
  const shortUsd = calculateCardPaymentPlan({
    statements, availableArs: '20000.53', availableUsd: '50', rateArsPerUsd: '1500.57',
    deductPerceptions: true,
  });
  expect(shortUsd.deductedCents).toBe(0);
  expect(shortUsd.missingUsdCents).toBe(5020);
  expect(shortUsd.perceptionNotApplied).toBe(true);
});

test('does not re-use the same USD balance for paying the card and selling currency', () => {
  const result = calculateCardPaymentPlan({
    statements, availableArs: '20000.53', availableUsd: '500',
    fxAvailableUsd: '150', rateArsPerUsd: '1500.57',
    deductPerceptions: true, sameUsdSource: true,
  });
  expect(result.fxAvailableUsdCents).toBe(4980);
  expect(result.insufficientFx).toBe(true);
});

test('keeps USD and ARS separate and refuses invalid or overlarge deductions', () => {
  expect(calculateCardPaymentPlan({ statements, rateArsPerUsd: '' }).error).toMatch(/cotización/);
  expect(calculateCardPaymentPlan({ statements: [{ amountArs: '50', amountUsd: '0', perceptionArs: '60' }], rateArsPerUsd: '1600' }).error).toMatch(/tarjetas/);
  expect(calculateCardPaymentPlan({ statements: [], rateArsPerUsd: '1600' }).error).toMatch(/tarjeta/);
});
