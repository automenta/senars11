/**
 * Formatting utility functions for displaying data in the UI
 */

// Format truth values (frequency and confidence)
export const formatTruth = (truth) => {
  if (!truth) return 'N/A';
  const frequency = (truth.frequency || 0) * 100;
  const confidence = (truth.confidence || 0) * 100;
  return `${frequency.toFixed(1)}% @ ${confidence.toFixed(1)}%`;
};

// Format budget values (priority, durability, quality)
export const formatBudget = (budget) => {
  if (!budget) return 'N/A';
  const priority = budget.priority || 0;
  const durability = budget.durability || 0;
  const quality = budget.quality || 0;
  return `P:${priority.toFixed(2)} D:${durability.toFixed(2)} Q:${quality.toFixed(2)}`;
};

// Format timestamp to a readable time string
export const formatDate = (timestamp) =>
  new Date(timestamp).toLocaleTimeString();

// Format a number with specified decimal places
export const formatNumber = (num, decimals = 2) =>
  num?.toFixed(decimals) || 'N/A';

// Format a number with commas as thousand separators
export const formatNumberWithCommas = (num) => {
  if (num == null) return 'N/A';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format a number with appropriate units (K, M, B)
export const formatNumberWithUnits = (num, decimals = 2) => {
  if (num == null) return 'N/A';
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
};

// Format a percentage value
export const formatPercentage = (value, decimals = 2) => {
  if (value == null) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
};

// Format a date in a more readable way
export const formatDateLong = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
};

// Format a duration in milliseconds to a human-readable format
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

// Truncate a string to a specified length with an ellipsis
export const truncateString = (str, maxLength, suffix = '...') => {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + suffix;
};

// Format a file size in bytes to a human-readable format
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format various data types consistently
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

// Standardized way to format complex objects
export const formatObject = (obj, formatters = {}) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const formatted = {};
  for (const [key, value] of Object.entries(obj)) {
    const formatter = formatters[key];
    formatted[key] = formatter ? formatter(value) : formatValue(value);
  }
  return formatted;
};

// Get color based on truth values for visualization
export const getTruthColor = (truth) => {
  if (!truth || typeof truth !== 'object') return '#ffffff';
  const { frequency = 0.5, confidence = 0.5 } = truth;
  // Calculate a color based on frequency and confidence
  const r = Math.floor(255 * frequency);
  const g = Math.floor(128 + Math.floor(127 * confidence));
  const b = Math.floor(255 * (1 - frequency));
  return `rgb(${r}, ${g}, ${b})`;
};

// Format functions mapping for consistent type-based formatting
export const formatByType = {
  'truth': formatTruth,
  'budget': formatBudget,
  'number': (value, decimals) => formatNumber(value, decimals),
  'percentage': (value, decimals) => formatPercentage(value, decimals),
  'duration': formatDuration,
  'size': formatFileSize,
  'date': formatDate,
  'timestamp': formatDateLong
};

// Generic formatter that selects the appropriate formatting function
export const formatByDataType = (value, dataType, ...args) => {
  const formatter = formatByType[dataType];
  return formatter ? formatter(value, ...args) : formatValue(value);
};