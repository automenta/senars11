import { Component } from './Component.js';
import { ConceptCard } from './ConceptCard.js';
import { TaskCard } from './TaskCard.js';

export class MemoryInspector extends Component {
    constructor(container) {
        super(container);
        this.data = [];
        this.sortField = 'priority';
        this.sortDirection = 'desc';
        this.filterText = '';
        this.filters = { hasGoals: false, hasQuestions: false };
        this.listMode = 'compact'; // 'compact' or 'full'
        this.viewMode = 'list';
        this.selectedConcept = null;

        document.addEventListener('senars:concept:select', (e) => {
            e.detail?.concept && this.selectConcept(e.detail.concept);
        });
    }

    initialize() {
        if (!this.container) return;

        this.container.innerHTML = '';
        this.container.className = 'mi-container';

        this._renderToolbar();
        this._renderContentContainer();
        this._setupListeners();
        this.render();
    }

    _renderToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'mi-toolbar';
        toolbar.innerHTML = `
            <div class="mi-filter-row">
                <input type="text" placeholder="Filter terms..." class="mi-filter-input" id="mi-filter-text">
                <button id="mi-refresh" class="mi-refresh-btn">REFRESH</button>
            </div>
            <div class="mi-filter-row">
                <label class="mi-checkbox-label"><input type="checkbox" id="mi-filter-goals"> Has Goals</label>
                <label class="mi-checkbox-label"><input type="checkbox" id="mi-filter-questions"> Has Questions</label>
                <label class="mi-checkbox-label" style="margin-left: 8px;"><input type="checkbox" id="mi-compact-view" checked> Compact</label>
                <select id="mi-sort" style="margin-left:auto; font-size:10px; padding: 2px;">
                    <option value="priority">Priority</option>
                    <option value="term">Term</option>
                    <option value="taskCount">Task Count</option>
                </select>
            </div>
        `;
        this.container.appendChild(toolbar);
        this.toolbar = toolbar;
    }

    _renderContentContainer() {
        this.contentContainer = document.createElement('div');
        this.contentContainer.id = 'mi-content';
        this.contentContainer.className = 'mi-content-container';
        this.container.appendChild(this.contentContainer);
    }

    _setupListeners() {
        const getEl = (sel) => this.container.querySelector(sel);

        getEl('#mi-filter-text').addEventListener('input', (e) => {
            this.filterText = e.target.value.toLowerCase();
            this.render();
        });

        getEl('#mi-filter-goals').addEventListener('change', (e) => {
            this.filters.hasGoals = e.target.checked;
            this.render();
        });

        getEl('#mi-filter-questions').addEventListener('change', (e) => {
            this.filters.hasQuestions = e.target.checked;
            this.render();
        });

        getEl('#mi-compact-view').addEventListener('change', (e) => {
            this.listMode = e.target.checked ? 'compact' : 'full';
            this.render();
        });

        getEl('#mi-sort').addEventListener('change', (e) => {
            this.sortField = e.target.value;
            this.render();
        });

        getEl('#mi-refresh').addEventListener('click', () => {
             document.dispatchEvent(new CustomEvent('senars:memory:refresh'));
        });
    }

    update(payload) {
        if (!payload?.concepts) return;
        this.data = payload.concepts;

        if (this.selectedConcept) {
             const updated = this.data.find(c => c.id === this.selectedConcept.id || c.term === this.selectedConcept.term);
             if (updated) this.selectedConcept = updated;
        }

        this.render();
    }

    selectConcept(concept) {
        this.selectedConcept = concept;
        this.viewMode = 'details';
        this.render();
    }

    render() {
        if (!this.contentContainer) return;
        this.contentContainer.innerHTML = '';
        this.toolbar.style.display = this.viewMode === 'list' ? 'flex' : 'none';

        if (this.viewMode === 'list') {
            this._renderListView();
        } else {
            this._renderDetailsView();
        }
    }

    _renderListView() {
        const listDiv = document.createElement('div');
        listDiv.className = 'mi-list';

        const filtered = this._filterAndSortData();

        if (filtered.length === 0) {
            listDiv.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">No concepts found</div>';
        } else {
            const limit = 50;
            const isCompact = this.listMode === 'compact';

            for (const concept of filtered.slice(0, limit)) {
                new ConceptCard(listDiv, concept, { compact: isCompact }).render();
            }

            if (filtered.length > limit) {
                const more = document.createElement('div');
                more.textContent = `...and ${filtered.length - limit} more`;
                more.style.cssText = 'padding:10px; text-align:center; color:var(--text-muted); font-size:10px;';
                listDiv.appendChild(more);
            }
        }

        this.contentContainer.appendChild(listDiv);
    }

    _renderDetailsView() {
        const container = document.createElement('div');
        container.className = 'mi-details';

        const header = this._createDetailsHeader();
        container.appendChild(header);

        const content = document.createElement('div');
        content.className = 'mi-details-content';

        if (this.selectedConcept) {
             this._renderConceptDetails(content);
        }

        container.appendChild(content);
        this.contentContainer.appendChild(container);
    }

    _createDetailsHeader() {
        const header = document.createElement('div');
        header.className = 'mi-details-header';

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '← Back';
        backBtn.className = 'mi-back-btn';
        backBtn.onclick = () => {
            this.viewMode = 'list';
            this.selectedConcept = null;
            this.render();
        };

        const title = document.createElement('div');
        title.className = 'mi-details-title';
        title.textContent = this.selectedConcept?.term ?? 'Concept Details';

        header.append(backBtn, title);
        return header;
    }

    _renderConceptDetails(container) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '20px';
        new ConceptCard(wrapper, this.selectedConcept).render();
        container.appendChild(wrapper);

        const taskHeader = document.createElement('div');
        taskHeader.textContent = 'TASKS';
        taskHeader.className = 'mi-section-header';
        container.appendChild(taskHeader);

        if (this.selectedConcept.tasks?.length > 0) {
            this.selectedConcept.tasks.forEach(task => new TaskCard(container, task).render());
        } else {
            const empty = document.createElement('div');
            empty.textContent = 'No tasks in memory view.';
            empty.style.color = 'var(--text-muted)';
            container.appendChild(empty);
        }
    }

    _filterAndSortData() {
        return this.data.filter(c =>
            (!this.filterText || c.term.toLowerCase().includes(this.filterText)) &&
            (!this.filters.hasGoals || c.tasks?.some(t => t.punctuation === '!')) &&
            (!this.filters.hasQuestions || c.tasks?.some(t => t.punctuation === '?'))
        ).sort((a, b) => {
            const valA = this._getValue(a, this.sortField);
            const valB = this._getValue(b, this.sortField);
            return (valA < valB ? -1 : 1) * (this.sortDirection === 'asc' ? 1 : -1);
        });
    }

    _getValue(obj, field) {
        if (field === 'priority') return obj.budget?.priority ?? 0;
        if (field === 'taskCount') return obj.tasks?.length ?? obj.taskCount ?? 0;
        if (field === 'term') return obj.term ?? '';
        return obj[field];
    }
}
