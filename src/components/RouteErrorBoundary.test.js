import { renderErrorCode } from './RouteErrorBoundary';

test('route diagnostics classify browser errors without copying private messages', () => {
  expect(renderErrorCode(new TypeError('Cannot convert object to primitive value'))).toBe('NON_SCALAR_FIELD');
  expect(renderErrorCode(new TypeError("Cannot read properties of undefined (reading 'private-account')"))).toBe('MISSING_FIELD');
  expect(renderErrorCode(new TypeError('merchant field is not a function'))).toBe('INVALID_METHOD');
  expect(renderErrorCode(new TypeError('sensitive transaction name 123'))).toBe('UNCLASSIFIED');
});
