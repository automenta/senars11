// Consolidated utility functions
import {
    debounce,
    deepClone,
    deepEqual,
    delay,
    formatDateTime,
    formatTimestamp,
    generateId,
    getNestedProperty,
    isEmpty,
    memoize,
    setNestedProperty,
    throttle
} from './helpers.js';

// Export all helper functions
export {
    generateId,
    debounce,
    throttle,
    deepClone,
    formatTimestamp,
    formatDateTime,
    isEmpty,
    deepEqual,
    delay,
    getNestedProperty,
    setNestedProperty,
    memoize
};

// Additional utility functions from utilityFunctions.js
export {safeTransformData, paginateData, createSearchableCollection} from './utilityFunctions.js';

// Formatting functions from formatters.js
export {
    formatTruth,
    formatBudget,
    formatDate,
    formatNumber,
    formatNumberWithCommas,
    formatNumberWithUnits,
    formatPercentage,
    formatDateLong,
    formatDuration,
    truncateString,
    formatFileSize,
    formatValue,
    formatObject,
    formatByType,
    formatByDataType,
    getTruthColor
} from './formatters.js';

// Component creation utilities
export {
    createListItem,
    createHeader,
    createControlBar,
    createTimelineItem,
    createMetricDisplay
} from './componentUtils.js';

// Dashboard utilities
export {
    createStatusBadge,
    createMetricCard,
    createProgressBar,
    createDistributionBar,
    getStatusColor,
    getPerformanceMetricColor
} from './dashboardUtils.js';

// Styling utilities
export {
    themeVariables,
    listItemStyles,
    typography,
    mergeStyles,
    buildListItemStyle,
    buildTextStyle
} from './styles.js';