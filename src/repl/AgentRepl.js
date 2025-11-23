#!/usr/bin/env node

import React from 'react';
import {render} from 'ink';
import inquirer from 'inquirer';
import {parseReplArgs} from './utils/ReplArgsParser.js';
import {DEFAULT_CONFIG} from './utils/ReplConstants.js';
import {SessionBuilder} from '../session/SessionBuilder.js';
import {AgentInkTUI} from './components/AgentInkTUI.js';

class AgentRepl {
    constructor() {
        this.engine = null;
        this.config = {};
        this.args = parseReplArgs();
        this.inkInstance = null;
    }

    async start() {
        console.log('🤖 SeNARS Unified Agent REPL - Hybrid Intelligence Lab\n');

        await this.configureLM();
        await this.startRepl();
    }

    _isOllamaMode() {
        return this.args.ollama || this.args.model !== undefined || this.args.modelName !== undefined;
    }

    async configureLM() {
        this._isOllamaMode()
            ? this._configureLMFromArgs()
            : await this._configureLMInteractively();
    }

    _configureLMFromArgs() {
        const {modelName, baseURL, temperature} = this._getOllamaConfig();

        this.config.lm = {
            provider: 'ollama',
            modelName: modelName,
            baseUrl: baseURL,
            temperature: temperature || 0,
            enabled: true
        };

        console.log(`🔧 Using command-line Ollama configuration: ${modelName}`);
    }

    async _configureLMInteractively() {
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
                temperature: configOptions.temperature,
                enabled: true
            };
        } catch (error) {
            console.log('⚠️ Interactive prompt failed, using default config.');
            this._configureLMFromDefaults();
        }
    }

    _configureLMFromDefaults() {
        this.config.lm = {
            provider: 'ollama',
            modelName: DEFAULT_CONFIG.OLLAMA.modelName,
            baseUrl: DEFAULT_CONFIG.OLLAMA.baseUrl,
            temperature: DEFAULT_CONFIG.OLLAMA.temperature,
            enabled: true
        };
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

        this.engine = await this._buildSessionEngine();

        console.log('✅ Engine ready. Rendering UI...');

        this.inkInstance = render(React.createElement(AgentInkTUI, {engine: this.engine}));
    }

    async _buildSessionEngine() {
        const builder = new SessionBuilder({
            nar: {
                tools: {enabled: true},
                lm: {enabled: true},
                debug: {pipeline: false}
            },
            lm: this.config.lm,
            inputProcessing: {
                lmTemperature: this.config.lm.temperature
            }
        });

        return await builder.build();
    }

    async shutdown() {
        this.inkInstance?.unmount();
        if (this.engine) {
            await this.engine.shutdown();
        }
        console.log('\n👋 Agent REPL session ended.');
    }
}

process.on('SIGINT', async () => {
    const agentRepl = global.agentReplInstance;
    if (agentRepl) {
        await agentRepl.shutdown();
    }
    process.exit(0);
});

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
