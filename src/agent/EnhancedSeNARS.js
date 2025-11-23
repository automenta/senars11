/**
 * Apply MCR concepts to enhance SeNARS
 * This module integrates agent management and ontology support into SeNARS
 */

import AgentManager from './AgentManager.js';
import OntologyManager from './OntologyManager.js';

/**
 * Enhanced SeNARS system with MCR-inspired features
 */
export class EnhancedSeNARS {
    constructor() {
        this.agentManager = AgentManager;
        this.ontologyManager = OntologyManager;
        this.activeAgent = null;
    }

    /**
     * Initialize with an optional ontology
     */
    async initializeWithOntology(ontologyConfig = {}) {
        // Load predefined types and relationships if provided
        if (ontologyConfig.types) {
            ontologyConfig.types.forEach(type => this.ontologyManager.addType(type));
        }

        if (ontologyConfig.relationships) {
            ontologyConfig.relationships.forEach(rel => this.ontologyManager.defineRelationshipType(rel));
        }

        // Set up type hierarchies if provided
        if (ontologyConfig.hierarchy) {
            Object.entries(ontologyConfig.hierarchy).forEach(([parent, children]) => {
                children.forEach(child => {
                    this.ontologyManager.addSubtype(parent, child);
                });
            });
        }

        // Add synonyms if provided
        if (ontologyConfig.synonyms) {
            Object.entries(ontologyConfig.synonyms).forEach(([synonym, canonical]) => {
                this.ontologyManager.addSynonym(synonym, canonical);
            });
        }
    }

    /**
     * Create a new reasoning agent
     */
    async createAgent(agentId = null, config = {}) {
        const newAgentId = await this.agentManager.createAgent(agentId, config);
        this.activeAgent = this.agentManager.getAgent(newAgentId);
        return newAgentId;
    }

    /**
     * Switch to a different agent
     */
    switchAgent(agentId) {
        const agent = this.agentManager.switchAgent(agentId);
        this.activeAgent = agent;
        return agent;
    }

    /**
     * Get the current active agent
     */
    getCurrentAgent() {
        return this.agentManager.getCurrentAgent();
    }

    /**
     * Validate a term against the ontology before processing
     */
    validateTerm(term) {
        return this.ontologyManager.validateTerm(term);
    }

    /**
     * Process input in the current agent with ontology validation
     */
    async processInput(narseseInput) {
        if (!this.activeAgent) {
            throw new Error('No active agent. Create or switch to an agent first.');
        }

        // Validate the input against the ontology if validation is enabled
        if (this.ontologyManager.getTypes().length > 0) {
            // This is a simplified check - in a full implementation, this would
            // parse the Narsese and validate its components against the ontology
            const isValid = this.validateTerm(narseseInput);
            if (!isValid) {
                console.warn(`Input "${narseseInput}" may not conform to ontology, but processing anyway.`);
            }
        }

        // Process the input using the current agent
        const agent = this.activeAgent;
        await agent.input(narseseInput);

        return {success: true, agentId: agent.id, input: narseseInput};
    }

    /**
     * Query the current agent
     */
    async query(question) {
        if (!this.activeAgent) {
            throw new Error('No active agent. Create or switch to an agent first.');
        }

        const agent = this.activeAgent;
        return await agent.query(question);
    }

    /**
     * Save the current agent state
     */
    saveAgent(agentId = null) {
        const id = agentId || this.agentManager.currentAgentId;
        return this.agentManager.saveAgent(id);
    }

    /**
     * Load a saved agent
     */
    async loadAgent(agentId, state) {
        const agent = await this.agentManager.loadAgent(agentId, state);
        this.activeAgent = agent;
        return agent;
    }

    /**
     * Get agent statistics
     */
    getAgentStats(agentId = null) {
        const agent = this.agentManager.getAgent(agentId || this.agentManager.currentAgentId);
        if (!agent || !agent.memory) {
            return null;
        }

        const memory = agent.memory;
        const entry = this.agentManager.getAgentEntry(agent.id);

        return {
            agentId: agent.id,
            conceptsCount: memory.concepts ? memory.concepts.size : 0,
            createdAt: entry ? entry.createdAt : null,
            lastAccessed: entry ? entry.lastAccessed : null,
            config: entry ? entry.config : {}
        };
    }

    /**
     * Get ontology information
     */
    getOntologyInfo() {
        return {
            types: this.ontologyManager.getTypes(),
            relationships: this.ontologyManager.getRelationships(),
            constraints: this.ontologyManager.getConstraints(),
            typeCount: this.ontologyManager.getTypes().length,
            relationshipCount: this.ontologyManager.getRelationships().length
        };
    }

    /**
     * Register an instance with the ontology
     */
    registerInstance(instance, type) {
        this.ontologyManager.registerInstance(instance, type);
    }

    /**
     * Check if an instance is of a type (with inheritance)
     */
    isInstanceOf(instance, type) {
        return this.ontologyManager.isInstanceOf(instance, type);
    }
}

// Export default instance
export default new EnhancedSeNARS();
