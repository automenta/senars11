/**
 * Utility functions for performance metrics and visualization
 */

export const getPerformanceMetricColor = (metricType) => {
    switch (metricType) {
        case 'nars':
            return '#28a745'; // Green for NARS
        case 'lm':
            return '#ffc107'; // Yellow for LM
        case 'hybrid':
            return '#007bff'; // Blue for Hybrid
        default:
            return '#6c757d'; // Gray for default
    }
};

export const formatPercentage = (value) => {
    return value.toFixed(1) + '%';
};