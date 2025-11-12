#!/usr/bin/env node

import { AgentReplOllama } from './AgentReplOllama.js'; // Our new implementation
import inquirer from 'inquirer';
import {LMConfigurator} from '../lm/LMConfigurator.js';

class AgentRepl {
    constructor() {
        this.agentRepl = null;
        this.config = {};
        this.args = this._parseArgs();
    }

    _parseArgs() {
        const args = {};
        for (let i = 0; i < process.argv.length; i++) {
            if (process.argv[i] === '--ollama') {
                args.ollama = true;
                // Check for model name in next argument
                if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
                    args.model = process.argv[i + 1];
                    i++; // Skip the next arg since we used it
                }
                // Note: If no model follows --ollama, we'll rely on later --model arg if present
            } else if (process.argv[i] === '--model') {
                args.model = process.argv[i + 1];
                i++; // Skip the next arg
            } else if (process.argv[i] === '--api-key') {
                args.apiKey = process.argv[i + 1];
                i++; // Skip the next arg
            } else if (process.argv[i] === '--base-url') {
                args.baseUrl = process.argv[i + 1];
                i++; // Skip the next arg
            } else if (process.argv[i] === '--temperature') {
                args.temperature = parseFloat(process.argv[i + 1]);
                i++; // Skip the next arg
            }
        }
        return args;
    }

    async start() {
        console.log('🤖 SeNARS Agent REPL with LangGraph & Ollama - Hybrid Intelligence Lab\n');
        console.log('Initializing Agent REPL with Ollama configuration...\n');

        // Configure Ollama settings
        await this.configureOllama();

        // Start the new Agent REPL implementation
        await this.startNewRepl();
    }

    _isOllamaMode() {
        return this.args.ollama || this.args.model !== undefined; // If a model is specified, use Ollama mode
    }

    async configureOllama() {
        if (this._isOllamaMode()) {
            const { modelName, baseURL, temperature } = this._getOllamaConfig();

            console.log(`🔧 Using command-line Ollama configuration:`);
            console.log(`   Model: ${modelName}`);
            console.log(`   Base URL: ${baseURL}`);
            console.log(`   Temperature: ${temperature || 0}`);

            this.config.modelName = modelName;
            this.config.baseUrl = baseURL;
            this.config.temperature = temperature || 0;
        } else {
            // Interactive configuration
            const configOptions = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'modelName',
                    message: 'Enter Ollama model name:',
                    default: 'hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M'
                },
                {
                    type: 'input',
                    name: 'baseUrl',
                    message: 'Enter Ollama base URL:',
                    default: 'http://localhost:11434'
                },
                {
                    type: 'number',
                    name: 'temperature',
                    message: 'Enter temperature (0-1):',
                    default: 0
                }
            ]);

            this.config.modelName = configOptions.modelName;
            this.config.baseUrl = configOptions.baseUrl;
            this.config.temperature = configOptions.temperature;
        }

        console.log(`\n✅ Using Ollama model: ${this.config.modelName}\n`);
    }

    _getOllamaConfig() {
        if (!this.args.model) {
            console.error('❌ Error: No model specified. Please provide a model using --model parameter.');
            console.error('   Example: npm run repl:agent:ollama -- --model hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M');
            process.exit(1);
        }
        return {
            modelName: this.args.model,
            baseURL: this.args.baseUrl || 'http://localhost:11434',
            temperature: this.args.temperature || 0
        };
    }

    async startNewRepl() {
        console.log('🚀 Starting new Agent REPL with LangGraph & streaming support...\n');

        // Create and initialize the new AgentReplOllama instance
        // In a full implementation, we would connect to the real NAR instance
        this.agentRepl = new AgentReplOllama({
            modelName: this.config.modelName,
            baseUrl: this.config.baseUrl,
            temperature: this.config.temperature,
            nar: null // Would connect to real NAR in production
        });

        await this.agentRepl.start();
    }

    async shutdown() {
        if (this.agentRepl && this.agentRepl.shutdown) {
            await this.agentRepl.shutdown();
        }
        console.log('\n👋 Agent REPL session ended. Goodbye!');
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
    global.agentReplInstance = agentRepl; // For graceful shutdown

    try {
        await agentRepl.start();
    } catch (error) {
        console.error('❌ Error starting Agent REPL:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}