/**
 * Formatting utility functions for displaying data in the UI
 */

/**
 * Format truth values (frequency and confidence)
 * @param {Object} truth - Truth object with frequency and confidence properties
 * @returns {string} Formatted truth string
 */
export const formatTruth = (truth) => {
  if (!truth) return 'N/A';
  const frequency = (truth.frequency || 0) * 100;
  const confidence = (truth.confidence || 0) * 100;
  return `${frequency.toFixed(1)}% @ ${confidence.toFixed(1)}%`;
};

/**
 * Format budget values (priority, durability, quality)
 * @param {Object} budget - Budget object with priority, durability, and quality properties
 * @returns {string} Formatted budget string
 */
export const formatBudget = (budget) => {
  if (!budget) return 'N/A';
  const priority = budget.priority || 0;
  const durability = budget.durability || 0;
  const quality = budget.quality || 0;
  return `P:${priority.toFixed(2)} D:${durability.toFixed(2)} Q:${quality.toFixed(2)}`;
};

/**
 * Format timestamp to a readable time string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted time string
 */
export const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleTimeString();

/**
 * Format a number with specified decimal places
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (num, decimals = 2) =>
  num?.toFixed(decimals) || 'N/A';

/**
 * Format a number with commas as thousand separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumberWithCommas = (num) => {
  if (num == null) return 'N/A';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format a number with appropriate units (K, M, B)
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string with units
 */
export const formatNumberWithUnits = (num, decimals = 2) => {
  if (num == null) return 'N/A';
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
};

/**
 * Format a percentage value
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value == null) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format a date in a more readable way
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export const formatDateLong = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
};

/**
 * Format a duration in milliseconds to a human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (ms) => {
  if (ms < 0) ms = 0;
    
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
    
  if (days) return `${days}d ${hours % 24}h`;
  if (hours) return `${hours}h ${minutes % 60}m`;
  if (minutes) return `${minutes}m ${seconds % 60}s`;
  if (seconds) return `${seconds}s`;
  return `${ms}ms`;
};

/**
 * Truncate a string to a specified length with an ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length of the string
 * @param {string} suffix - Suffix to add to truncated string
 * @returns {string} Truncated string
 */
export const truncateString = (str, maxLength, suffix = '...') => {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + suffix;
};

/**
 * Format a file size in bytes to a human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format various data types consistently
 * @param {any} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted value string
 */
export const formatValue = (value, options = {}) => {
  const { 
    type = typeof value, 
    decimals = 2, 
    maxLength = null, 
    prefix = '', 
    suffix = '' 
  } = options;
  
  if (value === null || value === undefined) return 'N/A';
  
  switch(type) {
    case 'number':
      return `${prefix}${Number(value).toFixed(decimals)}${suffix}`;
    case 'string':
      if (maxLength && value.length > maxLength) {
        return `${prefix}${value.substring(0, maxLength)}...${suffix}`;
      }
      return `${prefix}${value}${suffix}`;
    case 'object':
      return `${prefix}${JSON.stringify(value)}${suffix}`;
    default:
      return `${prefix}${String(value)}${suffix}`;
  }
};

/**
 * Standardized way to format complex objects
 * @param {Object} obj - Object to format
 * @param {Object} formatters - Formatters for specific properties
 * @returns {Object} Formatted object
 */
export const formatObject = (obj, formatters = {}) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const formatted = {};
  for (const [key, value] of Object.entries(obj)) {
    const formatter = formatters[key];
    formatted[key] = formatter ? formatter(value) : formatValue(value);
  }
  return formatted;
};

/**
 * Get color based on truth values for visualization
 * @param {Object} truth - Truth object with frequency and confidence
 * @returns {string} RGB color string
 */
export const getTruthColor = (truth) => {
  if (!truth || typeof truth !== 'object') return '#ffffff';
  const { frequency = 0.5, confidence = 0.5 } = truth;
  // Calculate a color based on frequency and confidence
  const r = Math.floor(255 * frequency);
  const g = Math.floor(128 + Math.floor(127 * confidence));
  const b = Math.floor(255 * (1 - frequency));
  return `rgb(${r}, ${g}, ${b})`;
};