/**
 * Unified formatting utilities for SeNARS.
 * Consolidates functionality from DisplayUtils, FormattingUtils, and common.js.
 */

const PUNCTUATION_MAP = {'BELIEF': '.', 'GOAL': '!', 'QUESTION': '?'};
const DEFAULT_TRUTH = ' %1.000,0.900%';
const DEFAULT_PRIORITY = '';
const DEFAULT_TERM = 'Unknown';
const DEFAULT_TASK_TYPE = 'TASK';

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

// --- NAR Specific Formatting ---

export const formatTask = (task) => {
    const priority = formatPriority(task.budget?.priority);
    const term = task.term?.toString?.() ?? task.term ?? DEFAULT_TERM;
    const punctuation = getTypePunctuation(task.type ?? DEFAULT_TASK_TYPE);
    const truthStr = formatTruth(task.truth);
    const occurrence = formatOccurrence(task);

    return `${priority}${term}${punctuation}${truthStr}${occurrence}`;
};

export const formatPriority = (priority) => {
    return priority !== undefined ? `$${priority.toFixed(3)} ` : '';
};

export const formatTruth = (truth) => {
    if (!truth) return DEFAULT_TRUTH;

    const freq = truth.frequency?.toFixed(3) ?? '1.000';
    const conf = truth.confidence?.toFixed(3) ?? '0.900';
    return ` %${freq},${conf}%`;
};

export const formatOccurrence = (task) => {
    if (task.occurrenceTime === undefined && !task.stamp) return DEFAULT_PRIORITY; // Return empty string

    const timeStr = task.occurrenceTime ?? '';
    const stampStr = task.stamp ? encodeShortId(task.stamp.id ?? task.stamp) : '';

    return stampStr ? ` ${timeStr}@${stampStr}`.trim() : timeStr;
};

export const getTypePunctuation = (type) => {
    return PUNCTUATION_MAP[type?.toUpperCase()] ?? '.';
};

export const formatConcept = (concept) => {
    if (!concept) return 'undefined concept';
    return concept.term ? concept.term.toString() : concept.toString();
};

export const encodeShortId = (input) => {
    if (!input) return 'N/A';

    const inputStr = String(input);
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    let hash = 0;
    for (let i = 0; i < inputStr.length; i++) {
        hash = ((hash << 5) - hash) + inputStr.charCodeAt(i);
        hash |= 0;
    }
    hash = Math.abs(hash);

    if (hash === 0) return chars[0];

    let result = '';
    const base = chars.length;
    let num = hash;

    while (num > 0) {
        result = chars[num % base] + result;
        num = Math.floor(num / base);
    }

    return result.length > 8 ? result.substring(0, 8) : result;
};

export const formatTaskDetails = (task) => {
    return [
        formatType(task.type),
        formatTruthStr(task.truth),
        formatPriorityStr(task.priority),
        formatStamp(task.stamp),
        formatOccurrenceTime(task.occurrenceTime)
    ].filter(Boolean).join(' | ');
};

export const formatType = (type) => {
    return type ? `Type: ${type}` : 'Type: Task';
};

export const formatTruthStr = (truth) => {
    return truth ? `Truth: ${truth.toString()}` : 'Truth: N/A';
};

export const formatPriorityStr = (priority) => {
    return priority !== undefined ? `Priority: ${priority.toFixed(3)}` : 'Priority: N/A';
};

export const formatStamp = (stamp) => {
    return stamp ? `Stamp: ${stamp}` : 'Stamp: N/A';
};

export const formatOccurrenceTime = (occurrenceTime) => {
    return occurrenceTime !== undefined ? `OccTime: ${occurrenceTime}` : null;
};

export const formatBeliefDetails = (task) => {
    return [
        formatBeliefTruth(task.truth),
        formatBeliefPriority(task.priority),
        formatBeliefOccurrence(task.stamp)
    ].filter(Boolean).join('');
};

export const formatBeliefTruth = (truth) => {
    return truth ? `${truth.toString()}` : null;
};

export const formatBeliefPriority = (priority) => {
    return priority !== undefined ? ` | P:${priority.toFixed(3)}` : null;
};

export const formatBeliefOccurrence = (stamp) => {
    return stamp ? ` | Occ:${stamp}` : null;
};
