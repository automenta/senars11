import {Component} from './Component.js';
import {debounce} from '../utils/Helpers.js';

/**
 * Sidebar component for demo selection and search functionality
 */
export class Sidebar extends Component {
    constructor(containerId) {
        super(containerId);
        this.demos = [];
        this.onSelectCallback = null;
        this.listContainer = document.getElementById('demo-list');
        this.searchInput = document.getElementById('search-input');

        if (this.searchInput) {
            // Use debounced input handler to improve performance
            this.searchInput.addEventListener('input', debounce((e) => this.filterDemos(e.target.value), 300));

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
        return this; // Allow chaining
    }

    setDemos(demos) {
        this.demos = demos;
        this.renderList(demos);
        return this; // Allow chaining
    }

    filterDemos(query) {
        if (!query) {
            this.renderList(this.demos);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = this.demos.filter(d =>
            (d.name && d.name.toLowerCase().includes(lowerQuery)) ||
            (d.description && d.description.toLowerCase().includes(lowerQuery))
        );
        this.renderList(filtered);
    }

    renderList(demos) {
        if (!this.listContainer) return;

        // Clear existing content
        this.listContainer.innerHTML = '';

        if (!demos || demos.length === 0) {
            this.listContainer.innerHTML = '<div class="empty-state">No demos found</div>';
            return;
        }

        // Create a document fragment for efficient DOM updates
        const fragment = document.createDocumentFragment();

        for (const demo of demos) { // Using for...of for better performance
            const item = document.createElement('div');
            item.className = 'demo-item';
            item.innerHTML = `
                <div class="demo-item-name">${demo.name || 'Unnamed Demo'}</div>
                <div class="demo-item-desc">${demo.description || ''}</div>
            `;

            item.addEventListener('click', () => {
                // Highlight selection - use more efficient query
                const activeItems = this.listContainer.querySelectorAll('.demo-item.active');
                for (const activeItem of activeItems) {
                    activeItem.classList.remove('active');
                }

                item.classList.add('active');

                if (this.onSelectCallback) {
                    this.onSelectCallback(demo.id, demo);
                }
            });

            fragment.appendChild(item);
        }

        this.listContainer.appendChild(fragment);
    }
}
