// Preparatory architecture for Phase 10: Knowledge Integration & External Systems
// This file establishes the foundation for integrating external knowledge bases and systems

const PROVIDER_MAP = Object.freeze({
    wikipedia: WikipediaConnector,
    wikidata: WikidataConnector,
    custom: CustomAPIConnector
});

const DEFAULT_RATE_LIMIT = Object.freeze({requests: 10, windowMs: 1000});
const DEFAULT_CACHE_TTL = 300000; // 5 minutes

// Knowledge base connector interface
class KnowledgeBaseConnector {
    constructor(config = {}) {
        this.config = config;
        this.connections = new Map(); // Active connections to knowledge bases
        this.cache = new Map(); // Cached knowledge to reduce external calls
        this.cacheTTL = config.cacheTTL ?? DEFAULT_CACHE_TTL;
        this.rateLimiter = new RateLimiter(config.rateLimit ?? DEFAULT_RATE_LIMIT);
    }

    // Connect to a knowledge base
    async connect(providerId, credentials) {
        // Return existing connection if available
        if (this.connections.has(providerId)) {
            return this.connections.get(providerId);
        }

        // Validate provider and create new connection
        const connector = await this._createConnector(providerId, credentials);
        this.connections.set(providerId, connector);
        return connector;
    }
    
    async _createConnector(providerId, credentials) {
        const ConnectorClass = PROVIDER_MAP[providerId];
        if (!ConnectorClass) {
            throw new Error(`Unknown provider: ${providerId}`);
        }

        const connector = new ConnectorClass(credentials, this.config);
        await connector.initialize();
        return connector;
    }

    // Query a knowledge base
    async query(providerId, query, options = {}) {
        // Check cache first
        const cacheKey = this._buildCacheKey(providerId, query);
        const cachedResult = this._getCachedResult(cacheKey);
        if (cachedResult) return cachedResult;

        // Check rate limit and query
        this._checkRateLimit(providerId);
        const connector = await this.connect(providerId);
        const result = await connector.query(query, options);

        // Cache the result
        this._cacheResult(cacheKey, result);
        return result;
    }
    
    _getCachedResult(cacheKey) {
        const cachedResult = this.cache.get(cacheKey);
        return cachedResult && this._isCacheValid(cachedResult) ? cachedResult.data : null;
    }
    
    _checkRateLimit(providerId) {
        if (!this.rateLimiter.allow(providerId)) {
            throw new Error(`Rate limit exceeded for provider: ${providerId}`);
        }
    }

    _buildCacheKey(providerId, query) {
        return `${providerId}:${JSON.stringify(query)}`;
    }

    _isCacheValid(cachedResult) {
        return Date.now() - cachedResult.timestamp < this.cacheTTL;
    }

    _cacheResult(cacheKey, result) {
        this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
    }

    // Batch query multiple knowledge bases
    async batchQuery(queries) {
        const results = await Promise.allSettled(
            queries.map(({providerId, query, options}) =>
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
            stats[providerId] = connector.getStats?.() ?? {};
        }

        return stats;
    }
}

// Rate limiter utility
class RateLimiter {
    constructor(config = DEFAULT_RATE_LIMIT) {
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
        this._ensureInitialized();
        
        const searchQuery = this._extractSearchQuery(query);
        const searchUrl = this._buildWikipediaUrl(searchQuery);

        const response = await this._fetchData(searchUrl);
        const data = await response.json();
        return this._buildResult('wikipedia', searchQuery, [data]);
    }
    
    _buildWikipediaUrl(searchQuery) {
        return `${this.baseUrl}/page/summary/${encodeURIComponent(searchQuery)}`;
    }
    
    async _fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return response;
    }

    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error(`${this.constructor.name} not initialized`);
        }
    }

    _extractSearchQuery(query) {
        return typeof query === 'string' ? query : query.search ?? query.term;
    }

    _buildResult(source, query, results) {
        return {
            source,
            query,
            results,
            timestamp: Date.now()
        };
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
        this._ensureInitialized();
        
        const sparqlQuery = this._prepareSparqlQuery(query);
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
        return this._buildResult('wikidata', sparqlQuery, data.results.bindings);
    }

    _prepareSparqlQuery(query) {
        if (typeof query === 'string') {
            return query;
        }
        return this._buildSparqlQuery(query);
    }

    _buildSparqlQuery(queryObj) {
        // Build a simple SPARQL query from a query object
        // This is a simplified implementation
        const searchTerm = queryObj.search ?? queryObj.term;
        return `
      SELECT ?item ?itemLabel WHERE {
        ?item ?label "${searchTerm}"@en .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 10
    `;
    }

    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error(`${this.constructor.name} not initialized`);
        }
    }

    _buildResult(source, query, results) {
        return {
            source,
            query,
            results,
            timestamp: Date.now()
        };
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
        this._ensureInitialized();
        
        const url = this._buildUrl(query, options);
        const headers = this._buildHeaders();

        const response = await fetch(url, {
            method: options.method ?? 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`Custom API error: ${response.status}`);
        }

        const data = await response.json();
        return this._buildResult('custom', query, Array.isArray(data) ? data : [data]);
    }

    _buildUrl(query, options) {
        // Build URL from query and options
        return `${this.baseUrl}/${query}`;
    }

    _buildHeaders() {
        // Build headers with authentication
        const headers = {'Content-Type': 'application/json'};
        if (this.credentials?.apiKey) {
            headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
        }
        return headers;
    }

    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error(`${this.constructor.name} not initialized`);
        }
    }

    _buildResult(source, query, results) {
        return {
            source,
            query,
            results,
            timestamp: Date.now()
        };
    }
}

// Data normalizer for different knowledge base formats
const NORMALIZATION_RULES = Object.freeze({
    wikipedia: (normalizer, data) => normalizer._normalizeData(data, normalizer._normalizeWikipediaItem.bind(normalizer), 'wikipedia'),
    wikidata: (normalizer, data) => normalizer._normalizeData(data, normalizer._normalizeWikidataItem.bind(normalizer), 'wikidata'),
    custom: (_normalizer, data) => Array.isArray(data) ? data : [data]
});

class KnowledgeNormalizer {
    constructor() {
        this.normalizationRules = NORMALIZATION_RULES;
    }

    normalize(source, data) {
        const normalizer = this.normalizationRules[source];
        if (normalizer) {
            return normalizer(this, data);
        }
        return data; // Return as-is if no normalizer
    }

    _normalizeData(data, itemNormalizer, source) {
        if (Array.isArray(data)) {
            return data.map(item => itemNormalizer(item, source));
        }
        return itemNormalizer(data, source);
    }

    _normalizeWikipediaItem(item, source) {
        return {
            id: item.pageid,
            title: item.title,
            extract: item.extract,
            url: item.content_urls?.desktop?.page,
            type: 'fact',
            source
        };
    }

    _normalizeWikidataItem(item, source) {
        return {
            id: item.item?.value?.split('/').pop(), // Extract ID from URL
            label: item.itemLabel?.value,
            description: item.itemDescription?.value,
            type: 'entity',
            source
        };
    }
}

// External knowledge integration manager
class ExternalKnowledgeManager {
    constructor(config = {}) {
        this.config = config;
        this.connector = new KnowledgeBaseConnector(config.connector ?? {});
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
                    error: result.error?.message,
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
        const subject = item.title ?? item.label;
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