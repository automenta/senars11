import { Component } from './Component.js';
import { DerivationWidget } from './widgets/DerivationWidget.js';

export class DerivationTree extends Component {
    constructor(container) {
        super(container);
        this.history = [];
        this.selectedDerivation = null;
        this.widget = null;
    }

    initialize() {
        if (!this.container) return;

        this.container.innerHTML = '';
        this.container.className = 'dt-wrapper';

        const wrapper = document.createElement('div');
        wrapper.className = 'dt-container';
        wrapper.innerHTML = `
            <div class="dt-sidebar">
                <div style="padding: 8px; font-weight: bold; border-bottom: 1px solid var(--border-color); background: var(--bg-header);">HISTORY</div>
                <div class="dt-history-list" id="dt-history"></div>
                <div class="dt-toolbar">
                    <button id="dt-export" title="Export History" style="padding: 2px 6px; font-size:10px; cursor: pointer;">💾 Export</button>
                </div>
            </div>
            <div class="dt-main" id="dt-graph"></div>
        `;
        this.container.appendChild(wrapper);

        this.historyList = wrapper.querySelector('#dt-history');
        const graphContainer = wrapper.querySelector('#dt-graph');

        wrapper.querySelector('#dt-export').addEventListener('click', () => this.exportHistory());

        // Initialize Widget
        this.widget = new DerivationWidget(graphContainer, null);
        requestAnimationFrame(() => this.widget.render());
    }

    exportHistory() {
        if (this.history.length === 0) {
            alert('No derivation history to export.');
            return;
        }
        const blob = new Blob([JSON.stringify(this.history, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `derivations-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    addDerivation(data) {
        if (!data) return;
        if (!data.timestamp) data.timestamp = new Date().toLocaleTimeString();

        this.history.unshift(data);
        this.renderHistory();
        this.selectDerivation(data);
    }

    renderHistory() {
        if (!this.historyList) return;
        this.historyList.innerHTML = '';

        for (const item of this.history) {
            const div = document.createElement('div');
            div.className = `dt-history-item ${this.selectedDerivation === item ? 'active' : ''}`;
            div.innerHTML = `
                <div class="dt-rule">${item.rule ?? 'Unknown Rule'}</div>
                <div class="dt-term" title="${item.derived?.term}">${item.derived?.term ?? '...'}</div>
                <div class="dt-time">${item.timestamp}</div>
            `;
            div.onclick = () => this.selectDerivation(item);
            this.historyList.appendChild(div);
        }
    }

    selectDerivation(data) {
        this.selectedDerivation = data;
        this.renderHistory();
        this.widget?.setDerivation(data);
    }

    resize() {
        // Widget doesn't have explicit resize method but Cytoscape might need it if container resizes
        // SimpleGraphWidget doesn't implement resize, but Cytoscape usually handles it if we call resize on it.
        // DerivationWidget -> SimpleGraphWidget.cy
        if (this.widget?.cy) {
            this.widget.cy.resize();
            this.widget.cy.fit();
        }
    }
}
