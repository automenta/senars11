/**
 * Utility functions for efficiently managing collections in state
 * Follows AGENT.md principles: DRY, modular, parameterized
 */

/**
 * Generic item finder for collections
 * @param {Array} list - The collection to search
 * @param {any} item - The item to find
 * @param {string} idField - The field to match on (default: 'id')
 * @returns {number} - Index of item or -1 if not found
 */
export const findItemIndex = (list, item, idField = 'id') =>
    list?.findIndex?.(i => i?.[idField] === item?.[idField]) ?? -1;

/**
 * Generic collection manager factory
 * @param {string} collectionName - Name of the collection in state
 * @returns {Object} - Collection management methods
 */
export const createCollectionManager = (collectionName) => ({
    /**
     * Add or update item in collection
     * @param {any} item - The item to add/update
     * @param {string} idField - Field to match on (default: 'id')
     * @returns {Function} - Zustand state update function
     */
    add: (item, idField = 'id') => (state) => {
        const currentList = state[collectionName] || [];
        const existingIndex = findItemIndex(currentList, item, idField);

        return existingIndex !== -1
            ? {[collectionName]: currentList.map((cur, idx) => idx === existingIndex ? {...cur, ...item} : cur)}
            : {[collectionName]: [...currentList, item]};
    },

    /**
     * Update specific item in collection
     * @param {any} key - Key to match
     * @param {string} keyField - Field name for key
     * @param {Object} updates - Updates to apply
     * @returns {Function} - Zustand state update function
     */
    update: (key, keyField, updates) => (state) => {
        const currentList = state[collectionName];
        if (!currentList) return {[collectionName]: currentList};

        const index = currentList?.findIndex?.(item => item?.[keyField] === key);
        return index === -1
            ? {[collectionName]: currentList}
            : {[collectionName]: currentList.map((cur, idx) => idx === index ? {...cur, ...updates} : cur)};
    },

    /**
     * Remove item from collection
     * @param {any} key - Key to match
     * @param {string} keyField - Field name for key
     * @returns {Function} - Zustand state update function
     */
    remove: (key, keyField) => (state) => {
        const currentList = state[collectionName];
        if (!currentList) return {[collectionName]: currentList};

        const indexToRemove = currentList?.findIndex?.(item => item?.[keyField] === key);
        return indexToRemove === -1
            ? {[collectionName]: currentList}
            : {[collectionName]: currentList.filter((_, idx) => idx !== indexToRemove)};
    },

    /**
     * Clear all items from collection
     * @returns {Function} - Zustand state update function
     */
    clear: () => (state) => ({[collectionName]: []}),

    /**
     * Add item with limit on collection size
     * @param {any} item - Item to add
     * @param {number} limit - Max number of items
     * @param {string} idField - Field to match on (default: 'id')
     * @returns {Function} - Zustand state update function
     */
    addLimited: (item, limit, idField = 'id') => (state) => ({
        [collectionName]: [...(state[collectionName] || []), item].slice(-limit)
    })
});

/**
 * Generic object manager factory for key-value state management
 * @param {string} objectName - Name of the object in state
 * @returns {Object} - Object management methods
 */
export const createObjectManager = (objectName) => ({
    /**
     * Set key-value pair in object
     * @param {any} key - Key
     * @param {any} value - Value
     * @returns {Function} - Zustand state update function
     */
    set: (key, value) => (prev) => ({
        [objectName]: {...(prev[objectName] || {}), [key]: value}
    }),

    /**
     * Update specific key in object
     * @param {any} key - Key
     * @param {Object} updates - Updates to apply
     * @returns {Function} - Zustand state update function
     */
    update: (key, updates) => (state) => ({
        [objectName]: {
            ...state[objectName],
            [key]: {...state[objectName]?.[key], ...updates}
        }
    }),

    /**
     * Clear object to empty
     * @returns {Function} - Zustand state update function
     */
    clear: () => (prev) => ({[objectName]: {}})
});

/**
 * Batch update utility for multiple state changes
 * @param {Function} set - Zustand set function
 * @param {Object} updates - Updates to apply
 */
export const batchUpdate = (set, updates) => {
    if (!updates || typeof updates !== 'object') return;

    set(prevState => {
        const newState = {...prevState};
        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'function') {
                newState[key] = value(newState);
            } else {
                newState[key] = value;
            }
        }
        return newState;
    });
};