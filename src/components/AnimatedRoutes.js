import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Routes, useLocation } from 'react-router-dom';

// Animate only the entrance of the new route. Waiting on a previous route's
// exit before mounting the next route can strand mobile users on a blank view
// when an animation is interrupted (rapid taps, background tab, low FPS).
// Never translate/scale: fixed modals and FABs stay viewport-anchored.
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
      <Routes location={location}>{children}</Routes>
    </motion.div>
  );
}
