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
        document.dispatchEvent(new CustomEvent('senars:graph:filter', {
            detail: { ...this.filters }
        }));
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
        this.graphManager?.initialized && this.graphManager.clear();
    }
}
