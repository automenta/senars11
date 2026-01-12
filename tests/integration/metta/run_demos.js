#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MeTTaInterpreter } from '@senars/metta/src/MeTTaInterpreter.js';
console.log("PROCESS START - run_demos.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runDemo = async (demoName) => {
    const filePath = path.join(__dirname, '../../..', `examples/metta/demos/${demoName}.metta`);
    console.log(`\n=== Running Demo: ${demoName} ===`);

    try {
        const interpreter = new MeTTaInterpreter();

        console.log(`Space size: ${interpreter.space.size()}`);

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
