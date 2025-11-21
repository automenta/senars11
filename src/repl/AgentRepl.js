#!/usr/bin/env node

import {AgentReplOllama} from './AgentReplOllama.js'; // Our new implementation
import inquirer from 'inquirer';
import {parseReplArgs} from './utils/ReplArgsParser.js';
import {DEFAULT_CONFIG} from './utils/ReplConstants.js';
import {NAR} from '../nar/NAR.js';

class AgentRepl {
    constructor() {
        this.agentRepl = null;
        this.config = {};
        this.args = parseReplArgs();
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
        return this.args.ollama || this.args.model !== undefined || this.args.modelName !== undefined; // If a model is specified, use Ollama mode
    }

    async configureOllama() {
        if (this._isOllamaMode()) {
            const {modelName, baseURL, temperature} = this._getOllamaConfig();

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

            this.config.modelName = configOptions.modelName;
            this.config.baseUrl = configOptions.baseUrl;
            this.config.temperature = configOptions.temperature;
        }

        console.log(`\n✅ Using Ollama model: ${this.config.modelName}\n`);
    }

    _getOllamaConfig() {
        // Use default model if not specified
        const modelName = this.args.model || DEFAULT_CONFIG.OLLAMA.modelName;

        return {
            modelName: modelName,
            baseURL: this.args.baseUrl || DEFAULT_CONFIG.OLLAMA.baseUrl,
            temperature: this.args.temperature || DEFAULT_CONFIG.OLLAMA.temperature
        };
    }

    async startNewRepl() {
        console.log('🚀 Starting new Agent REPL with LangGraph & streaming support...\n');

        // Create and initialize a real NAR instance
        const nar = new NAR({
            tools: {enabled: true},
            lm: {enabled: true},
            debug: {pipeline: false}
        });

        try {
            await nar.initialize();
            console.log('✅ NAR system initialized successfully');
        } catch (error) {
            console.error('⚠️  Warning: Failed to initialize NAR system:', error.message);
            console.log('⚠️  Continuing with mock NAR for testing purposes...');
        }

        // Create and initialize the new AgentReplOllama instance with the real NAR
        this.agentRepl = new AgentReplOllama({
            modelName: this.config.modelName,
            baseUrl: this.config.baseUrl,
            temperature: this.config.temperature,
            nar: nar
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
    console.log('\n🔄 Received SIGINT, shutting down gracefully...');
    const agentRepl = global.agentReplInstance;
    if (agentRepl) {
        try {
            await agentRepl.shutdown();
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    } else {
        console.log("👋 Agent REPL session ended. Goodbye!");
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
        console.error('❌ Error starting Agent REPL:', {error: error.message, stack: error.stack});
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}