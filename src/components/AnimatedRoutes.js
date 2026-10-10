import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Routes, useLocation } from 'react-router-dom';
import RouteErrorBoundary from './RouteErrorBoundary';

// Mount the new route immediately; a wait-mode exit transition can leave Android
// showing a blank page when interrupted. Preserve the shared 180ms entrance fade.
// Never translate or scale: fixed modals and FABs remain viewport-anchored.
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
    <motion.div
      key={location.pathname}
      {...getNavigationTransition(reduceMotion)}
      initial={false}
      className='w-full min-w-0'
    >
      <RouteErrorBoundary key={location.pathname}>
        <Routes location={location}>{children}</Routes>
      </RouteErrorBoundary>
    </motion.div>
  );
}
