import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_CONFIG = Object.freeze({
    nar: {
        tools: { enabled: true },
        lm: { enabled: false },
        reasoningAboutReasoning: { enabled: true },
        debug: { pipeline: false }
    },
    lm: {
        provider: 'ollama',
        modelName: "hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M",
        baseUrl: "http://localhost:11434",
        temperature: 0,
        enabled: false
    },
    persistence: {
        defaultPath: './agent.json'
    },
    webSocket: {
        port: parseInt(process.env.WS_PORT) || 8080,
        host: process.env.WS_HOST || '0.0.0.0',
        maxConnections: 20
    },
    ui: {
        port: parseInt(process.env.PORT) || 5173,
        layout: 'default',
        dev: true
    }
});

export class Config {
    static parse(argv = process.argv.slice(2)) {
        const config = structuredClone(DEFAULT_CONFIG);

        for (let i = 0; i < argv.length; i++) {
            const arg = argv[i];

            switch (arg) {
                // LM / Ollama Args
                case '--ollama':
                    config.lm.enabled = true;
                    if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
                        config.lm.modelName = argv[++i];
                    }
                    break;
                case '--model':
                case '--modelName':
                    config.lm.modelName = argv[++i];
                    config.lm.enabled = true; // Assume enabled if model specified
                    break;
                case '--base-url':
                    config.lm.baseUrl = argv[++i];
                    break;
                case '--temperature':
                    config.lm.temperature = parseFloat(argv[++i]);
                    break;
                case '--api-key':
                    config.lm.apiKey = argv[++i];
                    break;

                // WebSocket / Server Args
                case '--ws-port':
                    config.webSocket.port = parseInt(argv[++i]);
                    break;
                case '--host':
                    config.webSocket.host = argv[++i];
                    break;

                // UI Args
                case '--port':
                    config.ui.port = parseInt(argv[++i]);
                    break;
                case '--graph-ui':
                    config.ui.layout = 'graph';
                    break;
                case '--layout':
                    config.ui.layout = argv[++i];
                    break;
                case '--prod':
                    config.ui.dev = false;
                    break;
                case '--dev':
                    config.ui.dev = true;
                    break;

                // Demo
                case '--demo':
                    config.demo = true;
                    break;
            }
        }

        return config;
    }
}
