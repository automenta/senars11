/**
 * Utility functions for efficiently managing collections in state
 * Following AGENTS.md principles: DRY, modular, parameterized
 */

// Cache for performance - avoid recreating functions on every call
const collectionManagers = new Map();
const objectManagers = new Map();

/**
 * Generic item finder for collections using efficient lookup
 * @param {Array} list - The collection to search
 * @param {any} item - The item to find
 * @param {string} idField - The field to match on (default: 'id')
 * @returns {number} - Index of item or -1 if not found
 */
export const findItemIndex = (list, item, idField = 'id') => {
    if (!list?.length) return -1;
    for (let i = 0; i < list.length; i++) {
        if (list[i]?.[idField] === item?.[idField]) return i;
    }
    return -1;
};

/**
 * Generic collection manager factory with memoization
 * @param {string} collectionName - Name of the collection in state
 * @returns {Object} - Collection management methods
 */
export const createCollectionManager = (collectionName) => {
    // Return cached manager if already created
    if (collectionManagers.has(collectionName)) {
        return collectionManagers.get(collectionName);
    }

    const manager = {
        /**
         * Add or update item in collection
         * @param {any} item - The item to add/update
         * @param {string} idField - Field to match on (default: 'id')
         * @returns {Function} - Zustand state update function
         */
        add: (item, idField = 'id') => (state) => {
            const currentList = state[collectionName] || [];
            const existingIndex = findItemIndex(currentList, item, idField);

            if (existingIndex !== -1) {
                // Update existing item using array spread for immutability
                const updatedList = [...currentList];
                updatedList[existingIndex] = {...updatedList[existingIndex], ...item};
                return {[collectionName]: updatedList};
            } else {
                // Add new item
                return {[collectionName]: [...currentList, item]};
            }
        },

        /**
         * Update specific item in collection with optimized lookup
         * @param {any} key - Key to match
         * @param {string} keyField - Field name for key
         * @param {Object} updates - Updates to apply
         * @returns {Function} - Zustand state update function
         */
        update: (key, keyField, updates) => (state) => {
            const currentList = state[collectionName];
            if (!currentList?.length) return {[collectionName]: currentList};

            const index = currentList.findIndex(item => item?.[keyField] === key);
            if (index === -1) return {[collectionName]: currentList};

            // Use array spread to maintain immutability
            const updatedList = [...currentList];
            updatedList[index] = {...updatedList[index], ...updates};
            return {[collectionName]: updatedList};
        },

        /**
         * Remove item from collection with optimized lookup
         * @param {any} key - Key to match
         * @param {string} keyField - Field name for key
         * @returns {Function} - Zustand state update function
         */
        remove: (key, keyField) => (state) => {
            const currentList = state[collectionName];
            if (!currentList?.length) return {[collectionName]: currentList};

            const indexToRemove = currentList.findIndex(item => item?.[keyField] === key);
            if (indexToRemove === -1) return {[collectionName]: currentList};

            // Remove item efficiently using spread
            return {[collectionName]: [...currentList.slice(0, indexToRemove), ...currentList.slice(indexToRemove + 1)]};
        },

        /**
         * Clear all items from collection
         * @returns {Function} - Zustand state update function
         */
        clear: () => (state) => ({[collectionName]: []}),

        /**
         * Add item with limit on collection size - optimized for performance
         * @param {any} item - Item to add
         * @param {number} limit - Max number of items
         * @param {string} idField - Field to match on (default: 'id')
         * @returns {Function} - Zustand state update function
         */
        addLimited: (item, limit, idField = 'id') => (state) => {
            const currentList = state[collectionName] || [];
            const updatedList = [...currentList, item];

            // Only slice if needed to maintain performance
            return {[collectionName]: updatedList.length > limit ? updatedList.slice(-limit) : updatedList};
        }
    };

    // Cache the manager
    collectionManagers.set(collectionName, manager);
    return manager;
};

/**
 * Generic object manager factory for key-value state management with memoization
 * @param {string} objectName - Name of the object in state
 * @returns {Object} - Object management methods
 */
export const createObjectManager = (objectName) => {
    // Return cached manager if already created
    if (objectManagers.has(objectName)) {
        return objectManagers.get(objectName);
    }

    const manager = {
        /**
         * Set key-value pair in object with optimized immutability
         * @param {any} key - Key
         * @param {any} value - Value
         * @returns {Function} - Zustand state update function
         */
        set: (key, value) => (prev) => ({
            [objectName]: {...(prev[objectName] || {}), [key]: value}
        }),

        /**
         * Update specific key in object with safe nested updates
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
    };

    // Cache the manager
    objectManagers.set(objectName, manager);
    return manager;
};

/**
 * Batch update utility for multiple state changes with optimized performance
 * @param {Function} set - Zustand set function
 * @param {Object} updates - Updates to apply
 */
export const batchUpdate = (set, updates) => {
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) return;

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