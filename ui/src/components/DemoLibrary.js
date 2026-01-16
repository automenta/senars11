import { Component } from './Component.js';

/**
 * DemoLibrary - Interactive browser for exploring and loading demo files
 * 
 * Features:
 * - Tree view of examples.json hierarchy
 * - Search/filter demos by name
 * - File preview pane
 * - Auto-run and clear-before-load options
 * - Collapsible categories
 */
export class DemoLibrary extends Component {
    constructor(container, onLoadDemo) {
        super(container);
        this.onLoadDemo = onLoadDemo; // Callback: (path, options) => void
        this.examplesTree = null;
        this.filteredTree = null;
        this.selectedFile = null;
        this.options = {
            clearFirst: false,
            autoRun: false
        };

        // Expanded state tracking
        this.expandedNodes = new Set();
    }

    async initialize() {
        this.container.innerHTML = '';

        // Create header
        const header = this.createHeader();
        this.container.appendChild(header);

        // Create options panel
        const optionsPanel = this.createOptionsPanel();
        this.container.appendChild(optionsPanel);

        // Create main layout (tree + preview)
        const mainLayout = document.createElement('div');
        mainLayout.style.cssText = 'flex: 1; display: flex; overflow: hidden; border-top: 1px solid #3c3c3c;';

        // Tree container
        const treeContainer = document.createElement('div');
        treeContainer.id = 'demo-tree-container';
        treeContainer.style.cssText = 'flex: 1; overflow-y: auto; padding: 10px; background: #1e1e1e;';
        mainLayout.appendChild(treeContainer);

        // Preview container
        const previewContainer = document.createElement('div');
        previewContainer.id = 'demo-preview-container';
        previewContainer.style.cssText = `
            width: 300px; border-left: 1px solid #3c3c3c; 
            background: #252526; padding: 10px; overflow-y: auto;
            display: flex; flex-direction: column;
        `;
        mainLayout.appendChild(previewContainer);

        this.container.appendChild(mainLayout);

        // Footer with close button
        const footer = document.createElement('div');
        footer.style.cssText = 'padding: 10px; background: #252526; border-top: 1px solid #3c3c3c; text-align: right;';
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = 'padding: 6px 16px; background: #333; color: white; border: none; cursor: pointer; border-radius: 3px;';
        closeBtn.onclick = () => this.container.closest('.modal-backdrop')?.remove();
        footer.appendChild(closeBtn);
        this.container.appendChild(footer);

        // Load examples
        try {
            await this.loadExamplesTree();
            this.renderTree(treeContainer);
            this.showWelcomePreview(previewContainer);
        } catch (error) {
            treeContainer.innerHTML = `<div style="color: #f48771; padding: 20px;">Error loading examples: ${error.message}</div>`;
        }
    }

    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = 'padding: 15px; background: #2d2d30; border-bottom: 1px solid #3c3c3c;';

        const title = document.createElement('h2');
        title.textContent = '📚 Demo Library';
        title.style.cssText = 'margin: 0 0 10px 0; color: #d4d4d4; font-size: 1.2em;';
        header.appendChild(title);

        // Search box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = '🔍 Search demos...';
        searchBox.style.cssText = `
            width: 100%; padding: 8px; background: #1e1e1e; color: #d4d4d4; 
            border: 1px solid #3c3c3c; border-radius: 3px; font-size: 0.95em;
        `;
        searchBox.oninput = (e) => this.filterDemos(e.target.value);
        header.appendChild(searchBox);

        return header;
    }

    createOptionsPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = 'padding: 10px 15px; background: #252526; display: flex; gap: 20px; align-items: center;';

        const createCheckbox = (label, checked, onChange) => {
            const wrapper = document.createElement('label');
            wrapper.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; color: #d4d4d4; font-size: 0.9em;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;
            checkbox.onchange = onChange;

            const text = document.createElement('span');
            text.textContent = label;

            wrapper.append(checkbox, text);
            return wrapper;
        };

        panel.appendChild(createCheckbox(
            'Clear notebook before loading',
            this.options.clearFirst,
            (e) => this.options.clearFirst = e.target.checked
        ));

        panel.appendChild(createCheckbox(
            'Auto-run cells after loading',
            this.options.autoRun,
            (e) => this.options.autoRun = e.target.checked
        ));

        return panel;
    }

    async loadExamplesTree() {
        const response = await fetch('/examples.json');
        if (!response.ok) throw new Error('Failed to load examples.json');
        this.examplesTree = await response.json();
        this.filteredTree = this.examplesTree;
    }

    filterDemos(searchText) {
        if (!searchText.trim()) {
            this.filteredTree = this.examplesTree;
        } else {
            this.filteredTree = this.filterNode(this.examplesTree, searchText.toLowerCase());
        }

        const treeContainer = document.getElementById('demo-tree-container');
        if (treeContainer) this.renderTree(treeContainer);
    }

    filterNode(node, searchText) {
        if (node.type === 'file') {
            // File matches if name contains search text
            return node.name.toLowerCase().includes(searchText) ? node : null;
        }

        if (node.type === 'directory') {
            // Directory: filter children
            const filteredChildren = (node.children || [])
                .map(child => this.filterNode(child, searchText))
                .filter(child => child !== null);

            if (filteredChildren.length === 0) return null;

            return {
                ...node,
                children: filteredChildren
            };
        }

        return node;
    }

    renderTree(container) {
        container.innerHTML = '';
        if (!this.filteredTree) return;

        const tree = this.renderNode(this.filteredTree, 0);
        container.appendChild(tree);
    }

    renderNode(node, depth) {
        const nodeEl = document.createElement('div');

        if (node.type === 'directory') {
            const isExpanded = this.expandedNodes.has(node.id);

            const header = document.createElement('div');
            header.style.cssText = `
                padding: 4px 8px; padding-left: ${depth * 16 + 8}px; 
                cursor: pointer; display: flex; align-items: center; gap: 6px;
                color: #d4d4d4;
            `;
            header.onmouseenter = () => header.style.background = '#2a2d2e';
            header.onmouseleave = () => header.style.background = 'transparent';
            header.onclick = () => this.toggleNode(node.id);

            const icon = document.createElement('span');
            icon.textContent = isExpanded ? '📂' : '📁';
            icon.style.fontSize = '1.1em';

            const name = document.createElement('span');
            name.textContent = node.name;
            name.style.fontWeight = depth === 0 ? 'bold' : 'normal';

            header.append(icon, name);
            nodeEl.appendChild(header);

            if (isExpanded && node.children) {
                const childrenContainer = document.createElement('div');
                node.children.forEach(child => {
                    childrenContainer.appendChild(this.renderNode(child, depth + 1));
                });
                nodeEl.appendChild(childrenContainer);
            }
        } else if (node.type === 'file') {
            const fileEl = document.createElement('div');
            fileEl.style.cssText = `
                padding: 4px 8px; padding-left: ${depth * 16 + 8}px; 
                cursor: pointer; display: flex; align-items: center; gap: 6px;
                justify-content: space-between; color: #d4d4d4;
            `;
            fileEl.onmouseenter = () => fileEl.style.background = '#2a2d2e';
            fileEl.onmouseleave = () => fileEl.style.background = 'transparent';
            fileEl.onclick = () => this.selectFile(node);

            const nameSection = document.createElement('div');
            nameSection.style.cssText = 'display: flex; align-items: center; gap: 6px; flex: 1;';

            const icon = document.createElement('span');
            icon.textContent = '📄';

            const name = document.createElement('span');
            name.textContent = node.name;
            name.style.fontSize = '0.9em';

            nameSection.append(icon, name);

            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Load';
            loadBtn.dataset.demo = node.name;
            loadBtn.style.cssText = `
                padding: 2px 8px; background: #0e639c; color: white; 
                border: none; cursor: pointer; border-radius: 2px; font-size: 0.85em;
            `;
            loadBtn.onclick = (e) => {
                e.stopPropagation();
                this.loadDemo(node);
            };

            fileEl.append(nameSection, loadBtn);
            nodeEl.appendChild(fileEl);
        }

        return nodeEl;
    }

    toggleNode(nodeId) {
        if (this.expandedNodes.has(nodeId)) {
            this.expandedNodes.delete(nodeId);
        } else {
            this.expandedNodes.add(nodeId);
        }

        const treeContainer = document.getElementById('demo-tree-container');
        if (treeContainer) this.renderTree(treeContainer);
    }

    async selectFile(node) {
        this.selectedFile = node;
        await this.previewFile(node);
    }

    async previewFile(node) {
        const previewContainer = document.getElementById('demo-preview-container');
        if (!previewContainer) return;

        previewContainer.innerHTML = '<div style="color: #888;">Loading preview...</div>';

        try {
            const response = await fetch(`/${node.path}`);
            if (!response.ok) throw new Error('Failed to load file');
            const content = await response.text();

            previewContainer.innerHTML = '';

            // Preview header
            const header = document.createElement('div');
            header.style.cssText = 'margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #3c3c3c;';

            const title = document.createElement('div');
            title.textContent = node.name;
            title.style.cssText = 'font-weight: bold; color: #d4d4d4; margin-bottom: 4px;';

            const info = document.createElement('div');
            const lines = content.split('\n').length;
            info.textContent = `${lines} lines`;
            info.style.cssText = 'font-size: 0.85em; color: #888;';

            header.append(title, info);
            previewContainer.appendChild(header);

            // Preview content
            const contentEl = document.createElement('pre');
            contentEl.style.cssText = `
                background: #1e1e1e; padding: 10px; border-radius: 3px; 
                overflow-x: auto; font-size: 0.85em; color: #d4d4d4;
                font-family: monospace; margin: 0; white-space: pre-wrap;
            `;

            // Show first 20 lines
            const previewLines = content.split('\n').slice(0, 20).join('\n');
            contentEl.textContent = previewLines + (lines > 20 ? '\n\n...' : '');

            previewContainer.appendChild(contentEl);

        } catch (error) {
            previewContainer.innerHTML = `<div style="color: #f48771;">Error loading preview: ${error.message}</div>`;
        }
    }

    showWelcomePreview(container) {
        container.innerHTML = '';

        const welcome = document.createElement('div');
        welcome.style.cssText = 'color: #888; padding: 20px; text-align: center;';
        welcome.innerHTML = `
            <div style="font-size: 3em; margin-bottom: 10px;">📚</div>
            <div style="margin-bottom: 10px;">Select a demo file to preview</div>
            <div style="font-size: 0.85em;">Click "Load" to add it to your notebook</div>
        `;

        container.appendChild(welcome);
    }

    loadDemo(node) {
        if (this.onLoadDemo) {
            this.onLoadDemo(node.path, this.options);
        }
    }
}
