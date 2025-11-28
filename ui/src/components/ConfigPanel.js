import {Component} from './Component.js';

/**
 * Configuration panel for managing application settings
 */
const DEFAULT_CONFIG = {
    lm: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7
    }
};

export class ConfigPanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.config = this.loadConfig();
        this._bindMethods();
        this._setupEventListeners();
        this.renderContent();
    }

    /**
     * Bind method context to preserve 'this' reference
     */
    _bindMethods() {
        this._onTempInputChange = this._onTempInputChange.bind(this);
    }

    /**
     * Set up event listeners for the config panel
     */
    _setupEventListeners() {
        const closeBtn = document.getElementById('btn-close-config');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

        const saveBtn = document.getElementById('btn-save-config');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveAndApply());
    }

    loadConfig() {
        try {
            const stored = localStorage.getItem('senars-demo-config');
            if (stored) {
                return {...DEFAULT_CONFIG, ...JSON.parse(stored)};
            }
        } catch (e) {
            console.error('Error loading config:', e);
        }
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    saveConfig(config) {
        try {
            localStorage.setItem('senars-demo-config', JSON.stringify(config));
        } catch (e) {
            console.error('Error saving config:', e);
        }
    }

    getConfig() {
        return this.config;
    }

    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
            this.renderContent(); // Refresh values
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
    }

    saveAndApply() {
        // Harvest values from DOM
        const provider = document.getElementById('config-lm-provider')?.value;
        const apiKey = document.getElementById('config-lm-api-key')?.value;
        const model = document.getElementById('config-lm-model')?.value;
        const temp = parseFloat(document.getElementById('config-lm-temp')?.value);

        this.config.lm.provider = provider;
        if (apiKey) this.config.lm.apiKey = apiKey;
        this.config.lm.model = model;
        this.config.lm.temperature = temp;

        this.saveConfig(this.config);
        this.hide();

        // Notify app (optional, or let app pull config on next run)
        // For now, the prompt said "next execution".
    }

    renderContent() {
        const content = document.getElementById('config-content');
        if (!content) return;

        content.innerHTML = this._createConfigHTML();

        // Add listeners for dynamic updates (e.g. range slider value)
        const tempInput = document.getElementById('config-lm-temp');
        if (tempInput) {
            tempInput.addEventListener('input', this._onTempInputChange);
        }
    }

    /**
     * Create configuration HTML based on current settings
     */
    _createConfigHTML() {
        return `
            <div class="config-section">
                <h4>Language Model</h4>
                <div class="form-group">
                    <label>Provider</label>
                    <select id="config-lm-provider">
                        ${this._createProviderOptions()}
                    </select>
                </div>
                <div class="form-group">
                    <label>API Key</label>
                    <input type="password" id="config-lm-api-key" value="${this.config.lm.apiKey || ''}" placeholder="Enter API Key...">
                </div>
                <div class="form-group">
                    <label>Model</label>
                    <input type="text" id="config-lm-model" value="${this.config.lm.model}">
                </div>
                <div class="form-group">
                    <label>Temperature (${this.config.lm.temperature})</label>
                    <input type="range" id="config-lm-temp" min="0" max="1" step="0.1" value="${this.config.lm.temperature}">
                </div>
            </div>
        `;
    }

    /**
     * Create provider options HTML
     */
    _createProviderOptions() {
        const providers = [
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'ollama', label: 'Ollama' },
            { value: 'dummy', label: 'Dummy / Disabled' }
        ];

        return providers.map(provider =>
            `<option value="${provider.value}" ${this.config.lm.provider === provider.value ? 'selected' : ''}>${provider.label}</option>`
        ).join('');
    }

    /**
     * Handle temperature input change event
     */
    _onTempInputChange(e) {
        e.target.previousElementSibling.textContent = `Temperature (${e.target.value})`;
    }
}
