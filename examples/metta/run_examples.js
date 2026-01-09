#!/usr/bin/env node
/**
 * MeTTa Examples Runner
 * Loads and executes all .metta example files
 */

import { MeTTaInterpreter } from '../../core/src/metta/MeTTaInterpreter.js';
import { TermFactory } from '../../core/src/term/TermFactory.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize interpreter
const termFactory = new TermFactory();
const interpreter = new MeTTaInterpreter(null, {
    termFactory,
    typeChecking: false
});

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

    try {
        const code = fs.readFileSync(filePath, 'utf-8');
        console.log(code);
        console.log('\nResults:');
        console.log('-'.repeat(70));

        const results = interpreter.run(code);
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

const results = files.map(runFile);

const successCount = results.filter(r => r.success).length;
const failedResults = results.filter(r => !r.success);

console.log('\n' + '='.repeat(70));
console.log('Summary');
console.log('='.repeat(70));
console.log(`Total: ${results.length}`);
console.log(`Success: ${successCount}`);
console.log(`Failed: ${failedResults.length}`);

if (failedResults.length > 0) {
    console.log('\nFailed files:');
    failedResults.forEach(({ file, error }) => {
        console.log(`  - ${path.relative(__dirname, file)}: ${error}`);
    });
}
