/**
 * env.js - Environment Detection
 * Isomorphic environment detection for Node.js, Browser, and Web Workers
 */

export const ENV = {
    isBrowser: typeof window !== 'undefined' && typeof window.document !== 'undefined',
    isNode: typeof process !== 'undefined' && process.versions?.node,
    isWorker: typeof self !== 'undefined' && typeof importScripts === 'function',
    hasIndexedDB: typeof indexedDB !== 'undefined',
    hasWorkers: typeof Worker !== 'undefined',
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    hasFileSystem: typeof process !== 'undefined' && process.versions?.node
};

/**
 * Get current environment name
 */
export function getEnvironment() {
    if (ENV.isNode) return 'node';
    if (ENV.isWorker) return 'worker';
    if (ENV.isBrowser) return 'browser';
    return 'unknown';
}

/**
 * Assert environment requirement
 */
export function requireEnvironment(env) {
    const current = getEnvironment();
    if (current !== env) {
        throw new Error(`This operation requires ${env} environment, but running in ${current}`);
    }
}
