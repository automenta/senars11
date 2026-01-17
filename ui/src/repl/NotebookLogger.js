export class NotebookLogger {
    constructor(notebookManager) {
        this.notebook = notebookManager;
    }

    log(content, type = 'info', icon = null) {
        this.addLogEntry(content, type, icon);
    }

    addLogEntry(content, type = 'info', icon = null) {
        if (!this.notebook) {
            console.log(`[NotebookLogger] ${type}: ${content}`);
            return;
        }

        // Map logger types to notebook categories if needed
        // For now, we use the type as category directly.
        // We can optionally use the icon in the content or let the ResultCell handle it.
        // ResultCell logic:
        // const catInfo = MESSAGE_CATEGORIES[this.category] || MESSAGE_CATEGORIES.unknown;
        // const color = catInfo.color || '#00ff88';

        // We might want to prepend icon to content if it's not handled by category mapping
        // But ResultCell handles icons via MESSAGE_CATEGORIES.

        // If type is 'input', we might want to avoid logging it as result if it was just entered by user?
        // But CommandProcessor logs inputs too.

        let viewMode = 'full';
        if (type === 'info' || type === 'debug') viewMode = 'compact';

        this.notebook.createResultCell(content, type, viewMode);
    }

    showNotification(message, type = 'info') {
        // Use a compact result cell for notifications
        if (this.notebook) {
            this.notebook.createResultCell(`🔔 ${message}`, type, 'compact');
        } else {
            console.log(`[Notification] ${message}`);
        }
    }

    clearLogs() {
        if (this.notebook) {
            this.notebook.clear();
        }
    }
}
