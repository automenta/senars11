#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MeTTaInterpreter } from '../../metta/src/MeTTaInterpreter.js';
import { TermFactory } from '../../core/src/term/TermFactory.js';
import { Term } from '../../metta/src/kernel/Term.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runFile = (filePath) => {
    // Reset state
    Term.clearSymbolTable();
    const termFactory = new TermFactory();
    const interpreter = new MeTTaInterpreter(null, {
        termFactory,
        typeChecking: false,
        maxReductionSteps: 50000
    });

    try {
        const code = fs.readFileSync(filePath, 'utf-8');
        const results = interpreter.run(code);
        results.forEach((result, i) => {
            console.log(`${i + 1}. ${result?.toString() ?? 'null'}`);
        });
    } catch (error) {
        console.error(`Error executing ${filePath}:`, error);
        process.exit(1);
    }
};

const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: node run_one.js <file>");
    process.exit(1);
}

runFile(path.resolve(filePath));
