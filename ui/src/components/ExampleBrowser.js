import { Component } from './Component.js';

export class ExampleBrowser extends Component {
    constructor(containerId, options = {}) {
        super(containerId);
        this.options = {
            onSelect: null,
            indexUrl: 'examples.json',
            viewMode: 'graph', // 'tree' or 'graph'
            ...options
        };
        this.treeData = null;
        this.initialized = false;
        this.cy = null;

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
            if (this.container) {
                this.container.innerHTML = `<div class="eb-error">Failed to load examples: ${error.message}</div>`;
            }
        }
    }

    render() {
        if (!this.container || !this.treeData) return;

        this.container.innerHTML = '';
        this.container.classList.add('example-browser');

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'eb-toolbar';

        const modeSelect = document.createElement('select');
        modeSelect.className = 'eb-mode-select';
        modeSelect.innerHTML = `
            <option value="graph" ${this.options.viewMode === 'graph' ? 'selected' : ''}>Graph View</option>
            <option value="tree" ${this.options.viewMode === 'tree' ? 'selected' : ''}>Tree View</option>
        `;
        modeSelect.onchange = (e) => {
            this.options.viewMode = e.target.value;
            this.renderContent();
        };

        toolbar.appendChild(modeSelect);
        this.container.appendChild(toolbar);

        // Content Area
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'eb-content';
        this.container.appendChild(this.contentArea);

        this.renderContent();
    }

    renderContent() {
        this.contentArea.innerHTML = '';
        if (this.options.viewMode === 'graph') {
            this.renderGraph();
        } else {
            this.renderTree();
        }
    }

    renderTree() {
        this.contentArea.style.overflowY = 'auto'; // Keep minimal functional style or move to CSS class
        // Moving overflow-y to CSS class 'eb-content-tree' could be better but 'eb-content' handles basic layout.
        // Let's rely on 'eb-content' and maybe specific tree container.

        const rootList = document.createElement('ul');
        rootList.className = 'eb-tree-root';
        this.renderNode(this.treeData, rootList);
        this.contentArea.appendChild(rootList);
    }

    renderNode(node, parentElement) {
        const { type, id, name, path, children } = node;

        if (type === 'directory') {
            if (id === 'examples') {
                 children.forEach(child => this.renderNode(child, parentElement));
                 return;
            }

            const li = document.createElement('li');
            li.className = 'eb-tree-dir';

            const details = document.createElement('details');
            details.open = true;
            const summary = document.createElement('summary');
            summary.className = 'eb-tree-summary';
            summary.innerHTML = `<span class="icon">📁</span> <span class="label">${name}</span>`;

            const ul = document.createElement('ul');
            children.forEach(child => this.renderNode(child, ul));

            details.append(summary, ul);
            li.appendChild(details);
            parentElement.appendChild(li);

        } else if (type === 'file') {
            const li = document.createElement('li');
            li.className = 'eb-tree-file';

            const button = document.createElement('button');
            button.className = 'eb-file-btn';
            button.innerHTML = `<span class="icon">📄</span> <span class="label">${name}</span>`;
            Object.assign(button.dataset, { path, id });
            button.title = path;

            button.addEventListener('click', () => this.handleSelect(node));

            li.appendChild(button);
            parentElement.appendChild(li);
        }
    }

    renderGraph() {
        if (!window.cytoscape) {
            this.contentArea.innerHTML = '<div class="eb-error">Cytoscape library not loaded.</div>';
            return;
        }

        const cyContainer = document.createElement('div');
        cyContainer.className = 'eb-cy-container';
        this.contentArea.appendChild(cyContainer);

        const elements = this.convertToGraphElements(this.treeData);

        this.cy = window.cytoscape({
            container: cyContainer,
            elements: elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'color': '#fff',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '12px',
                        'text-wrap': 'wrap'
                    }
                },
                {
                    selector: 'node[type="directory"]',
                    style: {
                        'background-color': '#444',
                        'shape': 'round-rectangle',
                        'width': 'label',
                        'height': 'label',
                        'padding': '10px'
                    }
                },
                {
                    selector: 'node[type="file"]',
                    style: {
                        'background-color': '#0e639c',
                        'shape': 'ellipse',
                        'width': '60px',
                        'height': '60px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#555',
                        'target-arrow-color': '#555',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                }
            ],
            layout: {
                name: 'fcose',
                animate: true,
                nodeDimensionsIncludeLabels: true
            }
        });

        // Ensure layout runs after init
        setTimeout(() => {
             this.cy.resize();
             this.cy.layout({ name: 'fcose', animate: true }).run();
        }, 100);

        this.cy.on('tap', 'node[type="file"]', (evt) => {
            const data = evt.target.data();
            this.handleSelect(data.nodeData);
        });
    }

    convertToGraphElements(root, parentId = null) {
        let elements = [];
        const { type, id, name, children } = root;

        // Skip root "examples" folder visualization if desired, or show it as central hub
        // We'll show everything for now

        const nodeId = id || `node_${Math.random().toString(36).substr(2, 9)}`;

        elements.push({
            group: 'nodes',
            data: {
                id: nodeId,
                label: name,
                type: type,
                nodeData: root
            }
        });

        if (parentId) {
            elements.push({
                group: 'edges',
                data: {
                    source: parentId,
                    target: nodeId
                }
            });
        }

        if (children && Array.isArray(children)) {
            children.forEach(child => {
                elements = elements.concat(this.convertToGraphElements(child, nodeId));
            });
        }

        return elements;
    }

    handleSelect(node) {
        this.options.onSelect?.(node);
    }
}
