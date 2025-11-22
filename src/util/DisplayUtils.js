/**
 * DisplayUtils - Shared display utilities for SeNARS UI components
 * Provides common formatting and display functionality shared between different UI components
 */

import {
    formatNumber,
    formatPercentage,
    formatFileSize,
    formatDuration,
    truncateText
} from './Format.js';

export class DisplayUtils {
    /**
     * Creates a formatted table with specified headers and data
     * @param {string[]} headers - Array of column headers
     * @param {any[][]} rows - Array of row data arrays
     * @param {number[]} columnWidths - Optional array of specific column widths
     * @returns {string} Formatted table as a string
     */
    static createTable(headers, rows, columnWidths = []) {
        if (!headers || !rows) return '';

        // Calculate column widths if not provided
        const calculatedWidths = [];
        for (let i = 0; i < headers.length; i++) {
            const headerWidth = headers[i].length;
            const maxDataWidth = Math.max(...rows.map(row =>
                row[i] ? String(row[i]).length : 0
            ));
            calculatedWidths[i] = Math.max(headerWidth, maxDataWidth, columnWidths[i] || 0, 8);
        }

        const widths = calculatedWidths.map(w => Math.min(w, 50)); // Cap widths at 50 chars

        // Create separator line
        const separator = '  ' + widths.map(w => '─'.repeat(w + 2)).join('┼');

        // Create header row
        const headerRow = '  ' + headers.map((header, i) =>
            header.padEnd(widths[i])
        ).join(' │ ');

        // Create data rows
        const dataRows = rows.map(row =>
                '  ' + row.map((cell, i) =>
                    String(cell || '').padEnd(widths[i])
                ).join(' │ ')
        );

        // Combine all parts
        return [
            `  ┌${widths.map(w => '─'.repeat(w + 2)).join('┬')}┐`,
            `  │ ${headerRow} │`,
            `  ├${widths.map(w => '─'.repeat(w + 2)).join('┼')}┤`,
            ...dataRows.map(row => `  │${row}│`),
            `  └${widths.map(w => '─'.repeat(w + 2)).join('┴')}┘`
        ].join('\n');
    }

    /**
     * Creates a progress bar string
     * @param {number} progress - Progress value (0-1)
     * @param {number} width - Width of the progress bar (default: 20)
     * @param {string} completeChar - Character for completed portion (default: '█')
     * @param {string} incompleteChar - Character for incomplete portion (default: '░')
     * @returns {string} Progress bar string
     */
    static createProgressBar(progress, width = 20, completeChar = '█', incompleteChar = '░') {
        const filled = Math.floor(progress * width);
        const empty = width - filled;
        return completeChar.repeat(filled) + incompleteChar.repeat(empty);
    }

    /**
     * Formats a simple key-value pair display
     * @param {Object} obj - Object with key-value pairs
     * @param {string} prefix - Prefix for each line (default: '  ')
     * @param {boolean} includeEmpty - Whether to include empty values (default: false)
     * @returns {string} Formatted key-value pairs
     */
    static formatKeyValuePairs(obj, prefix = '  ', includeEmpty = false) {
        if (!obj || typeof obj !== 'object') return '';

        const entries = Object.entries(obj);
        if (entries.length === 0) return '';

        const formattedEntries = entries
            .filter(([key, value]) => includeEmpty || (value !== null && value !== undefined && value !== ''))
            .map(([key, value]) => {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const formattedValue = this._formatValue(value);
                return `${prefix}${formattedKey}: ${formattedValue}`;
            });

        return formattedEntries.join('\n');
    }

    /**
     * Formats values for display based on their type
     * @private
     * @param {*} value - Value to format
     * @returns {string} Formatted value
     */
    static _formatValue(value) {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'number') {
            if (value > 1000) return formatNumber(value);
            if (value <= 1 && value >= 0) return formatPercentage(value);
            return String(value);
        }
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return `[${value.length} items]`;
        if (typeof value === 'object') return '{Object}';
        return String(value);
    }

    /**
     * Creates an indented multi-line string
     * @param {string} text - Text to indent
     * @param {number} spaces - Number of spaces to indent (default: 2)
     * @returns {string} Indented text
     */
    static indent(text, spaces = 2) {
        if (!text) return '';
        const indentStr = ' '.repeat(spaces);
        return String(text).split('\n').map(line => indentStr + line).join('\n');
    }

    /**
     * Formats a list of items with emojis
     * @param {string[]} items - List of items to format
     * @param {string} emoji - Emoji prefix for each item
     * @param {string} prefix - Prefix for each line (default: '  ')
     * @returns {string} Formatted list
     */
    static formatListWithEmoji(items, emoji = '•', prefix = '  ') {
        if (!Array.isArray(items) || items.length === 0) return '';
        return items.map(item => `${prefix}${emoji} ${item}`).join('\n');
    }

    /**
     * Prints a DataFrame-like object as a formatted table
     * @param {Object} df - DataFrame-like object with shape, columns and values
     * @param {Object} options - Printing options
     * @param {number} options.maxRows - Maximum number of rows to display (default: 20)
     * @param {number} options.maxCols - Maximum number of columns to display (default: 10)
     * @param {number} options.precision - Decimal precision for numbers (default: 2)
     * @returns {string} Formatted table string
     */
    static printDataFrame(df, options = {}) {
        if (!df || typeof df !== 'object') return '';

        const {
            maxRows = 20,
            maxCols = 10,
            precision = 2
        } = options;

        try {
            // Get DataFrame dimensions
            const shape = df.shape || [0, 0];
            const rows = shape[0];
            const cols = shape[1];

            // Handle empty DataFrame
            if (rows === 0 || cols === 0) {
                return 'Empty DataFrame';
            }

            // Get column names
            const columns = df.columns || [];
            const displayColumns = columns.slice(0, maxCols);

            // Prepare headers
            const headers = displayColumns.map(col => String(col));

            // Prepare data rows
            const values = df.values || [];
            const displayRows = Math.min(rows, maxRows);
            const dataRows = [];

            for (let i = 0; i < displayRows; i++) {
                const row = values[i] || [];
                const displayRow = [];

                for (let j = 0; j < displayColumns.length; j++) {
                    let cell = row[j];

                    // Format cell value
                    if (typeof cell === 'number' && !Number.isInteger(cell)) {
                        cell = cell.toFixed(precision);
                    } else if (cell === null || cell === undefined) {
                        cell = 'null';
                    } else {
                        cell = String(cell);
                    }

                    displayRow.push(cell);
                }

                dataRows.push(displayRow);
            }

            // Create the table
            let table = this.createTable(headers, dataRows);

            // Add info about truncated data
            if (rows > maxRows || cols > maxCols) {
                const rowInfo = rows > maxRows ? ` (${rows - maxRows} more rows)` : '';
                const colInfo = cols > maxCols ? ` (${cols - maxCols} more columns)` : '';
                table += `\n\n[${rows} rows x ${cols} columns]${rowInfo}${colInfo}`;
            }

            return table;
        } catch (error) {
            // Fallback to simple representation if operations fail
            return `DataFrame (${df.shape ? df.shape.join('x') : 'unknown shape'})`;
        }
    }
}
