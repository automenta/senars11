/**
 * @file coverage-helpers.js
 * @description Utilities to help identify coverage gaps and suggest new tests
 */

import fs from 'fs';
import path from 'path';

/**
 * Analyzes the codebase to find files with low or missing test coverage
 * @param {string} srcDir - Source directory to analyze
 * @param {string} testDir - Test directory to analyze
 * @returns {Object} - Analysis results
 */
export function analyzeCoverageGaps(srcDir, testDir) {
    const srcFiles = findFiles(srcDir, '.js');
    const testFiles = findFiles(testDir, '.test.js');

    const gaps = [];

    for (const srcFile of srcFiles) {
        const relativePath = path.relative(srcDir, srcFile);
        const testName = path.basename(srcFile, '.js') + '.test.js';

        // Simple heuristic: check if a test file exists with the same name
        const hasTest = testFiles.some(tf => path.basename(tf) === testName);

        if (!hasTest) {
            gaps.push({
                file: relativePath,
                reason: 'No corresponding test file found',
                priority: 'High'
            });
        }
    }

    return gaps;
}

/**
 * Recursively finds files with a specific extension
 * @param {string} dir - Directory to search
 * @param {string} ext - Extension to match
 * @returns {string[]} - List of file paths
 */
function findFiles(dir, ext) {
    let results = [];
    const list = fs.readdirSync(dir);

    for (const file of list) {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            results = results.concat(findFiles(filePath, ext));
        } else if (filePath.endsWith(ext)) {
            results.push(filePath);
        }
    }

    return results;
}

/**
 * Generates a report of coverage gaps
 */
export function generateCoverageReport() {
    const rootDir = process.cwd();
    const coreSrc = path.join(rootDir, 'core/src');
    const agentSrc = path.join(rootDir, 'agent/src');
    const testsDir = path.join(rootDir, 'tests');

    console.log('Analyzing coverage gaps...');

    const coreGaps = analyzeCoverageGaps(coreSrc, testsDir);
    const agentGaps = analyzeCoverageGaps(agentSrc, testsDir);

    const allGaps = [...coreGaps, ...agentGaps];

    console.log(`Found ${allGaps.length} potential coverage gaps.`);

    if (allGaps.length > 0) {
        console.log('\nTop Gaps (Missing Test Files):');
        allGaps.slice(0, 10).forEach(gap => {
            console.log(`- ${gap.file} (${gap.priority})`);
        });
    }

    return allGaps;
}
