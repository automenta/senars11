/**
 * Data processing utilities for consistent data transformation and filtering
 * Implements elegant architectural patterns for data handling
 */

/**
 * Create a data processor with filtering, sorting, and transformation capabilities
 */
class DataProcessor {
  constructor(data = []) {
    this.data = [...data];
  }

  /**
   * Filter data based on a predicate function or search term
   */
  filter(predicate) {
    if (typeof predicate === 'function') {
      this.data = this.data.filter(predicate);
    } else if (typeof predicate === 'string') {
      // Simple search across all stringifiable fields
      const searchTerm = predicate.toLowerCase();
      this.data = this.data.filter(item => {
        if (typeof item === 'string') {
          return item.toLowerCase().includes(searchTerm);
        } else if (typeof item === 'object' && item !== null) {
          return Object.values(item).some(value => 
            String(value).toLowerCase().includes(searchTerm)
          );
        }
        return false;
      });
    }
    return this;
  }

  /**
   * Sort data by a field or custom comparator
   */
  sort(sortBy, direction = 'asc') {
    if (typeof sortBy === 'function') {
      this.data = this.data.sort(sortBy);
    } else if (typeof sortBy === 'string') {
      this.data = [...this.data].sort((a, b) => {
        let valueA = this._getNestedValue(a, sortBy);
        let valueB = this._getNestedValue(b, sortBy);
        
        let comparison = 0;
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          comparison = valueA - valueB;
        } else {
          comparison = String(valueA).localeCompare(String(valueB));
        }
        
        return direction === 'asc' ? comparison : -comparison;
      });
    }
    return this;
  }

  /**
   * Map data with a transformation function
   */
  map(transformFn) {
    this.data = this.data.map(transformFn);
    return this;
  }

  /**
   * Limit the number of results
   */
  limit(count) {
    this.data = this.data.slice(0, count);
    return this;
  }

  /**
   * Skip a number of results (useful for pagination)
   */
  skip(count) {
    this.data = this.data.slice(count);
    return this;
  }

  /**
   * Get the processed data
   */
  get() {
    return this.data;
  }

  /**
   * Get the count of processed data
   */
  count() {
    return this.data.length;
  }

  /**
   * Chain multiple operations together
   */
  chain(operations) {
    operations.forEach(op => {
      if (op.type === 'filter') {
        this.filter(op.predicate);
      } else if (op.type === 'sort') {
        this.sort(op.field, op.direction);
      } else if (op.type === 'map') {
        this.map(op.transform);
      } else if (op.type === 'limit') {
        this.limit(op.count);
      } else if (op.type === 'skip') {
        this.skip(op.count);
      }
    });
    return this;
  }

  /**
   * Get nested value using dot notation (e.g., 'user.name')
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Create a data processor instance
 */
const createDataProcessor = (data) => new DataProcessor(data);

/**
 * Common data utilities
 */
const dataUtils = {
  /**
   * Process data with multiple operations
   */
  process: (data, operations) => {
    return createDataProcessor(data).chain(operations).get();
  },

  /**
   * Create a searchable collection with optimized filtering
   */
  createSearchableCollection: (data, searchFields) => {
    return {
      originalData: data,
      search: (term) => {
        if (!term || term.trim() === '') return data;
        
        const searchTerm = term.toLowerCase();
        return data.filter(item => {
          if (typeof item === 'string') {
            return item.toLowerCase().includes(searchTerm);
          } else if (typeof item === 'object' && item !== null) {
            return searchFields.some(field => {
              const value = this._getNestedValue(item, field);
              return value && String(value).toLowerCase().includes(searchTerm);
            });
          }
          return false;
        });
      },
      _getNestedValue: (obj, path) => path.split('.').reduce((current, key) => current?.[key], obj)
    };
  },

  /**
   * Create a paginated collection
   */
  createPaginatedCollection: (data, itemsPerPage = 10) => {
    return {
      data,
      itemsPerPage,
      getPage: (page) => {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return data.slice(start, end);
      },
      getTotalPages: () => Math.ceil(data.length / itemsPerPage),
      getTotalCount: () => data.length
    };
  },

  /**
   * Create a grouped collection
   */
  createGroupedCollection: (data, groupByFn) => {
    return data.reduce((acc, item) => {
      const key = groupByFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  },

  /**
   * Get unique values for a field
   */
  getUniqueValues: (data, field) => {
    const values = new Set();
    data.forEach(item => {
      const value = typeof field === 'string' ? this._getNestedValue(item, field) : field(item);
      if (value !== undefined && value !== null) {
        values.add(value);
      }
    });
    return Array.from(values);
  },

  _getNestedValue: (obj, path) => path.split('.').reduce((current, key) => current?.[key], obj)
};

export {
  DataProcessor,
  createDataProcessor,
  dataUtils
};

export default {
  DataProcessor,
  createDataProcessor,
  dataUtils
};