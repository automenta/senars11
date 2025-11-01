/**
 * @file SystemConfig.js
 * @description Simple, robust system configuration with validation
 */

import {ConfigManager} from '../config/ConfigManager.js';

/**
 * SystemConfig class that uses the centralized ConfigManager
 */
export class SystemConfig {
    constructor(userConfig = {}) {
        // Use ConfigManager to handle validation and merging
        this._configManager = new ConfigManager(userConfig);
        this._config = this._configManager.toJSON();
    }

    static from(userConfig = {}) {
        return new SystemConfig(userConfig);
    }

    get(path) {
        return this._configManager.get(path);
    }

    set(path, value) {
        this._configManager.set(path, value);
        this._config = this._configManager.toJSON();
        return this;
    }

    update(updates) {
        this._configManager.update(updates);
        this._config = this._configManager.toJSON();
        return this;
    }

    toJSON() {
        return {...this._config};
    }
}