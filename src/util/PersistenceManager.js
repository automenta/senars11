export class PersistenceManager {
    constructor(options = {}) {
        this.options = {
            enabled: options.enabled !== false,
            storagePath: options.storagePath || './data',
            autoSave: options.autoSave !== false,
            saveInterval: options.saveInterval || 30000,
            ...options
        };
        
        this.storage = new Map();
        this.isInitialized = false;
    }
    
    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize persistence manager:', error);
            return false;
        }
    }
    
    async save(key, data) {
        if (!this.options.enabled || !this.isInitialized) return false;
        
        try {
            this.storage.set(key, data);
            return true;
        } catch (error) {
            console.error(`Failed to save data for key ${key}:`, error);
            return false;
        }
    }
    
    async load(key) {
        if (!this.options.enabled || !this.isInitialized) return null;
        
        try {
            return this.storage.get(key) ?? null;
        } catch (error) {
            console.error(`Failed to load data for key ${key}:`, error);
            return null;
        }
    }
    
    async delete(key) {
        if (!this.options.enabled || !this.isInitialized) return false;
        
        try {
            const exists = this.storage.has(key);
            exists && this.storage.delete(key);
            return exists;
        } catch (error) {
            console.error(`Failed to delete data for key ${key}:`, error);
            return false;
        }
    }
    
    async listKeys() {
        if (!this.options.enabled || !this.isInitialized) return [];
        
        try {
            return Array.from(this.storage.keys());
        } catch (error) {
            console.error('Failed to list keys:', error);
            return [];
        }
    }
    
    async clear() {
        if (!this.options.enabled || !this.isInitialized) return false;
        
        try {
            this.storage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }
    
    async getStats() {
        if (!this.options.enabled || !this.isInitialized) return {};
        
        return {
            keyCount: this.storage.size,
            enabled: this.options.enabled,
            storagePath: this.options.storagePath,
            autoSave: this.options.autoSave
        };
    }
}