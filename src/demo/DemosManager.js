/**
 * DemosManager - handles the demo content and execution logic
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileSystemDemoSource } from './FileSystemDemoSource.js';
import { ProcessDemoRunner } from './ProcessDemoRunner.js';

export class DemosManager {
    constructor() {
        this.fsSource = new FileSystemDemoSource();
        this.processRunner = new ProcessDemoRunner();
        this.fileDemos = new Map();
        this.demoConfigs = this._getBuiltinDemoConfigs();
        this.currentRunningDemoId = null;
    }

    async initialize() {
        const fileDemos = await this.fsSource.getDemos();
        this.fileDemos.clear();
        for (const demo of fileDemos) {
            this.fileDemos.set(demo.id, demo);
        }
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
            }
        ];
    }

    getAvailableDemos() {
        const builtins = this.demoConfigs.map(config => ({
            id: config.id,
            name: config.name,
            description: config.description,
            stepDelay: config.stepDelay,
            handler: config.handler,
            type: 'builtin'
        }));

        const fileDemos = Array.from(this.fileDemos.values()).map(demo => ({
            id: demo.id,
            name: demo.name,
            description: demo.description,
            stepDelay: 1000, // Default delay
            handler: this.runFileDemo.bind(this, demo.id),
            type: demo.type
        }));

        return [...builtins, ...fileDemos];
    }

    async runFileDemo(demoId, nar, sendDemoStep, waitIfNotPaused, params = {}) {
        const demo = this.fileDemos.get(demoId);
        if (!demo) throw new Error(`Demo ${demoId} not found`);

        this.currentRunningDemoId = demoId;

        if (demo.type === 'process') {
            await this.runProcessDemo(demo, sendDemoStep);
        } else {
            const steps = await this.fsSource.loadDemoSteps(demo.path);
            await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, demoId, steps, params);
        }

        this.currentRunningDemoId = null;
    }

    async runProcessDemo(demo, sendDemoStep) {
        return new Promise((resolve, reject) => {
            this.processRunner.start(demo.path,
                (text, type) => {
                    // We use step=0 to indicate continuous output
                    // We send data.input if it's input-like? No, just description/text.
                    // But Frontend console uses 'description' as log message.
                    sendDemoStep(demo.id, 0, text);
                },
                (code) => {
                    if (code === 0 || code === null) resolve(); // null if killed
                    else reject(new Error(`Process exited with code ${code}`));
                }
            );
        });
    }

    async runCustomDemo(code, type, sendDemoStep, waitIfNotPaused, nar) {
        this.currentRunningDemoId = 'custom';

        if (type === 'process') {
             const tempPath = path.join(os.tmpdir(), `senars_custom_${Date.now()}.js`);
             await fs.promises.writeFile(tempPath, code);
             try {
                 await this.runProcessDemo({ path: tempPath, id: 'custom' }, sendDemoStep);
             } finally {
                 fs.unlink(tempPath, () => {});
             }
        } else {
             const steps = this.fsSource.parseSteps(code);
             await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'custom', steps);
        }

        this.currentRunningDemoId = null;
    }

    stopCurrentDemo() {
        this.processRunner.stop();
        this.currentRunningDemoId = null;
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

    async getDemoSource(demoId) {
        const demo = this.fileDemos.get(demoId);
        if (demo) {
            return await this.fsSource.getFileContent(demo.path);
        }
        return '// Source not available for builtin demo';
    }
}
