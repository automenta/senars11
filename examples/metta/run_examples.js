#!/usr/bin/env node
/**
 * MeTTa Examples Runner
 * Loads and executes all .metta example files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { MeTTaInterpreter } from '../../core/src/metta/MeTTaInterpreter.js';
import { TermFactory } from '../../core/src/term/TermFactory.js';
import { Term } from '../../core/src/metta/kernel/Term.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all .metta files
const findMettaFiles = (dir) => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    return items.flatMap(item => {
        const fullPath = path.join(dir, item.name);
        return item.isDirectory() ? findMettaFiles(fullPath) :
            item.name.endsWith('.metta') ? [fullPath] : [];
    });
};

// Run a single file
const runFile = (filePath) => {
    const relativePath = path.relative(__dirname, filePath);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Running: ${relativePath}`);
    console.log('='.repeat(70));

    // Initialize FRESH interpreter for each file
    Term.clearSymbolTable(); // Reset symbol table if possible/needed (though Term.js usually keeps it)
    const termFactory = new TermFactory();
    const config = {
        loadStdlib: true,
        maxReductionSteps: 100000
    };
    const interpreter = new MeTTaInterpreter(null, {
        termFactory,
        typeChecking: false,
        ...config // Saftey limit
    });

    try {
        const code = fs.readFileSync(filePath, 'utf-8');
        console.log(code);
        console.log('\nResults:');
        console.log('-'.repeat(70));

        // Timeout protection (simple approach only works for infinite loops if they are async or using safe reduction limits)
        // Since interpreter.run is synchronous, we rely on maxReductionSteps.
        // We add start/end logs.

        console.time('Execution Time');
        const results = interpreter.run(code);
        console.timeEnd('Execution Time');

        results.forEach((result, i) => {
            console.log(`${i + 1}. ${result?.toString() ?? 'null'}`);
        });

        return { success: true, file: filePath };
    } catch (error) {
        console.error(`✗ Error: ${error.message}`);
        console.error(error.stack);
        return { success: false, file: filePath, error: error.message };
    }
};

// Main execution
const examplesDir = __dirname;
const files = findMettaFiles(examplesDir);

console.log('MeTTa Examples Runner');
console.log('='.repeat(70));
console.log(`Found ${files.length} example files\n`);

let passed = 0;
let failed = 0;
const failedList = [];

for (const file of files) {
    const result = runFile(file);
    if (result.success) {
        passed++;
    } else {
        failed++;
        failedList.push(result);
    }
}

console.log('\n' + '='.repeat(70));
console.log('Summary');
console.log('='.repeat(70));
console.log(`Total: ${files.length}`);
console.log(`Success: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    console.log('\nFailed files:');
    failedList.forEach(({ file, error }) => {
        console.log(`  - ${path.relative(__dirname, file)}: ${error}`);
    });
}
