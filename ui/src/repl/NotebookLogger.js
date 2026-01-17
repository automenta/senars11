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

        let viewMode = 'full';
        if (type === 'info' || type === 'debug') viewMode = 'compact';

        this.notebook.createResultCell(content, type, viewMode);
    }

    logWidget(type, data) {
        if (!this.notebook) {
            console.log(`[NotebookLogger] Widget ${type}:`, data);
            return;
        }
        this.notebook.createWidgetCell(type, data);
    }

    logMarkdown(content) {
        if (!this.notebook) {
            console.log(`[NotebookLogger] Markdown:`, content);
            return;
        }
        this.notebook.createMarkdownCell(content);
    }

    showNotification(message, type = 'info') {
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
