import { ExampleBrowser } from './ExampleBrowser.js';

export class DemoLibraryModal {
    constructor(notebookManager) {
        this.notebookManager = notebookManager;
        this.escHandler = null;
    }

    show() {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';

        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.id = 'demo-library-modal';

        // Title Bar
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = '<span class="modal-title">📚 Demo Library</span>';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.className = 'modal-close-btn';
        closeBtn.onclick = () => this.close(backdrop);
        header.appendChild(closeBtn);
        modalContainer.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.id = 'demo-browser-content';
        content.className = 'modal-content';
        modalContainer.appendChild(content);

        const browser = new ExampleBrowser(content, {
            viewMode: 'tree',
            onSelect: async (node) => {
                if (node.type === 'file') {
                    this.close(backdrop);
                    try {
                        await this.notebookManager?.loadDemoFile(node.path, { clearFirst: true, autoRun: true });
                    } catch (error) {
                        this.notebookManager?.createResultCell(`❌ Error loading demo: ${error.message}`, 'system');
                    }
                }
            }
        });

        backdrop.appendChild(modalContainer);
        document.body.appendChild(backdrop);

        // Initialize after appending to DOM
        browser.initialize();

        backdrop.onclick = (e) => { if (e.target === backdrop) this.close(backdrop); };

        this.escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close(backdrop);
            }
        };
        document.addEventListener('keydown', this.escHandler);
    }

    close(backdrop) {
        if (backdrop && backdrop.parentNode) {
            document.body.removeChild(backdrop);
        }
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
    }
}
