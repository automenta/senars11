import {Component} from './Component.js';
import {UI_CONSTANTS} from '../utils/Constants.js';

/**
 * LogViewer component for displaying log entries with icons and formatting
 */
export class LogViewer extends Component {
    constructor(container) {
        super(container);
        this.messageCounter = 1;
        this.icons = this._initializeIcons();
    }

    /**
     * Initialize icons map
     */
    _initializeIcons() {
        const {LOG_ICONS, LOG_TYPES} = UI_CONSTANTS;
        return {
            success: LOG_ICONS.SUCCESS,
            error: LOG_ICONS.ERROR,
            warning: LOG_ICONS.WARNING,
            info: LOG_ICONS.INFO,
            debug: LOG_ICONS.DEBUG,
            input: LOG_ICONS.INPUT,
            task: LOG_ICONS.TASK,
            concept: LOG_ICONS.CONCEPT,
            question: LOG_ICONS.QUESTION,
            reasoning: LOG_ICONS.REASONING,
            connection: LOG_ICONS.CONNECTION,
            snapshot: LOG_ICONS.SNAPSHOT,
            control: LOG_ICONS.CONTROL,
            notification: LOG_ICONS.NOTIFICATION,
            command: LOG_ICONS.COMMAND,
            demo: LOG_ICONS.DEMO,
            refresh: LOG_ICONS.REFRESH,
            clear: LOG_ICONS.CLEAR,
            eventBatch: LOG_ICONS.EVENT_BATCH
        };
    }

    render() {
        if (!this.container) return;
        this.container.classList.add('logs-container');
    }

    addLog(content, type = 'info', icon = null) {
        if (!this.container) return;

        const effectiveIcon = icon ?? this.icons[type] ?? this.icons[UI_CONSTANTS.LOG.TYPES.INFO];
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = this._createLogEntry(type, effectiveIcon, content, timestamp);

        // Check if user has scrolled to bottom to auto-scroll after adding new entry
        const isScrolledToBottom = this._isScrolledToBottom();
        this.container.appendChild(logEntry);

        if (isScrolledToBottom) {
            this._autoScrollToBottom();
        }

        this.messageCounter++;
        return logEntry;
    }

    /**
     * Create a complete log entry element
     */
    _createLogEntry(type, icon, content, timestamp) {
        const logEntry = this._createLogElement('div', `log-entry type-${type}`);
        const iconElement = this._createLogElement('span', 'log-entry-icon', icon);
        const contentElement = this._createContentElement(content);
        const timeElement = this._createLogElement('span', 'log-entry-time', timestamp, `time-${this.messageCounter}`);

        logEntry.appendChild(iconElement);
        logEntry.appendChild(contentElement);
        logEntry.appendChild(timeElement);

        return logEntry;
    }

    /**
     * Create content element based on content type
     */
    _createContentElement(content) {
        if (typeof content === 'object' && content !== null) {
            return this._createObjectContentElement(content);
        } else {
            return this._createLogElement('div', 'log-entry-content', content);
        }
    }

    /**
     * Create content element for object content
     */
    _createObjectContentElement(obj) {
        const contentElement = document.createElement('div');
        contentElement.className = 'log-entry-content';

        const jsonString = JSON.stringify(obj, null, 2);
        if (jsonString.length > 200) {
            contentElement.appendChild(this._createExpandableObjectElement(obj, jsonString));
        } else {
            const pre = document.createElement('pre');
            pre.textContent = jsonString;
            pre.style.margin = '0';
            contentElement.appendChild(pre);
        }

        return contentElement;
    }

    /**
     * Create expandable details element for large objects
     */
    _createExpandableObjectElement(obj, jsonString) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = `Object (${Object.keys(obj).length} keys)`;
        summary.style.cursor = 'pointer';
        summary.style.color = '#aaa';

        const pre = document.createElement('pre');
        pre.textContent = jsonString;
        pre.style.marginTop = '5px';
        pre.style.fontSize = '0.9em';

        details.appendChild(summary);
        details.appendChild(pre);

        return details;
    }

    /**
     * Check if container is scrolled to bottom
     */
    _isScrolledToBottom() {
        const {scrollTop, scrollHeight, clientHeight} = this.container;
        return Math.abs(scrollHeight - (scrollTop + clientHeight)) < 5; // Tolerance
    }

    _autoScrollToBottom() {
        if (!this.container) return;
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            window.requestAnimationFrame(() => {
                this.container.scrollTop = this.container.scrollHeight;
            });
        } else {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    _createLogElement(tag, className, textContent, id = null) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = textContent;
        if (id) element.id = id;
        return element;
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
