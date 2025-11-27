import {Component} from './Component.js';
import {LogViewer} from './LogViewer.js';

export class Console extends Component {
    constructor(containerId, inputId) {
        super(containerId);
        this.logViewer = new LogViewer(this.container);
        this.inputElement = document.getElementById(inputId);
        this.onInputCallback = null;

        if (this.inputElement) {
            this.inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const val = this.inputElement.value.trim();
                    if (val) {
                        this.handleInput(val);
                        this.inputElement.value = '';
                    }
                }
            });
        }
    }

    onInput(callback) {
        this.onInputCallback = callback;
    }

    handleInput(text) {
        this.logViewer.addLog(text, 'input');
        if (this.onInputCallback) {
            this.onInputCallback(text);
        }
    }

    log(content, type, icon) {
        this.logViewer.addLog(content, type, icon);
    }

    clear() {
        this.logViewer.clear();
    }
}
