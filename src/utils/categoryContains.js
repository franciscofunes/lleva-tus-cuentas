// Incomplete or older imported movements may have no category.
// Keep dashboard summaries and routes resilient to malformed fields.
export const categoryContains = (movement, expected) =>
  typeof movement?.category === 'string' && movement.category.includes(expected);
