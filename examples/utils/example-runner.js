
import { App } from '../../src/app/App.js';
import { Config } from '../../src/app/Config.js';

process.env.ORT_LOG_LEVEL = 'error';

export async function runExample(options) {
    const { model, inputs, onStep } = options;

    console.log(`🚀 Starting SeNARS Agent Example Runner with ${model}...`);

    // 1. Initialize Agent
    const config = Config.parse([
        '--provider', 'transformers',
        '--model', model,
        '--temperature', '0'
    ]);

    config.nar.tools.enabled = true;
    config.subsystems = { ...config.subsystems, tools: true, lm: true };

    if (options.tools) {
        config.tools = options.tools;
    }

    const app = new App(config);
    await app.start();
    const agent = await app.initialize();

    console.log("✅ Agent initialized.");

    // 2. Run Scenarios
    for (const input of inputs) {
        console.log(`\n--------------------------------------------------`);
        console.log(`👤 User: ${input}`);
        console.log(`--------------------------------------------------`);

        try {
            await agent.processInputStreaming(input, (chunk) => {
                 process.stdout.write(chunk);
            }, onStep);
            process.stdout.write("\n");
        } catch (e) {
            console.error(`❌ Error processing input: ${e.message}`);
        }
    }

    console.log(`\n--------------------------------------------------`);

    // Cleanup
    await app.shutdown();
    console.log("👋 Example finished.");
}
