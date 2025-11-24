export class BuiltinDemos {
    static getConfigs(managerContext) {
        return [
            {
                id: 'basicUsage',
                name: 'Basic Usage Demo',
                description: 'Demonstrates basic NARS operations',
                handler: BuiltinDemos.runBasicUsageDemo.bind(managerContext),
                stepDelay: 1000
            },
            {
                id: 'syllogism',
                name: 'Syllogistic Reasoning Demo',
                description: 'Demonstrates syllogistic reasoning',
                handler: BuiltinDemos.runSyllogismDemo.bind(managerContext),
                stepDelay: 1500
            },
            {
                id: 'inductive',
                name: 'Inductive Reasoning Demo',
                description: 'Demonstrates inductive reasoning',
                handler: BuiltinDemos.runInductiveDemo.bind(managerContext),
                stepDelay: 2000
            }
        ];
    }

    static async runBasicUsageDemo(nar, sendDemoStep, waitIfNotPaused, params = {}) {
        const steps = [
            {description: 'Initializing basic usage demo'},
            {description: 'Adding belief: <cat --> animal>.', input: '<cat --> animal>.'},
            {description: 'Adding belief: <dog --> animal>.', input: '<dog --> animal>.'},
            {description: 'Asking question: <cat --> animal>?', input: '<cat --> animal>?'},
            {description: 'Adding goal: <cat --> pet>!', input: '<cat --> pet>!'},
            {description: 'Demo completed'}
        ];
        // this refers to DemosManager instance
        await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'basicUsage', steps, params);
    }

    static async runSyllogismDemo(nar, sendDemoStep, waitIfNotPaused, params = {}) {
        const steps = [
            {description: 'Initializing syllogistic reasoning demo'},
            {description: 'Adding premise: <bird --> animal>.', input: '<bird --> animal>.'},
            {description: 'Adding premise: <robin --> bird>.', input: '<robin --> bird>.'},
            {description: 'Deriving conclusion: <robin --> animal>'},
            {description: 'Asking: <robin --> animal>?', input: '<robin --> animal>?'},
            {description: 'Syllogistic reasoning demo completed'}
        ];
        await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'syllogism', steps, params);
    }

    static async runInductiveDemo(nar, sendDemoStep, waitIfNotPaused, params = {}) {
        const steps = [
            {description: 'Initializing inductive reasoning demo'},
            {description: 'Adding observations: <swan1 --> white>.', input: '<swan1 --> white>.'},
            {description: 'Adding observations: <swan2 --> white>.', input: '<swan2 --> white>.'},
            {description: 'Adding observations: <swan3 --> white>.', input: '<swan3 --> white>.'},
            {description: 'Inductive inference: <swan --> white>?', input: '<swan --> white>?'},
            {description: 'Inductive reasoning demo completed'}
        ];
        await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'inductive', steps, params);
    }
}
