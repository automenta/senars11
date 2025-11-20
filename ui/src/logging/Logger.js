/**
 * Logger module to handle all log message formatting and display
 */
export class Logger {
  constructor(uiElements = null) {
    this.uiElements = uiElements;
    this.messageCounter = 1;
    this.icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      debug: '🔍',
      input: '⌨️',
      task: '📥',
      concept: '🧠',
      question: '❓',
      reasoning: '🔍',
      connection: '🌐',
      snapshot: '📊',
      control: '⚙️',
      notification: '🔔',
      command: '📜',
      demo: '🎬',
      refresh: '🔄',
      clear: '🧹',
      eventBatch: '📦'
    };
  }

  /**
   * Set UI elements reference for DOM operations
   */
  setUIElements(uiElements) {
    this.uiElements = uiElements;
  }

  /**
   * Add a log entry to the container
   */
  addLogEntry(content, type = 'info', icon = null) {
    const effectiveIcon = icon ?? this.icons[type] ?? this.icons.info;
    const timestamp = new Date().toLocaleTimeString();

    // Create log entry elements with helper function
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry type-${type}`;

    // Create elements directly without intermediate object to reduce object creation
    const iconElement = this._createLogElement('span', 'log-entry-icon', effectiveIcon);
    const contentElement = this._createLogElement('div', 'log-entry-content', content);
    const timeElement = this._createLogElement('span', 'log-entry-time', timestamp, `time-${this.messageCounter}`);

    logEntry.appendChild(iconElement);
    logEntry.appendChild(contentElement);
    logEntry.appendChild(timeElement);

    // Add to container if available
    if (this.uiElements?.logsContainer) {
      this.uiElements.logsContainer.appendChild(logEntry);
      // Auto-scroll to bottom - only do this if we're near the bottom to avoid jarring UX
      const container = this.uiElements.logsContainer;
      const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 1;

      if (isNearBottom) {
        // Use requestAnimationFrame to ensure DOM is updated before scrolling
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
          window.requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
          });
        } else {
          container.scrollTop = container.scrollHeight;
        }
      }
    }

    this.messageCounter++;
    return logEntry;
  }

  /**
   * Helper function to create log entry elements
   */
  _createLogElement(tag, className, textContent, id = null) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = textContent;
    if (id) element.id = id;
    return element;
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
    const container = this.uiElements?.notificationContainer || document.getElementById('notification-container');
    if (!container) {
      // If no container, just log to console
      console[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log'](message);
      return;
    }

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
    if (this.uiElements?.logsContainer) {
      this.uiElements.logsContainer.innerHTML = '';
      this.log('Cleared logs', 'info', '🧹');
    }
  }
}