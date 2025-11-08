import { BaseComponent } from './BaseComponent.js';
import blessed from 'blessed';

/**
 * Log Viewer Component - displays colorized, filterable logs with scrollback capacity
 */
export class LogViewerComponent extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.elementType = 'box';
        this.maxScrollback = config.maxScrollback ?? 1000;
        this.warningThreshold = config.warningThreshold ?? 0.8;
        this.logs = [];
        this.filteredLogs = [];
        this.filters = {
            level: 'all',
            keyword: '',
            showTimestamp: true
        };
        this.isFollowing = true;
        this.isAtCapacity = false;

        this.elementConfig = this.elementConfig ?? {
            top: '0',
            left: '40%',
            width: '60%',
            height: '100%-1',
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'black',
                border: { fg: 'cyan' }
            },
            scrollable: true,
            alwaysScroll: true,
            mouse: true,
            keys: true,
            vi: true
        };
    }

    init() {
        this.element = blessed.box(this.elementConfig);

        if (this.parent && this.element) {
            this.parent.append(this.element);
        }

        this._setupEventHandlers();
        this.isInitialized = true;
        return this.element;
    }

    // Event handling methods
    _setupEventHandlers() {
        if (!this.element) return;

        this._setupScrollHandler();
        this._setupMouseHandler();
        this._setupKeyBindings();
    }

    _setupScrollHandler() {
        this.element.on('scroll', () => {
            const currentScroll = this.element.getScroll();
            const maxScroll = this.element.getScrollHeight() - this.element.height;
            this.isFollowing = currentScroll >= maxScroll - 1;
        });
    }

    _setupMouseHandler() {
        this.element.on('mouse', (mouse) => {
            if (mouse.action === 'mousedown' && mouse.button === 'right') {
                this._showContextMenu(mouse);
            }
        });
    }

    _setupKeyBindings() {
        const keyBindings = this._getKeyBindings();
        Object.entries(keyBindings).forEach(([key, handler]) => {
            this.element.key([key], handler);
        });
    }

    _getKeyBindings() {
        return {
            'f': () => this._toggleFilterMenu(),
            'F': () => this._openAdvancedFilterDialog(), // Shift+F for advanced filter
            'C-l': () => this.clearLogs(),
            'C-c': () => this.clearLogs(), // Ctrl+C also clears logs
            'home': () => this._scrollToTop(),
            'end': () => this._scrollToBottom(),
            'C-f': () => this._openAdvancedFilterDialog(),
            'r': () => this._toggleRelativeTime(),
            'R': () => this._toggleRelativeTime(), // Shift+R for relative time
            '1': () => this.setLevelFilter('error'),
            '2': () => this.setLevelFilter('warn'),
            '3': () => this.setLevelFilter('info'),
            '4': () => this.setLevelFilter('debug'),
            '0': () => this.setLevelFilter('all'),
            'C-0': () => this.setLevelFilter('all'), // Ctrl+0 for all
            'C-1': () => this.setLevelFilter('error'), // Ctrl+1 for errors
            'C-2': () => this.setLevelFilter('warn'), // Ctrl+2 for warnings
            'C-3': () => this.setLevelFilter('info'), // Ctrl+3 for info
            'C-4': () => this.setLevelFilter('debug'), // Ctrl+4 for debug
            't': () => this.toggleTimestampDisplay(), // Toggle timestamps
            'T': () => this.toggleTimestampDisplay(), // Shift+T for timestamps
            'y': () => this._copyLogEntry(), // Copy current log to clipboard
            'Y': () => this._copyLogEntry(), // Shift+Y for copy
            'C-s': () => this._saveCurrentLogs(), // Save logs to file
            'C-S': () => this._compactLogs(), // Ctrl+Shift+S to compact logs
            'a': () => this.toggleFollowMode(), // Toggle auto-scroll
            'A': () => this.toggleFollowMode(), // Shift+A for auto-scroll
            'C-a': () => this._selectAllLogs(), // Ctrl+A to select all logs
            'C-u': () => this._clearLogSelection(), // Ctrl+U to clear selection
            'C-k': () => this.clearLogs(), // Ctrl+K also clears logs (like in some terminals)
            'C-e': () => this._exportLogs(), // Ctrl+E to export logs
            'C-p': () => this._printLogStats() // Ctrl+P to print log stats
        };
    }

    // Log addition and management methods
    addLog(message, level = 'info', timestamp = new Date()) {
        const logEntry = {
            message: typeof message === 'object' ? JSON.stringify(message) : message,
            level: level.toLowerCase(),
            timestamp,
            id: Date.now() + Math.random()
        };

        this.logs.push(logEntry);
        this._handleCapacityCheck();

        this._applyFilters();
        this._maybeScrollToBottom();
        this.emit('log-added', logEntry);
    }

    addInfo(message) { this.addLog(message, 'info'); }
    addError(message) { this.addLog(message, 'error'); }
    addWarning(message) { this.addLog(message, 'warn'); }
    addDebug(message) { this.addLog(message, 'debug'); }

    _handleCapacityCheck() {
        const capacityRatio = this.logs.length / this.maxScrollback;
        const wasAtCapacity = this.isAtCapacity;

        // Maintain scrollback limit
        if (this.logs.length > this.maxScrollback) {
            this.logs = this.logs.slice(-this.maxScrollback);
            this.isAtCapacity = true;
            this.emit('log-capped', {
                removedCount: this.logs.length - this.maxScrollback,
                currentCount: this.logs.length,
                maxCapacity: this.maxScrollback
            });
        } else {
            // Check capacity threshold
            if (capacityRatio >= this.warningThreshold && !wasAtCapacity) {
                this.isAtCapacity = true;
                this.emit('log-capacity-warning', {
                    currentCount: this.logs.length,
                    maxCapacity: this.maxScrollback,
                    ratio: capacityRatio
                });
            } else if (capacityRatio < this.warningThreshold && wasAtCapacity) {
                this.isAtCapacity = false;
            }
        }
    }

    clearLogs() {
        this.logs = [];
        this.filteredLogs = [];
        this.setContent('');
        this.render();
        this.emit('logs-cleared');
    }

    // Filtering methods
    _applyFilters() {
        this.filteredLogs = this.logs.filter(log => this._matchesFilters(log));
        this._updateDisplay();
    }

    _matchesFilters(log) {
        // Check level filter first (most common) as a performance optimization
        if (this.filters.level !== 'all' && log.level !== this.filters.level) return false;

        // Check keyword filter next if present
        if (this.filters.keyword && !log.message.toLowerCase().includes(this.filters.keyword.toLowerCase())) return false;

        // Check time range filter last
        if (this.filters.timeRange) {
            const logTime = new Date(log.timestamp);
            const start = this.filters.timeRange.start;
            const end = this.filters.timeRange.end ?? new Date();
            if (logTime < start || logTime > end) return false;
        }

        return true;
    }

    setLevelFilter(level) {
        this.filters.level = level.toLowerCase();
        this._applyFilters();
        this.emit('filter-changed', { type: 'level', value: level });
    }

    setKeywordFilter(keyword) {
        this.filters.keyword = keyword.toLowerCase();
        this._applyFilters();
        this.emit('filter-changed', { type: 'keyword', value: keyword });
    }

    setTimeRangeFilter(startDate, endDate) {
        this.filters.timeRange = { start: startDate, end: endDate };
        this._applyFilters();
        this.emit('filter-changed', {
            type: 'time-range',
            start: startDate,
            end: endDate
        });
    }

    setRelativeTimeFilter(relativeTime) {
        const now = new Date();
        const timeRanges = {
            'last-5-minutes': 5 * 60 * 1000,
            'last-15-minutes': 15 * 60 * 1000,
            'last-1-hour': 60 * 60 * 1000,
            'last-24-hours': 24 * 60 * 60 * 1000
        };

        const startTime = timeRanges[relativeTime] ?
            new Date(now.getTime() - timeRanges[relativeTime]) :
            now;

        this.filters.timeRange = { start: startTime, end: now };
        this._applyFilters();
        this.emit('filter-changed', {
            type: 'relative-time',
            value: relativeTime,
            start: startTime,
            end: now
        });
    }

    toggleTimestampDisplay() {
        this.filters.showTimestamp = !this.filters.showTimestamp;
        this._applyFilters();
        this.emit('filter-toggled', { type: 'timestamp', enabled: this.filters.showTimestamp });
    }

    toggleFollowMode() {
        this.isFollowing = !this.isFollowing;
        this.emit('follow-mode-toggled', { enabled: this.isFollowing });
    }

    // Display and formatting methods
    _updateDisplay() {
        if (!this.element) return;

        const content = this.filteredLogs
            .map(log => this._formatLogEntry(log))
            .join('\n');

        this.setContent(content);
    }

    _formatLogEntry(log) {
        const timestamp = this.filters.showTimestamp
            ? `[${log.timestamp.toLocaleTimeString()}] `
            : '';
        const level = this._getLevelSymbol(log.level);
        const color = this._getLevelColor(log.level);
        const message = this._escapeBraces(log.message);

        return `${timestamp}{${color}}${level} ${message}{/}`;
    }

    _getLevelSymbol(level) {
        const symbols = { error: '❌', warn: '⚠️', debug: '🔬' };
        return symbols[level] || 'ℹ️';
    }

    _getLevelColor(level) {
        const levelColors = {
            error: 'red',
            warn: 'yellow',
            debug: 'blue',
            info: 'cyan',
            success: 'green'
        };
        return levelColors[level] ?? 'white';
    }

    _escapeBraces(str) {
        return str.toString().replace(/\{/g, '{open-brace}').replace(/\}/g, '{close-brace}');
    }

    // Query and statistics methods
    getLogs() { return [...this.logs]; }
    getFilteredLogs() { return [...this.filteredLogs]; }

    getLogCount(level) {
        return level
            ? this.logs.filter(log => log.level === level.toLowerCase()).length
            : this.logs.length;
    }

    searchLogs(keyword) {
        return this.logs.filter(log =>
            log.message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    getStats() {
        const counts = this.logs.reduce((acc, log) => {
            acc[log.level] = (acc[log.level] ?? 0) + 1;
            acc.total++;
            return acc;
        }, { total: 0, error: 0, warn: 0, info: 0, debug: 0 });

        return {
            counts,
            size: this.logs.length,
            filteredSize: this.filteredLogs.length,
            oldest: this.logs[0]?.timestamp ?? null,
            newest: this.logs[this.logs.length - 1]?.timestamp ?? null,
            currentFilters: { ...this.filters },
            maxScrollback: this.maxScrollback,
            isAtCapacity: this.isAtCapacity,
            capacityRatio: this.logs.length / this.maxScrollback
        };
    }

    // Scrollback capacity management methods
    setMaxScrollback(newMax) {
        this.maxScrollback = newMax;

        // Truncate logs if new max is smaller than current size
        if (this.logs.length > this.maxScrollback) {
            this.logs = this.logs.slice(-this.maxScrollback);
        }

        this.emit('max-scrollback-changed', {
            oldMax: this.maxScrollback,
            newMax: newMax
        });
    }

    getCapacity() {
        return {
            current: this.logs.length,
            max: this.maxScrollback,
            ratio: this.logs.length / this.maxScrollback,
            isAtCapacity: this.isAtCapacity
        };
    }

    clearCapacityWarning() {
        this.isAtCapacity = false;
        this.emit('capacity-warning-cleared');
    }

    compactLogs() {
        const originalCount = this.logs.length;
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

        this.logs = this.logs.filter(log => new Date(log.timestamp).getTime() > cutoffTime);

        this._applyFilters();
        this.emit('logs-compacted', {
            originalCount,
            newCount: this.logs.length,
            removedCount: originalCount - this.logs.length
        });
    }

    // Helper methods for scrolling
    _scrollToTop() {
        if (this.element) {
            this.element.setScroll(0);
            this.render();
        }
    }

    _scrollToBottom() {
        if (this.element) {
            this.element.setScrollPerc(100);
            this.render();
        }
    }

    _maybeScrollToBottom() {
        if (this.isFollowing) {
            setTimeout(() => {
                if (this.element) {
                    this.element.setScrollPerc(100);
                    this.render();
                }
            }, 10);
        }
    }

    // Context menu and filter methods
    _toggleFilterMenu() {
        this.emit('show-filter-menu', {
            currentFilters: { ...this.filters },
            onFilterChange: (type, value) => {
                switch (type) {
                    case 'level': this.setLevelFilter(value); break;
                    case 'keyword': this.setKeywordFilter(value); break;
                    case 'timestamp': this.toggleTimestampDisplay(); break;
                }
            }
        });
    }

    _showContextMenu(mouse) {
        // Calculate position for context menu
        const position = {
            top: Math.min(mouse.y, this.parent.height - 10),
            left: Math.min(mouse.x, this.parent.width - 20)
        };

        // Define context menu items for log level controls
        const menuItems = [
            {
                label: this.filters.level === 'all' ? '✓ All Messages' : 'All Messages',
                action: () => this.setLevelFilter('all')
            },
            {
                label: this.filters.level === 'error' ? '✓ Errors Only' : 'Show Errors',
                action: () => this.setLevelFilter('error')
            },
            {
                label: this.filters.level === 'warn' ? '✓ Warnings Only' : 'Show Warnings',
                action: () => this.setLevelFilter('warn')
            },
            {
                label: this.filters.level === 'info' ? '✓ Info Only' : 'Show Info',
                action: () => this.setLevelFilter('info')
            },
            {
                label: this.filters.level === 'debug' ? '✓ Debug Only' : 'Show Debug',
                action: () => this.setLevelFilter('debug')
            },
            {
                label: 'Clear Filters',
                action: () => {
                    this.setLevelFilter('all');
                    this.setKeywordFilter('');
                    this.setTimeRangeFilter(null);
                }
            },
            {
                label: 'Search...',
                action: () => this._openAdvancedFilterDialog()
            },
            {
                label: 'Compact Logs',
                action: () => this.compactLogs()
            },
            {
                label: 'Exit',
                action: () => {}
            }
        ];

        this.emit('show-context-menu', { position, menuItems });
    }

    _openAdvancedFilterDialog() {
        this.emit('open-advanced-filter', {
            currentFilters: { ...this.filters },
            onFilterChange: (filterType, value) => {
                switch (filterType) {
                    case 'level':
                        this.setLevelFilter(value);
                        break;
                    case 'keyword':
                        this.setKeywordFilter(value);
                        break;
                    case 'time-range':
                        this.setTimeRangeFilter(value.start, value.end);
                        break;
                    case 'relative-time':
                        this.setRelativeTimeFilter(value);
                        break;
                    case 'regex':
                        this.setRegexFilter(value);
                        break;
                    case 'complex':
                        this.setComplexFilter(value);
                        break;
                }
            }
        });
    }

    // Advanced filtering methods
    setRegexFilter(pattern) {
        try {
            const regex = new RegExp(pattern, 'i'); // Case insensitive
            this.filters.regex = regex;
            this.filters.keyword = null; // Clear keyword filter when using regex
            this._applyFilters();
            this.emit('filter-changed', { type: 'regex', value: pattern });
        } catch (error) {
            this.addError(`Invalid regex pattern: ${pattern} - ${error.message}`);
            this.emit('filter-error', { error: error.message, pattern });
        }
    }

    setComplexFilter(filterConfig) {
        // Support complex filtering configurations
        this.filters.complex = filterConfig;
        this._applyFilters();
        this.emit('filter-changed', { type: 'complex', config: filterConfig });
    }

    _matchesFilters(log) {
        // Check level filter first (most common) as a performance optimization
        if (this.filters.level !== 'all' && log.level !== this.filters.level) return false;

        // Check keyword filter next if present
        if (this.filters.keyword && !log.message.toLowerCase().includes(this.filters.keyword.toLowerCase())) return false;

        // Check regex filter if present
        if (this.filters.regex && !this.filters.regex.test(log.message)) return false;

        // Check complex filter if present
        if (this.filters.complex && !this._matchesComplexFilter(log, this.filters.complex)) return false;

        // Check time range filter last
        if (this.filters.timeRange) {
            const logTime = new Date(log.timestamp);
            const start = this.filters.timeRange.start;
            const end = this.filters.timeRange.end ?? new Date();
            if (logTime < start || logTime > end) return false;
        }

        return true;
    }

    _matchesComplexFilter(log, filterConfig) {
        // Apply multiple conditions based on filter configuration
        const conditions = filterConfig.conditions || [];
        
        for (const condition of conditions) {
            const { field, operator, value } = condition;
            
            let fieldValue;
            switch (field) {
                case 'message':
                    fieldValue = log.message;
                    break;
                case 'level':
                    fieldValue = log.level;
                    break;
                case 'timestamp':
                    fieldValue = log.timestamp;
                    break;
                default:
                    fieldValue = log[field];
            }

            if (fieldValue === undefined) continue;

            switch (operator) {
                case 'equals':
                    if (fieldValue != value) return false;
                    break;
                case 'contains':
                    if (typeof fieldValue === 'string' && !fieldValue.toLowerCase().includes(value.toLowerCase())) return false;
                    break;
                case 'startsWith':
                    if (typeof fieldValue === 'string' && !fieldValue.toLowerCase().startsWith(value.toLowerCase())) return false;
                    break;
                case 'endsWith':
                    if (typeof fieldValue === 'string' && !fieldValue.toLowerCase().endsWith(value.toLowerCase())) return false;
                    break;
                case 'greaterThan':
                    if (fieldValue <= value) return false;
                    break;
                case 'lessThan':
                    if (fieldValue >= value) return false;
                    break;
                case 'between':
                    if (fieldValue < value.min || fieldValue > value.max) return false;
                    break;
                case 'matches':
                    try {
                        const regex = new RegExp(value);
                        if (typeof fieldValue === 'string' && !regex.test(fieldValue)) return false;
                    } catch (e) {
                        // Invalid regex, skip condition
                    }
                    break;
            }
        }

        return true;
    }

    _toggleRelativeTime() {
        const timeOptions = ['last-5-minutes', 'last-15-minutes', 'last-1-hour', 'all'];
        const currentIndex = timeOptions.indexOf(this.currentRelativeTime || 'all');
        const nextIndex = (currentIndex + 1) % timeOptions.length;
        const nextTimeOption = timeOptions[nextIndex];

        this.currentRelativeTime = nextTimeOption;
        this.setRelativeTimeFilter(nextTimeOption);
    }

    // Placeholder methods for extended functionality
    _logPlaceholderAction(message, eventName) {
        this.addInfo(message);
        this.emit(eventName);
    }

    _copyLogEntry() {
        this._logPlaceholderAction('📋 Copy log entry functionality would be implemented here', 'log-entry-copy-requested');
    }

    _saveCurrentLogs() {
        this._logPlaceholderAction('💾 Save logs functionality would be implemented here', 'log-save-requested');
    }

    _exportLogs() {
        this._logPlaceholderAction('📤 Export logs functionality would be implemented here', 'log-export-requested');
    }

    _printLogStats() {
        const stats = this.getStats();
        const statsInfo = [
            `📊 Log Statistics:`,
            `   Total logs: ${stats.size}`,
            `   Filtered: ${stats.filteredSize}`,
            `   Errors: ${stats.counts.error}, Warnings: ${stats.counts.warn}, Info: ${stats.counts.info}, Debug: ${stats.counts.debug}`,
            `   Capacity: ${Math.round(stats.capacityRatio * 100)}% (${stats.size}/${stats.maxScrollback})`
        ];

        statsInfo.forEach(info => this.addInfo(info));
        this.emit('log-stats-printed', stats);
    }

    _selectAllLogs() {
        this._logPlaceholderAction('📋 Select all logs functionality would be implemented here', 'log-select-all-requested');
    }

    _clearLogSelection() {
        this._logPlaceholderAction('📋 Clear log selection functionality would be implemented here', 'log-clear-selection-requested');
    }

    // File operations
    saveLogsToFile(filePath) {
        try {
            const fs = require('fs');
            const logContent = this.logs
                .map(log => `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`)
                .join('\n');

            fs.writeFileSync(filePath, logContent);
            this.emit('logs-saved', { filePath, count: this.logs.length });
            return true;
        } catch (error) {
            this.emit('logs-save-error', { error: error.message });
            return false;
        }
    }
}