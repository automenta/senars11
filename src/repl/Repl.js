#!/usr/bin/env node

import React from 'react';
import {render} from 'ink';
import inquirer from 'inquirer';
import { Config, DEFAULT_CONFIG } from '../app/Config.js';
import { App } from '../app/App.js';
import { AgentInkTUI } from './components/AgentInkTUI.js';

class Repl {
    constructor() {
        this.config = Config.parse();
        this.app = new App(this.config);
        this.inkInstance = null;
    }

    async start() {
        console.log('🤖 SeNARS Unified Agent REPL - Hybrid Intelligence Lab\n');

        if (!this.config.lm.enabled && !this.config.demo) {
             await this._configureLMInteractively();
        }

        await this.startRepl();
    }

    async _configureLMInteractively() {
        try {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'modelName',
                    message: 'Enter Ollama model name:',
                    default: DEFAULT_CONFIG.lm.modelName
                },
                {
                    type: 'input',
                    name: 'baseUrl',
                    message: 'Enter Ollama base URL:',
                    default: DEFAULT_CONFIG.lm.baseUrl
                },
                {
                    type: 'number',
                    name: 'temperature',
                    message: 'Enter temperature (0-1):',
                    default: DEFAULT_CONFIG.lm.temperature
                }
            ]);

            this.config.lm.provider = 'ollama';
            this.config.lm.modelName = answers.modelName;
            this.config.lm.baseUrl = answers.baseUrl;
            this.config.lm.temperature = answers.temperature;
            this.config.lm.enabled = true;

        } catch (error) {
            console.log('⚠️ Interactive prompt failed, using default config.');
            this.config.lm.enabled = true;
        }
    }

    async startRepl() {
        console.log('🚀 Starting REPL engine...\n');

        // Initialize app/agent
        const agent = await this.app.start({ startAgent: false });

        console.log('✅ Engine ready. Rendering UI...');

        this.inkInstance = render(React.createElement(AgentInkTUI, {engine: agent}));

        // Register shutdown handler for TUI specific cleanup
        process.on('SIGINT', async () => {
            await this.shutdown();
            process.exit(0);
        });
    }

    async shutdown() {
        this.inkInstance?.unmount();
        await this.app.shutdown();
        console.log('\n👋 Agent REPL session ended.');
    }
}

async function main() {
    const repl = new Repl();

    try {
        await repl.start();
    } catch (error) {
        console.error('❌ Error starting Agent REPL:', {error: error.message, stack: error.stack});
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
