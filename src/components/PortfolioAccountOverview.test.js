import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PortfolioAccountOverview from './PortfolioAccountOverview';

const position={id:'mp',institution:'Mercado Pago',name:'Dólares remunerados',
  currency:'USD',category:'Cuenta remunerada',trackingMode:'DAILY_RATE',
  balance:10500.53,annualRate:1.8,realizedEarnings:-498.93};
const snapshots=[
  {changeType:'withdrawal',observedEarning:-500},
  {changeType:'withdrawal',observedEarning:-128.53},
  {changeType:'earning',observedEarning:0.53,confirmedEarning:0.53},
];

test('account overview separates available balance, earned interest and capital flows',()=>{
  render(<PortfolioAccountOverview position={position} snapshots={snapshots}/>);
  expect(screen.getByText('Saldo disponible registrado')).toBeInTheDocument();
  expect(screen.getByText('Rendimientos registrados')).toBeInTheDocument();
  expect(screen.getByText('Interés diario estimado')).toBeInTheDocument();
  expect(screen.getByText('Retiros de capital')).toBeInTheDocument();
  expect(screen.getByText('Aportes de capital')).toBeInTheDocument();
  expect(screen.getByText(/no es una pérdida/)).toBeInTheDocument();
  expect(screen.getByText(/puede incluir retiros antiguos/i)).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Historial pendiente de conciliación');
});

test('no legacy earnings warning when classified interest reconciles',()=>{
  render(<PortfolioAccountOverview position={{...position,realizedEarnings:0.53}}
    snapshots={[snapshots[2]]}/>);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('unclassified observations trigger a review, never presumed interest',()=>{
  render(<PortfolioAccountOverview position={{...position,realizedEarnings:0}}
    snapshots={[{changeType:'unclassified',observedEarning:-14}]}/>);
  expect(screen.getByRole('status')).toHaveTextContent('sin clasificar');
});
