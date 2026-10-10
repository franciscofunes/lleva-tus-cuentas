// Older imported movements might not contain a category. Never let one
// incomplete document crash the entire financial dashboard on navigation.
export const categoryContains = (movement, label) =>
  typeof movement?.category === 'string' && movement.category.includes(label);
