import { AgentBuilder } from '../agent/AgentBuilder.js';
import EventEmitter from 'events';

export class App extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.agent = null;
    }

    async initialize() {
        const builder = new AgentBuilder({
            nar: this.config.nar,
            persistence: this.config.persistence,
            lm: this.config.lm,
            inputProcessing: {
                lmTemperature: this.config.lm.temperature
            }
        });

        this.agent = await builder.build();
        return this.agent;
    }

    async start() {
        if (!this.agent) await this.initialize();

        if (this.agent.start) {
             this.agent.start();
        }

        this._setupSignalHandlers();
        this.emit('started', this.agent);
    }

    async shutdown() {
        console.log('\nShutting down gracefully...');

        if (this.agent) {
            try {
                if (this.agent.save) {
                    console.log('Saving agent state...');
                    await this.agent.save();
                }
            } catch (error) {
                console.error('Error saving state:', error.message);
            }

            try {
                if (this.agent.shutdown) {
                    await this.agent.shutdown();
                } else if (this.agent.stop) {
                    this.agent.stop();
                }
            } catch (error) {
                console.error('Error stopping agent:', error.message);
            }
        }

        this.emit('stopped');
    }

    _setupSignalHandlers() {
        const handleSignal = async () => {
            await this.shutdown();
            process.exit(0);
        };

        process.on('SIGINT', handleSignal);
        process.on('SIGTERM', handleSignal);
    }
}
