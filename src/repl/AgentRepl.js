#!/usr/bin/env node

import React from 'react';
import {render} from 'ink';
import inquirer from 'inquirer';
import {parseReplArgs} from './utils/ReplArgsParser.js';
import {DEFAULT_CONFIG} from './utils/ReplConstants.js';
import {NAR} from '../nar/NAR.js';
import {AgentReplEngine} from './AgentReplEngine.js';
import {AgentInkTUI} from './components/AgentInkTUI.js';
import {ChatOllama} from "@langchain/ollama";

class AgentRepl {
    constructor() {
        this.engine = null;
        this.config = {};
        this.args = parseReplArgs();
        this.inkInstance = null;
    }

    async start() {
        console.log('🤖 SeNARS Unified Agent REPL - Hybrid Intelligence Lab\n');

        // Configure Ollama/LM settings
        await this.configureLM();

        // Start the REPL
        await this.startRepl();
    }

    _isOllamaMode() {
        // If any specific args are provided, assume we skip interactive setup if possible,
        // or at least pre-fill.
        return this.args.ollama || this.args.model !== undefined || this.args.modelName !== undefined;
    }

    async configureLM() {
        if (this._isOllamaMode()) {
            const {modelName, baseURL, temperature} = this._getOllamaConfig();

            this.config.lm = {
                provider: 'ollama',
                modelName: modelName,
                baseUrl: baseURL,
                temperature: temperature || 0
            };

            console.log(`🔧 Using command-line Ollama configuration: ${modelName}`);
        } else {
            // Interactive configuration
            try {
                const configOptions = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'modelName',
                        message: 'Enter Ollama model name:',
                        default: DEFAULT_CONFIG.OLLAMA.modelName
                    },
                    {
                        type: 'input',
                        name: 'baseUrl',
                        message: 'Enter Ollama base URL:',
                        default: DEFAULT_CONFIG.OLLAMA.baseUrl
                    },
                    {
                        type: 'number',
                        name: 'temperature',
                        message: 'Enter temperature (0-1):',
                        default: DEFAULT_CONFIG.OLLAMA.temperature
                    }
                ]);

                this.config.lm = {
                    provider: 'ollama',
                    modelName: configOptions.modelName,
                    baseUrl: configOptions.baseUrl,
                    temperature: configOptions.temperature
                };
            } catch (error) {
                // Fallback if inquirer fails (e.g. non-interactive)
                console.log('⚠️ Interactive prompt failed, using default config.');
                this.config.lm = {
                    provider: 'ollama',
                    modelName: DEFAULT_CONFIG.OLLAMA.modelName,
                    baseUrl: DEFAULT_CONFIG.OLLAMA.baseUrl,
                    temperature: DEFAULT_CONFIG.OLLAMA.temperature
                };
            }
        }
    }

    _getOllamaConfig() {
        return {
            modelName: this.args.model || this.args.modelName || DEFAULT_CONFIG.OLLAMA.modelName,
            baseURL: this.args.baseUrl || DEFAULT_CONFIG.OLLAMA.baseUrl,
            temperature: this.args.temperature || DEFAULT_CONFIG.OLLAMA.temperature
        };
    }

    async startRepl() {
        console.log('🚀 Starting REPL engine...\n');

        // Create and initialize a real NAR instance
        const nar = new NAR({
            tools: {enabled: true},
            lm: {enabled: true},
            debug: {pipeline: false}
        });

        try {
            await nar.initialize();
            console.log('✅ NAR system initialized');
        } catch (error) {
            console.error('⚠️  Warning: Failed to initialize NAR system:', error.message);
        }

        // Initialize AgentReplEngine
        // We need to setup the LM provider structure that AgentReplEngine expects
        // AgentReplEngine uses this.agentLM (LM class) which has a ProviderRegistry.

        // We'll create the provider instance here.
        const ollamaProvider = new ChatOllama({
            model: this.config.lm.modelName,
            baseUrl: this.config.lm.baseUrl,
            temperature: this.config.lm.temperature,
        });

        // Add a 'name' property which might be expected by some logging
        ollamaProvider.name = 'ollama';

        this.engine = new AgentReplEngine({
            nar: nar, // Pass existing NAR instance
            lm: {
                // LM Config passed to LM constructor
            },
            inputProcessing: {
                lmTemperature: this.config.lm.temperature
            }
        });

        // Initialize engine first
        await this.engine.initialize();

        // Register the provider with the engine's LM component
        this.engine.registerLMProvider('ollama', ollamaProvider);

        // Bind tools to the provider if it supports it
        // AgentReplEngine's _registerNARTools adds tools to the provider's .tools array
        // We need to ensure the provider instance we passed is the one being used.
        // Since we passed 'ollamaProvider' and registered it, we should be good.

        // However, ChatOllama doesn't automatically bind tools from a .tools property.
        // We might need to do that binding dynamically in streamExecution or here.
        // For now, let's attach the tools array so _registerNARTools can populate it.
        ollamaProvider.tools = [];

        console.log('✅ Engine ready. Rendering UI...');

        // Render the Ink UI
        this.inkInstance = render(React.createElement(AgentInkTUI, {engine: this.engine}));
    }

    async shutdown() {
        if (this.inkInstance) {
            this.inkInstance.unmount();
        }
        if (this.engine) {
            await this.engine.shutdown();
        }
        console.log('\n👋 Agent REPL session ended.');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    const agentRepl = global.agentReplInstance;
    if (agentRepl) {
        await agentRepl.shutdown();
    }
    process.exit(0);
});

// Start the agent REPL
async function main() {
    const agentRepl = new AgentRepl();
    global.agentReplInstance = agentRepl;

    try {
        await agentRepl.start();
    } catch (error) {
        console.error('❌ Error starting Agent REPL:', {error: error.message, stack: error.stack});
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
