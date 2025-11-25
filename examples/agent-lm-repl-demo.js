
import { App } from '../src/app/App.js';
import { Config } from '../src/app/Config.js';

async function main() {
    console.log("🚀 Starting SeNARS Agent LM REPL Demo...");

    // 1. Initialize Agent
    const config = Config.parse([
        '--provider', 'transformers',
        '--model', 'Xenova/LaMini-Flan-T5-248M',
        '--temperature', '0'
    ]);

    config.nar.tools.enabled = true;
    config.subsystems = { ...config.subsystems, tools: true, lm: true };
    config.tools = [
        {
            name: 'is_sky_blue',
            description: 'Checks if the sky is blue.',
            inputSchema: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: async () => {
                return "The sky is indeed blue.";
            }
        }
    ];

    const app = new App(config);
    const agent = await app.initialize();

    console.log("✅ Agent initialized and 'is_sky_blue' tool registered.");

    // 2. Run Scenarios
    const inputs = [
        "The sky is blue.",
        "What color is the sky?",
        "You have a tool named 'is_sky_blue' that can check if the sky is blue. Use it."
    ];

    for (const input of inputs) {
        console.log(`\n--------------------------------------------------`);
        console.log(`👤 User: ${input}`);
        console.log(`--------------------------------------------------`);

        try {
            await agent.processInputStreaming(input, (chunk) => {
                 process.stdout.write(chunk);
            });
            process.stdout.write("\n");
        } catch (e) {
            console.error(`❌ Error processing input: ${e.message}`);
        }
    }

    console.log(`\n--------------------------------------------------`);

    // Cleanup
    await app.shutdown();
    console.log("👋 Demo finished.");
}

main().catch(error => {
    console.error("Fatal Error:", error);
    process.exit(1);
});
