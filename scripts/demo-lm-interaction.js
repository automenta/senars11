import {AgentBuilder} from '../src/agent/AgentBuilder.js';

async function main() {
    console.log("🤖 Starting SeNARS Agent with TransformersJS (Offline LM)...");

    try {
        const agent = await AgentBuilder.createAgent({
            subsystems: {
                lm: true,
                tools: true
            },
            lm: {
                provider: 'transformersjs',
                modelName: 'Xenova/LaMini-Flan-T5-783M',
                temperature: 0
            },
            nar: {
                tools: {enabled: true}
            }
        });

        const lmProvider = agent.lm._getProvider('transformersjs');
        lmProvider.tools = [
            {
                name: 'add',
                description: 'Add two numbers',
                invoke: async (args) => {
                    console.log(`\n[Tool Internal Debug] Args received:`, JSON.stringify(args));
                    const a = args.a || args[0] || (args.input ? args.input.split(',')[0] : 0);
                    const b = args.b || args[1] || (args.input ? args.input.split(',')[1] : 0);

                    const valA = parseFloat(a);
                    const valB = parseFloat(b);
                    const result = valA + valB;

                    console.log(`🎯 [Tool Execution] add(${valA}, ${valB}) -> ${result}`);
                    return result.toString();
                }
            }
        ];

        console.log("✅ Agent initialized.");
        console.log("✅ Tool 'add' registered manually.");

        // Few-shot prompt to guide the model
        const prompt = `Task: Solve.
Q: 1+1?
A: Tool: add(1, 1)
Q: 10+5?
A: Tool: add(10, 5)
Q: 5+3?
A:`;

        console.log(`\n👤 User Input:\n${prompt}\n`);
        console.log("🤖 Agent Output (Streaming):");

        await agent.processInputStreaming(prompt, (chunk) => {
            process.stdout.write(chunk);
        });

        console.log("\n\n✅ Interaction completed.");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

main();
