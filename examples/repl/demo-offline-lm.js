import {TransformersJSProvider} from '../../src/lm/TransformersJSProvider.js';

async function run() {
    console.log('🚀 Demo: Offline LM with Transformers.js');
    console.log('Loading model (this may take a while first time)...');

    try {
        const provider = new TransformersJSProvider({
            modelName: 'Xenova/LaMini-Flan-T5-783M',
            task: 'text2text-generation'
        });

        const prompt = "Explain artificial intelligence in simple terms.";
        console.log(`\n📝 Prompt: ${prompt}`);

        const start = Date.now();
        const result = await provider.generateText(prompt);
        const time = (Date.now() - start) / 1000;

        console.log(`\n🤖 Result (${time.toFixed(2)}s):`);
        console.log(result);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

run().catch(console.error);
