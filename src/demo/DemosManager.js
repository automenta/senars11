/**
 * DemosManager - handles the demo content and execution logic
 */
export class DemosManager {
    constructor() {
        this.demoConfigs = this._getBuiltinDemoConfigs();
    }

    _getBuiltinDemoConfigs() {
        return [
            {
                id: 'basicUsage',
                name: 'Basic Usage Demo',
                description: 'Demonstrates basic NARS operations',
                handler: this.runBasicUsageDemo.bind(this),
                stepDelay: 1000
            },
            {
                id: 'syllogism',
                name: 'Syllogistic Reasoning Demo',
                description: 'Demonstrates syllogistic reasoning',
                handler: this.runSyllogismDemo.bind(this),
                stepDelay: 1500
            },
            {
                id: 'inductive',
                name: 'Inductive Reasoning Demo',
                description: 'Demonstrates inductive reasoning',
                handler: this.runInductiveDemo.bind(this),
                stepDelay: 2000
            },
            {
                id: 'rlfp_focus',
                name: 'RLFP: Focus Management',
                description: 'Shows how distraction affects reasoning',
                handler: this.runRLFPFocusDemo.bind(this),
                stepDelay: 1500
            }
        ];
    }

    getAvailableDemos() {
        return this.demoConfigs.map(config => ({
            id: config.id,
            name: config.name,
            description: config.description,
            stepDelay: config.stepDelay,
            handler: config.handler
        }));
    }

    async runBasicUsageDemo(nar, sendDemoStep, waitIfNotPaused, params = {}) {
        const steps = [
            {description: 'Initializing basic usage demo'},
            {description: 'Adding belief: <cat --> animal>.', input: 'cat --> animal.'},
            {description: 'Adding belief: <dog --> animal>.', input: 'dog --> animal.'},
            {description: 'Asking question: <cat --> animal>?', input: 'cat --> animal?'},
            {description: 'Adding goal: <cat --> pet>!', input: 'cat --> pet!'},
            {description: 'Demo completed'}
        ];
        await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'basicUsage', steps, params);
    }

    async runSyllogismDemo(nar, sendDemoStep, waitIfNotPaused, params = {}) {
        const steps = [
            {description: 'Initializing syllogistic reasoning demo'},
            {description: 'Adding premise: <bird --> animal>.', input: 'bird --> animal.'},
            {description: 'Adding premise: <robin --> bird>.', input: 'robin --> bird.'},
            {description: 'Deriving conclusion: <robin --> animal>'},
            {description: 'Asking: <robin --> animal>?', input: 'robin --> animal?'},
            {description: 'Syllogistic reasoning demo completed'}
        ];
        await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'syllogism', steps, params);
    }

    async runInductiveDemo(nar, sendDemoStep, waitIfNotPaused, params = {}) {
        const steps = [
            {description: 'Initializing inductive reasoning demo'},
            {description: 'Adding observations: <swan1 --> white>.', input: 'swan1 --> white.'},
            {description: 'Adding observations: <swan2 --> white>.', input: 'swan2 --> white.'},
            {description: 'Adding observations: <swan3 --> white>.', input: 'swan3 --> white.'},
            {description: 'Inductive inference: <swan --> white>?', input: 'swan --> white?'},
            {description: 'Inductive reasoning demo completed'}
        ];
        await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'inductive', steps, params);
    }

    async runRLFPFocusDemo(nar, sendDemoStep, waitIfNotPaused, params = {}) {
        // This demo simulates a scenario where we want to compare "Focused" vs "Distracted" reasoning.
        // Ideally this runs on two sessions, but here we run it sequentially or just one path
        // and explain that RLFP would prefer the "focused" one.

        const steps = [
            {description: 'Initializing RLFP Focus Demo (The "Penguin Problem")'},
            {description: 'Task: Answer "Is a penguin a bird that can fly?"', input: '<penguin --> (&, bird, [flying])>?'},
            {description: 'Relevant Belief: Penguins are birds.', input: '<penguin --> bird>.'},
            {description: 'Relevant Belief: Birds usually fly.', input: '<bird --> [flying]>.'},
            {description: 'Relevant Belief: Penguins cannot fly.', input: '<penguin --> [flying]>{0.0, 0.9}.'},
            {description: 'Distraction: Adding irrelevant info about sparrows.', input: '<sparrow --> bird>.'},
            {description: 'Distraction: Adding irrelevant info about airplanes.', input: '<airplane --> [flying]>.'},
            {description: 'Observation: Does the system prioritize the penguin query or get distracted?'},
            {description: 'RLFP Goal: Learn to prefer trajectories that ignore sparrow/airplane when answering about penguins.'}
        ];
        await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'rlfp_focus', steps, params);
    }

    async _executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, demoId, steps, params = {}) {
        const stepDelay = params.stepDelay || 1000;

        for (const [index, step] of steps.entries()) {
            await sendDemoStep(demoId, index + 1, step.description);

            if (step.input && nar) {
                await this._executeInputSafely(nar, demoId, index + 1, step.input);
            }

            // Don't wait after the last step
            if (index < steps.length - 1) {
                await waitIfNotPaused(stepDelay);
            }
        }
    }

    async _executeInputSafely(nar, demoId, step, input) {
        try {
            await nar.input(input);
        } catch (error) {
            console.error(`Error processing input for step ${step}:`, error);
            // This would need to be implemented by the caller
            // await sendDemoStep(demoId, step, `Error processing input: ${error.message}`);
        }
    }
}
