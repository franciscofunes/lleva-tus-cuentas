// Same 160 ms entrance/exit as the floating quick-actions panel.
// Keep navbar popovers synchronized with the existing FAB animation.
export const popoverMotion = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
  transition: { duration: 0.16, ease: 'easeOut' },
}

export const getPopoverMotion = (prefersReducedMotion) => (
  prefersReducedMotion
    ? {
        initial: false,
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0 },
      }
    : popoverMotion
)

export const popoverTapTransition = { type: 'spring', stiffness: 420, damping: 28 }

export const getPopoverTap = (prefersReducedMotion) => (
  prefersReducedMotion ? undefined : { scale: 0.95 }
)
