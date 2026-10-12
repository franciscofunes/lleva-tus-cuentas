import {
  accountMovementLabel, groupAccountEarnings,
  sortedAccountSnapshots, summarizeAccountActivity,
} from './portfolioAccountActivity';

const at = (day, hh, mm) => new Date(`2026-10-${day}T${hh}:${mm}:00-03:00`);
const position = {
  id:'mercado-pago', balance:10500.53, currency:'USD',
  annualRate:1.8, trackingMode:'DAILY_RATE', realizedEarnings:-498.93,
};

const examples = [
  { id:'last',capturedAt:at('09','07','45'),balance:10500.53,changeType:'earning',observedEarning:0.53,confirmedEarning:0.53,expectedEarning:0.52 },
  { id:'withdraw-500',capturedAt:at('08','09','03'),balance:10500,changeType:'withdrawal',observedEarning:-500,confirmedEarning:0,expectedEarning:0.54 },
  { id:'withdraw-128',capturedAt:at('08','11','41'),balance:11000,changeType:'withdrawal',observedEarning:-128.53,confirmedEarning:0,expectedEarning:0.55 },
  { id:'first',capturedAt:at('05','09','03'),balance:11126.91,changeType:'earning',observedEarning:1.48,confirmedEarning:1.48,expectedEarning:0.55 },
];

test('sorts by actual timestamp without mutating the Firebase subscription', () => {
  const source=[...examples];
  expect(sortedAccountSnapshots(source).map(x=>x.id)).toEqual([
    'first','withdraw-500','withdraw-128','last'
  ]);
  expect(source).toEqual(examples);
});

test('withdrawals reduce invested balance but cannot become negative earnings', () => {
  const metrics=summarizeAccountActivity(position,examples);
  expect(metrics.withdrawals).toBeCloseTo(628.53);
  expect(metrics.capitalCount).toBe(2);
  expect(metrics.userTaggedEarnings).toBeCloseTo(2.01);
  expect(metrics.earningCount).toBe(2);
  expect(metrics.negativeLegacyEarnings).toBe(true);
  expect(metrics.reportedEarnings).toBe(-498.93);
  expect(metrics.needsReview).toBe(true);
  expect(metrics.dailyEstimate).toBeCloseTo(10500.53*0.018/365);
  expect(accountMovementLabel('withdrawal')).toBe('Retiro de capital');
});

test('missing legacy classification is reviewable, not assumed to be interest', () => {
  const metrics=summarizeAccountActivity({ balance:200,annualRate:2,trackingMode:'DAILY_RATE' }, [
    {observedEarning:-500,changeType:'unclassified'},
    {observedEarning:300,changeType:'deposit'},
  ]);
  expect(metrics.unclassifiedCount).toBe(1);
  expect(metrics.deposits).toBe(300);
  expect(metrics.userTaggedEarnings).toBe(0);
  expect(metrics.reportedEarnings).toBeNull();
});

test('one daily expectation per day, not one expectation per verification', () => {
  const data=[
    {capturedAt:at('08','08','48'), changeType:'earning',confirmedEarning:0.2,expectedEarning:0.55},
    {capturedAt:at('08','09','03'), changeType:'withdrawal',observedEarning:-500,expectedEarning:0.54},
    {capturedAt:at('08','11','41'), changeType:'withdrawal',observedEarning:-128.53,expectedEarning:0.52},
    {capturedAt:at('09','07','45'), changeType:'earning',confirmedEarning:0.53,expectedEarning:0.51},
  ];
  const daily=groupAccountEarnings(data,'day');
  expect(daily).toHaveLength(2);
  expect(daily[0].checks).toBe(3);
  expect(daily[0].earning).toBeCloseTo(0.2);
  expect(daily[0].expected).toBeCloseTo(0.52);
  expect(daily[1].expected).toBeCloseTo(0.51);
  const weekly=groupAccountEarnings(data,'week');
  expect(weekly).toHaveLength(1);
  expect(weekly[0].earning).toBeCloseTo(0.73);
  expect(weekly[0].expected).toBeCloseTo(1.03);
});

test('negative snapshot change with adjustment is neutral and never yield', () => {
  const m=summarizeAccountActivity(position,[
    {capturedAt:at('09','08','00'),observedEarning:-23,changeType:'adjustment'},
  ]);
  expect(m.adjustments).toBe(-23);
  expect(m.userTaggedEarnings).toBe(0);
  expect(m.withdrawals).toBe(0);
});
