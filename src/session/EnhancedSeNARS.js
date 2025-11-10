/**
 * Apply MCR concepts to enhance SeNARS
 * This module integrates session management and ontology support into SeNARS
 */

import SessionManager from './SessionManager.js';
import OntologyManager from './OntologyManager.js';

/**
 * Enhanced SeNARS system with MCR-inspired features
 */
export class EnhancedSeNARS {
  constructor() {
    this.sessionManager = SessionManager;
    this.ontologyManager = OntologyManager;
    this.activeSession = null;
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
   * Create a new reasoning session
   */
  async createSession(sessionId = null, config = {}) {
    const newSessionId = await this.sessionManager.createSession(sessionId, config);
    this.activeSession = this.sessionManager.getSession(newSessionId);
    return newSessionId;
  }

  /**
   * Switch to a different session
   */
  switchSession(sessionId) {
    const session = this.sessionManager.switchSession(sessionId);
    this.activeSession = session;
    return session;
  }

  /**
   * Get the current active session
   */
  getCurrentSession() {
    return this.sessionManager.getCurrentSession();
  }

  /**
   * Validate a term against the ontology before processing
   */
  validateTerm(term) {
    return this.ontologyManager.validateTerm(term);
  }

  /**
   * Process input in the current session with ontology validation
   */
  async processInput(narseseInput) {
    if (!this.activeSession) {
      throw new Error('No active session. Create or switch to a session first.');
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

    // Process the input using the current session's NAR
    const nar = this.activeSession.nar;
    await nar.input(narseseInput);
    
    return { success: true, sessionId: this.activeSession.id, input: narseseInput };
  }

  /**
   * Query the current session
   */
  async query(question) {
    if (!this.activeSession) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    const nar = this.activeSession.nar;
    return await nar.query(question);
  }

  /**
   * Save the current session state
   */
  saveSession(sessionId = null) {
    const id = sessionId || this.sessionManager.currentSessionId;
    return this.sessionManager.saveSession(id);
  }

  /**
   * Load a saved session
   */
  async loadSession(sessionId, state) {
    const session = await this.sessionManager.loadSession(sessionId, state);
    this.activeSession = session;
    return session;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId = null) {
    const session = this.sessionManager.getSession(sessionId || this.sessionManager.currentSessionId);
    if (!session || !session.nar || !session.nar.memory) {
      return null;
    }

    const memory = session.nar.memory;
    return {
      sessionId: session.id,
      conceptsCount: memory.concepts ? memory.concepts.size : 0,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed,
      config: session.config
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