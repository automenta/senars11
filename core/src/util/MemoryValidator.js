export class MemoryValidator {
    constructor(options = {}) {
        this.options = {
            enableChecksums: options.enableChecksums !== false,
            validationInterval: options.validationInterval || 30000,
            algorithm: options.algorithm || 'simple-hash',
            ...options
        };

        this.checksums = new Map();
        this.isEnabled = true;
    }

    calculateChecksum(obj) {
        if (!this.isEnabled || !this.options.enableChecksums) return null;

        let str;
        try {
            if (obj && typeof obj.serialize === 'function') {
                str = JSON.stringify(obj.serialize());
            } else {
                // Simple circular reference protection
                const seen = new WeakSet();
                str = JSON.stringify(obj, (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                            return '[Circular]';
                        }
                        seen.add(value);
                    }
                    return value;
                });
            }
        } catch (e) {
            return null;
        }

        if (!str) return null;

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return hash.toString();
    }

    storeChecksum(key, obj) {
        if (!this.isEnabled) return;

        const checksum = this.calculateChecksum(obj);
        checksum && this.checksums.set(key, checksum);
        return checksum;
    }

    validate(key, obj) {
        if (!this.isEnabled || !this.options.enableChecksums) {
            return {valid: true, message: 'Validation disabled'};
        }

        const expectedChecksum = this.checksums.get(key);
        if (!expectedChecksum) {
            this.storeChecksum(key, obj);
            return {valid: true, message: 'First validation - stored checksum'};
        }

        const actualChecksum = this.calculateChecksum(obj);
        if (!actualChecksum) {
            return {valid: false, message: 'Could not calculate checksum'};
        }

        return expectedChecksum === actualChecksum
            ? {valid: true, message: 'Valid'}
            : {
                valid: false,
                message: 'Memory corruption detected',
                expected: expectedChecksum,
                actual: actualChecksum
            };
    }

    validateBatch(validations) {
        return validations.map(([key, obj]) => ({
            key,
            result: this.validate(key, obj)
        }));
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }

    clear() {
        this.checksums.clear();
    }

    getChecksums() {
        return new Map(this.checksums);
    }

    updateChecksum(key, obj) {
        return this.storeChecksum(key, obj);
    }
}