/**
 * DemosManager - handles the demo content and execution logic
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FileSystemDemoSource } from './FileSystemDemoSource.js';
import { ProcessDemoRunner } from './ProcessDemoRunner.js';
import { BuiltinDemos } from './BuiltinDemos.js';

export class DemosManager {
    constructor() {
        this.fsSource = new FileSystemDemoSource();
        this.processRunner = new ProcessDemoRunner();
        this.fileDemos = new Map();
        this.demoConfigs = BuiltinDemos.getConfigs(this);
        this.currentRunningDemoId = null;
    }

    async initialize() {
        const fileDemos = await this.fsSource.getDemos();
        this.fileDemos.clear();
        for (const demo of fileDemos) {
            this.fileDemos.set(demo.id, demo);
        }
    }

    getAvailableDemos() {
        const builtins = this.demoConfigs.map(config => ({
            ...config,
            type: 'builtin'
        }));

        const fileDemos = Array.from(this.fileDemos.values()).map(demo => ({
            id: demo.id,
            name: demo.name,
            description: demo.description,
            stepDelay: 1000,
            handler: (nar, sendDemoStep, waitIfNotPaused, params) =>
                this.runFileDemo(demo.id, nar, sendDemoStep, waitIfNotPaused, params),
            type: demo.type
        }));

        return [...builtins, ...fileDemos];
    }

    async runFileDemo(demoId, nar, sendDemoStep, waitIfNotPaused, params = {}) {
        const demo = this.fileDemos.get(demoId);
        if (!demo) throw new Error(`Demo ${demoId} not found`);

        this.currentRunningDemoId = demoId;

        try {
            if (demo.type === 'process') {
                await this.runProcessDemo(demo, sendDemoStep);
            } else {
                const steps = await this.fsSource.loadDemoSteps(demo.path);
                await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, demoId, steps, params);
            }
        } finally {
            this.currentRunningDemoId = null;
        }
    }

    async runProcessDemo(demo, sendDemoStep) {
        return new Promise((resolve, reject) => {
            this.processRunner.start(demo.path,
                (text, type) => sendDemoStep(demo.id, 0, text),
                (code) => (code === 0 || code === null) ? resolve() : reject(new Error(`Exit code ${code}`))
            );
        });
    }

    async runCustomDemo(code, type, sendDemoStep, waitIfNotPaused, nar) {
        this.currentRunningDemoId = 'custom';
        try {
            if (type === 'process') {
                const tempPath = path.join(os.tmpdir(), `senars_custom_${Date.now()}.js`);
                await fs.promises.writeFile(tempPath, code);
                try { await this.runProcessDemo({ path: tempPath, id: 'custom' }, sendDemoStep); }
                finally { await fs.promises.unlink(tempPath).catch(() => {}); }
            } else {
                await this._executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, 'custom', this.fsSource.parseSteps(code));
            }
        } finally {
            this.currentRunningDemoId = null;
        }
    }

    stopCurrentDemo() {
        this.processRunner.stop();
        this.currentRunningDemoId = null;
    }

    async _executeDemoSteps(nar, sendDemoStep, waitIfNotPaused, demoId, steps, params = {}) {
        const stepDelay = params.stepDelay || 1000;

        for (const [index, step] of steps.entries()) {
            await sendDemoStep(demoId, index + 1, step.description);
            if (step.input && nar) await this._executeInputSafely(nar, demoId, index + 1, step.input, sendDemoStep);
            if (index < steps.length - 1) await waitIfNotPaused(stepDelay);
        }
    }

    async _executeInputSafely(nar, demoId, step, input, sendDemoStep) {
        try { await nar.input(input); }
        catch (error) {
            console.error(`Step ${step} error:`, error);
            sendDemoStep?.(demoId, step, `Error: ${error.message}`);
        }
    }

    async getDemoSource(demoId) {
        const demo = this.fileDemos.get(demoId);
        return demo ? await this.fsSource.getFileContent(demo.path) : '// Source not available for builtin demo';
    }
}
