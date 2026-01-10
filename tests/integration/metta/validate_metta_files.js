#!/usr/bin/env node

/**
 * Quick validation test for MeTTa demo files
 * Checks that demo files exist and can be parsed without running them
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate that demo files exist and have content
const demoFiles = [
    path.join(__dirname, '../../../examples/metta/demos/maze_solver.metta'),
    path.join(__dirname, '../../../examples/metta/demos/adaptive_reasoning.metta'),
    path.join(__dirname, '../../../examples/metta/demos/truth_chain.metta')
];

console.log("Validating MeTTa demo files...\n");

let allValid = true;

for (const fullPath of demoFiles) {
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ File does not exist: ${fullPath}`);
        allValid = false;
        continue;
    }

    try {
        const content = fs.readFileSync(fullPath, 'utf8');

        if (content.trim().length === 0) {
            console.error(`❌ File is empty: ${fullPath}`);
            allValid = false;
            continue;
        }

        console.log(`✅ ${path.basename(fullPath)} - ${content.length} chars, exists and not empty`);

        // Basic syntax check: count parentheses to ensure they're balanced
        let parenCount = 0;
        let inComment = false;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];

            if (char === ';' && (i === 0 || content[i-1] !== '\\')) {
                inComment = true;
            } else if (char === '\n') {
                inComment = false;
            }

            if (!inComment) {
                if (char === '(') parenCount++;
                else if (char === ')') parenCount--;
            }
        }

        if (parenCount !== 0) {
            console.error(`⚠️  ${path.basename(fullPath)} - Unbalanced parentheses: ${parenCount}`);
            allValid = false;  // Mark as invalid
        } else {
            console.log(`   ${path.basename(fullPath)} - Parentheses balanced`);
        }

    } catch (error) {
        console.error(`❌ Error reading ${fullPath}: ${error.message}`);
        allValid = false;
    }
}

// Also validate the stdlib files
console.log("\nValidating stdlib files...\n");

const stdlibFiles = [
    path.join(__dirname, '../../../../core/src/metta/stdlib/search.metta'),
    path.join(__dirname, '../../../../core/src/metta/stdlib/learn.metta')
];

for (const fullPath of stdlibFiles) {
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Stdlib file does not exist: ${fullPath}`);
        allValid = false;
        continue;
    }

    try {
        const content = fs.readFileSync(fullPath, 'utf8');

        if (content.trim().length === 0) {
            console.error(`❌ Stdlib file is empty: ${fullPath}`);
            allValid = false;
            continue;
        }

        console.log(`✅ ${path.basename(fullPath)} - ${content.length} chars, exists and not empty`);

        // Basic syntax check for parentheses balance
        let parenCount = 0;
        let inComment = false;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];

            if (char === ';' && (i === 0 || content[i-1] !== '\\')) {
                inComment = true;
            } else if (char === '\n') {
                inComment = false;
            }

            if (!inComment) {
                if (char === '(') parenCount++;
                else if (char === ')') parenCount--;
            }
        }

        if (parenCount !== 0) {
            console.error(`⚠️  ${path.basename(fullPath)} - Unbalanced parentheses: ${parenCount}`);
            allValid = false;  // Mark as invalid
        } else {
            console.log(`   ${path.basename(fullPath)} - Parentheses balanced`);
        }

    } catch (error) {
        console.error(`❌ Error reading ${fullPath}: ${error.message}`);
        allValid = false;
    }
}

console.log("\n" + (allValid ? "✅ All files validated successfully!" : "❌ Some files failed validation"));
process.exit(allValid ? 0 : 1);