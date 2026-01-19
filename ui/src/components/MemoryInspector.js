import { Component } from './Component.js';
import { NarseseHighlighter } from '../utils/NarseseHighlighter.js';

export class MemoryInspector extends Component {
    constructor(container) {
        super(container);
        this.data = [];
        this.sortField = 'priority';
        this.sortDirection = 'desc';
        this.filter = '';
    }

    initialize() {
        if (!this.container) return;

        // CSS for the table
        const style = document.createElement('style');
        style.textContent = `
            .memory-table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 11px; }
            .memory-table th { text-align: left; padding: 5px; background: var(--bg-header); border-bottom: 1px solid var(--border-color); position: sticky; top: 0; cursor: pointer; user-select: none; color: var(--text-muted); text-transform: uppercase; }
            .memory-table th:hover { color: var(--text-main); }
            .memory-table td { padding: 4px 5px; border-bottom: 1px solid var(--border-color); color: #aaa; }
            .memory-table tr:hover td { background: rgba(255,255,255,0.05); color: #fff; }
            .memory-table .col-term { color: var(--text-main); }
            .memory-table .col-type { color: #888; font-size: 10px; text-transform: uppercase; }
            .memory-table .col-val { text-align: right; font-family: var(--font-mono); }
        `;
        this.container.appendChild(style);

        this.container.style.overflow = 'auto';
        this.container.innerHTML += `
            <div style="padding: 5px; position: sticky; top: 0; background: var(--bg-panel); z-index: 2; border-bottom: 1px solid var(--border-color); display: flex; gap: 5px;">
                <input type="text" placeholder="Filter terms..." style="flex:1; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-main); padding:4px;" id="memory-filter">
                <button id="memory-refresh" style="font-size:10px;">REFRESH</button>
            </div>
            <div id="memory-table-container"></div>
        `;

        this.tableContainer = this.container.querySelector('#memory-table-container');
        this.container.querySelector('#memory-filter').addEventListener('input', (e) => {
            this.filter = e.target.value.toLowerCase();
            this.renderTable();
        });

        this.container.querySelector('#memory-refresh').addEventListener('click', () => {
            // Trigger refresh request if connection available (handled by app)
            // For now, relies on incoming snapshots
        });

        this.renderTable();
    }

    update(payload) {
        if (!payload || !payload.concepts) return;
        this.data = payload.concepts;
        this.renderTable();
    }

    renderTable() {
        if (!this.tableContainer) return;

        let filtered = this.data;
        if (this.filter) {
            filtered = filtered.filter(c => c.term && c.term.toLowerCase().includes(this.filter));
        }

        // Sort
        filtered.sort((a, b) => {
            let valA = this._getValue(a, this.sortField);
            let valB = this._getValue(b, this.sortField);

            if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        const html = `
            <table class="memory-table">
                <thead>
                    <tr>
                        <th data-sort="term">Term</th>
                        <th data-sort="type">Type</th>
                        <th data-sort="priority" class="col-val">Pri</th>
                        <th data-sort="durability" class="col-val">Dur</th>
                        <th data-sort="quality" class="col-val">Qual</th>
                        <th data-sort="truth" class="col-val">Truth {F, C}</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(c => this._renderRow(c)).join('')}
                </tbody>
            </table>
        `;

        this.tableContainer.innerHTML = html;

        // Bind Sort Events
        this.tableContainer.querySelectorAll('th').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (this.sortField === field) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortField = field;
                    this.sortDirection = 'desc';
                }
                this.renderTable();
            });
        });
    }

    _renderRow(c) {
        const truth = c.truth ? `{${c.truth.frequency?.toFixed(2)}, ${c.truth.confidence?.toFixed(2)}}` : '-';
        const priority = c.budget?.priority?.toFixed(2) || '0.00';
        const durability = c.budget?.durability?.toFixed(2) || '0.00';
        const quality = c.budget?.quality?.toFixed(2) || '0.00';

        // Highlight Narsese in term column
        const termHtml = NarseseHighlighter.highlight(c.term);

        return `
            <tr data-id="${c.id}" class="memory-row">
                <td class="col-term" title="${c.term}">${termHtml}</td>
                <td class="col-type">${c.type || 'CONCEPT'}</td>
                <td class="col-val" style="color:${this._colorVal(c.budget?.priority)}">${priority}</td>
                <td class="col-val">${durability}</td>
                <td class="col-val">${quality}</td>
                <td class="col-val">${truth}</td>
            </tr>
        `;
    }

    _getValue(obj, field) {
        if (field === 'priority') return obj.budget?.priority || 0;
        if (field === 'durability') return obj.budget?.durability || 0;
        if (field === 'quality') return obj.budget?.quality || 0;
        if (field === 'truth') return obj.truth?.confidence || 0; // Sort by confidence for truth
        return obj[field];
    }

    _colorVal(val) {
        if (val > 0.8) return '#00ff9d';
        if (val > 0.5) return '#ffcc00';
        return '#555';
    }
}
