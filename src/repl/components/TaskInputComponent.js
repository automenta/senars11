import { BaseComponent } from './BaseComponent.js';
import blessed from 'blessed';

/**
 * Task Input Component - provides input field for adding new tasks
 */
export class TaskInputComponent extends BaseComponent {
    constructor(config = {}) {
        super(config);
        const { engine, onSubmit = () => {} } = config;
        this.engine = engine;
        this.elementType = 'textarea';
        this.onSubmit = onSubmit;

        this.elementConfig = this.elementConfig || {
            bottom: 0,
            left: 0,
            right: 0,
            height: '1',
            border: { type: 'line' },
            style: {
                fg: 'white',
                bg: 'black',
                border: { fg: 'cyan' }
            },
            inputOnFocus: true
        };
    }

    init() {
        this.element = blessed.textarea(this.elementConfig);

        this.parent?.append?.(this.element);
        this._setupEventHandlers();
        this.isInitialized = true;
        return this.element;
    }

    _setupEventHandlers() {
        if (!this.element) return;

        const handlers = {
            'submit': (inputText) => this._handleSubmit(inputText),
            'enter': (ch, key) => this._handleEnter(key)
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            if (event === 'enter') {
                this.element.key([event], handler);
            } else {
                this.element.on(event, handler);
            }
        });
    }

    _handleSubmit(inputText) {
        if (inputText?.trim()) {
            this.onSubmit(inputText.trim());
            this.element.clearValue();
        }
    }

    _handleEnter(key) {
        const inputText = this.element.getValue();
        if (inputText?.trim()) {
            this.onSubmit(inputText.trim());
            this.element.clearValue();
        }
        key?.preventDefault?.();
    }

    getValue() {
        return this.element?.getValue?.() ?? '';
    }

    clearValue() {
        this.element?.clearValue?.();
    }

    focus() {
        this.element?.focus?.();
    }
}