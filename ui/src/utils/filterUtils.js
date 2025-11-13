export const createTypeFilter = (typeField, filterType) =>
  filterType === 'all'
    ? () => true
    : (item) => item[typeField] && item[typeField].toLowerCase() === filterType.toLowerCase();

export const createTextFilter = (searchFields, filterText) => {
  if (!filterText.trim()) return () => true;
  const searchText = filterText.toLowerCase();

  return (item) =>
    searchFields.some(field => {
      const value = getNestedValue(item, field);
      if (!value) return false;
      const stringValue = String(value).toLowerCase();
      return stringValue.includes(searchText);
    });
};

export const createCustomFilters = (customFilters = []) => {
  if (!customFilters.length) return () => true;

  return (item) => customFilters.every(filter => {
    if (typeof filter === 'function') {
      return filter(item);
    }
    if (filter && typeof filter.test === 'function') {
      return filter.test(item);
    }
    if (filter && filter.property && filter.value !== undefined) {
      const itemValue = getNestedValue(item, filter.property);
      if (filter.matcher) {
        return filter.matcher(itemValue, filter.value);
      }
      return itemValue === filter.value;
    }
    return true;
  });
};

export const getNestedValue = (obj, path) => path.split('.').reduce((current, key) => current?.[key], obj);