import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Routes, useLocation } from 'react-router-dom';

// Route transition lives OUTSIDE the pages so the old view fades away before
// the new view enters. Never apply translate/scale to the page: nested fixed
// modals and Android floating buttons must keep their viewport coordinates.
export const navigationTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

export const getNavigationTransition = (reduceMotion) => (
  reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : navigationTransition
);

export default function AnimatedRoutes({ children }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence mode='wait' initial={false}>
      <motion.div
        key={location.pathname}
        {...getNavigationTransition(reduceMotion)}
        className='w-full min-w-0'
      >
        <Routes location={location}>{children}</Routes>
      </motion.div>
    </AnimatePresence>
  );
}
