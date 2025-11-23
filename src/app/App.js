import {AgentBuilder} from '../agent/AgentBuilder.js';
import EventEmitter from 'events';

export class App extends EventEmitter {
    constructor(config) {
        super();
        this.config = config || {};
        this.agents = new Map();
        this.activeAgentId = null;
    }

    /**
     * Gets the current active agent.
     */
    get agent() {
        return this.activeAgentId ? this.agents.get(this.activeAgentId)?.agent : null;
    }

    /**
     * Initializes the default agent using the App config.
     * @returns {Promise<Agent>}
     */
    async initialize() {
        if (this.agent) return this.agent;
        // Use 'default' ID and this.config
        return this.createAgent('default', this.config);
    }

    /**
     * Creates a new agent.
     * @param {string} [agentId]
     * @param {Object} [config]
     * @returns {Promise<Agent>}
     */
    async createAgent(agentId = null, config = {}) {
        const id = agentId || `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // Merge provided config with App config defaults where appropriate
        // If config is empty, we use this.config (for the default agent case)
        const effectiveConfig = Object.keys(config).length > 0 ? config : this.config;

        const builder = new AgentBuilder({
            nar: effectiveConfig.nar,
            persistence: effectiveConfig.persistence,
            lm: effectiveConfig.lm,
            inputProcessing: {
                lmTemperature: effectiveConfig.lm?.temperature
            }
        });

        const agent = await builder.build();
        agent.id = id;

        this.agents.set(id, {
            id,
            agent,
            createdAt: new Date(),
            lastAccessed: new Date(),
            config: effectiveConfig
        });

        // If this is the first agent, make it active
        if (!this.activeAgentId) {
            this.activeAgentId = id;
        }

        return agent;
    }

    /**
     * Gets an agent by ID.
     * @param {string} agentId
     * @returns {Agent|null}
     */
    getAgent(agentId) {
        const entry = this.agents.get(agentId);
        if (entry) {
            entry.lastAccessed = new Date();
            return entry.agent;
        }
        return null;
    }

    /**
     * Switches the active agent.
     * @param {string} agentId
     * @returns {Agent}
     */
    switchAgent(agentId) {
        if (!this.agents.has(agentId)) {
            throw new Error(`Agent ${agentId} does not exist`);
        }
        this.activeAgentId = agentId;
        return this.getAgent(agentId);
    }

    /**
     * Lists all agents.
     */
    listAgents() {
        return Array.from(this.agents.entries()).map(([id, entry]) => ({
            id: entry.id,
            createdAt: entry.createdAt,
            lastAccessed: entry.lastAccessed,
            isActive: entry.id === this.activeAgentId
        }));
    }

    /**
     * Removes an agent.
     * @param {string} agentId
     */
    async removeAgent(agentId) {
        if (!this.agents.has(agentId)) return false;

        const {agent} = this.agents.get(agentId);
        try {
            if (agent.stop) agent.stop();
            if (agent.dispose) await agent.dispose();
        } catch (e) {
            console.error(`Error removing agent ${agentId}:`, e);
        }

        this.agents.delete(agentId);

        if (this.activeAgentId === agentId) {
            this.activeAgentId = this.agents.size > 0 ? this.agents.keys().next().value : null;
        }

        return true;
    }

    /**
     * Starts the active agent and optionally sets up signal handlers.
     * @param {Object} options
     * @param {boolean} [options.startAgent=true] - Start the reasoning loop
     * @param {boolean} [options.setupSignals=false] - Setup SIGINT/SIGTERM handlers
     */
    async start(options = {}) {
        const {startAgent = true, setupSignals = false} = options;

        if (!this.agent) await this.initialize();

        if (startAgent && this.agent && this.agent.start) {
            this.agent.start();
        }

        if (setupSignals) {
            this.setupGracefulShutdown();
        }

        this.emit('started', this.agent);
        return this.agent;
    }

    /**
     * Gracefully shuts down all agents.
     */
    async shutdown() {
        console.log('\nShutting down application...');

        for (const [id, entry] of this.agents) {
            const agent = entry.agent;
            if (agent) {
                console.log(`Stopping agent ${id}...`);
                try {
                    if (agent.save) {
                        await agent.save();
                    }
                } catch (error) {
                    console.error(`Error saving agent ${id}:`, error.message);
                }

                try {
                    if (agent.shutdown) {
                        await agent.shutdown();
                    } else if (agent.stop) {
                        agent.stop();
                    }
                } catch (error) {
                    console.error(`Error stopping agent ${id}:`, error.message);
                }
            }
        }

        this.emit('stopped');
    }

    /**
     * Registers default signal handlers to shutdown the app and exit.
     */
    setupGracefulShutdown() {
        const handleSignal = async () => {
            await this.shutdown();
            process.exit(0);
        };

        process.on('SIGINT', handleSignal);
        process.on('SIGTERM', handleSignal);
    }
}
