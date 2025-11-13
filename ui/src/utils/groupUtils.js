export const groupRelatedItems = (items, groupingStrategy = 'timestamp') => {
  const groupingStrategies = {
    timestamp: (items) => {
      const groupedByTime = new Map();
      items.forEach(item => {
        const timestamp = item.timestamp || item.creationTime || Date.now();
        const interval = Math.floor(timestamp / 10000);
        if (!groupedByTime.has(interval)) {
          groupedByTime.set(interval, []);
        }
        groupedByTime.get(interval).push(item);
      });
      return Array.from(groupedByTime.values()).flat();
    },
    type: (items) => {
      const groupedByType = new Map();
      items.forEach(item => {
        const type = item.type || 'unknown';
        if (!groupedByType.has(type)) {
          groupedByType.set(type, []);
        }
        groupedByType.get(type).push(item);
      });
      return Array.from(groupedByType.values()).flat();
    },
    relationship: (items) => items
  };

  return groupingStrategies[groupingStrategy]?.(items) ?? items;
};

export const groupByProperty = (items, property) => {
  const grouped = new Map();
  items.forEach(item => {
    const key = item[property] || 'unknown';
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(item);
  });
  return grouped;
};