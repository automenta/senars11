/**
 * Utility functions for creating and handling UI messages
 */

/**
 * Create a standard notification object
 * @param {string} type - Notification type ('info', 'success', 'warning', 'error')
 * @param {string} message - Notification message
 * @param {string} title - Optional title for the notification
 * @param {number} duration - Duration in milliseconds before auto-dismissal
 * @returns {Object} Notification object
 */
export const createNotification = (type, message, title = '', duration = 5000) => {
    if (!['info', 'success', 'warning', 'error'].includes(type)) {
        console.warn(`Invalid notification type: ${type}. Using 'info' as default.`);
        type = 'info';
    }
    
    return {
        id: Date.now().toString(),
        type,
        message,
        title: title || capitalizeFirst(type),
        timestamp: Date.now(),
        duration
    };
};

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Create an error notification
 * @param {string} message - Error message
 * @param {string} title - Optional title for the error
 * @returns {Object} Error notification object
 */
export const createErrorNotification = (message, title = 'Error') => 
    createNotification('error', message, title);

/**
 * Create a success notification
 * @param {string} message - Success message
 * @param {string} title - Optional title for the success
 * @returns {Object} Success notification object
 */
export const createSuccessNotification = (message, title = 'Success') => 
    createNotification('success', message, title);

/**
 * Create a warning notification
 * @param {string} message - Warning message
 * @param {string} title - Optional title for the warning
 * @returns {Object} Warning notification object
 */
export const createWarningNotification = (message, title = 'Warning') => 
    createNotification('warning', message, title);

/**
 * Create an info notification
 * @param {string} message - Info message
 * @param {string} title - Optional title for the info
 * @returns {Object} Info notification object
 */
export const createInfoNotification = (message, title = 'Info') => 
    createNotification('info', message, title);

/**
 * Format a message for display
 * @param {string} message - Raw message to format
 * @param {number} maxLength - Maximum length of the message
 * @returns {string} Formatted message
 */
export const formatDisplayMessage = (message, maxLength = 200) => {
    if (!message) return '';
    
    // Ensure the message is a string
    const str = String(message);
    
    // Truncate if too long
    if (str.length > maxLength) {
        return str.substring(0, maxLength) + '...';
    }
    
    return str;
};

/**
 * Sanitize a message to prevent XSS
 * @param {string} message - Message to sanitize
 * @returns {string} Sanitized message
 */
export const sanitizeMessage = (message) => {
    if (typeof message !== 'string') return String(message);
    
    // Basic HTML sanitization
    return message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

/**
 * Create a user-friendly error message from an error object
 * @param {Error|Object|string} error - Error to format
 * @param {string} fallbackMessage - Fallback message if error formatting fails
 * @returns {string} User-friendly error message
 */
export const formatErrorMessage = (error, fallbackMessage = 'An unexpected error occurred') => {
    if (!error) return fallbackMessage;
    
    // Handle different error formats
    if (typeof error === 'string') {
        return error;
    }
    
    if (error.message) {
        return error.message;
    }
    
    if (error.error) {
        return typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
    }
    
    // For objects, try to extract message or stringify
    if (typeof error === 'object') {
        return JSON.stringify(error);
    }
    
    return fallbackMessage;
};