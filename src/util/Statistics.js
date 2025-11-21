/**
 * Common statistical utility functions.
 */
export class Statistics {
    /**
     * Calculate the arithmetic mean of an array of numbers.
     * @param {number[]} values - Array of numbers
     * @returns {number} The mean value, or 0 if array is empty
     */
    static mean(values) {
        if (!values || values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Calculate the standard deviation of an array of numbers.
     * @param {number[]} values - Array of numbers
     * @returns {number} The standard deviation, or 0 if array is empty
     */
    static stdDev(values) {
        if (!values || values.length === 0) return 0;
        const avg = this.mean(values);
        const squareDiffs = values.map(val => Math.pow(val - avg, 2));
        const variance = this.mean(squareDiffs);
        return Math.sqrt(variance);
    }

    /**
     * Calculate the median of an array of numbers.
     * @param {number[]} values - Array of numbers
     * @returns {number} The median value, or 0 if array is empty
     */
    static median(values) {
        if (!values || values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);

        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    /**
     * Calculate a specific quantile from an array of numbers.
     * @param {number[]} values - Array of numbers
     * @param {number} q - The quantile to calculate (0 to 1)
     * @returns {number} The quantile value, or 0 if array is empty
     */
    static quantile(values, q) {
        if (!values || values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;

        if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        } else {
            return sorted[base];
        }
    }

    /**
     * Calculate multiple quantiles at once.
     * @param {number[]} values - Array of numbers
     * @param {number[]} quantiles - Array of quantiles to calculate
     * @returns {Object} Object mapping quantile keys (e.g., 'p25') to values
     */
    static quantiles(values, quantiles = [0.25, 0.5, 0.75, 0.95]) {
        if (!values || values.length === 0) {
            return quantiles.reduce((acc, q) => {
                acc[`p${q * 100}`] = 0;
                return acc;
            }, {});
        }

        const sorted = [...values].sort((a, b) => a - b);
        return quantiles.reduce((acc, q) => {
            acc[`p${q * 100}`] = this.quantile(sorted, q); // Use sorted array optimization if we were to refactor quantile to accept it
            return acc;
        }, {});
    }
}
