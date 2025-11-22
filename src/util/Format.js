/**
 * Unified formatting utilities for SeNARS.
 * Consolidates functionality from DisplayUtils, FormattingUtils, and common.js.
 */

/**
 * Formats a number with locale-specific separators (e.g. "1,234.56").
 * @param {number} num - Number to format.
 * @returns {string} Formatted number string.
 */
export const formatNumber = (num) => {
    if (typeof num !== 'number') return String(num);
    return num.toLocaleString();
};

/**
 * Formats a number with compact K/M/B suffixes (e.g. "1.5K").
 * @param {number} num - Number to format.
 * @returns {string} Formatted number string.
 */
export const formatNumberCompact = (num) => {
    if (typeof num !== 'number') return String(num);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

/**
 * Formats a number with fixed decimal places (e.g. "1.23").
 * @param {number} num - Number to format.
 * @param {number} [decimals=2] - Number of decimal places.
 * @returns {string} Formatted number string.
 */
export const formatNumberFixed = (num, decimals = 2) => {
    if (typeof num !== 'number') return num?.toString() || '0';
    return num.toFixed(decimals);
};

/**
 * Formats a percentage value.
 * @param {number} value - Percentage value (0-1 or 0-100).
 * @param {number} [decimals=1] - Number of decimal places.
 * @returns {string} Formatted percentage (e.g. "50.0%").
 */
export const formatPercentage = (value, decimals = 1) => {
    if (typeof value !== 'number') return String(value);
    // If value is between 0 and 1, multiply by 100
    const percent = value <= 1 && value >= 0 ? value * 100 : value;
    return percent.toFixed(decimals) + '%';
};

/**
 * Formats file size in human readable format.
 * @param {number} size - Size in bytes.
 * @returns {string} Human readable size (e.g. "1.5 MB").
 */
export const formatFileSize = (size) => {
    if (typeof size !== 'number') return String(size);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
    return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

/**
 * Formats duration in milliseconds to human readable format.
 * @param {number} duration - Duration in milliseconds.
 * @returns {string} Human readable duration (e.g. "1.50s").
 */
export const formatDuration = (duration) => {
    if (typeof duration !== 'number') return String(duration);
    if (duration < 1000) return duration + 'ms';
    if (duration < 60000) return (duration / 1000).toFixed(2) + 's';
    return (duration / 60000).toFixed(2) + 'min';
};

/**
 * Truncates text to specified length, adding ellipsis if truncated.
 * @param {string} text - Text to truncate.
 * @param {number} maxLength - Maximum length.
 * @param {string} [ellipsis='...'] - Ellipsis to add.
 * @returns {string} Truncated text.
 */
export const truncateText = (text, maxLength, ellipsis = '...') => {
    if (!text) return '';
    const str = String(text);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - ellipsis.length) + ellipsis;
};
