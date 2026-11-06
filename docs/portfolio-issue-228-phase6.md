# Portfolio #228 — mobile position-editor scroll and theme refinement (phase 6)

## Evidence and scope

The user provided an Android Chrome screenshot of the **Editar posición** dialog
with the screenshot/Markdown importer expanded. The dialog displayed multiple
purple scroll indicators on nested surfaces, with the long position form and its
save action outside the first viewport. Source inspection found two independent
vertical scrolling regions: `GenericModal` already scrolls its content, while
the Portfolio form forced another `max-h-[78dvh] overflow-y-auto` container.
The form also imposed `text-white` even though `GenericModal` uses a white
surface in light mode.

The private screenshot and any financial content in it must **not** be committed.
This is a code-grounded, screenshot-informed improvement; it is **not** a
completed authenticated two-theme visual audit.

## Changes

- Use **only GenericModal's existing scroll container**. Remove the child form's
  nested max-height, scrollbar gutter and vertical scrolling utilities.
- Keep submit and cancel actions in a sticky, theme-aware footer within the form,
  preserving pending save state, actual form submission and the existing
  `reset` cancellation path. Touch targets are at least 44px.
- Make the import disclosure, comparison preview and FCI monthly-return
  subsection readable on both white/light and slate/dark surfaces. Narrow
  currency/rate and date fields stack at phone width; 3-column FCI monthly
  inputs become 2 columns on phones.
- Do not change OCR runtime, category parsing, any persisted field, financial
  computation, Firestore or Lita integration.

## Verification and follow-up

- `Portfolio.visual.test.js` covers the single scroll owner, sticky actions,
  visible OCR importer and light/dark styling, alongside existing FCI
  calculations and privacy tests.
- `GenericModal.test.js` covers the shared Escape/focus/Tab contract, which
  remains unchanged by this Portfolio-only fix.
- Still required: synthetic signed-in Android Chrome 390px screenshots with
  importer expanded, including actual scroll geometry and on-screen keyboard;
  then 1440/1728px and light/dark checks. See
  [authenticated QA matrix](financial-ui-visual-qa.md).
