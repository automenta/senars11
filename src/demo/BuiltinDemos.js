
const DEMOS = {
    basicUsage: {
        name: 'Basic Usage Demo',
        description: 'Demonstrates basic NARS operations',
        stepDelay: 1000,
        steps: [
            { description: 'Initializing basic usage demo' },
            { description: 'Adding belief: <cat --> animal>.', input: '<cat --> animal>.' },
            { description: 'Adding belief: <dog --> animal>.', input: '<dog --> animal>.' },
            { description: 'Asking question: <cat --> animal>?', input: '<cat --> animal>?' },
            { description: 'Adding goal: <cat --> pet>!', input: '<cat --> pet>!' },
            { description: 'Demo completed' }
        ]
    },
    syllogism: {
        name: 'Syllogistic Reasoning Demo',
        description: 'Demonstrates syllogistic reasoning',
        stepDelay: 1500,
        steps: [
            { description: 'Initializing syllogistic reasoning demo' },
            { description: 'Adding premise: <bird --> animal>.', input: '<bird --> animal>.' },
            { description: 'Adding premise: <robin --> bird>.', input: '<robin --> bird>.' },
            { description: 'Deriving conclusion: <robin --> animal>' },
            { description: 'Asking: <robin --> animal>?', input: '<robin --> animal>?' },
            { description: 'Syllogistic reasoning demo completed' }
        ]
    },
    inductive: {
        name: 'Inductive Reasoning Demo',
        description: 'Demonstrates inductive reasoning',
        stepDelay: 2000,
        steps: [
            { description: 'Initializing inductive reasoning demo' },
            { description: 'Adding observations: <swan1 --> white>.', input: '<swan1 --> white>.' },
            { description: 'Adding observations: <swan2 --> white>.', input: '<swan2 --> white>.' },
            { description: 'Adding observations: <swan3 --> white>.', input: '<swan3 --> white>.' },
            { description: 'Inductive inference: <swan --> white>?', input: '<swan --> white>?' },
            { description: 'Inductive reasoning demo completed' }
        ]
    }
};

export class BuiltinDemos {
    static getConfigs(managerContext) {
        return Object.entries(DEMOS).map(([id, config]) => ({
            id,
            name: config.name,
            description: config.description,
            stepDelay: config.stepDelay,
            handler: async (nar, sendDemoStep, waitIfNotPaused, params = {}) => {
                await managerContext._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, id, config.steps, params);
            }
        }));
    }
}
