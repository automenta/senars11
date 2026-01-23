import { Component } from './Component.js';
import { SmartTextarea } from '../notebook/SmartTextarea.js';
import { FluentUI } from '../utils/FluentUI.js';

export class CodeEditorPanel extends Component {
    constructor(container) {
        super(container);
        this.app = null;
        this.editor = null;
    }

    initialize(app) {
        this.app = app;
        this.render();
    }

    render() {
        if (!this.container) return;
        this.fluent().clear().class('code-editor-panel');

        // Toolbar
        const toolbar = FluentUI.create('div')
            .class('editor-toolbar')
            .style({ padding: '5px', background: '#252526', borderBottom: '1px solid #333', display: 'flex', gap: '8px' })
            .mount(this.container);

        toolbar.child(
            FluentUI.create('button')
                .text('▶️ Run')
                .class('btn-primary')
                .style({ padding: '4px 12px', background: '#0e639c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' })
                .on('click', () => this.execute())
        );

        toolbar.child(
            FluentUI.create('button')
                .text('💾 Save')
                .style({ padding: '4px 8px', background: '#333', color: '#ccc', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer' })
                .on('click', () => this.saveFile())
        );

        toolbar.child(
            FluentUI.create('button')
                .text('📂 Load')
                .style({ padding: '4px 8px', background: '#333', color: '#ccc', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer' })
                .on('click', () => this.loadFile())
        );

        toolbar.child(
            FluentUI.create('span')
                .text('Shift+Enter to Run')
                .style({ fontSize: '0.8em', color: '#888', alignSelf: 'center', marginLeft: 'auto' })
        );

        // Editor Area
        const editorContainer = FluentUI.create('div')
            .style({ flex: '1', position: 'relative', height: 'calc(100% - 35px)', overflow: 'hidden' })
            .mount(this.container);

        this.editor = new SmartTextarea(editorContainer.dom, {
            rows: 20, // Initial rows, but autoResize false for fixed height
            autoResize: false,
            onExecute: (text) => this.execute(text)
        });

        const editorEl = this.editor.render();
        editorEl.style.height = '100%';
        this.editor.textarea.style.height = '100%'; // Ensure full height
    }

    saveFile() {
        const content = this.editor.getValue();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'code.nars'; // Default to nars, could detect
        a.click();
        URL.revokeObjectURL(url);
    }

    loadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.nars,.metta,.scm,.txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    this.editor.setValue(evt.target.result);
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    execute(text) {
        const content = text || this.editor.getValue();
        if (!content.trim()) return;

        if (this.app?.commandProcessor) {
            // Optionally log to notebook if available
            const notebookComponent = this.app.components.get('notebook');
            let logCell = null;

            if (notebookComponent && notebookComponent.notebookManager) {
                // Log input first
                logCell = notebookComponent.notebookManager.createCodeCell(content);
                // Important: Update lastInsertionPoint so the result attaches here
                notebookComponent.notebookManager.lastInsertionPoint = logCell;
            }

            // Send to command processor
            this.app.commandProcessor.processCommand(content);
        }
    }

    resize() {
        // Handle resize if needed
    }
}
