/**
 * @file ReplArgsParser.js
 * @description Common utility for parsing command line arguments across REPL implementations
 */

/**
 * Parse command line arguments for REPL configurations
 * @param {Array} argv - Process argv array, defaults to process.argv
 * @returns {Object} Parsed configuration options
 */
export function parseReplArgs(argv = process.argv) {
    const args = {};
    
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--ollama') {
            args.ollama = true;
            // Check for model name in next argument
            if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
                args.model = argv[i + 1];
                i++; // Skip the next arg since we used it
            }
            // Note: If no model follows --ollama, we'll rely on later --model arg if present
        } else if (argv[i] === '--model') {
            args.model = argv[i + 1];
            i++; // Skip the next arg
        } else if (argv[i] === '--api-key') {
            args.apiKey = argv[i + 1];
            i++; // Skip the next arg
        } else if (argv[i] === '--base-url') {
            args.baseUrl = argv[i + 1];
            i++; // Skip the next arg
        } else if (argv[i] === '--temperature') {
            args.temperature = parseFloat(argv[i + 1]);
            i++; // Skip the next arg
        }
    }
    
    return args;
}

/**
 * Parse arguments specifically for Ollama configuration
 * @param {Array} argv - Process argv array, defaults to process.argv
 * @returns {Object} Parsed Ollama configuration options
 */
export function parseOllamaArgs(argv = process.argv) {
    const args = {};
    
    for (let i = 0; i < argv.length; i++) {
        switch (argv[i]) {
            case '--model':
            case '--ollama':
                args.modelName = argv[i + 1]?.startsWith('--') ? "hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M" : argv[++i];
                break;
            case '--temperature':
                args.temperature = parseFloat(argv[++i]);
                break;
            case '--base-url':
                args.baseUrl = argv[++i];
                break;
        }
    }
    
    // Default model if --ollama flag is provided without specific model
    if (argv.includes('--ollama') && !args.modelName) {
        args.modelName = "hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M";
    }
    
    return args;
}