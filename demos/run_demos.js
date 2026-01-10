#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MeTTaInterpreter } from '../core/src/metta/MeTTaInterpreter.js';
console.log("PROCESS START - run_demos.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runDemo = async (demoName) => {
    const filePath = path.join(__dirname, `${demoName}.metta`);
    console.log(`\n=== Running Demo: ${demoName} ===`);

    try {
        const interpreter = new MeTTaInterpreter(null, {
            typeChecking: false,
            loadStdlib: false // Manual load
        });

        interpreter.eventBus.on('meTTa', (e) => {
            if (e.type === 'stdlib-loaded') {
                console.log('StdLib Loaded modules:', e.data.loaded.length);
                if (e.data.failed.length) console.log('StdLib Failed:', e.data.failed);
            }
        });

        // Load Stdlib manually
        // const stats = interpreter._loadMeTTaStdlib();
        // if (!stats) console.error("Stdlib load returned null");

        console.log(`Space size: ${interpreter.space.getAtomCount()}`);

        let code = fs.readFileSync(filePath, 'utf-8');

        // Remove import lines
        code = code.replace(/^\s*\(import!.*\)/gm, '; (Implicilty imported)');

        const results = interpreter.run(code);

        console.log('Results:');
        results.forEach((res, i) => console.log(`${i + 1}. ${res}`));
        return true;
    } catch (e) {
        console.error(`FAILED: ${e.message}`);
        console.error(e.stack);
        return false;
    }
};

const demos = ['maze_solver', 'adaptive_reasoning', 'truth_chain'];

(async () => {
    let success = true;
    for (const demo of demos) {
        if (!await runDemo(demo)) success = false;
    }
    if (!success) process.exit(1);
})();
