import {UI_CONSTANTS} from '../utils/Constants.js';
import {LogViewer} from '../components/LogViewer.js';

/**
 * Logger module to handle all log message formatting and display
 */
export class Logger {
    constructor(uiElements = null) {
        this.uiElements = uiElements;
        this.logViewer = null;
        if (uiElements?.logsContainer) {
            this.logViewer = new LogViewer(uiElements.logsContainer);
        }
        this.messageCounter = 1;
        this.icons = this._initializeIcons();
    }

    /**
     * Initialize icons map
     */
    _initializeIcons() {
        const {LOG} = UI_CONSTANTS;
        return {
            success: LOG.ICONS.SUCCESS,
            error: LOG.ICONS.ERROR,
            warning: LOG.ICONS.WARNING,
            info: LOG.ICONS.INFO,
            debug: LOG.ICONS.DEBUG,
            input: LOG.ICONS.INPUT,
            task: LOG.ICONS.TASK,
            concept: LOG.ICONS.CONCEPT,
            question: LOG.ICONS.QUESTION,
            reasoning: LOG.ICONS.REASONING,
            connection: LOG.ICONS.CONNECTION,
            snapshot: LOG.ICONS.SNAPSHOT,
            control: LOG.ICONS.CONTROL,
            notification: LOG.ICONS.NOTIFICATION,
            command: LOG.ICONS.COMMAND,
            demo: LOG.ICONS.DEMO,
            refresh: LOG.ICONS.REFRESH,
            clear: LOG.ICONS.CLEAR,
            eventBatch: LOG.ICONS.EVENT_BATCH
        };
    }

    /**
     * Set UI elements reference for DOM operations
     */
    setUIElements(uiElements) {
        this.uiElements = uiElements;
        if (uiElements?.logsContainer) {
            this.logViewer = new LogViewer(uiElements.logsContainer);
        }
    }

    /**
     * Add a log entry to the container
     */
    addLogEntry(content, type = 'info', icon = null) {
        if (this.logViewer) {
            return this.logViewer.addLog(content, type, icon);
        }

        // Fallback for when LogViewer is not initialized (e.g. tests or missing container)
        const effectiveIcon = icon ?? this.icons[type] ?? this.icons[UI_CONSTANTS.LOG.TYPES.INFO];
        const timestamp = new Date().toLocaleTimeString();

        console.log(`[${timestamp}] ${effectiveIcon} ${content}`);
        return null;
    }

    /**
     * Log a message using the addLogEntry method
     */
    log(content, type = 'info', icon = null) {
        this.addLogEntry(content, type, icon);
    }

    /**
     * Show a notification message
     */
    showNotification(message, type = 'info') {
        const container = this._getNotificationContainer();
        if (!container) {
            // If no container, just log to console
            this._logToConsole(message, type);
            return;
        }

        this._createAndShowNotification(container, message, type);
    }

    /**
     * Get notification container element
     */
    _getNotificationContainer() {
        return this.uiElements?.notificationContainer || document.getElementById('notification-container');
    }

    /**
     * Log message to console based on type
     */
    _logToConsole(message, type) {
        const consoleMethod = type === 'error' ? 'error' :
                             type === 'warning' ? 'warn' : 'log';
        console[consoleMethod](message);
    }

    /**
     * Create and show notification element
     */
    _createAndShowNotification(container, message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                container.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Clear all log entries
     */
    clearLogs() {
        if (this.logViewer) {
            this.logViewer.clear();
        } else if (this.uiElements?.logsContainer) {
            // Fallback
            this._clearLogsFallback();
        } else {
            console.error('[Logger] Cannot clear logs: logsContainer not found');
            return;
        }

        this.log('Cleared logs', 'info', '🧹');
    }

    /**
     * Fallback method to clear logs when logViewer is not available
     */
    _clearLogsFallback() {
        try {
            this.uiElements.logsContainer.innerHTML = '';
        } catch (e) {
            console.error('[Logger] Error clearing logs:', e);
        }
    }
}