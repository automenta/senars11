#!/usr/bin/env node

import inquirer from 'inquirer';

import {AgentReplEngine} from './AgentReplEngine.js';
import {AgentInkRepl} from './AgentInkRepl.js';
import {LMConfigurator} from '../lm/LMConfigurator.js';
import {LangChainProvider} from '../lm/LangChainProvider.js';

class AgentRepl {
    constructor() {
        this.engine = null;
        this.repl = null;
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
            }
        }
        return args;
    }

    async start() {
        console.log('🤖 SeNARS Agent REPL - Hybrid Intelligence Lab\n');
        console.log('Initializing Agent REPL with LM configuration...\n');

        // Configure LM provider at startup (with possible command-line override)
        await this.configureLM();
        
        // Initialize the engine with the configured LM
        await this.initializeEngine();
        
        // Start the REPL interface
        await this.startRepl();
    }

    async configureLM() {
        if (this._isOllamaMode()) {
            await this._configureOllamaLM();
        } else {
            await this._configureInteractiveLM();
        }
    }

    _isOllamaMode() {
        return this.args.ollama || this.args.model !== undefined; // If a model is specified, use Ollama mode
    }

    async _configureOllamaLM() {
        const { modelName, baseURL, apiKey } = this._getOllamaConfig();
        
        console.log(`🔧 Using command-line Ollama configuration:`);
        console.log(`   Model: ${modelName}`);
        console.log(`   Base URL: ${baseURL}`);

        const provider = new LangChainProvider({
            provider: 'ollama',
            modelName,
            baseURL,
            apiKey
        });

        this.config.lm = {
            provider,
            config: { provider: 'ollama', modelName, baseURL }
        };

        console.log(`\n✅ Using Ollama: ${modelName}\n`);
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
            apiKey: this.args.apiKey || undefined
        };
    }

    async _configureInteractiveLM() {
        const configOptions = await inquirer.prompt([
            {
                type: 'list',
                name: 'configMethod',
                message: 'How would you like to configure your LM provider?',
                choices: [
                    {name: 'Quick select (recommended for beginners)', value: 'quick'},
                    {name: 'Detailed configuration', value: 'detailed'}
                ],
                default: 'quick'
            }
        ]);

        const configurator = new LMConfigurator();
        const result = configOptions.configMethod === 'quick' 
            ? await configurator.quickSelect() 
            : await configurator.configure();

        this.config.lm = result;
        console.log(`\n✅ Using ${result.provider.constructor.name}: ${result.config.modelName}\n`);
    }

    async initializeEngine() {
        // Initialize with the configured LM provider
        this.engine = new AgentReplEngine({
            nar: {},
            lm: {
                provider: this.config.lm.provider
            }
        });
        
        // Register the configured provider
        this.engine.registerLMProvider('active', this.config.lm.provider);
        
        await this.engine.initialize();
        console.log('✅ Agent engine initialized\n');
    }

    async startRepl() {
        console.log('🚀 Starting Agent REPL interface...\n');

        // Add agent-specific commands to the engine BEFORE setting it to repl
        this.engine.addAgentCommands();

        // Check if we should use the Ink-based REPL (for console-like experience)
        // Use Ink REPL if command-line args specify ollama
        if (this.args.ollama) {
            console.log('🎨 Using Ink-based TUI for console-like experience...\n');
            this.repl = new AgentInkRepl({
                nar: {},
                lm: {
                    provider: this.config.lm.provider
                }
            });
        } else {
            // Use the ink-based REPL for agent visualization
            console.log('🎨 Using Ink-based TUI for agent...\n');
            this.repl = new AgentInkRepl({
                nar: {},
                lm: {
                    provider: this.config.lm.provider
                }
            });
        }

        // Use the agent-specific engine
        this.repl.engine = this.engine;
        
        await this.repl.start();
    }

    async shutdown() {
        if (this.repl) {
            await this.repl.shutdown();
        }
        if (this.engine) {
            await this.engine.shutdown();
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