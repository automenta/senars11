import {EventEmitter} from 'events';
import blessed from 'blessed';

/**
 * Reasoning Trace Component - Visualizes the reasoning process
 */
export class ReasoningTraceComponent {
    constructor(options = {}) {
        this.elementConfig = options.elementConfig || {};
        this.parent = options.parent;
        this.eventEmitter = options.eventEmitter;
        this.engine = options.engine;
        this.element = null;
        this.traceBuffer = [];
        this.maxBufferSize = options.maxBufferSize || 100;
    }

    init() {
        this.element = blessed.log({
            ...this.elementConfig,
            tags: true,
            border: {type: 'line'},
            style: {
                fg: 'white',
                bg: 'black',
                border: {fg: 'cyan'}
            },
            scrollback: this.maxBufferSize
        });

        this.parent.append(this.element);

        // Listen for reasoning events
        this.eventEmitter.on('narsese.processed', (data) => {
            this.addTraceEntry('NAL', data.input || data.result, 'processed');
        });

        this.eventEmitter.on('narsese.error', (data) => {
            this.addTraceEntry('NAL', data.input, 'error', data.error);
        });

        // Listen for LM events if available
        this.eventEmitter.on('lm.processed', (data) => {
            this.addTraceEntry('LM', data.prompt, 'processed', data.result);
        });

        this.eventEmitter.on('hybrid.reasoning', (data) => {
            this.addTraceEntry('HYBRID', data.description, 'executed', data.result);
        });

        return this;
    }

    addTraceEntry(source, description, status, details = '') {
        const timestamp = new Date().toLocaleTimeString();
        let statusSymbol, color;
        
        switch (status) {
            case 'processed':
            case 'executed':
                statusSymbol = '✅';
                color = 'green';
                break;
            case 'error':
                statusSymbol = '❌';
                color = 'red';
                break;
            default:
                statusSymbol = 'ℹ️';
                color = 'yellow';
        }

        const entry = `{bold}${timestamp}{/bold} | {${color}-fg}${statusSymbol} ${source}{/${color}-fg} | ${description}`;
        this.traceBuffer.push(entry);
        
        // Keep buffer size manageable
        if (this.traceBuffer.length > this.maxBufferSize) {
            this.traceBuffer = this.traceBuffer.slice(-this.maxBufferSize);
        }

        this.element.log(entry);
        this.parent.render();
    }

    clear() {
        this.traceBuffer = [];
        this.element.setContent('');
        this.parent.render();
    }

    getElement() {
        return this.element;
    }
}