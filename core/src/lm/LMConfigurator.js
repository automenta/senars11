import {LMConfig} from './LMConfig.js';

/**
 * @deprecated Use LMConfig.interactive() or LMConfig.quickSelect() instead
 *
 * LMConfigurator is deprecated as of Phase 4. All functionality has been
 * consolidated into LMConfig for a unified configuration API.
 *
 * Migration:
 *   const configurator = new LMConfigurator();
 *   const result = await configurator.configure();
 *
 * Becomes:
 *   const config = new LMConfig();
 *   const result = await config.interactive();
 */
export class LMConfigurator {
    constructor() {
        console.warn('[DEPRECATED] LMConfigurator is deprecated. Use LMConfig.interactive() instead.');
        this._config = new LMConfig();
    }

    async configure() {
        return await this._config.interactive();
    }

    async quickSelect() {
        return await this._config.quickSelect();
    }
}