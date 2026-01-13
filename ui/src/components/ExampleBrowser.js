import { Component } from './Component.js';

export class ExampleBrowser extends Component {
    constructor(containerId, options = {}) {
        super(containerId);
        this.options = {
            onSelect: null,
            indexUrl: 'examples.json',
            ...options
        };
        this.treeData = null;
        this.initialized = false;

        // Bind methods
        this.handleSelect = this.handleSelect.bind(this);
    }

    async initialize() {
        if (this.initialized) return;

        try {
            const response = await fetch(this.options.indexUrl);
            if (!response.ok) throw new Error(`Failed to load examples index: ${response.statusText}`);
            this.treeData = await response.json();
            this.render();
            this.initialized = true;
        } catch (error) {
            console.error('ExampleBrowser initialization failed:', error);
            // Fallback content
            if (this.container) {
                this.container.innerHTML = `<div class="error-message">Failed to load examples: ${error.message}</div>`;
            }
        }
    }

    render() {
        if (!this.container || !this.treeData) return;

        this.container.innerHTML = '';
        this.container.classList.add('example-browser');

        const rootList = document.createElement('ul');
        rootList.className = 'tree-root';

        this.renderNode(this.treeData, rootList);
        this.container.appendChild(rootList);
    }

    renderNode(node, parentElement) {
        if (node.type === 'directory') {
            // Don't render the root directory itself, just its children
            // unless it's a subdirectory
            if (node.id === 'examples') {
                 node.children.forEach(child => this.renderNode(child, parentElement));
                 return;
            }

            const li = document.createElement('li');
            li.className = 'tree-directory';

            const details = document.createElement('details');
            // details.open = true; // Optional: default open

            const summary = document.createElement('summary');
            summary.innerHTML = `<span class="icon">📁</span> <span class="label">${node.name}</span>`;

            const ul = document.createElement('ul');
            node.children.forEach(child => this.renderNode(child, ul));

            details.appendChild(summary);
            details.appendChild(ul);
            li.appendChild(details);
            parentElement.appendChild(li);

        } else if (node.type === 'file') {
            const li = document.createElement('li');
            li.className = 'tree-file';

            const button = document.createElement('button');
            button.className = 'tree-item-btn';
            button.innerHTML = `<span class="icon">📄</span> <span class="label">${node.name}</span>`;
            button.title = node.path;
            button.dataset.path = node.path;
            button.dataset.id = node.id;

            button.addEventListener('click', (e) => this.handleSelect(node));

            li.appendChild(button);
            parentElement.appendChild(li);
        }
    }

    handleSelect(node) {
        // Highlight selection
        const prev = this.container.querySelector('.selected');
        if (prev) prev.classList.remove('selected');

        const btn = this.container.querySelector(`button[data-id="${node.id}"]`);
        if (btn) btn.classList.add('selected');

        if (this.options.onSelect) {
            this.options.onSelect(node);
        }
    }
}
