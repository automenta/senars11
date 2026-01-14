/**
 * Convert Python MeTTa tests to our test format
 * Usage: node scripts/convert-python-tests.js <python-tests-dir> <output-dir>
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

function extractMeTTaTests(pythonFile) {
    const content = fs.readFileSync(pythonFile, 'utf-8');
    const tests = [];

    // Pattern: metta.run("!(expression)") or similar
    const runPattern = /metta\.run\s*\(\s*["']([^"']+)["']\s*\)/g;
    const assertPattern = /assert.*==\s*["']([^"']+)["']/g;

    let match;
    let lastExpression = null;

    while ((match = runPattern.exec(content)) !== null) {
        lastExpression = match[1];
    }

    // Try to find assertions
    const assertions = [];
    while ((match = assertPattern.exec(content)) !== null) {
        assertions.push(match[1]);
    }

    // If we found expressions and assertions, pair them
    if (lastExpression && assertions.length > 0) {
        assertions.forEach((expected, i) => {
            tests.push({
                expression: lastExpression,
                expected,
                description: `Test from ${path.basename(pythonFile)} (${i + 1})`
            });
        });
    }

    return tests;
}

function convertToMeTTaFormat(tests, outputFile) {
    let output = `; Converted from Python tests\n`;
    output += `; Source: ${path.basename(outputFile, '.metta')}.py\n\n`;

    tests.forEach((test, i) => {
        output += `; Test: ${test.description}\n`;
        output += `${test.expression}\n`;
        output += `; Expected: ${test.expected}\n\n`;
    });

    fs.writeFileSync(outputFile, output);
    console.log(`✅ Converted ${tests.length} tests to ${path.basename(outputFile)}`);
    return tests.length;
}

// Main execution
const pythonTestsDir = process.argv[2];
const outputDir = process.argv[3];

if (!pythonTestsDir || !outputDir) {
    console.log('Usage: node convert-python-tests.js <python-tests-dir> <output-dir>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/convert-python-tests.js \\');
    console.log('    /tmp/hyperon-experimental/python/tests/scripts \\');
    console.log('    tests/integration/metta/hyperon/converted');
    process.exit(1);
}

if (!fs.existsSync(pythonTestsDir)) {
    console.error(`❌ Error: Directory not found: ${pythonTestsDir}`);
    process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
}

console.log('========================================');
console.log('Converting Python Tests to MeTTa Format');
console.log('========================================');
console.log('');
console.log(`📂 Input:  ${pythonTestsDir}`);
console.log(`📂 Output: ${outputDir}`);
console.log('');

// Process all Python test files
const files = fs.readdirSync(pythonTestsDir).filter(f => f.endsWith('.py'));
let totalTests = 0;
let filesConverted = 0;

files.forEach(file => {
    const tests = extractMeTTaTests(path.join(pythonTestsDir, file));
    if (tests.length > 0) {
        const outputFile = path.join(outputDir, file.replace('.py', '.metta'));
        const count = convertToMeTTaFormat(tests, outputFile);
        totalTests += count;
        filesConverted++;
    }
});

console.log('');
console.log('========================================');
console.log('Conversion Complete!');
console.log('========================================');
console.log('');
console.log(`📊 Files converted: ${filesConverted}/${files.length}`);
console.log(`📊 Total tests: ${totalTests}`);
console.log('');
console.log('⚠️  Note: Automatic conversion may not be perfect.');
console.log('   Please review converted files and adjust as needed.');
console.log('');
