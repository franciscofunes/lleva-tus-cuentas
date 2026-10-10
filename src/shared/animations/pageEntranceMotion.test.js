import { getPageEntranceMotion, pageEntranceMotion } from './pageEntranceMotion';

test('both financial pages get the same short entrance, rather than a one-second fade', () => {
  expect(getPageEntranceMotion(false)).toBe(pageEntranceMotion);
  expect(pageEntranceMotion).toEqual({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.18, ease: 'easeOut' },
  });
  // Intentionally avoid translate/scale: those can offset position:fixed FABs.
  expect(pageEntranceMotion.initial.y).toBeUndefined();
  expect(pageEntranceMotion.initial.scale).toBeUndefined();
});

test('reduced-motion mode never fades or delays a page', () => {
  expect(getPageEntranceMotion(true)).toEqual({
    initial: false,
    animate: { opacity: 1 },
    transition: { duration: 0 },
  });
});
