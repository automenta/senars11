
import { runExample } from './utils/example-runner.js';

const model = 'Xenova/LaMini-Flan-T5-248M';
const inputs = [
    "The sky is blue.",
    "What color is the sky?",
    "You have a tool named 'is_sky_blue' that can check if the sky is blue. Use it."
];
const tools = [
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

runExample({ model, inputs, tools });
