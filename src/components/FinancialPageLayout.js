import React from 'react';
import { Outlet } from 'react-router-dom';
import AppFooter from './AppFooter';

// All authenticated financial routes share the same footer and visual shell.
// Pages own their content only; never render a second footer inside a page.
export default function FinancialPageLayout() {
  return (
    <div className='flex min-h-[calc(100dvh-4.5rem)] min-w-0 flex-col bg-slate-50 dark:bg-gray-900'>
      <div className='min-w-0 flex-1'>
        <Outlet />
      </div>
      <AppFooter />
    </div>
  );
}
