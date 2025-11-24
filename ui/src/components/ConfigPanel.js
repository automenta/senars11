import { Component } from './Component.js';

const DEFAULT_CONFIG = {
    lm: {
        provider: 'transformers',
        model: 'Xenova/LaMini-Flan-T5-783M',
        temperature: 0.7
    }
};

export class ConfigPanel extends Component {
    constructor(containerId) {
        super(containerId);
        this.config = this.loadConfig();

        const closeBtn = document.getElementById('btn-close-config');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

        const saveBtn = document.getElementById('btn-save-config');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveAndApply());

        this.renderContent();
    }

    loadConfig() {
        try {
            const stored = localStorage.getItem('senars-demo-config');
            if (stored) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
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
    }

    renderContent() {
        const content = document.getElementById('config-content');
        if (!content) return;

        content.innerHTML = `
            <div class="config-section">
                <h4>Language Model</h4>
                <div class="form-group">
                    <label>Provider</label>
                    <select id="config-lm-provider">
                        <option value="transformers" ${this.config.lm.provider === 'transformers' ? 'selected' : ''}>Transformers.js (Local)</option>
                        <option value="openai" ${this.config.lm.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                        <option value="anthropic" ${this.config.lm.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                        <option value="ollama" ${this.config.lm.provider === 'ollama' ? 'selected' : ''}>Ollama</option>
                        <option value="dummy" ${this.config.lm.provider === 'dummy' ? 'selected' : ''}>Dummy / Disabled</option>
                    </select>
                </div>
                <div class="form-group" id="group-api-key">
                    <label>API Key</label>
                    <input type="password" id="config-lm-api-key" value="${this.config.lm.apiKey || ''}" placeholder="Enter API Key...">
                </div>
                <div class="form-group">
                    <label>Model</label>
                    <input type="text" id="config-lm-model" value="${this.config.lm.model}" list="model-presets" placeholder="Select or type model name...">
                    <datalist id="model-presets">
                        <option value="Xenova/LaMini-Flan-T5-783M">LaMini-Flan-T5 (General)</option>
                        <option value="Xenova/all-MiniLM-L6-v2">all-MiniLM-L6-v2 (Embeddings)</option>
                        <option value="Xenova/distilbert-base-uncased-finetuned-sst-2-english">DistilBERT (Classification)</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                        <option value="llama2">Llama 2</option>
                    </datalist>
                </div>
                <div class="form-group">
                    <label>Temperature (${this.config.lm.temperature})</label>
                    <input type="range" id="config-lm-temp" min="0" max="1" step="0.1" value="${this.config.lm.temperature}">
                </div>
                 <div class="form-group">
                    <button id="btn-test-lm" class="secondary-btn" style="width: 100%">Test Provider</button>
                    <div id="test-lm-result" style="margin-top: 8px; font-size: 0.85rem; color: #aaa; min-height: 20px;"></div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const tempInput = document.getElementById('config-lm-temp');
        if (tempInput) {
            tempInput.addEventListener('input', (e) => {
                e.target.previousElementSibling.textContent = `Temperature (${e.target.value})`;
            });
        }

        const providerSelect = document.getElementById('config-lm-provider');
        if (providerSelect) {
            providerSelect.addEventListener('change', () => this.updateVisibility());
            // Initial update
            this.updateVisibility();
        }

        const btnTest = document.getElementById('btn-test-lm');
        if (btnTest) {
            btnTest.addEventListener('click', () => this.handleTestLM());
        }
    }

    updateVisibility() {
        const provider = document.getElementById('config-lm-provider')?.value;
        const apiKeyGroup = document.getElementById('group-api-key');

        if (apiKeyGroup) {
            if (provider === 'transformers' || provider === 'ollama' || provider === 'dummy') {
                apiKeyGroup.style.display = 'none';
            } else {
                apiKeyGroup.style.display = 'block';
            }
        }
    }

    handleTestLM() {
        const provider = document.getElementById('config-lm-provider')?.value;
        const apiKey = document.getElementById('config-lm-api-key')?.value;
        const model = document.getElementById('config-lm-model')?.value;
        const temp = parseFloat(document.getElementById('config-lm-temp')?.value);

        const config = {
            provider,
            apiKey: apiKey || undefined,
            model,
            temperature: temp
        };

        const resultDiv = document.getElementById('test-lm-result');
        if (resultDiv) {
            resultDiv.textContent = 'Testing...';
            resultDiv.className = '';
            resultDiv.style.color = '#aaa';
        }

        // Dispatch event for the app to handle
        const event = new CustomEvent('test-lm', { detail: config });
        document.dispatchEvent(event);
    }

    showTestResult(result) {
        const resultDiv = document.getElementById('test-lm-result');
        if (resultDiv) {
            if (result.success) {
                resultDiv.textContent = `Success: ${result.output}`;
                resultDiv.style.color = '#4ec9b0';
            } else {
                resultDiv.textContent = `Error: ${result.error}`;
                resultDiv.style.color = '#f48771';
            }
        }
    }
}
