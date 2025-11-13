export const compareValues = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA === typeB) {
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeA === 'string') return a.toLowerCase().localeCompare(b.toLowerCase());
    if (typeA === 'number') return a - b;
  }

  return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
};

export const sortByKey = (data, sortKey, sortOrder = 'asc') =>
  [...data].sort((a, b) => {
    const comparison = compareValues(a[sortKey], b[sortKey]);
    return sortOrder === 'desc' ? -comparison : comparison;
  });