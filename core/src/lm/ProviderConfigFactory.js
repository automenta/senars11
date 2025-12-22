import {LMConfig} from './LMConfig.js';

/**
 * @deprecated Use LMConfig directly instead
 *
 * ProviderConfigFactory is deprecated as of Phase 4. All provider configuration
 * functionality has been consolidated into LMConfig.
 *
 * Migration:
 *   const configurator = ProviderConfigFactory.createProviderConfigurator(type, defaults);
 *   const config = await configurator.configure();
 *
 * Becomes:
 *   const lmConfig = new LMConfig();
 *   const result = await lmConfig.interactive();
 */
export class ProviderConfigFactory {
    static createProviderConfigurator(providerType, defaultProviders) {
        console.warn('[DEPRECATED] ProviderConfigFactory is deprecated. Use LMConfig.interactive() instead.');
        return {
            configure: async () => {
                const config = new LMConfig();
                const {default: inquirer} = await import('inquirer');
                return await config._configureProvider(providerType, inquirer);
            }
        };
    }

    static getPredefinedModels() {
        const huggingfacePresets = LMConfig.DEFAULT_PROVIDERS.huggingface?.presets || {};
        return huggingfacePresets;
    }
}