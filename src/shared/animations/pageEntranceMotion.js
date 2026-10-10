// Keep the route-level entrance identical for Portfolio and Transacciones.
// Only animate opacity: transforming a page shell would reposition fixed FABs
// and modals in mobile browsers. No artificial loading delays.
export const pageEntranceMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

export const getPageEntranceMotion = (reduceMotion) => (
  reduceMotion
    ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
    : pageEntranceMotion
);
