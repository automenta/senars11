/**
 * Base class for components that support configuration
 * Implements common configuration patterns to reduce code duplication
 */
export class ConfigurableComponent {
    constructor(defaultConfig = {}, validationSchema = null) {
        this._defaultConfig = defaultConfig;
        this._config = {...defaultConfig};
        this._validationSchema = validationSchema;
    }

    get config() {
        return {...this._config};
    }

    get defaultConfig() {
        return {...this._defaultConfig};
    }

    configure(cfg) {
        const validatedCfg = this._validate(cfg);
        this._config = {...this._config, ...validatedCfg};
        return this;
    }

    getConfigValue(key, defaultVal) {
        return this._config[key] ?? defaultVal;
    }

    setConfigValue(key, val) {
        const newConfig = {...this._config, [key]: val};
        this._config = this._validate(newConfig);
        return this;
    }

    validateConfig(config = this._config) {
        return this._validate(config);
    }

    _validate(config) {
        if (!this._validationSchema) return config;

        const schema = typeof this._validationSchema === 'function'
            ? this._validationSchema()
            : this._validationSchema;

        const result = schema.validate(config, {
            stripUnknown: true,
            allowUnknown: false,
            convert: true
        });

        if (result.error) {
            throw new Error(`Configuration validation failed: ${result.error.message}`);
        }

        return result.value;
    }
}