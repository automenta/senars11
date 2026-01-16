import { VIEW_MODES, MESSAGE_CATEGORIES } from './MessageFilter.js';

/**
 * Base class for REPL cells
 */
export class REPLCell {
    constructor(type, content = '') {
        this.id = `cell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.type = type;
        this.content = content;
        this.timestamp = Date.now();
        this.element = null;
    }

    render() {
        throw new Error('REPLCell.render() must be implemented by subclass');
    }

    destroy() {
        this.element?.parentNode?.removeChild(this.element);
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
        this.element = document.createElement('div');
        this.element.className = 'repl-cell code-cell';
        this.element.dataset.cellId = this.id;
        this.element.style.cssText = `
            margin-bottom: 12px;
            border: 1px solid #3c3c3c;
            border-radius: 4px;
            background: #1e1e1e;
            overflow: hidden;
        `;

        this.element.appendChild(this._createToolbar());
        this.element.appendChild(this._createEditor());

        return this.element;
    }

    _createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'cell-toolbar';
        toolbar.style.cssText = `
            padding: 4px 8px;
            background: #252526;
            border-bottom: 1px solid #3c3c3c;
            display: flex; gap: 8px; align-items: center; font-size: 0.85em;
        `;

        const label = document.createElement('span');
        label.textContent = '💻 Code';
        label.style.color = '#888';

        const runBtn = this._createButton('▶️', 'Run cell', '#0e639c', () => this.execute());
        const deleteBtn = this._createButton('🗑️', 'Delete cell', '#b30000', () => this.delete());
        deleteBtn.style.marginLeft = 'auto';

        toolbar.append(label, runBtn, deleteBtn);
        return toolbar;
    }

    _createButton(icon, title, bg, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = title;
        btn.style.cssText = `padding: 2px 8px; background: ${bg}; color: white; border: none; cursor: pointer; border-radius: 2px;`;
        btn.onclick = onClick;
        return btn;
    }

    _createEditor() {
        const editor = document.createElement('textarea');
        editor.className = 'cell-editor';
        editor.value = this.content;
        editor.placeholder = 'Enter Narsese or MeTTa...';
        editor.rows = 3;
        editor.style.cssText = `
            width: 100%; background: #1e1e1e; color: #d4d4d4; border: none; padding: 10px;
            font-family: monospace; font-size: 0.95em; resize: vertical; outline: none;
        `;

        editor.addEventListener('input', (e) => this.content = e.target.value);
        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.execute();
            }
        });

        this.editor = editor;
        return editor;
    }

    execute() {
        if (this.onExecute && this.content.trim()) {
            this.onExecute(this.content, this);
        }
    }

    delete() {
        if (confirm('Delete this cell?')) {
            this.destroy();
            this.onDelete?.(this);
        }
    }

    focus() {
        this.editor?.focus();
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
        this.element = document.createElement('div');
        this.element.className = 'repl-cell result-cell';
        this.element.dataset.cellId = this.id;
        this.element.dataset.category = this.category;

        this.updateViewMode(this.viewMode);
        return this.element;
    }

    updateViewMode(mode) {
        this.viewMode = mode;
        if (!this.element) return;

        const catInfo = MESSAGE_CATEGORIES[this.category] || MESSAGE_CATEGORIES.unknown;
        const color = catInfo.color || '#00ff88';

        this.element.innerHTML = '';
        this.element.style.display = mode === VIEW_MODES.HIDDEN ? 'none' : 'block';
        if (mode === VIEW_MODES.HIDDEN) return;

        if (mode === VIEW_MODES.COMPACT) {
            this._renderCompact(catInfo, color);
        } else {
            this._renderFull(catInfo, color);
        }
    }

    _renderCompact(catInfo, color) {
        this.element.style.cssText = `
            margin-bottom: 4px; padding: 4px 8px; border-left: 3px solid ${color};
            background: rgba(0,0,0,0.2); border-radius: 4px; display: flex;
            align-items: center; gap: 8px; cursor: pointer; font-size: 0.9em;
        `;
        this.element.title = "Click to expand";
        this.element.onclick = () => this.updateViewMode(VIEW_MODES.FULL);

        const badge = document.createElement('span');
        badge.style.color = color;
        badge.innerHTML = `${catInfo.icon || '✨'} ${catInfo.label || 'Result'}`;

        const preview = document.createElement('span');
        preview.style.cssText = 'color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;';

        let previewText = typeof this.content === 'string' ? this.content : JSON.stringify(this.content);
        if (previewText.length > 80) previewText = previewText.substring(0, 80) + '...';
        preview.textContent = previewText;

        this.element.append(badge, preview);
    }

    _renderFull(catInfo, color) {
        this.element.onclick = null;
        this.element.style.cssText = `
            margin-bottom: 12px; padding: 10px; border-left: 3px solid ${color};
            background: rgba(255, 255, 255, 0.03); border-radius: 4px;
        `;

        this.element.appendChild(this._createHeader(color, catInfo));

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'white-space: pre-wrap; font-family: monospace; color: #d4d4d4; overflow-x: auto;';
        contentDiv.textContent = typeof this.content === 'object' ? JSON.stringify(this.content, null, 2) : this.content;

        this.element.appendChild(contentDiv);
    }

    _createHeader(color, catInfo) {
        const header = document.createElement('div');
        header.style.cssText = 'font-size: 0.85em; color: #888; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;';

        const left = document.createElement('span');
        left.style.color = color;
        left.innerHTML = `${catInfo.icon || '✨'} ${catInfo.label || 'Result'}`;

        const collapseBtn = document.createElement('span');
        collapseBtn.innerHTML = ' 🔽';
        collapseBtn.style.cursor = 'pointer';
        collapseBtn.title = 'Collapse';
        collapseBtn.onclick = (e) => {
            e.stopPropagation();
            this.updateViewMode(VIEW_MODES.COMPACT);
        };
        left.appendChild(collapseBtn);

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.gap = '8px';
        right.style.alignItems = 'center';

        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; color: #666; font-size: 1.1em; padding: 0;';
        copyBtn.onclick = (e) => {
             e.stopPropagation();
             const text = typeof this.content === 'object' ? JSON.stringify(this.content, null, 2) : this.content;
             navigator.clipboard.writeText(text);
             copyBtn.innerHTML = '✅';
             setTimeout(() => copyBtn.innerHTML = '📋', 1500);
        };

        const timeSpan = document.createElement('span');
        timeSpan.textContent = new Date(this.timestamp).toLocaleTimeString();

        right.append(copyBtn, timeSpan);
        header.append(left, right);
        return header;
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
        this.container.appendChild(cell.render());
        this.scrollToBottom();
        return cell;
    }

    createCodeCell(content = '', onExecute = null) {
        const cell = new CodeCell(content, onExecute);
        cell.onDelete = (c) => this.removeCell(c);
        return this.addCell(cell);
    }

    createResultCell(content, category = 'result', viewMode = VIEW_MODES.FULL) {
        return this.addCell(new ResultCell(content, category, viewMode));
    }

    applyFilter(messageFilter) {
        this.cells.forEach(cell => {
            if (cell instanceof ResultCell) {
                const fakeMsg = { type: cell.category, content: cell.content };
                cell.updateViewMode(messageFilter.getMessageViewMode(fakeMsg));
            }
        });
    }

    removeCell(cell) {
        const index = this.cells.indexOf(cell);
        if (index > -1) this.cells.splice(index, 1);
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
        data.forEach(d => {
            if (d.type === 'code') this.createCodeCell(d.content);
            else if (d.type === 'result') this.createResultCell(d.content, d.category);
        });
    }
}
