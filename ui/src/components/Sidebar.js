import { Component } from './Component.js';

export class Sidebar extends Component {
    constructor(containerId) {
        super(containerId);
        this.demos = [];
        this.onSelectCallback = null;
        this.listContainer = document.getElementById('demo-list');
        this.searchInput = document.getElementById('search-input');

        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.filterDemos(e.target.value));
            // Shortcut handling
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.searchInput.focus();
                }
            });
        }
    }

    onSelect(callback) {
        this.onSelectCallback = callback;
    }

    setDemos(demos) {
        this.demos = demos;
        this.renderList(demos);
    }

    filterDemos(query) {
        const lowerQuery = query.toLowerCase();
        const filtered = this.demos.filter(d =>
            d.name.toLowerCase().includes(lowerQuery) ||
            (d.description && d.description.toLowerCase().includes(lowerQuery))
        );
        this.renderList(filtered);
    }

    renderList(demos) {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';

        if (demos.length === 0) {
            this.listContainer.innerHTML = '<div class="empty-state">No demos found</div>';
            return;
        }

        demos.forEach(demo => {
            const item = document.createElement('div');
            item.className = 'demo-item';
            item.innerHTML = `
                <div class="demo-item-name">${demo.name}</div>
                <div class="demo-item-desc">${demo.description || ''}</div>
            `;
            item.addEventListener('click', () => {
                // Highlight selection
                this.listContainer.querySelectorAll('.demo-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');

                if (this.onSelectCallback) {
                    this.onSelectCallback(demo.id, demo);
                }
            });
            this.listContainer.appendChild(item);
        });
    }
}
