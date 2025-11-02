// Preparatory architecture for Phase 10: Knowledge Integration & External Systems
// This file establishes the foundation for integrating external knowledge bases and systems

// Knowledge base connector interface
class KnowledgeBaseConnector {
  constructor(config = {}) {
    this.config = config;
    this.connections = new Map(); // Active connections to knowledge bases
    this.cache = new Map(); // Cached knowledge to reduce external calls
    this.cacheTTL = config.cacheTTL || 300000; // 5 minutes default
    this.rateLimiter = new RateLimiter(config.rateLimit || { requests: 10, windowMs: 1000 });
  }
  
  // Connect to a knowledge base
  async connect(providerId, credentials) {
    if (this.connections.has(providerId)) {
      return this.connections.get(providerId);
    }
    
    let connector;
    
    switch (providerId) {
      case 'wikipedia':
        connector = new WikipediaConnector(credentials, this.config);
        break;
      case 'wikidata':
        connector = new WikidataConnector(credentials, this.config);
        break;
      case 'custom':
        connector = new CustomAPIConnector(credentials, this.config);
        break;
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
    
    await connector.initialize();
    this.connections.set(providerId, connector);
    return connector;
  }
  
  // Query a knowledge base
  async query(providerId, query, options = {}) {
    // Check cache first
    const cacheKey = `${providerId}:${JSON.stringify(query)}`;
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < this.cacheTTL) {
      return cachedResult.data;
    }
    
    // Check rate limit
    if (!this.rateLimiter.allow(providerId)) {
      throw new Error(`Rate limit exceeded for provider: ${providerId}`);
    }
    
    // Connect if needed and query
    const connector = await this.connect(providerId);
    const result = await connector.query(query, options);
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  // Batch query multiple knowledge bases
  async batchQuery(queries) {
    const results = await Promise.allSettled(
      queries.map(({ providerId, query, options }) => 
        this.query(providerId, query, options)
      )
    );
    
    return results.map((result, index) => ({
      query: queries[index],
      success: result.status === 'fulfilled',
      data: result.value,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }
  
  // Clear cache
  clearCache() {
    this.cache.clear();
  }
  
  // Get connection statistics
  getStats() {
    const stats = {};
    
    for (const [providerId, connector] of this.connections) {
      stats[providerId] = connector.getStats ? connector.getStats() : {};
    }
    
    return stats;
  }
}

// Rate limiter utility
class RateLimiter {
  constructor(config = { requests: 10, windowMs: 1000 }) {
    this.config = config;
    this.requests = new Map(); // providerId -> array of timestamps
  }
  
  allow(providerId) {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    if (!this.requests.has(providerId)) {
      this.requests.set(providerId, []);
    }
    
    const providerRequests = this.requests.get(providerId);
    
    // Remove old requests outside the window
    const validRequests = providerRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(providerId, validRequests);
    
    // Check if we're under the limit
    if (validRequests.length < this.config.requests) {
      validRequests.push(now);
      return true;
    }
    
    return false;
  }
}

// Wikipedia connector
class WikipediaConnector {
  constructor(credentials, config) {
    this.credentials = credentials;
    this.config = config;
    this.baseUrl = 'https://en.wikipedia.org/api/rest_v1';
    this.initialized = false;
  }
  
  async initialize() {
    // Verify connectivity or setup
    this.initialized = true;
  }
  
  async query(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Wikipedia connector not initialized');
    }
    
    const searchQuery = typeof query === 'string' ? query : query.search || query.term;
    const searchUrl = `${this.baseUrl}/page/summary/${encodeURIComponent(searchQuery)}`;
    
    try {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Wikipedia API error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        source: 'wikipedia',
        query: searchQuery,
        results: [data],
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Wikipedia query failed: ${error.message}`);
    }
  }
}

// Wikidata connector
class WikidataConnector {
  constructor(credentials, config) {
    this.credentials = credentials;
    this.config = config;
    this.baseUrl = 'https://query.wikidata.org/sparql';
    this.initialized = false;
  }
  
  async initialize() {
    // Verify connectivity
    this.initialized = true;
  }
  
  async query(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Wikidata connector not initialized');
    }
    
    // If query is a string, assume it's a SPARQL query
    // If it's an object, convert to SPARQL
    let sparqlQuery;
    if (typeof query === 'string') {
      sparqlQuery = query;
    } else {
      sparqlQuery = this.buildSparqlQuery(query);
    }
    
    const url = `${this.baseUrl}?query=${encodeURIComponent(sparqlQuery)}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/sparql-results+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Wikidata API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      source: 'wikidata',
      query: sparqlQuery,
      results: data.results.bindings,
      timestamp: Date.now()
    };
  }
  
  buildSparqlQuery(queryObj) {
    // Build a simple SPARQL query from a query object
    // This is a simplified implementation
    const searchTerm = queryObj.search || queryObj.term;
    return `
      SELECT ?item ?itemLabel WHERE {
        ?item ?label "${searchTerm}"@en .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 10
    `;
  }
}

// Custom API connector base class
class CustomAPIConnector {
  constructor(credentials, config) {
    this.credentials = credentials;
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.initialized = false;
  }
  
  async initialize() {
    // Verify connectivity or setup
    this.initialized = true;
  }
  
  async query(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Custom API connector not initialized');
    }
    
    const url = this.buildUrl(query, options);
    const headers = this.buildHeaders();
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      source: 'custom',
      query,
      results: Array.isArray(data) ? data : [data],
      timestamp: Date.now()
    };
  }
  
  buildUrl(query, options) {
    // Build URL from query and options
    return `${this.baseUrl}/${query}`;
  }
  
  buildHeaders() {
    // Build headers with authentication
    const headers = { 'Content-Type': 'application/json' };
    if (this.credentials && this.credentials.apiKey) {
      headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
    }
    return headers;
  }
}

// Data normalizer for different knowledge base formats
class KnowledgeNormalizer {
  constructor() {
    this.normalizationRules = {
      'wikipedia': this.normalizeWikipedia,
      'wikidata': this.normalizeWikidata,
      'custom': this.normalizeCustom
    };
  }
  
  normalize(source, data) {
    const normalizer = this.normalizationRules[source];
    if (normalizer) {
      return normalizer(data);
    }
    return data; // Return as-is if no normalizer
  }
  
  normalizeWikipedia(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.normalizeWikipediaItem(item));
    }
    return this.normalizeWikipediaItem(data);
  }
  
  normalizeWikipediaItem(item) {
    return {
      id: item.pageid,
      title: item.title,
      extract: item.extract,
      url: item.content_urls?.desktop?.page,
      type: 'fact',
      source: 'wikipedia'
    };
  }
  
  normalizeWikidata(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.normalizeWikidataItem(item));
    }
    return this.normalizeWikidataItem(data);
  }
  
  normalizeWikidataItem(item) {
    return {
      id: item.item?.value?.split('/').pop(), // Extract ID from URL
      label: item.itemLabel?.value,
      description: item.itemDescription?.value,
      type: 'entity',
      source: 'wikidata'
    };
  }
  
  normalizeCustom(data) {
    // Default normalization for custom sources
    return Array.isArray(data) ? data : [data];
  }
}

// External knowledge integration manager
class ExternalKnowledgeManager {
  constructor(config = {}) {
    this.config = config;
    this.connector = new KnowledgeBaseConnector(config.connector || {});
    this.normalizer = new KnowledgeNormalizer();
    this.nar = null; // Will be set when connected to NAR
  }
  
  // Connect to NAR for integration
  connectToNAR(nar) {
    this.nar = nar;
  }
  
  // Query external knowledge and integrate with internal knowledge
  async queryAndIntegrate(query, sources = ['wikipedia', 'wikidata']) {
    if (!this.nar) {
      throw new Error('ExternalKnowledgeManager not connected to NAR');
    }
    
    // Query multiple sources
    const queries = sources.map(providerId => ({
      providerId,
      query,
      options: {}
    }));
    
    const results = await this.connector.batchQuery(queries);
    
    // Normalize and integrate results
    const integratedResults = [];
    
    for (const result of results) {
      if (result.success) {
        const normalized = this.normalizer.normalize(
          result.query.providerId, 
          result.data.results
        );
        
        // Integrate with NAR (this would convert to Narsese and input to NAR)
        await this.integrateWithNAR(normalized, result.query.providerId);
        
        integratedResults.push({
          source: result.query.providerId,
          data: normalized,
          integrated: true
        });
      } else {
        integratedResults.push({
          source: result.query.providerId,
          error: result.error.message,
          integrated: false
        });
      }
    }
    
    return integratedResults;
  }
  
  // Integrate external knowledge with NAR
  async integrateWithNAR(knowledge, source) {
    if (!this.nar) return;
    
    // Convert external knowledge to Narsese and add to NAR
    for (const item of knowledge) {
      try {
        // This is a simplified conversion - in reality, this would be more complex
        const narsese = this.convertToNarsese(item);
        if (narsese) {
          await this.nar.input(narsese);
        }
      } catch (error) {
        console.warn(`Failed to convert knowledge item to Narsese:`, error);
      }
    }
  }
  
  // Convert external knowledge item to Narsese
  convertToNarsese(item) {
    if (!item.title && !item.label) return null;
    
    // Simple conversion - in reality, this would be much more sophisticated
    const subject = item.title || item.label;
    const predicate = 'fact';
    
    // This is a very simplified approach - real integration would be more complex
    return `<${subject.replace(/\s+/g, '_')} --> ${predicate}>. %1.00;0.90%`;
  }
  
  // Get statistics
  getStats() {
    return {
      connectorStats: this.connector.getStats(),
      cacheSize: this.connector.cache.size
    };
  }
  
  // Clear cache
  clearCache() {
    this.connector.clearCache();
  }
}

// Export factory functions
const createKnowledgeBaseConnector = (config = {}) => new KnowledgeBaseConnector(config);
const createExternalKnowledgeManager = (config = {}) => new ExternalKnowledgeManager(config);

export { 
  KnowledgeBaseConnector, 
  ExternalKnowledgeManager, 
  createKnowledgeBaseConnector, 
  createExternalKnowledgeManager 
};