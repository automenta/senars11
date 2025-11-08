import { BaseComponent } from './BaseComponent.js';
import blessed from 'blessed';

/**
 * Log Viewer Component - displays colorized, filterable logs with scrollback capacity
 */
export class LogViewerComponent extends BaseComponent {
    constructor(config = {}) {
        super(config);
        this.elementType = 'box';
        this.maxScrollback = config.maxScrollback || 1000;
        this.logs = [];
        this.filteredLogs = [];
        this.filters = {
            level: 'all', // 'all', 'error', 'warn', 'info', 'debug'
            keyword: '',
            showTimestamp: true
        };
        this.isFollowing = true; // Auto-scroll to newest entries

        this.elementConfig = this.elementConfig || {
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

    _setupEventHandlers() {
        if (!this.element) return;

        // Handle scrolling
        this.element.on('scroll', () => {
            const currentScroll = this.element.getScroll();
            const maxScroll = this.element.getScrollHeight() - this.element.height;
            this.isFollowing = (currentScroll >= maxScroll - 1);
        });

        // Add custom key bindings for log filtering and navigation
        const keyBindings = {
            'f': () => this._toggleFilterMenu(),
            'C-l': () => this.clearLogs(),
            'home': () => this._scrollToTop(),
            'end': () => this._scrollToBottom()
        };

        Object.entries(keyBindings).forEach(([key, handler]) => {
            this.element.key([key], handler);
        });
    }

    addLog(message, level = 'info', timestamp = new Date()) {
        const logEntry = {
            message: typeof message === 'object' ? JSON.stringify(message) : message,
            level: level.toLowerCase(),
            timestamp: timestamp,
            id: Date.now() + Math.random() // Unique ID for the log entry
        };

        this.logs.push(logEntry);

        // Maintain scrollback limit
        if (this.logs.length > this.maxScrollback) {
            this.logs = this.logs.slice(-this.maxScrollback);
        }

        this._applyFilters();
        this._maybeScrollToBottom();
        this.emit('log-added', logEntry);
    }

    addInfo(message) { this.addLog(message, 'info'); }
    addError(message) { this.addLog(message, 'error'); }
    addWarning(message) { this.addLog(message, 'warn'); }
    addDebug(message) { this.addLog(message, 'debug'); }

    clearLogs() {
        this.logs = [];
        this.filteredLogs = [];
        this.setContent('');
        this.render();
        this.emit('logs-cleared');
    }

    _applyFilters() {
        this.filteredLogs = this.logs.filter(log => this._matchesFilters(log));
        this._updateDisplay();
    }

    _matchesFilters(log) {
        // Level filter
        if (this.filters.level !== 'all' && log.level !== this.filters.level) {
            return false;
        }

        // Keyword filter
        if (this.filters.keyword && 
            !log.message.toLowerCase().includes(this.filters.keyword.toLowerCase())) {
            return false;
        }

        return true;
    }

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
        const colors = { error: 'red', warn: 'yellow', debug: 'blue' };
        return colors[level] || 'white';
    }

    _escapeBraces(str) {
        return str.toString().replace(/\{/g, '{open-brace}').replace(/\}/g, '{close-brace}');
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

    toggleTimestampDisplay() {
        this.filters.showTimestamp = !this.filters.showTimestamp;
        this._applyFilters();
        this.emit('filter-toggled', { type: 'timestamp', enabled: this.filters.showTimestamp });
    }

    toggleFollowMode() {
        this.isFollowing = !this.isFollowing;
        this.emit('follow-mode-toggled', { enabled: this.isFollowing });
    }

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

    getStats() {
        const counts = this.logs.reduce((acc, log) => {
            acc[log.level] = (acc[log.level] || 0) + 1;
            acc.total++;
            return acc;
        }, { total: 0, error: 0, warn: 0, info: 0, debug: 0 });

        return {
            counts,
            size: this.logs.length,
            filteredSize: this.filteredLogs.length,
            oldest: this.logs[0]?.timestamp || null,
            newest: this.logs[this.logs.length - 1]?.timestamp || null,
            currentFilters: { ...this.filters }
        };
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
}