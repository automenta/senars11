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
        this.filters = {
            hasGoals: false,
            hasQuestions: false
        };

        this.viewMode = 'list'; // 'list' or 'details'
        this.selectedConcept = null;

        // Listen for external concept selection (e.g. from Graph)
        document.addEventListener('senars:concept:select', (e) => {
            if (e.detail && e.detail.concept) {
                this.selectConcept(e.detail.concept);
            }
        });
    }

    initialize() {
        if (!this.container) return;

        // CSS
        const style = document.createElement('style');
        style.textContent = `
            .mi-toolbar {
                padding: 8px;
                background: var(--bg-header);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .mi-filter-row {
                display: flex;
                gap: 5px;
                align-items: center;
            }
            .mi-list {
                padding: 8px;
                overflow-y: auto;
                height: calc(100% - 70px); /* Approx toolbar height */
            }
            .mi-details {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            .mi-details-header {
                padding: 8px;
                background: var(--bg-header);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .mi-details-content {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }
            .mi-checkbox-label {
                font-size: 10px;
                color: var(--text-muted);
                display: flex;
                align-items: center;
                gap: 3px;
                cursor: pointer;
                user-select: none;
            }
            .mi-checkbox-label input {
                margin: 0;
            }
        `;
        this.container.appendChild(style);

        // Toolbar + Content container
        const toolbar = document.createElement('div');
        toolbar.className = 'mi-toolbar';
        toolbar.innerHTML = `
            <div class="mi-filter-row">
                <input type="text" placeholder="Filter terms..." style="flex:1; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-main); padding:4px;" id="mi-filter-text">
                <button id="mi-refresh" style="font-size:10px;">REFRESH</button>
            </div>
            <div class="mi-filter-row">
                <label class="mi-checkbox-label">
                    <input type="checkbox" id="mi-filter-goals"> Has Goals
                </label>
                <label class="mi-checkbox-label">
                    <input type="checkbox" id="mi-filter-questions"> Has Questions
                </label>
                <select id="mi-sort" style="margin-left:auto; font-size:10px; padding: 2px;">
                    <option value="priority">Priority</option>
                    <option value="term">Term</option>
                    <option value="taskCount">Task Count</option>
                </select>
            </div>
        `;
        this.container.appendChild(toolbar);
        this.toolbar = toolbar;

        const content = document.createElement('div');
        content.id = 'mi-content';
        content.style.height = '100%'; // Will be adjusted by flex if needed, but simple for now
        this.container.appendChild(content);
        this.contentContainer = content;

        // Event Listeners
        this.container.querySelector('#mi-filter-text').addEventListener('input', (e) => {
            this.filterText = e.target.value.toLowerCase();
            this.render();
        });

        this.container.querySelector('#mi-filter-goals').addEventListener('change', (e) => {
            this.filters.hasGoals = e.target.checked;
            this.render();
        });

        this.container.querySelector('#mi-filter-questions').addEventListener('change', (e) => {
            this.filters.hasQuestions = e.target.checked;
            this.render();
        });

        this.container.querySelector('#mi-sort').addEventListener('change', (e) => {
            this.sortField = e.target.value;
            this.render();
        });

        this.container.querySelector('#mi-refresh').addEventListener('click', () => {
             // Dispatch refresh event
             document.dispatchEvent(new CustomEvent('senars:memory:refresh'));
        });

        this.render();
    }

    update(payload) {
        if (!payload || !payload.concepts) return;
        this.data = payload.concepts;

        // If we have a selected concept, try to update it with new data
        if (this.selectedConcept) {
             const updated = this.data.find(c => c.id === this.selectedConcept.id || c.term === this.selectedConcept.term);
             if (updated) {
                 this.selectedConcept = updated;
             }
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

        if (this.viewMode === 'list') {
            this.toolbar.style.display = 'flex';
            this.renderList();
        } else {
            this.toolbar.style.display = 'none';
            this.renderDetails();
        }
    }

    renderList() {
        const listDiv = document.createElement('div');
        listDiv.className = 'mi-list';

        let filtered = this.data.filter(c => {
            if (this.filterText && !c.term.toLowerCase().includes(this.filterText)) return false;

            if (this.filters.hasGoals) {
                if (!c.tasks || !c.tasks.some(t => t.punctuation === '!')) return false;
            }
            if (this.filters.hasQuestions) {
                if (!c.tasks || !c.tasks.some(t => t.punctuation === '?')) return false;
            }
            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            let valA = this._getValue(a, this.sortField);
            let valB = this._getValue(b, this.sortField);

            if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        if (filtered.length === 0) {
            listDiv.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">No concepts found</div>';
        } else {
            // Virtual scrolling or just limit for now to avoid DOM overload?
            // With 50 items it's fine. 1000 might lag.
            // I'll render first 50 for now.
            const limit = 50;
            filtered.slice(0, limit).forEach(concept => {
                const card = new ConceptCard(listDiv, concept);
                card.render();
            });

            if (filtered.length > limit) {
                const more = document.createElement('div');
                more.textContent = `...and ${filtered.length - limit} more`;
                more.style.cssText = 'padding:10px; text-align:center; color:var(--text-muted); font-size:10px;';
                listDiv.appendChild(more);
            }
        }

        this.contentContainer.appendChild(listDiv);
    }

    renderDetails() {
        const container = document.createElement('div');
        container.className = 'mi-details';

        // Header
        const header = document.createElement('div');
        header.className = 'mi-details-header';

        const backBtn = document.createElement('button');
        backBtn.innerHTML = '← Back';
        backBtn.onclick = () => {
            this.viewMode = 'list';
            this.selectedConcept = null;
            this.render();
        };

        const title = document.createElement('div');
        title.style.cssText = 'font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
        title.textContent = this.selectedConcept ? this.selectedConcept.term : 'Concept Details';

        header.appendChild(backBtn);
        header.appendChild(title);
        container.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.className = 'mi-details-content';

        if (this.selectedConcept) {
             // Show Concept Info using ConceptCard (non-interactive ideally, or just reused)
             // I'll reuse it but maybe wrapped
             const wrapper = document.createElement('div');
             wrapper.style.marginBottom = '20px';
             new ConceptCard(wrapper, this.selectedConcept).render(); // Reuse
             content.appendChild(wrapper);

             const taskHeader = document.createElement('div');
             taskHeader.textContent = 'TASKS';
             taskHeader.style.cssText = 'font-size:10px; color:var(--text-muted); margin-bottom:5px; font-weight:bold; letter-spacing:1px;';
             content.appendChild(taskHeader);

             if (this.selectedConcept.tasks && this.selectedConcept.tasks.length > 0) {
                 this.selectedConcept.tasks.forEach(task => {
                     new TaskCard(content, task).render();
                 });
             } else {
                 const empty = document.createElement('div');
                 empty.textContent = 'No tasks in memory view.';
                 empty.style.color = 'var(--text-muted)';
                 content.appendChild(empty);
             }
        }

        container.appendChild(content);
        this.contentContainer.appendChild(container);
    }

    _getValue(obj, field) {
        if (field === 'priority') return obj.budget?.priority || 0;
        if (field === 'taskCount') return obj.tasks ? obj.tasks.length : (obj.taskCount || 0);
        if (field === 'term') return obj.term || '';
        return obj[field];
    }
}
