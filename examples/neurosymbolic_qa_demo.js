import {TransformersJSProvider} from '../src/lm/TransformersJSProvider.js';

export const NeurosymbolicQADemo = {
    id: 'neurosymbolic-qa',
    name: 'Neurosymbolic QA (Transformers.js)',
    description: 'Demonstrates hybrid reasoning using Transformers.js and NAR.',
    stepDelay: 1000,
    parameters: {
        model: {
            type: 'string',
            defaultValue: 'Xenova/LaMini-Flan-T5-783M',
            description: 'Model to use'
        }
    },
    handler: async (nar, sendDemoStep, wait, parameters) => {
        await sendDemoStep('neurosymbolic-qa', 1, "Initializing Neurosymbolic QA Demo...");

        // Ensure LM is configured
        let lmProvider;
        // Check if provider is available in nar.lm (assuming nar.lm is where provider is stored)
        // Note: NAR structure might vary, but usually it's registered.
        // If nar.registerLMProvider was used, we assume it's set up.

        // However, we don't have easy access to get the provider back from NAR instance if it doesn't expose it.
        // But we can just create a new one if needed, or rely on the one passed in parameters if DemoWrapper handled it.

        // DemoWrapper _configureLM calls nar.registerLMProvider.

        await sendDemoStep('neurosymbolic-qa', 2, "Configuring Transformers.js provider if needed...");

        // We instantiate it locally to be sure we have one for the demo logic
        // even if NAR has one, we need to call generateText.
        // If NAR exposes it, great. If not, we create one.

        // Let's assume we create one for the demo's use,
        // AND we register it with NAR for NAR's internal use (if any).

        lmProvider = new TransformersJSProvider({
             modelName: parameters.model || 'Xenova/LaMini-Flan-T5-783M',
             temperature: 0.1
        });

        if (nar && typeof nar.registerLMProvider === 'function') {
             nar.registerLMProvider('default', lmProvider);
        }

        const question = "Birds can fly. Tweety is a bird. Can Tweety fly?";
        await sendDemoStep('neurosymbolic-qa', 3, `Question: "${question}"`);

        const prompt = `Translate to Narsese:
"${question}"
Narsese:`;

        await sendDemoStep('neurosymbolic-qa', 4, "Generating Narsese with LM...");

        let narsese = "";
        try {
             const output = await lmProvider.generateText(prompt, { maxTokens: 50 });
             await sendDemoStep('neurosymbolic-qa', 5, `LM Output: ${output}`);

             // Simple cleanup
             let cleaned = output.replace(/```/g, '').trim();

             // Naive validation
             if (cleaned.includes('<') && cleaned.includes('>')) {
                 narsese = cleaned;
             } else {
                  narsese = "<bird --> [flying]>.\n<Tweety --> bird>.\n<Tweety --> [flying]>?";
                  await sendDemoStep('neurosymbolic-qa', 5, `Output unclear, using fallback: ${narsese}`);
             }
        } catch (e) {
             await sendDemoStep('neurosymbolic-qa', 5, `LM Failed: ${e.message}. Using fallback.`);
             narsese = "<bird --> [flying]>.\n<Tweety --> bird>.\n<Tweety --> [flying]>?";
        }

        const lines = narsese.split('\n').filter(l => l.trim());

        for (const line of lines) {
             await sendDemoStep('neurosymbolic-qa', 6, `Inputting: ${line}`);
             nar.input(line);
             await wait(1000);
        }

        await sendDemoStep('neurosymbolic-qa', 7, "Reasoning...");
        for(let i=0; i<10; i++) {
             nar.cycle();
             await wait(100);
        }

        await sendDemoStep('neurosymbolic-qa', 8, "Demo Completed.");
    }
};
