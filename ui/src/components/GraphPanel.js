import { Component } from './Component.js';
import { GraphManager } from '../visualization/GraphManager.js';
import { Toolbar } from './ui/Toolbar.js';

export class GraphPanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.graphManager = null;
        this.initialized = false;
        this.filters = {
            showTasks: true,
            minPriority: 0
        };
    }

    initialize() {
        if (this.initialized || !this.container) return;

        this.createToolbar();
        this.createGraphContainer();

        try {
            this.graphManager = new GraphManager({
                graphContainer: this.graphDiv,
                graphDetails: null
            });
            this.initialized = this.graphManager.initialize();
            if (this.initialized) {
                this.graphManager.setUpdatesEnabled(true);
            }
        } catch (e) {
            console.error('Failed to initialize GraphManager:', e);
        }
    }

    createToolbar() {
        const toolbarContainer = document.createElement('div');
        toolbarContainer.className = 'graph-toolbar-container';

        const tb = new Toolbar(toolbarContainer);

        // Row 1: Controls
        const controlRow = document.createElement('div');
        controlRow.className = 'graph-control-row';
        const controlTb = new Toolbar(controlRow);

        controlTb.addButton({ icon: '⤢', title: 'Fit View', onClick: () => this.graphManager?.fitToScreen(), className: 'toolbar-btn' });
        controlTb.addButton({ icon: '🔭', title: 'Focus Center', onClick: () => this.graphManager?.cy?.center(), className: 'toolbar-btn' });
        controlTb.addButton({ icon: '➕', title: 'Zoom In', onClick: () => this.graphManager?.zoomIn(), className: 'toolbar-btn' });
        controlTb.addButton({ icon: '➖', title: 'Zoom Out', onClick: () => this.graphManager?.zoomOut(), className: 'toolbar-btn' });
        controlTb.addButton({ icon: '🗑️', title: 'Reset', onClick: () => this.reset(), className: 'toolbar-btn' });

        // Layout Selector
        const layoutSelect = document.createElement('select');
        layoutSelect.className = 'graph-layout-select toolbar-select';
        layoutSelect.style.cssText = 'background: #333; color: #eee; border: 1px solid #444; border-radius: 3px; padding: 2px; margin-left: 4px;';
        ['fcose', 'grid', 'circle', 'concentric', 'breadthfirst'].forEach(l => {
            const opt = document.createElement('option');
            opt.value = l;
            opt.textContent = l.charAt(0).toUpperCase() + l.slice(1);
            layoutSelect.appendChild(opt);
        });
        layoutSelect.onchange = (e) => this.graphManager?.setLayout(e.target.value);
        controlTb.addCustom(layoutSelect);

        tb.addCustom(controlRow);

        // Filter: Show Tasks
        const taskToggle = document.createElement('label');
        taskToggle.className = 'graph-filter-toggle';
        taskToggle.innerHTML = `<input type="checkbox" checked style="margin:0;"> Show Tasks`;
        taskToggle.querySelector('input').onchange = (e) => {
            this.filters.showTasks = e.target.checked;
            this._dispatchFilter();
        };
        tb.addCustom(taskToggle);

        // Filter: Hide Isolated
        const isolatedToggle = document.createElement('label');
        isolatedToggle.className = 'graph-filter-toggle';
        isolatedToggle.style.marginLeft = '8px';
        isolatedToggle.innerHTML = `<input type="checkbox" style="margin:0;"> Hide Isolated`;
        isolatedToggle.querySelector('input').onchange = (e) => {
            this.filters.hideIsolated = e.target.checked;
            this._dispatchFilter();
        };
        tb.addCustom(isolatedToggle);

        // Filter: Priority Slider
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'graph-slider-container';

        const sliderLabel = document.createElement('div');
        sliderLabel.className = 'graph-slider-label';
        sliderLabel.innerHTML = '<span>Min Prio</span><span id="gp-prio-val">0.0</span>';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '1';
        slider.step = '0.05';
        slider.value = '0';
        slider.className = 'graph-slider-input';
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            this.filters.minPriority = val;
            sliderLabel.querySelector('#gp-prio-val').textContent = val.toFixed(2);
            this._dispatchFilter();
        };

        sliderContainer.append(sliderLabel, slider);
        tb.addCustom(sliderContainer);

        this.container.appendChild(toolbarContainer);
    }

    createGraphContainer() {
        this.graphDiv = document.createElement('div');
        this.graphDiv.className = 'graph-container';
        this.container.appendChild(this.graphDiv);
    }

    _dispatchFilter() {
        if (this.graphManager) {
            this.graphManager.applyFilters(this.filters);
        }
    }

    _inspectNode(node) {
        document.dispatchEvent(new CustomEvent('senars:concept:select', {
            detail: { concept: { term: node.id(), ...node.data() } }
        }));
    }

    update(message) {
        this.initialized && this.graphManager?.updateFromMessage(message);
    }

    resize() {
        const cy = this.graphManager?.cy;
        if (cy) {
            cy.resize();
            cy.fit();
        }
    }

    reset() {
        this.graphManager?.clear();
    }
}
