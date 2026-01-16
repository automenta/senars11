import { VIEW_MODES, MESSAGE_CATEGORIES } from './MessageFilter.js';

/**
 * Base class for REPL cells
 */
export class REPLCell {
    constructor(type, content = '') {
        this.id = `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.type = type; // 'code', 'result', 'markdown'
        this.content = content;
        this.timestamp = Date.now();
        this.element = null;
    }

    render() {
        throw new Error('REPLCell.render() must be implemented by subclass');
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

/**
 * Code cell for user input
 */
export class CodeCell extends REPLCell {
    constructor(content = '', onExecute = null) {
        super('code', content);
        this.onExecute = onExecute;
    }

    render() {
        const cell = document.createElement('div');
        cell.className = 'repl-cell code-cell';
        cell.dataset.cellId = this.id;
        cell.style.cssText = `
            margin-bottom: 12px;
            border: 1px solid #3c3c3c;
            border-radius: 4px;
            background: #1e1e1e;
            overflow: hidden;
        `;

        // Cell toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'cell-toolbar';
        toolbar.style.cssText = `
            padding: 4px 8px;
            background: #252526;
            border-bottom: 1px solid #3c3c3c;
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 0.85em;
        `;

        const label = document.createElement('span');
        label.textContent = '💻 Code';
        label.style.color = '#888';

        const runBtn = document.createElement('button');
        runBtn.innerHTML = '▶️';
        runBtn.title = 'Run cell';
        runBtn.style.cssText = 'padding: 2px 8px; background: #0e639c; color: white; border: none; cursor: pointer; border-radius: 2px;';
        runBtn.onclick = () => this.execute();

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete cell';
        deleteBtn.style.cssText = 'padding: 2px 8px; background: #b30000; color: white; border: none; cursor: pointer; border-radius: 2px; margin-left: auto;';
        deleteBtn.onclick = () => this.delete();

        toolbar.appendChild(label);
        toolbar.appendChild(runBtn);
        toolbar.appendChild(deleteBtn);

        // Code editor
        const editor = document.createElement('textarea');
        editor.className = 'cell-editor';
        editor.value = this.content;
        editor.placeholder = 'Enter Narsese or MeTTa...';
        editor.rows = 3;
        editor.style.cssText = `
            width: 100%;
            background: #1e1e1e;
            color: #d4d4d4;
            border: none;
            padding: 10px;
            font-family: monospace;
            font-size: 0.95em;
            resize: vertical;
            outline: none;
        `;

        editor.addEventListener('input', (e) => {
            this.content = e.target.value;
        });

        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.execute();
            }
        });

        cell.appendChild(toolbar);
        cell.appendChild(editor);

        this.element = cell;
        this.editor = editor;

        return cell;
    }

    execute() {
        if (this.onExecute && this.content.trim()) {
            this.onExecute(this.content, this);
        }
    }

    delete() {
        if (confirm('Delete this cell?')) {
            this.destroy();
            // Trigger deletion event
            if (this.onDelete) {
                this.onDelete(this);
            }
        }
    }

    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }
}

/**
 * Result cell for output display
 */
export class ResultCell extends REPLCell {
    constructor(content, category = 'result', viewMode = VIEW_MODES.FULL) {
        super('result', content);
        this.category = category;
        this.viewMode = viewMode;
    }

    render() {
        const cell = document.createElement('div');
        cell.className = 'repl-cell result-cell';
        cell.dataset.cellId = this.id;
        cell.dataset.category = this.category;

        this.element = cell;
        this.updateViewMode(this.viewMode);
        return cell;
    }

    updateViewMode(mode) {
        this.viewMode = mode;
        if (!this.element) return;

        const catInfo = MESSAGE_CATEGORIES[this.category] || MESSAGE_CATEGORIES.unknown;
        const color = catInfo.color || '#00ff88';
        const icon = catInfo.icon || '✨';
        const label = catInfo.label || 'Result';
        const timestamp = new Date(this.timestamp).toLocaleTimeString();

        this.element.innerHTML = '';
        this.element.style.display = 'block'; // Reset

        if (mode === VIEW_MODES.HIDDEN) {
             this.element.style.display = 'none';
             return;
        }

        if (mode === VIEW_MODES.COMPACT) {
             this.element.style.cssText = `
                margin-bottom: 4px;
                padding: 4px 8px;
                border-left: 3px solid ${color};
                background: rgba(0,0,0,0.2);
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 0.9em;
            `;
            this.element.title = "Click to expand";
            this.element.onclick = () => this.updateViewMode(VIEW_MODES.FULL);

            const badge = document.createElement('span');
            badge.style.color = color;
            badge.innerHTML = `${icon} ${label}`;

            const preview = document.createElement('span');
            preview.style.cssText = 'color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;';
            // Simple preview: first 50 chars of content
            let previewText = typeof this.content === 'string' ? this.content : JSON.stringify(this.content);
            if (previewText.length > 80) previewText = previewText.substring(0, 80) + '...';
            preview.textContent = previewText;

            this.element.appendChild(badge);
            this.element.appendChild(preview);
        } else { // FULL
             this.element.onclick = null;
             this.element.style.cssText = `
                margin-bottom: 12px;
                padding: 10px;
                border-left: 3px solid ${color};
                background: rgba(255, 255, 255, 0.03);
                border-radius: 4px;
            `;

            // Result header
            const header = document.createElement('div');
            header.style.cssText = 'font-size: 0.85em; color: #888; margin-bottom: 6px; display: flex; justify-content: space-between;';

            const left = document.createElement('span');
            left.style.color = color;
            left.innerHTML = `${icon} ${label}`;

            const right = document.createElement('span');
            right.textContent = timestamp;

            // Allow collapsing back to compact
            const collapseBtn = document.createElement('span');
            collapseBtn.innerHTML = ' 🔽';
            collapseBtn.style.cursor = 'pointer';
            collapseBtn.title = 'Collapse';
            collapseBtn.onclick = (e) => {
                e.stopPropagation();
                this.updateViewMode(VIEW_MODES.COMPACT);
            };
            left.appendChild(collapseBtn);

            header.appendChild(left);
            header.appendChild(right);

            // Result content
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = 'white-space: pre-wrap; font-family: monospace; color: #d4d4d4; overflow-x: auto;';

            if (typeof this.content === 'object') {
                 contentDiv.textContent = JSON.stringify(this.content, null, 2);
            } else {
                 contentDiv.textContent = this.content;
            }

            this.element.appendChild(header);
            this.element.appendChild(contentDiv);
        }
    }
}

/**
 * Notebook manager for REPL cells
 */
export class NotebookManager {
    constructor(container) {
        this.container = container;
        this.cells = [];
    }

    addCell(cell) {
        this.cells.push(cell);
        const element = cell.render();
        this.container.appendChild(element);
        this.scrollToBottom();
        return cell;
    }

    createCodeCell(content = '', onExecute = null) {
        const cell = new CodeCell(content, onExecute);
        cell.onDelete = (c) => this.removeCell(c);
        return this.addCell(cell);
    }

    createResultCell(content, category = 'result', viewMode = VIEW_MODES.FULL) {
        const cell = new ResultCell(content, category, viewMode);
        return this.addCell(cell);
    }

    applyFilter(messageFilter) {
        this.cells.forEach(cell => {
            if (cell instanceof ResultCell) {
                // We construct a fake message object to pass to getMessageViewMode
                // because filter logic might need content for search
                const fakeMsg = {
                    type: cell.category,
                    content: cell.content
                };
                const mode = messageFilter.getMessageViewMode(fakeMsg);
                cell.updateViewMode(mode);
            }
        });
    }

    removeCell(cell) {
        const index = this.cells.indexOf(cell);
        if (index > -1) {
            this.cells.splice(index, 1);
        }
        cell.destroy();
    }

    clear() {
        this.cells.forEach(cell => cell.destroy());
        this.cells = [];
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }

    exportNotebook() {
        return this.cells.map(cell => ({
            type: cell.type,
            content: cell.content,
            timestamp: cell.timestamp,
            category: cell.category
        }));
    }

    importNotebook(data) {
        this.clear();
        data.forEach(cellData => {
            if (cellData.type === 'code') {
                this.createCodeCell(cellData.content);
            } else if (cellData.type === 'result') {
                this.createResultCell(cellData.content, cellData.category);
            }
        });
    }
}
