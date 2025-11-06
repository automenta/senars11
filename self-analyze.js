#!/usr/bin/env node

import {spawnSync} from 'child_process';
import fs from 'fs';
import path, {basename, dirname} from 'path';
import {DisplayUtils} from './src/tui/DisplayUtils.js';
import * as dfd from 'danfojs';
// Check if this script is being run directly (not imported)
import {fileURLToPath} from 'url';

// For integration with NAR system
let NAR = null;

// Try to import NAR if available (for integration scenarios)
try {
    // This import is optional and only used when integrated with the full system
} catch (e) {
    // NAR not available, which is fine for standalone operation
}

const TOP_N = 20;

// Common utilities
class FileUtils {
    static readonlyExclusions = new Set([
        'src/parser/peggy-parser.js',
        'peggy-parser.js',
        './peggy-parser.js',
        'peggy-parser.js',
        'node_modules/**/*',
        '.git/**/*',
        'dist/**/*',
        'build/**/*',
        '.next/**/*',
        'coverage/**/*',
        'node_modules/*',
        '.git/*',
        'dist/*',
        'build/*',
        '.next/*',
        'coverage/*'
    ]);

    static isExcludedPath(filePath) {
        const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
        return Array.from(this.readonlyExclusions).some(exclusion => {
            if (exclusion.startsWith('**/')) {
                return normalizedPath.includes(exclusion.substring(3));
            } else if (exclusion.endsWith('/*')) {
                const prefix = exclusion.slice(0, -2);
                return normalizedPath.startsWith(prefix) || normalizedPath.includes('/' + prefix);
            } else {
                return normalizedPath.includes(exclusion);
            }
        });
    }

    static readJSONFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content.trim()) {
                console.log(`⚠️ Empty content when parsing JSON from: ${filePath}`);
                return null;
            }
            return JSON.parse(content);
        } catch (error) {
            console.log(`❌ Error parsing JSON from ${filePath}:`, error.message);
            return null;
        }
    }

    static analyzeCoverageByFile(verbose = false) {
        try {
            const coverageDetailPath = './coverage/coverage-final.json';
            if (!fs.existsSync(coverageDetailPath)) return [];

            let coverageDetail;
            try {
                const fileContent = fs.readFileSync(coverageDetailPath, 'utf8');
                if (!fileContent.trim()) {
                    console.log('❌ Coverage file is empty');
                    return [];
                }
                coverageDetail = JSON.parse(fileContent);
            } catch (parseError) {
                console.log('❌ Error parsing coverage-final.json:', parseError.message);
                return [];
            }

            const files = [];
            for (const [filePath, coverage] of Object.entries(coverageDetail)) {
                try {
                    if (!filePath || typeof filePath !== 'string') {
                        continue; // Skip invalid file paths
                    }

                    if (filePath.startsWith('./')) {
                        filePath = path.resolve(filePath);
                    }

                    // Skip excluded files
                    const relativePath = path.relative(process.cwd(), filePath);
                    if (this.isExcludedPath(relativePath)) {
                        continue;
                    }

                    // Validate coverage structure before accessing properties
                    if (!coverage || typeof coverage !== 'object' || !coverage.s) {
                        if (verbose) console.log(`⚠️ Invalid coverage structure for file: ${filePath}`);
                        continue;
                    }

                    const summary = coverage.s;
                    if (typeof summary !== 'object') {
                        continue; // Skip if summary is not an object
                    }

                    const statementKeys = Object.keys(summary);
                    const coveredStatements = statementKeys.filter(key => {
                        const value = summary[key];
                        return typeof value === 'number' && value > 0;
                    }).length;
                    const statementCount = statementKeys.length;

                    const lineCoverage = statementCount > 0 ? (coveredStatements / statementCount) * 100 : 100;

                    let fileSize = 0;
                    try {
                        if (fs.existsSync(filePath)) {
                            fileSize = fs.statSync(filePath).size;
                        }
                    } catch (e) {
                        // If we can't get file size, continue with 0
                    }

                    files.push({
                        filePath: path.relative(process.cwd(), filePath),
                        lineCoverage: parseFloat(lineCoverage.toFixed(2)),
                        statements: statementCount,
                        covered: coveredStatements,
                        uncovered: statementCount - coveredStatements,
                        size: fileSize
                    });
                } catch (fileError) {
                    // Skip this file if there's an error processing it
                    if (verbose) console.log(`⚠️ Error processing coverage for ${filePath}:`, fileError.message);
                    continue;
                }
            }

            files.sort((a, b) => {
                if (a.lineCoverage !== b.lineCoverage) {
                    return a.lineCoverage - b.lineCoverage;
                }
                if (a.size !== b.size) {
                    return b.size - a.size;
                }
                return b.statements - a.statements;
            });

            return files.slice(0, TOP_N);
        } catch (error) {
            console.log('❌ Error in analyzeCoverageByFile:', error.message);
            return [];
        }
    }
}

class CoverageUtils {
    static findCoverageFile() {
        const possiblePaths = [
            './coverage/coverage-summary.json',
            './coverage/coverage-final.json',
            './.nyc_output/coverage-summary.json',
            './.nyc_output/coverage-final.json'
        ];

        for (const path of possiblePaths) {
            if (fs.existsSync(path)) {
                return path;
            }
        }
        return null;
    }

    static async generateCoverage() {
        console.log('📦 Generating coverage data...');

        // Try different methods to generate coverage
        const methods = [
            () => spawnSync('npm', ['test', '--', '--coverage', '--coverageReporters=json-summary', '--coverageReporters=text'], {
                cwd: process.cwd(),
                timeout: 120000,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }),
            () => spawnSync('npx', ['jest', '--coverage', '--coverageReporters=json-summary', '--coverageReporters=text'], {
                cwd: process.cwd(),
                timeout: 120000,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            })
        ];

        for (const method of methods) {
            try {
                const result = method();
                if (result.status === 0 || result.status === 1) { // 1 might mean tests passed with coverage
                    if (this.findCoverageFile()) {
                        console.log('✅ Coverage generated successfully');
                        return true;
                    }
                }
            } catch (error) {
                console.log(`⚠️ Coverage generation method failed: ${error.message}`);
            }
        }

        console.log('❌ Failed to generate coverage data');
        return false;
    }
}

class TestUtils {
    static async runTestsAndGetCoverage() {
        // Try running tests with coverage enabled
        const testResult = spawnSync('npx', ['jest', '--json', '--coverage', '--coverageReporters=json-summary'], {
            cwd: process.cwd(),
            timeout: 180000,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_NO_WARNINGS: '1',
                NODE_OPTIONS: '--experimental-vm-modules'
            }
        });

        if (testResult.error || (testResult.status !== 0 && testResult.status !== 1)) {
            console.log('⚠️ Jest coverage failed, trying fallback methods...');
            return null;
        }

        return testResult;
    }
}

class FileAnalyzer {
    static collectTestFiles() {
        const testFiles = [];
        const searchPaths = ['./tests', './test', './src'];

        const isTestFile = (fileName) => {
            return fileName.endsWith('.test.js') ||
                fileName.endsWith('.spec.js') ||
                fileName.includes('_test.js') ||
                fileName.includes('_spec.js');
        };

        for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
                this._collectTestFilesRecursively(searchPath, testFiles, isTestFile);
            }
        }

        return testFiles;
    }

    static _collectTestFilesRecursively(dir, testFiles, isTestFile) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                this._collectTestFilesRecursively(fullPath, testFiles, isTestFile);
            } else if (item.isFile() && isTestFile(item.name)) {
                const relPath = path.relative('.', fullPath);
                testFiles.push(relPath);
            }
        }
    }

    static readJSONFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content.trim()) {
                console.log(`⚠️ Empty content when parsing JSON from: ${filePath}`);
                return null;
            }
            return JSON.parse(content);
        } catch (error) {
            console.log(`❌ Error parsing JSON from ${filePath}:`, error.message);
            return null;
        }
    }

    static analyzeCoverageByFile(verbose = false) {
        try {
            const coverageDetailPath = './coverage/coverage-final.json';
            if (!fs.existsSync(coverageDetailPath)) return [];

            let coverageDetail;
            try {
                const fileContent = fs.readFileSync(coverageDetailPath, 'utf8');
                if (!fileContent.trim()) {
                    console.log('❌ Coverage file is empty');
                    return [];
                }
                coverageDetail = JSON.parse(fileContent);
            } catch (parseError) {
                console.log('❌ Error parsing coverage-final.json:', parseError.message);
                return [];
            }

            const files = [];
            for (const [filePath, coverage] of Object.entries(coverageDetail)) {
                try {
                    if (!filePath || typeof filePath !== 'string') {
                        continue; // Skip invalid file paths
                    }

                    if (filePath.startsWith('./')) {
                        filePath = path.resolve(filePath);
                    }

                    // Validate coverage structure before accessing properties
                    if (!coverage || typeof coverage !== 'object' || !coverage.s) {
                        if (verbose) console.log(`⚠️ Invalid coverage structure for file: ${filePath}`);
                        continue;
                    }

                    const summary = coverage.s;
                    if (typeof summary !== 'object') {
                        continue; // Skip if summary is not an object
                    }

                    const statementKeys = Object.keys(summary);
                    const coveredStatements = statementKeys.filter(key => {
                        const value = summary[key];
                        return typeof value === 'number' && value > 0;
                    }).length;
                    const statementCount = statementKeys.length;

                    const lineCoverage = statementCount > 0 ? (coveredStatements / statementCount) * 100 : 100;

                    let fileSize = 0;
                    try {
                        if (fs.existsSync(filePath)) {
                            fileSize = fs.statSync(filePath).size;
                        }
                    } catch (e) {
                        // If we can't get file size, continue with 0
                    }

                    files.push({
                        filePath: path.relative(process.cwd(), filePath),
                        lineCoverage: parseFloat(lineCoverage.toFixed(2)),
                        statements: statementCount,
                        covered: coveredStatements,
                        uncovered: statementCount - coveredStatements,
                        size: fileSize
                    });
                } catch (fileError) {
                    // Skip this file if there's an error processing it
                    if (verbose) console.log(`⚠️ Error processing coverage for ${filePath}:`, fileError.message);
                    continue;
                }
            }

            files.sort((a, b) => {
                if (a.lineCoverage !== b.lineCoverage) {
                    return a.lineCoverage - b.lineCoverage;
                }
                if (a.size !== b.size) {
                    return b.size - a.size;
                }
                return b.statements - a.statements;
            });

            return files.slice(0, TOP_N);
        } catch (error) {
            console.log('❌ Error in analyzeCoverageByFile:', error.message);
            return [];
        }
    }
}

// Base analyzer with common functionality
class BaseAnalyzer {
    constructor(options, verbose) {
        this.options = options;
        this.verbose = verbose;
    }

    async safeAnalyze(analysisFunction, errorMessage) {
        try {
            return await analysisFunction();
        } catch (error) {
            if (this.verbose) console.log(`❌ ${errorMessage}: ${error.message}`);
            return {
                status: 'error',
                error: `${errorMessage}: ${error.message}`,
                timestamp: Date.now()
            };
        }
    }

    log(message, level = 'info', meta = {}) {
        if (!this.verbose) return;

        const timestamp = new Date().toISOString();
        const levelEmojis = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
            debug: '🔍',
            success: '✅'
        };

        const emoji = levelEmojis[level] || 'ℹ️';
        const fullMessage = `${emoji} [${timestamp}] ${message}`;

        if (Object.keys(meta).length > 0) {
            console.log(fullMessage, meta);
        } else {
            console.log(fullMessage);
        }
    }

    logError(message, error = null) {
        const errorInfo = error ? {
            message: error.message,
            stack: this.options?.debug ? error.stack : undefined
        } : null;

        this.log(message, 'error', errorInfo);
    }
}

class TestAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Unit Test Results...');

        return await this.safeAnalyze(async () => {
            // Try to run tests with coverage
            const testResult = await TestUtils.runTestsAndGetCoverage();

            if (testResult && (testResult.status === 0 || testResult.status === 1)) {
                const output = testResult.stdout || testResult.stderr;
                if (output) {
                    const parsedResult = this.parseTestOutput(output);

                    if (parsedResult && parsedResult.testResults) {
                        const individualTestResults = this.extractIndividualTestResults(parsedResult.testResults);
                        return this._buildTestResult(testResult, parsedResult, individualTestResults);
                    }
                }
            }

            // Fallback: try running tests without coverage
            return await this._runFallbackTest();
        }, 'Test collection failed');
    }

    _buildTestResult(testResult, parsedResult, individualTestResults) {
        return {
            status: testResult.status === 0 ? 'success' : 'partial',
            totalTests: parsedResult.numTotalTests || 0,
            passedTests: parsedResult.numPassedTests || 0,
            failedTests: parsedResult.numFailedTests || 0,
            skippedTests: parsedResult.numPendingTests || 0,
            todoTests: parsedResult.numTodoTests || 0,
            testSuites: parsedResult.numTotalTestSuites || 0,
            totalSuites: parsedResult.numTotalTestSuites || 0,
            passedSuites: parsedResult.numPassedTestSuites || 0,
            failedSuites: parsedResult.numFailedTestSuites || 0,
            testDuration: parsedResult.endTime ? (parsedResult.endTime - parsedResult.startTime) : 'unknown',
            individualTestResults,
            slowestTests: this.getSlowestTests(individualTestResults),
            testFiles: FileAnalyzer.collectTestFiles(),
            failureAnalysis: this._analyzeFailures(individualTestResults)
        };
    }

    _analyzeFailures(individualTestResults) {
        const failedTests = individualTestResults.filter(test => test.status === 'failed');
        const analysis = {
            totalFailed: failedTests.length,
            failurePatterns: [],
            likelyCauses: [],
            fileConnections: {}
        };

        if (failedTests.length === 0) {
            return analysis;
        }

        // Analyze failure patterns
        const patterns = {};
        for (const test of failedTests) {
            // Extract failure pattern from error message
            for (const message of test.failureMessages) {
                // Look for common failure patterns
                if (message.includes('timeout')) {
                    patterns.timeout = (patterns.timeout || 0) + 1;
                } else if (message.includes('undefined') || message.includes('null')) {
                    patterns.nullReference = (patterns.nullReference || 0) + 1;
                } else if (message.includes('not found') || message.includes('404')) {
                    patterns.notFound = (patterns.notFound || 0) + 1;
                } else if (message.includes('expected') && message.includes('received')) {
                    patterns.assertion = (patterns.assertion || 0) + 1;
                } else if (message.includes('Cannot read property') || message.includes('TypeError')) {
                    patterns.typeError = (patterns.typeError || 0) + 1;
                }
            }

            // Connect to implementation files based on test names
            const testFileName = test.suite;
            const connectedFiles = this._findConnectedFiles(testFileName);

            analysis.fileConnections[test.name] = connectedFiles;
        }

        analysis.failurePatterns = Object.entries(patterns).map(([pattern, count]) => ({
            type: pattern,
            count,
            percentage: parseFloat(((count / failedTests.length) * 100).toFixed(2))
        }));

        // Diagnose likely causes based on coverage data
        analysis.likelyCauses = this._diagnoseFailureCauses(failedTests, analysis.fileConnections);

        return analysis;
    }

    _findConnectedFiles(testSuiteName) {
        // Extract potential implementation file names from test name
        const possibleNames = [];
        const testBasename = path.basename(testSuiteName, path.extname(testSuiteName));

        // Common test naming patterns
        if (testBasename.endsWith('.test') || testBasename.endsWith('.spec')) {
            const implName = testBasename.replace(/\.test$/, '').replace(/\.spec$/, '');
            possibleNames.push(implName + '.js');
        }

        // If test name contains implementation name
        possibleNames.push(testBasename + '.js');

        // Search for related files in src directory
        const connectedFiles = [];
        const srcDir = './src';

        if (fs.existsSync(srcDir)) {
            this._searchConnectedFiles(srcDir, possibleNames, connectedFiles);
        }

        return connectedFiles;
    }

    _searchConnectedFiles(dir, possibleNames, results) {
        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                this._searchConnectedFiles(fullPath, possibleNames, results);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                for (const name of possibleNames) {
                    if (item.name === name || path.basename(item.name, '.js') === path.basename(name, '.js')) {
                        results.push(path.relative('.', fullPath));
                        break;
                    }
                }
            }
        }
    }

    _diagnoseFailureCauses(failedTests, fileConnections) {
        const causes = [];

        // If we have coverage data, check for low coverage in connected files
        try {
            if (fs.existsSync('./coverage/coverage-final.json')) {
                const coverageDetail = JSON.parse(fs.readFileSync('./coverage/coverage-final.json', 'utf8'));

                for (const [testName, connectedFiles] of Object.entries(fileConnections)) {
                    for (const file of connectedFiles) {
                        const coveragePath = path.resolve(file);
                        if (coverageDetail[coveragePath]) {
                            const statements = coverageDetail[coveragePath].s;
                            const covered = Object.values(statements).filter(count => count > 0).length;
                            const total = Object.keys(statements).length;
                            const coveragePercent = total > 0 ? (covered / total) * 100 : 100;

                            if (coveragePercent < 50) {
                                causes.push({
                                    type: 'low-coverage',
                                    description: `Test '${testName}' is connected to low-coverage file '${file}' (${coveragePercent.toFixed(2)}% coverage)`,
                                    file,
                                    coverage: coveragePercent,
                                    severity: 'high'
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // If coverage analysis fails, continue without it
        }

        // Add general failure patterns as potential causes
        const allFailureMessages = failedTests.flatMap(t => t.failureMessages);
        for (const message of allFailureMessages) {
            if (message.includes('timeout')) {
                causes.push({
                    type: 'timeout',
                    description: 'Tests are timing out, possibly due to slow operations or infinite loops',
                    severity: 'high'
                });
            } else if (message.includes('undefined') || message.includes('null')) {
                causes.push({
                    type: 'null-reference',
                    description: 'Tests are failing due to null/undefined references',
                    severity: 'medium'
                });
            } else if (message.includes('not found')) {
                causes.push({
                    type: 'missing-dependency',
                    description: 'Tests are failing due to missing dependencies or resources',
                    severity: 'high'
                });
            }
        }

        return causes;
    }

    async _runFallbackTest() {
        // Try to run the direct jest command first (similar to what the main method does)
        const jestResult = spawnSync('npx', ['jest', '--json'], {
            cwd: process.cwd(),
            timeout: 180000,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                NODE_NO_WARNINGS: '1',
                NODE_OPTIONS: '--experimental-vm-modules'
            }
        });

        if (jestResult.status === 0 || jestResult.status === 1) { // 1 might mean tests ran but had failures
            const output = jestResult.stdout;
            if (output) {
                try {
                    const parsedResult = JSON.parse(output.trim());
                    if (parsedResult.testResults) {
                        const individualTestResults = this.extractIndividualTestResults(parsedResult.testResults);
                        return this._buildTestResult(jestResult, parsedResult, individualTestResults);
                    }
                } catch (parseError) {
                    this.log('⚠️ Jest direct command JSON parsing failed:', 'warn', {error: parseError.message});
                }
            }
        }

        // If the direct jest command didn't work, try npm test but clean the output
        const altTestResult = spawnSync('npm', ['test', '--silent', '--', '--json'], {
            cwd: process.cwd(),
            timeout: 120000,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (altTestResult.error) {
            this.log('❌ NPM test command execution failed:', 'error', {error: altTestResult.error.message});
            return this.createEmptyTestResult('NPM test command execution error');
        }

        if (altTestResult.status === 0 || altTestResult.status === 1) {
            let output = altTestResult.stdout || altTestResult.stderr;
            if (!output) {
                this.log('❌ No output from NPM test command', 'error');
                return this.createEmptyTestResult('No output from NPM test');
            }

            try {
                // Try to extract JSON from mixed output by finding the JSON part
                // Look for the opening brace and match the closing brace
                const jsonMatch = output.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonStr = jsonMatch[0];
                    const fallbackParsed = JSON.parse(jsonStr);
                    if (fallbackParsed.testResults) {
                        const individualTestResults = this.extractIndividualTestResults(fallbackParsed.testResults);
                        return this._buildTestResult(altTestResult, fallbackParsed, individualTestResults);
                    }
                } else {
                    // If we can't find JSON in the output, try parsing the whole thing (fallback)
                    const fallbackParsed = JSON.parse(output.trim());
                    if (fallbackParsed.testResults) {
                        const individualTestResults = this.extractIndividualTestResults(fallbackParsed.testResults);
                        return this._buildTestResult(altTestResult, fallbackParsed, individualTestResults);
                    }
                }
            } catch (parseError) {
                this.log('❌ Fallback test result parsing failed:', 'error', {error: parseError.message});
                // Log the actual output for debugging purposes
                this.log('🔍 Actual output that failed to parse:', 'debug', {output: output.substring(0, 200) + '...'});
            }
        }

        return this.createEmptyTestResult('Unable to parse test results');
    }

    createEmptyTestResult(errorMsg) {
        return {
            status: 'error',
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            testSuites: 0,
            testFiles: FileAnalyzer.collectTestFiles(),
            error: errorMsg
        };
    }

    parseTestOutput(output) {
        try {
            return JSON.parse(output.trim());
        } catch (e) {
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }
    }

    extractIndividualTestResults(testResultsArray) {
        const individualResults = [];
        if (!testResultsArray) return individualResults;

        for (const testSuite of testResultsArray) {
            const suiteName = testSuite.name || testSuite.testFilePath;
            // Determine the directory from suite name
            const testDirectory = path.dirname(suiteName);

            if (testSuite.assertionResults) {
                for (const testResult of testSuite.assertionResults) {
                    individualResults.push({
                        name: testResult.title,
                        status: testResult.status,
                        duration: testResult.duration || 0,
                        suite: suiteName,
                        directory: testDirectory,  // Add directory information
                        ancestorTitles: testResult.ancestorTitles || [],
                        failureMessages: testResult.failureMessages || [],
                        location: testResult.location || null,
                        fullName: (testResult.ancestorTitles ? testResult.ancestorTitles.join(' > ') + ' > ' : '') + testResult.title,
                        invocations: testResult.invocations || 1,
                        numPassingAsserts: testResult.numPassingAsserts || 0,
                        retryReasons: testResult.retryReasons || []
                    });
                }
            }
        }
        return individualResults;
    }

    getSlowestTests(individualTestResults) {
        if (!individualTestResults || individualTestResults.length === 0) return [];

        try {
            // Use danfojs for test analysis
            const testDf = new dfd.DataFrame(individualTestResults);

            // Filter tests with duration > 0
            const durationValues = testDf['duration'].values;
            const validIndices = [];
            for (let i = 0; i < durationValues.length; i++) {
                if (durationValues[i] > 0) {
                    validIndices.push(i);
                }
            }

            if (validIndices.length > 0) {
                // Create array of valid tests with indices for danfojs operations
                const validTests = validIndices.map(i => individualTestResults[i]);

                // Sort by duration manually since danfojs doesn't have direct sort
                const sortedValidTests = [...validTests].sort((a, b) => b.duration - a.duration);

                // Get top N slowest tests
                const slowestTests = sortedValidTests.slice(0, TOP_N).map(test => ({
                    name: test.name,
                    duration: test.duration,
                    suite: test.suite,
                    directory: test.directory,
                    status: test.status
                }));

                // Group by directory and sort within each group
                const testsByDirectory = {};
                for (const test of validTests) {
                    if (!testsByDirectory[test.directory]) {
                        testsByDirectory[test.directory] = [];
                    }
                    testsByDirectory[test.directory].push(test);
                }

                // Sort each directory's tests by duration and take top 3
                for (const [dir, tests] of Object.entries(testsByDirectory)) {
                    testsByDirectory[dir] = tests.sort((a, b) => b.duration - a.duration).slice(0, 3)
                        .map(test => ({
                            name: test.name,
                            duration: test.duration,
                            suite: test.suite,
                            directory: test.directory,
                            status: test.status
                        }));
                }

                return {
                    all: slowestTests,
                    byDirectory: testsByDirectory
                };
            }

            return {
                all: slowestTests,
                byDirectory: testsByDirectory
            };
        } catch (error) {
            this.log(`⚠️ Error processing tests with danfojs: ${error.message}`, 'warn');
            // Fallback to original implementation
            const sortedTests = [...individualTestResults]
                .filter(test => test.duration && test.duration > 0)
                .sort((a, b) => b.duration - a.duration);

            // Calculate slowest tests by directory
            const testsByDirectory = {};
            for (const test of individualTestResults) {
                if (test.duration > 0) {
                    if (!testsByDirectory[test.directory]) {
                        testsByDirectory[test.directory] = [];
                    }
                    testsByDirectory[test.directory].push(test);
                }
            }

            const slowestTestsByDir = {};
            for (const [dir, tests] of Object.entries(testsByDirectory)) {
                const sortedDirTests = tests.sort((a, b) => b.duration - a.duration);
                slowestTestsByDir[dir] = sortedDirTests.slice(0, 3); // Top 3 slowest per directory
            }

            return {
                all: sortedTests.slice(0, TOP_N).map(test => ({
                    name: test.name,
                    duration: test.duration,
                    suite: test.suite,
                    directory: test.directory,
                    status: test.status
                })),
                byDirectory: slowestTestsByDir
            };
        }
    }
}

class CoverageAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Coverage Data...');

        // First, try to find existing coverage data
        let coverageFile = CoverageUtils.findCoverageFile();

        if (!coverageFile) {
            this.log('No existing coverage data found, generating...');
            const generated = await CoverageUtils.generateCoverage();
            if (!generated) {
                this.log('❌ Failed to generate coverage data', 'error');
                return {available: false, error: 'Could not generate coverage data'};
            }

            coverageFile = CoverageUtils.findCoverageFile();
            if (!coverageFile) {
                this.log('❌ Coverage file not found after generation', 'error');
                return {available: false, error: 'Coverage file not found after generation'};
            }
        }

        // Load coverage summary
        const summaryPath = './coverage/coverage-summary.json';
        if (!fs.existsSync(summaryPath)) {
            this.log('❌ Coverage summary file not found', 'error');
            return {available: false, error: 'Coverage summary file not found'};
        }

        const coverageSummary = FileAnalyzer.readJSONFile(summaryPath);
        if (!coverageSummary || !coverageSummary.total) {
            this.log('❌ Invalid coverage summary format', 'error');
            return {available: false, error: 'Invalid coverage summary format'};
        }

        const summary = coverageSummary.total;
        const coverageStats = {
            statements: summary.statements.pct,
            branches: summary.branches.pct,
            functions: summary.functions.pct,
            lines: summary.lines.pct,
            total: {
                statements: summary.statements.total,
                branches: summary.branches.total,
                functions: summary.functions.total,
                lines: summary.lines.total
            },
            covered: {
                statements: summary.statements.covered,
                branches: summary.branches.covered,
                functions: summary.functions.covered,
                lines: summary.lines.covered
            }
        };

        coverageStats.fileAnalysis = FileAnalyzer.analyzeCoverageByFile(this.verbose);

        // Additional detailed analysis
        coverageStats.detailedAnalysis = this._analyzeDetailedCoverage();

        return coverageStats;
    }

    _analyzeDetailedCoverage() {
        const finalCoveragePath = './coverage/coverage-final.json';
        if (!fs.existsSync(finalCoveragePath)) {
            return {
                lowCoverageFiles: [],
                coverageByDirectory: {},
                uncoveredBlocks: []
            };
        }

        const coverageData = FileAnalyzer.readJSONFile(finalCoveragePath);
        if (!coverageData) {
            return {
                lowCoverageFiles: [],
                coverageByDirectory: {},
                uncoveredBlocks: []
            };
        }

        const detailedAnalysis = {
            lowCoverageFiles: [],
            coverageByDirectory: {},
            uncoveredBlocks: []
        };

        // Collect file-level data for DataFrame processing
        const fileCoverageData = [];

        // Analyze each file in detail
        for (const [filePath, fileCoverage] of Object.entries(coverageData)) {
            if (filePath === 'total') continue; // Skip summary entry

            const relativePath = path.relative(process.cwd(), filePath);
            const directory = path.dirname(relativePath);

            // Initialize directory stats
            if (!detailedAnalysis.coverageByDirectory[directory]) {
                detailedAnalysis.coverageByDirectory[directory] = {
                    files: 0,
                    statements: 0,
                    covered: 0,
                    coveragePercent: 0
                };
            }

            // Calculate file coverage
            if (fileCoverage && fileCoverage.s) {
                const statements = fileCoverage.s;
                const covered = Object.values(statements).filter(count => count > 0).length;
                const total = Object.keys(statements).length;
                const fileCoveragePercent = total > 0 ? (covered / total) * 100 : 100;

                // Add to low coverage files if below threshold
                if (fileCoveragePercent < 50) {
                    detailedAnalysis.lowCoverageFiles.push({
                        filePath: relativePath,
                        coverage: parseFloat(fileCoveragePercent.toFixed(2)),
                        statements: total,
                        covered: covered
                    });
                }

                // Store for DataFrame processing
                fileCoverageData.push({
                    filePath: relativePath,
                    directory: directory,
                    coverage: fileCoveragePercent,
                    statements: total,
                    covered: covered,
                    uncovered: total - covered
                });

                // Update directory stats
                detailedAnalysis.coverageByDirectory[directory].files++;
                detailedAnalysis.coverageByDirectory[directory].statements += total;
                detailedAnalysis.coverageByDirectory[directory].covered += covered;
            }
        }

        // Calculate directory coverage percentages
        for (const [dir, stats] of Object.entries(detailedAnalysis.coverageByDirectory)) {
            stats.coveragePercent = stats.statements > 0 ? (stats.covered / stats.statements) * 100 : 100;
        }

        // Use danfojs for advanced analysis
        try {
            if (fileCoverageData.length > 0) {
                const coverageDf = new dfd.DataFrame(fileCoverageData);

                // Filter low coverage files using danfojs
                const coverageSeries = coverageDf['coverage'];
                const lowCoverageIndices = [];
                for (let i = 0; i < coverageSeries.values.length; i++) {
                    if (coverageSeries.values[i] < 50) {
                        lowCoverageIndices.push(i);
                    }
                }

                if (lowCoverageIndices.length > 0) {
                    const lowCoverageDf = coverageDf.iloc({rows: lowCoverageIndices});

                    // danfojs may not support sort_values directly, use JavaScript sort for compatibility
                    // Extract the rows and sort them manually
                    const filteredData = lowCoverageDf.values.map((row, idx) => ({
                        filePath: lowCoverageDf.columns.includes('filePath') ? row[lowCoverageDf.columns.indexOf('filePath')] : fileCoverageData[lowCoverageIndices[idx]].filePath,
                        coverage: lowCoverageDf.columns.includes('coverage') ? row[lowCoverageDf.columns.indexOf('coverage')] : fileCoverageData[lowCoverageIndices[idx]].coverage,
                        statements: lowCoverageDf.columns.includes('statements') ? row[lowCoverageDf.columns.indexOf('statements')] : fileCoverageData[lowCoverageIndices[idx]].statements,
                        covered: lowCoverageDf.columns.includes('covered') ? row[lowCoverageDf.columns.indexOf('covered')] : fileCoverageData[lowCoverageIndices[idx]].covered
                    })).sort((a, b) => a.coverage - b.coverage);

                    detailedAnalysis.lowCoverageFiles = filteredData.map(item => ({
                        filePath: item.filePath,
                        coverage: parseFloat(item.coverage.toFixed(2)),
                        statements: item.statements,
                        covered: item.covered
                    }));
                }
            }
        } catch (error) {
            this.log(`⚠️ Error processing coverage with danfojs: ${error.message}`, 'warn');
            // Fallback to original sorting
            detailedAnalysis.lowCoverageFiles.sort((a, b) => a.coverage - b.coverage);
        }

        // Use danfojs for directory analysis as well
        try {
            const dirData = Object.entries(detailedAnalysis.coverageByDirectory)
                .map(([dir, stats]) => ({directory: dir, ...stats}));

            if (dirData.length > 0) {
                // danfojs may not support sort_values directly, use JavaScript sort for compatibility
                detailedAnalysis.directoriesSorted = dirData.sort((a, b) => a.coveragePercent - b.coveragePercent);
            }
        } catch (error) {
            this.log(`⚠️ Error processing directory data with danfojs: ${error.message}`, 'warn');
            // Fallback to original sorting
            detailedAnalysis.directoriesSorted = Object.entries(detailedAnalysis.coverageByDirectory)
                .map(([dir, stats]) => ({directory: dir, ...stats}))
                .sort((a, b) => a.coveragePercent - b.coveragePercent);
        }

        return detailedAnalysis;
    }
}

class ProjectAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Project Information...');

        return await this.safeAnalyze(async () => {
            if (!fs.existsSync('./package.json')) {
                this.log('package.json not found', 'error');
                return {error: 'package.json not found'};
            }

            const packageJson = FileAnalyzer.readJSONFile('./package.json');
            if (!packageJson) {
                return {error: 'Could not parse package.json'};
            }

            return {
                name: packageJson.name,
                version: packageJson.version,
                description: packageJson.description,
                dependencies: Object.keys(packageJson.dependencies || {}).length,
                devDependencies: Object.keys(packageJson.devDependencies || {}).length,
                scripts: Object.keys(packageJson.scripts || {}).length
            };
        }, 'Project info collection failed');
    }
}

class StaticAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Static Analysis...');

        return await this.safeAnalyze(async () => {
            const directoriesToAnalyze = ['./src', './ui', './tests', './scripts'];

            const stats = {
                jsFiles: 0,
                totalLines: 0,
                directories: 0,
                filesByType: {},
                fileDetails: [],
                directoryStats: {},
                largestFiles: [],
                complexityMetrics: {},
                dependencyInfo: {},
                riskMetrics: {}
            };

            // Analyze multiple directories with timeout protection
            const analysisTimeout = 30000; // 30 seconds timeout
            const startTime = Date.now();

            for (const dirPath of directoriesToAnalyze) {
                if (Date.now() - startTime > analysisTimeout) {
                    this.log('Static analysis timeout reached, stopping...', 'warn');
                    break;
                }

                if (fs.existsSync(dirPath)) {
                    this.log(`Analyzing directory: ${dirPath}`);
                    this._traverseDirectory(dirPath, stats, 0, 8); // Start at depth 0, max 8 levels
                } else {
                    this.log(`Directory ${dirPath} not found, skipping...`, 'warn');
                }
            }

            // Process file details if we have any data
            if (stats.fileDetails.length > 0) {
                // Sort file details by lines for largest files
                stats.fileDetails.sort((a, b) => b.lines - a.lines);
                stats.largestFiles = stats.fileDetails.slice(0, TOP_N);

                this._calculateSummaryStats(stats);
                this._calculateRiskMetrics(stats);
            }

            return stats;
        }, 'Static analysis failed');
    }

    _calculateRiskMetrics(stats) {
        // Calculate risk metrics based on complexity, size, and other factors
        stats.riskMetrics = {
            highRiskFiles: [],
            mediumRiskFiles: [],
            complexityRisk: 0,
            sizeRisk: 0,
            changeRisk: 0,
            overallRiskScore: 0
        };

        for (const file of stats.fileDetails) {
            let fileRisk = 0;
            const complexity = file.complexity.cyclomatic;
            const lines = file.lines;

            // Complexity risk: high cyclomatic complexity indicates decision-heavy code
            if (complexity > 10) {
                fileRisk += complexity * 0.5; // Weight complexity heavily
                stats.riskMetrics.complexityRisk += complexity * 0.5;
            }

            // Size risk: very large files are harder to maintain
            if (lines > 200) {
                fileRisk += Math.max(0, lines - 200) * 0.1;
                stats.riskMetrics.sizeRisk += Math.max(0, lines - 200) * 0.1;
            }

            // Function count risk: too many functions in one file
            if (file.complexity.functionCount > 10) {
                fileRisk += (file.complexity.functionCount - 10) * 0.5;
            }

            // Class count risk: too many classes in one file
            if (file.complexity.classCount > 3) {
                fileRisk += (file.complexity.classCount - 3) * 2;
            }

            file.riskScore = fileRisk;
            stats.riskMetrics.overallRiskScore += fileRisk;

            // Categorize files by risk level
            if (fileRisk > 20) {
                stats.riskMetrics.highRiskFiles.push(file);
            } else if (fileRisk > 10) {
                stats.riskMetrics.mediumRiskFiles.push(file);
            }
        }

        // Sort high and medium risk files by risk score
        stats.riskMetrics.highRiskFiles.sort((a, b) => b.riskScore - a.riskScore);
        stats.riskMetrics.mediumRiskFiles.sort((a, b) => b.riskScore - a.riskScore);

        // Calculate average risk
        if (stats.fileDetails.length > 0) {
            stats.riskMetrics.avgRiskScore = stats.riskMetrics.overallRiskScore / stats.fileDetails.length;
        }

        // Identify change risk: files with high complexity and many functions may be risky to modify
        stats.riskMetrics.changeRisk = stats.riskMetrics.complexityRisk * 0.6 + stats.riskMetrics.sizeRisk * 0.4;
    }

    _traverseDirectory(dir, stats, currentDepth = 0, maxDepth = 8) {
        if (!fs.existsSync(dir)) {
            this.log(`Directory does not exist: ${dir}`, 'error');
            return;
        }

        // Prevent excessive recursion
        if (currentDepth > maxDepth) {
            this.log(`Maximum depth (${maxDepth}) reached, skipping: ${dir}`, 'warn');
            return;
        }

        let items;
        try {
            items = fs.readdirSync(dir, {withFileTypes: true});
        } catch (readError) {
            this.log(`Cannot read directory: ${dir}`, 'error', {error: readError.message});
            return;
        }

        // Initialize directory stats for this directory
        const relativeDir = path.relative('.', dir);
        if (!stats.directoryStats[relativeDir]) {
            stats.directoryStats[relativeDir] = {
                path: relativeDir,
                files: 0,
                lines: 0,
                size: 0,
                jsFiles: 0,
                complexity: 0,
                subdirectories: 0,
                parentDirectory: path.dirname(relativeDir) !== '.' ? path.dirname(relativeDir) : null, // Store parent directory
                subdirectories: [], // List of subdirectories
                depth: Math.min(relativeDir.split(path.sep).length || 1, maxDepth) // Depth of directory
            };
        }

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                // Skip node_modules, .git, build directories to avoid performance issues
                if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' ||
                    item.name === 'build' || item.name === '.next' || item.name === 'coverage' ||
                    item.name.startsWith('.')) {
                    continue;
                }

                stats.directories++;
                const subDirPath = path.relative('.', fullPath);
                // Add subdirectory to parent's subdirectory list
                stats.directoryStats[relativeDir].subdirectories.push(subDirPath);
                this._traverseDirectory(fullPath, stats, currentDepth + 1, maxDepth);
            } else if (item.isFile()) {
                this._processFile(item, fullPath, stats, relativeDir);
            }
        }
    }

    _processFile(item, fullPath, stats, parentDir) {
        const ext = path.extname(item.name).substring(1) || 'no_ext';
        stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1;

        const relativePath = path.relative('.', fullPath);

        // Skip excluded files using global exclusion
        if (FileUtils.isExcludedPath(relativePath)) {
            this.log(`Excluding file from analysis: ${relativePath}`, 'warn');
            return;
        }

        if (item.name.endsWith('.js')) {
            stats.jsFiles++;
            const content = this._readFileContent(fullPath);
            if (content) {
                const lines = content.split('\n').length;
                stats.totalLines += lines;

                const imports = this.extractImports(content);
                const complexity = this.calculateComplexityMetrics(content);

                stats.fileDetails.push({
                    path: path.relative('.', fullPath),
                    directory: parentDir,
                    lines,
                    size: content.length,
                    imports,
                    complexity
                });

                // Update directory stats
                if (!stats.directoryStats[parentDir]) {
                    stats.directoryStats[parentDir] = {
                        path: parentDir,
                        files: 0,
                        lines: 0,
                        size: 0,
                        jsFiles: 0,
                        complexity: 0,
                        subdirectories: 0,
                        directories: [],
                        depth: parentDir.split(path.sep).length
                    };
                }

                stats.directoryStats[parentDir].files++;
                stats.directoryStats[parentDir].lines += lines;
                stats.directoryStats[parentDir].size += content.length;
                stats.directoryStats[parentDir].jsFiles++;
                stats.directoryStats[parentDir].complexity += complexity.cyclomatic;
            }
        } else {
            // Handle non-js files too
            const content = this._readFileContent(fullPath);
            if (content) {
                // Update directory stats for any file type
                if (!stats.directoryStats[parentDir]) {
                    stats.directoryStats[parentDir] = {
                        path: parentDir,
                        files: 0,
                        lines: 0,
                        size: 0,
                        jsFiles: 0,
                        complexity: 0,
                        subdirectories: 0,
                        directories: [],
                        depth: parentDir.split(path.sep).length
                    };
                }

                stats.directoryStats[parentDir].files++;
                stats.directoryStats[parentDir].size += content.length;
                // Count lines for any file type
                stats.directoryStats[parentDir].lines += content.split('\n').length;
            }
        }
    }

    extractImports(content) {
        const imports = [];
        const importRegex = /(import\s+|from\s+|require\(\s*)["'](.*?\.(js|ts))["']/gi;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            const imp = match[2];
            if (imp && !imp.startsWith('.') && !imp.startsWith('/')) {
                imports.push(imp);
            }
        }

        const relativeImportRegex = /(import\s+|from\s+|require\(\s*)["'](\.{1,2}\/.*?\.(js|ts))["']/gi;
        while ((match = relativeImportRegex.exec(content)) !== null) {
            imports.push(match[2]);
        }

        return [...new Set(imports)];
    }

    calculateComplexityMetrics(content) {
        const lines = content.split('\n');

        let functionCount = 0;
        let classCount = 0;
        let conditionalCount = 0;
        let cyclomatic = 1;

        for (const line of lines) {
            const trimmed = line.trim();

            const hasFunction = trimmed.startsWith('function ') ||
                trimmed.includes('function(') ||
                trimmed.includes('=>') ||
                trimmed.includes('function*');
            if (hasFunction) functionCount++;

            if (trimmed.includes('class ')) classCount++;

            const conditions = ['if (', 'else if', 'for (', 'while (', 'do {', 'switch (', 'try ', 'catch ('];
            for (const condition of conditions) {
                if (trimmed.includes(condition)) {
                    conditionalCount++;
                    cyclomatic++;
                }
            }

            if (trimmed.includes(' && ') || trimmed.includes(' || ')) cyclomatic++;
        }

        return {
            lines: lines.length,
            functionCount,
            classCount,
            conditionalCount,
            cyclomatic
        };
    }

    _readFileContent(fullPath) {
        try {
            return fs.readFileSync(fullPath, 'utf8');
        } catch (readError) {
            this.log(`Cannot read file: ${fullPath}`, 'warn', {error: readError.message});
            return null;
        }
    }

    _calculateSummaryStats(stats) {
        // Calculate statistical metrics
        stats.avgLinesPerFile = stats.fileDetails.length > 0
            ? Math.round(stats.totalLines / stats.fileDetails.length)
            : 0;

        const lineCounts = stats.fileDetails.map(f => f.lines);
        if (lineCounts.length > 0) {
            // Calculate median manually
            const sortedLines = [...lineCounts].sort((a, b) => a - b);
            const mid = Math.floor(sortedLines.length / 2);
            stats.medianLinesPerFile = sortedLines.length % 2 !== 0
                ? sortedLines[mid]
                : (sortedLines[mid - 1] + sortedLines[mid]) / 2;

            // Find largest and smallest files
            const maxLinesIdx = lineCounts.indexOf(Math.max(...lineCounts));
            const minLinesIdx = lineCounts.indexOf(Math.min(...lineCounts));
            stats.largestFile = stats.fileDetails[maxLinesIdx];
            stats.smallestFile = stats.fileDetails[minLinesIdx];

            // Calculate average complexity
            const complexityValues = stats.fileDetails.map(f => f.complexity.cyclomatic);
            if (complexityValues.length > 0) {
                stats.avgComplexity = complexityValues.reduce((sum, val) => sum + val, 0) / complexityValues.length;
            }
        }

        // Calculate directory averages and detailed stats
        const directoryEntries = Object.entries(stats.directoryStats);
        if (directoryEntries.length > 0) {
            // Calculate directory metrics
            const dirLines = directoryEntries.map(([, dirStats]) => dirStats.lines);
            const dirFiles = directoryEntries.map(([, dirStats]) => dirStats.files);

            stats.directoryAvgLines = dirLines.reduce((sum, val) => sum + val, 0) / dirLines.length;
            stats.directoryAvgFiles = dirFiles.reduce((sum, val) => sum + val, 0) / dirFiles.length;

            // Find largest directory by lines
            const maxLinesDirIdx = dirLines.indexOf(Math.max(...dirLines));
            stats.largestDirectory = directoryEntries[maxLinesDirIdx][1];

            // Find directory with most files
            const maxFilesDirIdx = dirFiles.indexOf(Math.max(...dirFiles));
            stats.mostFilesDirectory = directoryEntries[maxFilesDirIdx][1];

            // Create arrays for detailed directory analysis
            stats.largestDirectories = Object.values(stats.directoryStats)
                .sort((a, b) => (b.lines || 0) - (a.lines || 0))
                .slice(0, TOP_N);

            stats.largestFileCountDirectories = Object.values(stats.directoryStats)
                .sort((a, b) => (b.files || 0) - (a.files || 0))
                .slice(0, TOP_N);

            stats.complexityByDirectory = Object.values(stats.directoryStats)
                .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
                .slice(0, TOP_N);

            stats.largestSizeDirectories = Object.values(stats.directoryStats)
                .sort((a, b) => (b.size || 0) - (a.size || 0))
                .slice(0, TOP_N);

            // Calculate subdirectories statistics separately
            const allSubdirectories = [];
            for (const [, dirStats] of directoryEntries) {
                for (const subDir of dirStats.subdirectories) {
                    if (stats.directoryStats[subDir]) {
                        allSubdirectories.push(stats.directoryStats[subDir]);
                    }
                }
            }

            stats.largestSubdirectories = allSubdirectories
                .sort((a, b) => (b.lines || 0) - (a.lines || 0))
                .slice(0, TOP_N);

            stats.subdirectoriesWithMostFiles = allSubdirectories
                .sort((a, b) => (b.files || 0) - (a.files || 0))
                .slice(0, TOP_N);

            // Calculate directory averages by depth
            stats.directoryStatsByDepth = {};
            directoryEntries.forEach(([, dirStats]) => {
                const depth = dirStats.depth;
                if (!stats.directoryStatsByDepth[depth]) {
                    stats.directoryStatsByDepth[depth] = [];
                }
                stats.directoryStatsByDepth[depth].push(dirStats);
            });

            // Calculate avg metrics by depth
            for (const [depth, dirs] of Object.entries(stats.directoryStatsByDepth)) {
                if (dirs.length > 0) {
                    stats.directoryStatsByDepth[depth] = {
                        count: dirs.length,
                        avgLines: dirs.reduce((sum, d) => sum + (d.lines || 0), 0) / dirs.length,
                        avgFiles: dirs.reduce((sum, d) => sum + (d.files || 0), 0) / dirs.length,
                        avgComplexity: dirs.reduce((sum, d) => sum + (d.complexity || 0), 0) / dirs.length,
                        totalLines: dirs.reduce((sum, d) => sum + (d.lines || 0), 0),
                        totalFiles: dirs.reduce((sum, d) => sum + (d.files || 0), 0)
                    };
                }
            }
        }
    }
}

class RequirementsAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Requirements Analysis...');

        return await this.safeAnalyze(async () => {
            if (!fs.existsSync('./README.md')) {
                this.log('README.md not found', 'error');
                return {error: 'README.md not found'};
            }

            const readmeContent = this._readFileContent('./README.md');
            if (!readmeContent) {
                return {error: 'Could not read README.md'};
            }

            const requirements = this._analyzeRequirements(readmeContent);

            const satisfiedCount = Object.values(requirements).filter(value => value === true).length;
            const totalCount = Object.keys(requirements).length;

            requirements.complianceScore = Math.round((satisfiedCount / totalCount) * 100);
            requirements.satisfiedRequirements = satisfiedCount;
            requirements.totalRequirements = totalCount;

            return requirements;
        }, 'Requirements analysis failed');
    }

    _analyzeRequirements(readmeContent) {
        return {
            hasImmutableDataFoundation: readmeContent.includes('Immutable Data Foundation'),
            hasComponentBasedArchitecture: readmeContent.includes('Component-Based Architecture'),
            hasDualMemoryArchitecture: readmeContent.includes('Dual Memory Architecture'),
            hasHybridReasoningIntegration: readmeContent.includes('Hybrid Reasoning Integration'),
            hasLayerBasedExtensibility: readmeContent.includes('Layer-Based Extensibility'),

            hasTermClassDocumentation: readmeContent.includes('`Term` Class') || readmeContent.toLowerCase().includes('term') && readmeContent.includes('knowledge'),
            hasTaskClassDocumentation: readmeContent.includes('`Task` Class') || readmeContent.toLowerCase().includes('task') && readmeContent.includes('unit of work'),
            hasTruthDocumentation: readmeContent.includes('`Truth` Value Representation') || readmeContent.toLowerCase().includes('truth value'),
            hasStampDocumentation: readmeContent.includes('`Stamp` and Evidence Tracking') || readmeContent.toLowerCase().includes('stamp') && readmeContent.includes('evidence'),

            hasNARDocumentation: readmeContent.includes('`NAR` (NARS Reasoner Engine)') || readmeContent.toLowerCase().includes('nar') && readmeContent.includes('orchestrator'),
            hasMemoryDocumentation: readmeContent.includes('Memory and Focus Management') || readmeContent.toLowerCase().includes('memory') && readmeContent.includes('concept'),
            hasParserDocumentation: readmeContent.includes('Parser System') || readmeContent.toLowerCase().includes('parser') && readmeContent.includes('narsese'),
            hasLMDocumentation: readmeContent.includes('Language Model Integration') || readmeContent.toLowerCase().includes('lm integration'),

            hasBeliefGoalDistinction: readmeContent.includes('Belief vs. Goal') || readmeContent.toLowerCase().includes('belief') && readmeContent.includes('goal'),
            hasUsageExamples: readmeContent.includes('Usage Examples'),
            hasTestingStrategy: readmeContent.includes('Testing Strategy'),
            hasAPIConventions: readmeContent.includes('API Conventions') || readmeContent.includes('conventions'),
            hasErrorHandling: readmeContent.includes('Error Handling') || readmeContent.includes('robustness'),
            hasSecurityImplementation: readmeContent.includes('Security Implementation'),

            hasCompoundIntelligence: readmeContent.includes('Compound Intelligence Architecture') || readmeContent.includes('compound intelligence'),
            hasReinforcementLearning: readmeContent.includes('General-Purpose Reinforcement Learning') || readmeContent.includes('reinforcement learning'),
            hasKeyObjectives: readmeContent.includes('Key Design Objectives') || readmeContent.includes('simplicity') || readmeContent.includes('robustness') || readmeContent.includes('consistency'),

            hasTechnicalChallenges: readmeContent.includes('Core Technical Challenges'),

            systemSize: readmeContent.length,
            hasLongTermSpec: readmeContent.includes('Long-Term Specification'),
            hasUserExperienceGoals: readmeContent.includes('User Experience Goals'),
            hasTechnicalExcellence: readmeContent.includes('Technical Excellence Standards'),
            hasDirectoryStructure: readmeContent.includes('Directory Structure'),
            readmeComplete: readmeContent.length > 5000,
        };
    }

    _readFileContent(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (readError) {
            this.log(`Cannot read file: ${filePath}`, 'warn', {error: readError.message});
            return null;
        }
    }
}

class PlanningAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Planning and Roadmap Indicators...');

        return await this.safeAnalyze(async () => {
            const planning = {
                projectHealth: {},
                developmentVelocity: {},
                milestoneIndicators: {},
                resourceAllocation: {},
                riskAssessment: {},
                futureEstimates: {},
                featureCompletion: {}
            };

            // Analyze different aspects to provide planning indicators
            planning.projectHealth = await this._analyzeProjectHealth();
            planning.developmentVelocity = await this._analyzeDevelopmentVelocity();
            planning.milestoneIndicators = await this._analyzeMilestoneIndicators();
            planning.riskAssessment = await this._analyzeOverallRisk();
            planning.futureEstimates = await this._analyzeFutureEstimates();

            return planning;
        }, 'Planning analysis failed');
    }

    async _analyzeProjectHealth() {
        // Project health based on multiple indicators
        const healthIndicators = {
            stability: 0,      // Based on test pass rate
            maintainability: 0, // Based on complexity, size, and technical debt
            documentation: 0,   // Based on README compliance
            coverage: 0        // Based on test coverage
        };

        // We'll populate these as the analysis runs
        return healthIndicators;
    }

    async _analyzeDevelopmentVelocity() {
        // Development velocity indicators - based on git history if available
        // Since git analysis might be complex, we'll focus on structural indicators
        const velocityIndicators = {
            codeGrowth: {},
            complexityGrowth: {},
            refactoringNeeds: 0,
            developmentPace: 'medium' // Based on file count, complexity, etc.
        };

        // Calculate based on static analysis
        if (fs.existsSync('./src')) {
            const fileCount = this._countFiles('./src');
            if (fileCount > 200) {
                velocityIndicators.developmentPace = 'high';
            } else if (fileCount > 100) {
                velocityIndicators.developmentPace = 'medium';
            } else {
                velocityIndicators.developmentPace = 'low';
            }
            velocityIndicators.codeGrowth.totalFiles = fileCount;
        }

        return velocityIndicators;
    }

    async _analyzeMilestoneIndicators() {
        // Milestone indicators based on feature completion, test coverage, etc.
        const milestoneIndicators = {
            featureCompleteness: 0,
            testingMilestone: 0,
            architectureMilestone: 0,
            documentationMilestone: 0,
            nextMilestoneEstimate: 'Not enough data',
            completionEstimate: 'Not enough data'
        };

        return milestoneIndicators;
    }

    async _analyzeOverallRisk() {
        // Risk assessment for planning
        const riskAssessment = {
            technicalRisk: 0,
            scheduleRisk: 0,
            resourceRisk: 0,
            architecturalRisk: 0,
            overallRiskLevel: 'medium',
            riskFactors: []
        };

        return riskAssessment;
    }

    async _analyzeFutureEstimates() {
        // Future estimates based on current metrics
        const estimates = {
            refactoringTime: '2-4 weeks',
            featureDevelopment: '4-8 weeks per major feature',
            maintenanceEffort: '20-30% of development time',
            scalingConsiderations: [],
            priorityRecommendations: []
        };

        return estimates;
    }

    _countFiles(dir) {
        if (!fs.existsSync(dir)) return 0;

        const items = fs.readdirSync(dir, {withFileTypes: true});
        let count = 0;

        for (const item of items) {
            if (item.isDirectory()) {
                count += this._countFiles(path.join(dir, item.name));
            } else if (item.isFile()) {
                count++;
            }
        }

        return count;
    }
}

class ArchitectureAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Architecture and Dependency Analysis...');

        return await this.safeAnalyze(async () => {
            const srcPath = './src';
            if (!fs.existsSync(srcPath)) {
                this.log('Source directory not found', 'error');
                return {error: 'src directory not found'};
            }

            const architecture = {
                dependencyGraph: {},
                cyclicDependencies: [],
                architecturalLayers: {},
                dependencyComplexity: 0,
                couplingMetrics: {
                    afferent: {}, // incoming dependencies
                    efferent: {}, // outgoing dependencies
                    instability: {} // (efferent)/(efferent + afferent)
                },
                apiEntryPoints: [],
                moduleCohesion: {},
                layerDependencies: {}
            };

            // Build dependency graph
            this._buildDependencyGraph(srcPath, architecture);

            // Analyze architectural layers
            this._analyzeLayers(architecture);

            // Calculate coupling and cohesion metrics
            this._calculateCouplingMetrics(architecture);

            // Identify cyclic dependencies
            this._findCyclicDependencies(architecture);

            // Identify API entry points
            this._identifyEntryPoints(architecture);

            return architecture;
        }, 'Architecture analysis failed');
    }

    _buildDependencyGraph(dir, architecture) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                this._buildDependencyGraph(fullPath, architecture);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                const relativePath = path.relative('.', fullPath);

                // Skip excluded files using global exclusion
                if (FileUtils.isExcludedPath(relativePath)) {
                    this.log(`Excluding file from architecture analysis: ${relativePath}`, 'warn');
                    continue;
                }

                const content = this._readFileContent(fullPath);

                if (content) {
                    // Extract dependencies from the file
                    const dependencies = this._extractDependencies(content, relativePath);
                    architecture.dependencyGraph[relativePath] = dependencies;
                }
            }
        }
    }

    _extractDependencies(content, currentFile) {
        const dependencies = [];
        const lines = content.split('\n');

        // Extract ES6 imports
        const importRegex = /import\s+.*?\s+from\s+["'](.*?\.(js|ts))["']/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            let depPath = match[1];

            // Convert relative paths to absolute paths relative to current file
            if (depPath.startsWith('./') || depPath.startsWith('../')) {
                const resolvedPath = path.resolve(path.dirname(currentFile), depPath);
                depPath = path.relative('.', resolvedPath);
            }

            // Normalize path separators and remove extensions
            depPath = depPath.replace(/\\/g, '/').replace(/\.(js|ts)$/, '');

            // Only include dependencies in src directory
            if (depPath.includes('src/')) {
                dependencies.push(depPath);
            }
        }

        // Extract require statements
        const requireRegex = /require\(["'](.*?\.(js|ts))["']\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
            let depPath = match[1];

            if (depPath.startsWith('./') || depPath.startsWith('../')) {
                const resolvedPath = path.resolve(path.dirname(currentFile), depPath);
                depPath = path.relative('.', resolvedPath);
            }

            depPath = depPath.replace(/\\/g, '/').replace(/\.(js|ts)$/, '');

            if (depPath.includes('src/')) {
                dependencies.push(depPath);
            }
        }

        return [...new Set(dependencies)]; // Remove duplicates
    }

    _readFileContent(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (readError) {
            this.log(`Cannot read file: ${filePath}`, 'warn', {error: readError.message});
            return null;
        }
    }

    _analyzeLayers(architecture) {
        // Group files by directory to identify architectural layers
        const layers = {};

        for (const [filePath, dependencies] of Object.entries(architecture.dependencyGraph)) {
            const dirPath = path.dirname(filePath);

            if (!layers[dirPath]) {
                layers[dirPath] = {
                    files: [],
                    dependencies: new Set(),
                    dependents: new Set()
                };
            }

            layers[dirPath].files.push(filePath);

            // Record dependencies between layers
            for (const depPath of dependencies) {
                const depDir = path.dirname(depPath);
                if (depDir !== dirPath) {
                    layers[dirPath].dependencies.add(depDir);
                }
            }
        }

        // Find dependents for each layer
        for (const [dirPath, layerInfo] of Object.entries(layers)) {
            for (const [otherDirPath, otherLayerInfo] of Object.entries(layers)) {
                if (otherDirPath !== dirPath && otherLayerInfo.dependencies.has(dirPath)) {
                    layers[dirPath].dependents.add(otherDirPath);
                }
            }
        }

        architecture.architecturalLayers = layers;

        // Identify layer dependencies
        for (const [dirPath, layerInfo] of Object.entries(layers)) {
            architecture.layerDependencies[dirPath] = {
                dependencies: Array.from(layerInfo.dependencies),
                dependents: Array.from(layerInfo.dependents),
                dependencyCount: layerInfo.dependencies.size,
                dependentCount: layerInfo.dependents.size
            };
        }
    }

    _calculateCouplingMetrics(architecture) {
        // Calculate afferent (incoming) and efferent (outgoing) couplings
        const afferent = {}; // incoming dependencies
        const efferent = {}; // outgoing dependencies

        // Initialize with all files from dependency graph
        for (const file of Object.keys(architecture.dependencyGraph)) {
            afferent[file] = 0;
            efferent[file] = architecture.dependencyGraph[file].length;
        }

        // Count afferent (incoming) dependencies
        for (const [file, dependencies] of Object.entries(architecture.dependencyGraph)) {
            for (const dep of dependencies) {
                if (afferent.hasOwnProperty(dep)) {
                    afferent[dep]++;
                }
            }
        }

        // Calculate instability (I = efferent / (efferent + afferent))
        const instability = {};
        for (const file of Object.keys(architecture.dependencyGraph)) {
            const aff = afferent[file] || 0;
            const eff = efferent[file] || 0;
            const total = aff + eff;

            instability[file] = total > 0 ? eff / total : 0;
        }

        architecture.couplingMetrics = {afferent, efferent, instability};
    }

    _findCyclicDependencies(architecture) {
        const visited = new Set();
        const recStack = new Set();
        const path = [];
        const cycles = [];

        // For each unvisited node, perform DFS to find cycles
        for (const node of Object.keys(architecture.dependencyGraph)) {
            if (!visited.has(node)) {
                this._dfsCycles(node, architecture.dependencyGraph, visited, recStack, path, cycles);
            }
        }

        architecture.cyclicDependencies = cycles;
    }

    _dfsCycles(node, graph, visited, recStack, path, cycles) {
        visited.add(node);
        recStack.add(node);
        path.push(node);

        for (const neighbor of graph[node] || []) {
            if (!visited.has(neighbor)) {
                this._dfsCycles(neighbor, graph, visited, recStack, path, cycles);
            } else if (recStack.has(neighbor)) {
                // Found a cycle
                const cycleStart = path.indexOf(neighbor);
                const cycle = path.slice(cycleStart).concat([neighbor]);
                cycles.push(cycle);
            }
        }

        recStack.delete(node);
        path.pop();
    }

    _identifyEntryPoints(architecture) {
        // Entry points are files with no incoming dependencies (afferent = 0)
        // that are not just dependency-only files
        const entryPoints = [];

        for (const [file, deps] of Object.entries(architecture.dependencyGraph)) {
            // A file with no incoming dependencies could be an entry point
            if (architecture.couplingMetrics.afferent[file] === 0 && deps.length > 0) {
                entryPoints.push(file);
            }
        }

        architecture.apiEntryPoints = entryPoints;
    }
}

class TechnicalDebtAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Technical Debt Indicators...');

        return await this.safeAnalyze(async () => {
            const srcPath = './src';
            if (!fs.existsSync(srcPath)) {
                this.log('Source directory not found', 'error');
                return {error: 'src directory not found'};
            }

            const debtIndicators = {
                files: [],
                totalDebtScore: 0,
                highRiskFiles: [],
                refactoringTargets: [],
                debtByCategory: {
                    complexity: 0,
                    size: 0,
                    duplication: 0,
                    testCoverage: 0
                }
            };

            this._analyzeDirectory(srcPath, debtIndicators);

            // Calculate overall debt metrics
            debtIndicators.avgDebtScore = debtIndicators.files.length > 0
                ? debtIndicators.totalDebtScore / debtIndicators.files.length
                : 0;

            // Identify high-risk items
            debtIndicators.highRiskFiles = debtIndicators.files
                .filter(file => file.debtScore > 50)
                .sort((a, b) => b.debtScore - a.debtScore);

            debtIndicators.refactoringTargets = debtIndicators.files
                .filter(file => file.debtScore > 30)
                .sort((a, b) => b.debtScore - a.debtScore)
                .slice(0, 10);

            return debtIndicators;
        }, 'Technical debt analysis failed');
    }

    _analyzeDirectory(dir, debtIndicators) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                this._analyzeDirectory(fullPath, debtIndicators);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                this._analyzeFile(fullPath, debtIndicators);
            }
        }
    }

    _analyzeFile(filePath, debtIndicators) {
        const relativePath = path.relative('.', filePath);

        // Skip excluded files using global exclusion
        if (FileUtils.isExcludedPath(relativePath)) {
            this.log(`Excluding file from debt analysis: ${relativePath}`, 'warn');
            return;
        }

        const content = this._readFileContent(filePath);
        if (!content) return;

        const lines = content.split('\n');
        const complexityMetrics = this.calculateComplexityMetrics(content);

        // Calculate debt score based on multiple factors
        let debtScore = 0;
        const indicators = [];

        // Complexity-based debt (higher weight for high cyclomatic complexity)
        if (complexityMetrics.cyclomatic > 10) {
            debtScore += (complexityMetrics.cyclomatic - 10) * 2;
            indicators.push(`high complexity (${complexityMetrics.cyclomatic})`);
            debtIndicators.debtByCategory.complexity += (complexityMetrics.cyclomatic - 10) * 2;
        }

        // Size-based debt (too many lines)
        if (lines.length > 200) {
            debtScore += Math.floor((lines.length - 200) / 50);
            indicators.push(`${lines.length} lines`);
            debtIndicators.debtByCategory.size += Math.floor((lines.length - 200) / 50);
        }

        // Deep nesting debt
        let nestingLevel = 0;
        let maxNesting = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('if') || trimmed.includes('if (') ||
                trimmed.startsWith('for') || trimmed.includes('for (') ||
                trimmed.startsWith('while') || trimmed.includes('while (') ||
                trimmed.startsWith('function') || trimmed.includes('function(')) {
                nestingLevel++;
                maxNesting = Math.max(maxNesting, nestingLevel);
            } else if (trimmed === '}' || trimmed.endsWith('}')) {
                nestingLevel = Math.max(0, nestingLevel - 1);
            }
        }
        if (maxNesting > 4) {
            debtScore += (maxNesting - 4) * 3;
            indicators.push(`deep nesting (${maxNesting} levels)`);
            debtIndicators.debtByCategory.complexity += (maxNesting - 4) * 3;
        }

        // Comment-to-code ratio (too low indicates missing documentation)
        const commentLines = lines.filter(line =>
            line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')
        ).length;
        const commentRatio = lines.length > 0 ? commentLines / lines.length : 0;
        if (commentRatio < 0.05) { // Less than 5% comments
            debtScore += 10;
            indicators.push(`low documentation (${Math.round(commentRatio * 100)}% comments)`);
        }

        // Large functions (more than 50 lines)
        const largeFunctions = this._countLargeFunctions(content);
        if (largeFunctions > 0) {
            debtScore += largeFunctions * 5;
            indicators.push(`${largeFunctions} large functions`);
        }

        // Duplicate code indicators (simplified detection)
        const duplicateIndicators = this._findDuplicatePatterns(content);
        if (duplicateIndicators > 0) {
            debtScore += duplicateIndicators * 3;
            indicators.push(`${duplicateIndicators} potential duplication patterns`);
            debtIndicators.debtByCategory.duplication += duplicateIndicators * 3;
        }

        const fileDebt = {
            path: relativePath,
            debtScore,
            lines: lines.length,
            complexity: complexityMetrics.cyclomatic,
            indicators,
            size: content.length
        };

        debtIndicators.files.push(fileDebt);
        debtIndicators.totalDebtScore += debtScore;
    }

    _readFileContent(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (readError) {
            this.log(`Cannot read file: ${filePath}`, 'warn', {error: readError.message});
            return null;
        }
    }

    calculateComplexityMetrics(content) {
        const lines = content.split('\n');

        let functionCount = 0;
        let classCount = 0;
        let conditionalCount = 0;
        let cyclomatic = 1;

        for (const line of lines) {
            const trimmed = line.trim();

            const hasFunction = trimmed.startsWith('function ') ||
                trimmed.includes('function(') ||
                trimmed.includes('=>') ||
                trimmed.includes('function*');
            if (hasFunction) functionCount++;

            if (trimmed.includes('class ')) classCount++;

            const conditions = ['if (', 'else if', 'for (', 'while (', 'do {', 'switch (', 'try ', 'catch ('];
            for (const condition of conditions) {
                if (trimmed.includes(condition)) {
                    conditionalCount++;
                    cyclomatic++;
                }
            }

            if (trimmed.includes(' && ') || trimmed.includes(' || ')) cyclomatic++;
        }

        return {
            lines: lines.length,
            functionCount,
            classCount,
            conditionalCount,
            cyclomatic
        };
    }

    _countLargeFunctions(content) {
        const lines = content.split('\n');
        let largeFunctionCount = 0;
        let currentFunctionLines = 0;
        let inFunction = false;

        for (const line of lines) {
            if (line.trim().startsWith('function') ||
                line.trim().includes('=>') ||
                line.trim().startsWith('const') && line.includes('=>') ||
                line.trim().startsWith('var') && line.includes('=>') ||
                line.trim().startsWith('let') && line.includes('=>')) {
                if (inFunction && currentFunctionLines > 50) {
                    largeFunctionCount++;
                }
                inFunction = true;
                currentFunctionLines = 1;
            } else if (inFunction) {
                currentFunctionLines++;
                if (line.trim() === '}' && currentFunctionLines > 50) {
                    largeFunctionCount++;
                    inFunction = false;
                    currentFunctionLines = 0;
                } else if (line.trim() === '}') {
                    inFunction = false;
                    currentFunctionLines = 0;
                }
            }
        }

        // Check the last function if it wasn't closed properly
        if (inFunction && currentFunctionLines > 50) {
            largeFunctionCount++;
        }

        return largeFunctionCount;
    }

    _findDuplicatePatterns(content) {
        const lines = content.split('\n');
        const lineCounts = {};
        let duplicateCount = 0;

        // Count occurrences of each non-empty line
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
                lineCounts[trimmed] = (lineCounts[trimmed] || 0) + 1;
            }
        }

        // Count lines that appear more than 3 times as potential duplicates
        for (const [line, count] of Object.entries(lineCounts)) {
            if (count > 3) {
                duplicateCount++;
            }
        }

        return duplicateCount;
    }
}

class FeatureSpecificationAnalyzer extends BaseAnalyzer {
    constructor(options, verbose) {
        super(options, verbose);
        this.specDir = './specifications';
        this.featureSpecs = new Map();
    }

    async analyze() {
        this.log('Collecting Feature Specifications...');

        return await this.safeAnalyze(async () => {
            // First, look for existing specification files
            if (fs.existsSync(this.specDir)) {
                await this._loadSpecFiles();
            } else {
                // Look for spec files in common locations
                const commonSpecPaths = ['./specs', './spec', './docs/specs', './docs/spec'];
                for (const specPath of commonSpecPaths) {
                    if (fs.existsSync(specPath)) {
                        this.specDir = specPath;
                        await this._loadSpecFiles();
                        break;
                    }
                }
            }

            // If no spec files found, create basic analysis from existing sources
            if (this.featureSpecs.size === 0) {
                await this._inferFeatureSpecsFromCode();
            }

            // Connect features to test files
            const testConnections = await this._mapFeaturesToTests();

            // Connect features to implementation
            const implementationConnections = await this._mapFeaturesToImplementation();

            return {
                specificationsFound: this.featureSpecs.size,
                features: Array.from(this.featureSpecs.entries()),
                testConnections,
                implementationConnections,
                coverageByFeature: this._calculateCoverageByFeature(implementationConnections),
                overallFeatureCompliance: this._calculateFeatureCompliance()
            };
        }, 'Feature specification analysis failed');
    }

    async _loadSpecFiles() {
        if (!fs.existsSync(this.specDir)) return;

        const items = fs.readdirSync(this.specDir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(this.specDir, item.name);

            if (item.isFile() && (item.name.endsWith('.json') || item.name.endsWith('.md'))) {
                try {
                    let specContent;
                    if (item.name.endsWith('.json')) {
                        specContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                        // Add as feature spec
                        if (specContent.id && specContent.description) {
                            this.featureSpecs.set(specContent.id, specContent);
                        }
                    } else if (item.name.endsWith('.md')) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        // Try to parse markdown for feature specifications
                        this._parseMarkdownSpec(content, item.name);
                    }
                } catch (parseError) {
                    this.log(`Error parsing spec file ${fullPath}:`, 'warn', {error: parseError.message});
                }
            }
        }
    }

    _parseMarkdownSpec(content, fileName) {
        // Simple parsing for feature specifications in markdown
        const lines = content.split('\n');
        let currentFeature = null;
        let currentSection = '';

        const id = fileName.replace('.md', '');
        const spec = {
            id,
            title: '',
            description: '',
            requirements: [],
            status: 'defined',
            implementationStatus: 'not_started',
            testStatus: 'not_tested'
        };

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('# ')) {
                spec.title = trimmed.substring(2);
            } else if (trimmed.startsWith('## ') && trimmed.includes('Description')) {
                currentSection = 'description';
            } else if (trimmed.startsWith('## ') && trimmed.includes('Requirements')) {
                currentSection = 'requirements';
            } else if (trimmed.startsWith('## ') && trimmed.includes('Status')) {
                currentSection = 'status';
            } else {
                if (currentSection === 'description' && trimmed && !trimmed.startsWith('##')) {
                    spec.description += trimmed + ' ';
                } else if (currentSection === 'requirements' && trimmed.startsWith('- ')) {
                    spec.requirements.push(trimmed.substring(2));
                } else if (currentSection === 'status') {
                    if (trimmed.includes('Implementation:')) {
                        spec.implementationStatus = trimmed.split(':')[1].trim().toLowerCase();
                    } else if (trimmed.includes('Test:')) {
                        spec.testStatus = trimmed.split(':')[1].trim().toLowerCase();
                    }
                }
            }
        }

        this.featureSpecs.set(id, spec);
    }

    async _inferFeatureSpecsFromCode() {
        // Infer features from README, package.json, and other documentation
        const readmePath = './README.md';
        if (fs.existsSync(readmePath)) {
            const readmeContent = fs.readFileSync(readmePath, 'utf8');

            // Extract features from README as requirements
            const features = [
                {
                    id: 'core-knowledge-representation', title: 'Core Knowledge Representation',
                    description: 'System for representing knowledge using Terms and Tasks',
                    requirements: ['Term class implementation', 'Task class implementation', 'Truth value handling'],
                    status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown'
                },
                {
                    id: 'reasoning-engine', title: 'NARS Reasoner Engine',
                    description: 'Core reasoning engine (NAR) for processing tasks and knowledge',
                    requirements: ['NAR implementation', 'Inference mechanisms', 'Concept handling'],
                    status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown'
                },
                {
                    id: 'memory-management', title: 'Memory and Focus Management',
                    description: 'System for managing concepts and tasks in memory',
                    requirements: ['Concept memory', 'Event buffer', 'Focus control'],
                    status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown'
                },
                {
                    id: 'parsing', title: 'Parser System',
                    description: 'System for parsing Narsese input',
                    requirements: ['Narsese parser', 'Input handling', 'Syntax validation'],
                    status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown'
                }
            ];

            for (const feature of features) {
                this.featureSpecs.set(feature.id, feature);
            }
        }
    }

    async _mapFeaturesToTests() {
        const testFiles = FileAnalyzer.collectTestFiles();
        const connections = [];

        for (const testFile of testFiles) {
            try {
                const content = fs.readFileSync(testFile, 'utf8');

                for (const [featureId, spec] of this.featureSpecs.entries()) {
                    // Check if test file relates to feature (by name matching)
                    const featureRelated = spec.title.toLowerCase().includes(path.basename(testFile, '.js')) ||
                        spec.requirements.some(req =>
                            content.toLowerCase().includes(req.toLowerCase()) ||
                            content.toLowerCase().includes(featureId.toLowerCase()));

                    if (featureRelated) {
                        connections.push({
                            featureId,
                            testFile,
                            testContent: content.substring(0, 200) + '...' // First 200 chars
                        });
                    }
                }
            } catch (e) {
                this.log(`Could not read test file ${testFile}:`, 'warn', {error: e.message});
            }
        }

        return connections;
    }

    async _mapFeaturesToImplementation() {
        const connections = [];

        // Look through src directory for implementation files
        const srcDir = './src';
        if (!fs.existsSync(srcDir)) return connections;

        await this._traverseAndMapFeatures(srcDir, connections);

        return connections;
    }

    async _traverseAndMapFeatures(dir, connections) {
        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                await this._traverseAndMapFeatures(fullPath, connections);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                const relativePath = path.relative('.', fullPath);

                // Skip excluded files using global exclusion
                if (FileUtils.isExcludedPath(relativePath)) {
                    this.log(`Excluding file from feature mapping: ${relativePath}`, 'warn');
                    continue;
                }

                try {
                    const content = fs.readFileSync(fullPath, 'utf8');

                    for (const [featureId, spec] of this.featureSpecs.entries()) {
                        // Check if implementation file relates to feature
                        const featureRelated = spec.title.toLowerCase().includes(path.basename(item.name, '.js')) ||
                            spec.requirements.some(req =>
                                content.toLowerCase().includes(req.toLowerCase()) ||
                                content.toLowerCase().includes(featureId.toLowerCase()));

                        if (featureRelated) {
                            connections.push({
                                featureId,
                                implementationFile: relativePath,
                                implementationContent: content.substring(0, 200) + '...'
                            });
                        }
                    }
                } catch (e) {
                    this.log(`Could not read implementation file ${fullPath}:`, 'warn', {error: e.message});
                }
            }
        }
    }

    _calculateCoverageByFeature(implementationConnections) {
        const coverageByFeature = new Map();

        for (const [featureId, spec] of this.featureSpecs.entries()) {
            const implementations = implementationConnections.filter(conn => conn.featureId === featureId);
            const implemented = implementations.length > 0;

            coverageByFeature.set(featureId, {
                featureId,
                title: spec.title,
                implemented,
                implementationCount: implementations.length,
                requirementsCount: spec.requirements.length
            });
        }

        return Object.fromEntries(coverageByFeature);
    }

    _calculateFeatureCompliance() {
        let implementedCount = 0;
        let totalCount = this.featureSpecs.size;

        for (const [, spec] of this.featureSpecs.entries()) {
            if (spec.implementationStatus === 'completed' || spec.implementationStatus === 'in_progress') {
                implementedCount++;
            }
        }

        return totalCount > 0 ? Math.round((implementedCount / totalCount) * 100) : 0;
    }
}

// Result display classes
class ResultDisplay {
    constructor(options) {
        this.options = options;
    }

    display(results) {
        if (this.options.summaryOnly) {
            this.printSummary(results);
        } else if (this.options.verbose) {
            this.printDetailed(results);
        } else {
            this.printConcise(results);
            // Always show actionable insights by default (not just in summary mode)
            this._printActionableInsights(results);
        }
    }

    printSummary(results) {
        console.log('📋 PROJECT SUMMARY:');

        if (results.project && !results.project.error) {
            console.log(`  📦 ${results.project.name} v${results.project.version}`);
            console.log(`     Dependencies: ${DisplayUtils.formatNumber(results.project.dependencies)} regular, ${DisplayUtils.formatNumber(results.project.devDependencies)} dev`);
        }

        if (results.tests && !results.tests.error) {
            const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
            const statusEmoji = passRate >= 95 ? '✅' : passRate >= 80 ? '⚠️' : '❌';
            console.log(`  🧪 Tests: ${DisplayUtils.formatNumber(results.tests.passedTests)}/${DisplayUtils.formatNumber(results.tests.totalTests)} (${DisplayUtils.formatPercentage(passRate / 100)}) ${statusEmoji}`);

            if (results.tests.failedTests > 0) {
                console.log(`     ⚠️  ${DisplayUtils.formatNumber(results.tests.failedTests)} failed tests need attention`);
            }
            if (results.tests.failedTests === 0 && results.tests.passedTests > 0) {
                console.log(`     ✅ All tests passing - good stability`);
            }
        }

        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            const coverageStatus = results.coverage.lines >= 80 ? '✅' : results.coverage.lines >= 50 ? '⚠️' : '❌';
            console.log(`  📊 Coverage: ${DisplayUtils.formatPercentage(results.coverage.lines / 100)} lines ${coverageStatus}`);

            if (results.coverage.lines < 80) {
                console.log(`     ⚠️  Consider adding more tests for better coverage`);
            } else {
                console.log(`     ✅ Good test coverage - code reliability likely high`);
            }
        }

        if (results.static && !results.static.error) {
            console.log(`  📁 Code: ${DisplayUtils.formatNumber(results.static.jsFiles)} files, ~${DisplayUtils.formatNumber(results.static.totalLines)} lines`);
            console.log(`     Avg: ${results.static.avgLinesPerFile}/file, ${DisplayUtils.formatNumber(results.static.directories)} dirs`);

            // Add insights about code health
            if (results.static.avgLinesPerFile > 300) {
                console.log(`     ⚠️  High avg lines per file - consider refactoring large files`);
            } else {
                console.log(`     ✅ Reasonable file sizes - good maintainability`);
            }

            // Identify potentially risky areas
            if (results.static.largestFile && results.static.largestFile.lines > 1000) {
                console.log(`     ⚠️  Largest file: ${results.static.largestFile.path} (${DisplayUtils.formatNumber(results.static.largestFile.lines)} lines) - potential refactoring target`);
            }

            if (results.static.largestDirectories && results.static.largestDirectories.length > 0) {
                const largestDir = results.static.largestDirectories[0];
                console.log(`     🏗️  Largest directory: ${largestDir.path} (${DisplayUtils.formatNumber(largestDir.lines)} lines) - major code area`);
            }

            if (results.static.avgComplexity && results.static.avgComplexity > 20) {
                console.log(`     ⚠️  High avg complexity (${results.static.avgComplexity.toFixed(2)}) - consider simplification`);
            } else if (results.static.avgComplexity) {
                console.log(`     ✅ Reasonable complexity (${results.static.avgComplexity.toFixed(2)}) - good maintainability`);
            }
        }

        if (results.requirements && !results.requirements.error) {
            const complianceStatus = results.requirements.complianceScore >= 90 ? '✅' : results.requirements.complianceScore >= 70 ? '⚠️' : '❌';
            console.log(`  📋 README: ${DisplayUtils.formatPercentage(results.requirements.complianceScore / 100)} compliance ${complianceStatus}`);

            if (results.requirements.complianceScore < 80) {
                console.log(`     ⚠️  Consider improving documentation coverage`);
            } else {
                console.log(`     ✅ Good documentation coverage - project well-documented`);
            }
        }

        // Add actionable insights summary
        this._printActionableInsights(results);
    }

    _printActionableInsights(results) {
        console.log('\n💡 ACTIONABLE INSIGHTS:');

        const insights = [];
        const risks = [];
        const recommendations = [];
        const planningIndicators = [];

        // Test insights
        if (results.tests && !results.tests.error) {
            if (results.tests.failedTests > 0) {
                insights.push(`Fix ${DisplayUtils.formatNumber(results.tests.failedTests)} failing tests to ensure stability`);
                risks.push(`${DisplayUtils.formatNumber(results.tests.failedTests)} failing tests indicate potential instability`);
            }
            if (results.coverage && results.coverage.lines < 80) {
                insights.push(`Improve test coverage (${DisplayUtils.formatPercentage(results.coverage.lines / 100)} < 80%) to catch potential issues`);
                risks.push(`Low test coverage (${DisplayUtils.formatPercentage(results.coverage.lines / 100)}) increases bug risk`);
            }
        }

        // Code structure insights
        if (results.static && !results.static.error) {
            if (results.static.avgLinesPerFile > 300) {
                insights.push(`Refactor large files (avg > 300 lines) to improve maintainability`);
                risks.push(`High avg file size (${DisplayUtils.formatNumber(results.static.avgLinesPerFile)}) may complicate maintenance`);
            }
            if (results.static.avgComplexity > 20) {
                insights.push(`Simplify complex code (avg complexity > 20) to reduce bugs`);
                risks.push(`High avg complexity (${results.static.avgComplexity.toFixed(2)}) increases bug risk`);
            }
            if (results.static.largestFile && results.static.largestFile.lines > 1000) {
                insights.push(`Split ${results.static.largestFile.path} (${DisplayUtils.formatNumber(results.static.largestFile.lines)} lines) into smaller modules`);
                risks.push(`Very large file (${results.static.largestFile.path}) is a maintenance risk`);
            }

            // Risk metrics insights
            if (results.static.riskMetrics) {
                if (results.static.riskMetrics.highRiskFiles.length > 0) {
                    risks.push(`${DisplayUtils.formatNumber(results.static.riskMetrics.highRiskFiles.length)} high-risk files need attention`);
                    recommendations.push(`Focus on refactoring high-risk files: ${results.static.riskMetrics.highRiskFiles.slice(0, 3).map(f => path.basename(f.path)).join(', ')}`);
                }

                if (results.static.riskMetrics.overallRiskScore > 200) {
                    risks.push(`High overall risk score (${results.static.riskMetrics.overallRiskScore.toFixed(1)})`);
                }
            }
        }

        // Add directory-specific insights
        if (results.static && results.static.largestDirectories && results.static.largestDirectories.length > 0) {
            const largestDir = results.static.largestDirectories[0];
            if (largestDir.lines > 5000) {
                insights.push(`Consider splitting ${largestDir.path} (${DisplayUtils.formatNumber(largestDir.lines)} lines) for better organization`);
                risks.push(`Large directory (${largestDir.path}) may benefit from modularization`);
            }
        }

        // Coverage insights
        if (results.coverage && results.coverage.detailedAnalysis && results.coverage.detailedAnalysis.lowCoverageFiles) {
            const lowCoverageCount = results.coverage.detailedAnalysis.lowCoverageFiles.filter(f => f.coverage < 30).length;
            if (lowCoverageCount > 0) {
                insights.push(`Focus on testing ${DisplayUtils.formatNumber(lowCoverageCount)} critically low-coverage files (<30%)`);
                risks.push(`${DisplayUtils.formatNumber(lowCoverageCount)} low-coverage files pose quality risks`);
            }
        }

        // Technical debt insights
        if (results.technicaldebt && !results.technicaldebt.error && results.technicaldebt.highRiskFiles) {
            if (results.technicaldebt.highRiskFiles.length > 0) {
                insights.push(`Address technical debt in ${DisplayUtils.formatNumber(results.technicaldebt.highRiskFiles.length)} high-debt files`);
                risks.push(`High technical debt (${results.technicaldebt.totalDebtScore.toFixed(1)} score) slows development`);
                recommendations.push(`Target top debt files: ${results.technicaldebt.highRiskFiles.slice(0, 3).map(f => path.basename(f.path)).join(', ')}`);
            }
        }

        // Architecture insights
        if (results.architecture && !results.architecture.error) {
            if (results.architecture.cyclicDependencies.length > 0) {
                risks.push(`${DisplayUtils.formatNumber(results.architecture.cyclicDependencies.length)} cyclic dependencies detected`);
                recommendations.push(`Resolve cyclic dependencies to improve modularity`);
            }

            if (results.architecture.apiEntryPoints.length > 0) {
                planningIndicators.push(`Identified ${DisplayUtils.formatNumber(results.architecture.apiEntryPoints.length)} main entry points`);
            }
        }

        // Planning insights
        if (results.planning && !results.planning.error) {
            if (results.planning.developmentVelocity.developmentPace) {
                planningIndicators.push(`Development pace: ${results.planning.developmentVelocity.developmentPace}`);
            }
        }

        if (insights.length === 0) {
            insights.push('Codebase appears healthy based on current metrics');
        }

        console.log(`  Primary focus areas: ${insights.length > 0 ? insights[0] : 'None identified'}`);

        if (risks.length > 0) {
            console.log(`  Key risks: ${risks[0]}`);
            if (risks.length > 1) {
                console.log(`  Additional risks: ${risks.slice(1, 2).join('; ')}`);
            }
        }

        if (recommendations.length > 0) {
            console.log(`  Specific recommendations: ${recommendations[0]}`);
            if (recommendations.length > 1) {
                console.log(`  More recommendations: ${recommendations.slice(1, 2).join('; ')}`);
            }
        }

        if (planningIndicators.length > 0) {
            console.log(`  Planning indicators: ${planningIndicators[0]}`);
            if (planningIndicators.length > 1) {
                console.log(`  Additional: ${planningIndicators.slice(1, 2).join('; ')}`);
            }
        }
    }

    printConcise(results) {
        console.log('\n📊 PROJECT OVERVIEW:');

        if (results.project && !results.project.error) {
            console.log(`  Project: ${results.project.name} v${results.project.version}`);
            console.log(`  Dependencies: ${results.project.dependencies} regular, ${results.project.devDependencies} dev`);
            console.log(`  Scripts: ${results.project.scripts} defined`);
        }

        if (results.tests && !results.tests.error) {
            const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
            console.log(`  Tests: ${results.tests.passedTests}/${results.tests.totalTests} passed (${passRate}%)`);
            const status = passRate >= 95 ? '✅ Excellent' : passRate >= 80 ? '⚠️ Good' : '❌ Needs attention';
            console.log(`  Status: ${status}`);
            console.log(`  Failed: ${results.tests.failedTests}, Todo: ${results.tests.todoTests}, Skipped: ${results.tests.skippedTests}`);
            console.log(`  Suites: ${results.tests.testSuites}, Files: ${results.tests.testFiles.length}`);
        }

        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            console.log(`  Coverage: Lines: ${results.coverage.lines}%, Functions: ${results.coverage.functions}%, Branches: ${results.coverage.branches}%`);
            console.log(`  Status: ${results.coverage.lines >= 80 ? '✅ Good' : results.coverage.lines >= 50 ? '⚠️ Moderate' : '❌ Low'}`);
        }

        if (results.static && !results.static.error) {
            console.log(`  Code: ${results.static.jsFiles} JS files, ~${results.static.totalLines} lines`);
            console.log(`  Avg: ${results.static.avgLinesPerFile}/file, Median: ${results.static.medianLinesPerFile}/file`);
            console.log(`  Directories: ${results.static.directories}, Types: ${Object.keys(results.static.filesByType).length}`);
        }

        if (results.requirements && !results.requirements.error) {
            console.log(`  Documentation: ${results.requirements.complianceScore}% compliance (${results.requirements.satisfiedRequirements}/${results.requirements.totalRequirements})`);
            const complianceStatus = results.requirements.complianceScore >= 90 ? '✅ Excellent' : results.requirements.complianceScore >= 70 ? '⚠️ Good' : '❌ Needs work';
            console.log(`  Status: ${complianceStatus}`);
        }
    }

    printDetailed(results) {
        console.log('\n📊 PROJECT METRICS:');
        if (results.project && !results.project.error) {
            console.log(DisplayUtils.formatKeyValuePairs(results.project, '  ', true));
        } else {
            console.log('  ❌ Project info unavailable');
        }

        console.log('\n🧪 TESTING METRICS:');
        if (results.tests && !results.tests.error) {
            const testMetrics = {
                totalTests: results.tests.totalTests,
                passed: results.tests.passedTests,
                failed: results.tests.failedTests,
                skipped: results.tests.skippedTests || 0,
                todo: results.tests.todoTests || 0,
                suites: results.tests.testSuites,
                passRate: `${Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100)}%`
            };
            console.log(DisplayUtils.formatKeyValuePairs(testMetrics));

            const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
            const status = passRate >= 95 ? '✅ Excellent' : passRate >= 80 ? '⚠️ Good but needs improvement' : '❌ Needs attention';
            console.log(`  Status: ${status}`);

            if (results.tests.testFiles) console.log(`  Test Files: ${results.tests.testFiles.length} found`);

            // Show failure analysis if there were failures
            if (results.tests.failureAnalysis && results.tests.failureAnalysis.totalFailed > 0) {
                console.log(`  Failure Analysis:`);
                console.log(`    Total Failed: ${results.tests.failureAnalysis.totalFailed}`);

                if (results.tests.failureAnalysis.failurePatterns.length > 0) {
                    console.log(`    Failure Patterns:`);
                    results.tests.failureAnalysis.failurePatterns.forEach(pattern => {
                        console.log(`      - ${pattern.type}: ${pattern.count} occurrences (${pattern.percentage}%)`);
                    });
                }

                if (results.tests.failureAnalysis.likelyCauses.length > 0) {
                    console.log(`    Likely Causes:`);
                    results.tests.failureAnalysis.likelyCauses.forEach(cause => {
                        console.log(`      - ${cause.description} [${cause.severity}]`);
                    });
                }
            }

            // Show slowest tests by directory if available
            if (results.tests.slowestTests && typeof results.tests.slowestTests === 'object' && results.tests.slowestTests.byDirectory) {
                console.log(`  Slowest Tests by Directory:`);
                const slowestByDir = results.tests.slowestTests.byDirectory;
                const topDirs = Object.entries(slowestByDir)
                    .filter(([, tests]) => tests.length > 0)
                    .slice(0, 5);

                for (const [dir, tests] of topDirs) {
                    console.log(`    ${dir}:`);
                    tests.slice(0, 3).forEach(test => {
                        console.log(`      - ${test.name} (${test.duration}ms)`);
                    });
                }
            }
        } else {
            console.log('  ❌ Test metrics unavailable');
        }

        console.log('\n🔍 COVERAGE METRICS:');
        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            const coverageMetrics = {
                lines: `${results.coverage.lines}%`,
                functions: `${results.coverage.functions}%`,
                branches: `${results.coverage.branches}%`,
                statements: `${results.coverage.statements}%`
            };
            console.log(DisplayUtils.formatKeyValuePairs(coverageMetrics));

            if (results.coverage.fileAnalysis && results.coverage.fileAnalysis.length > 0) {
                console.log(`  Lowest coverage files:`);
                results.coverage.fileAnalysis.slice(0, 5).forEach((file, idx) => {
                    console.log(`    ${idx + 1}. ${file.filePath} (${file.lineCoverage}%)`);
                });
            }

            // Show detailed coverage analysis if available
            if (results.coverage.detailedAnalysis) {
                const lowCoverageFiles = results.coverage.detailedAnalysis.lowCoverageFiles;
                if (lowCoverageFiles && lowCoverageFiles.length > 0) {
                    console.log(`  Critical low-coverage files (<50%):`);
                    lowCoverageFiles.slice(0, 5).forEach(file => {
                        console.log(`    - ${file.filePath} (${file.coverage}%)`);
                    });
                }

                const dirCoverage = results.coverage.detailedAnalysis.coverageByDirectory;
                if (dirCoverage) {
                    console.log(`  Coverage by directory:`);
                    const sortedDirs = Object.entries(dirCoverage)
                        .map(([dir, stats]) => ({directory: dir, ...stats}))
                        .sort((a, b) => a.coveragePercent - b.coveragePercent);

                    sortedDirs.slice(0, 5).forEach(dir => {
                        console.log(`    - ${dir.directory}: ${dir.coveragePercent.toFixed(2)}% (${dir.files} files)`);
                    });
                }
            }
        } else {
            console.log('  ❌ Coverage metrics unavailable');
        }

        console.log('\n📁 CODE STRUCTURE:');
        if (results.static && !results.static.error) {
            const structureMetrics = {
                jsFiles: results.static.jsFiles,
                totalLines: results.static.totalLines,
                directories: results.static.directories,
                avgLinesPerFile: results.static.avgLinesPerFile,
                medianLinesPerFile: results.static.medianLinesPerFile,
                avgComplexity: results.static.avgComplexity ? results.static.avgComplexity.toFixed(2) : undefined,
                avgFunctionsPerFile: results.static.avgFunctionCount ? results.static.avgFunctionCount.toFixed(2) : undefined
            };
            console.log(DisplayUtils.formatKeyValuePairs(structureMetrics));

            if (results.static.largestFile) console.log(`  Largest File: ${results.static.largestFile.path} (${results.static.largestFile.lines} lines)`);
            if (results.static.smallestFile) console.log(`  Smallest File: ${results.static.smallestFile.path} (${results.static.smallestFile.lines} lines)`);

            console.log(`  File types: ${Object.entries(results.static.filesByType).map(([ext, count]) => `${ext}:${count}`).join(', ')}`);

            // Show directory statistics if available
            if (results.static.directoryStats) {
                console.log(`  Directory Statistics:`);
                const dirs = Object.entries(results.static.directoryStats).map(([path, stats]) => ({path, ...stats}));

                // Show largest directories by lines
                if (results.static.largestDirectories && results.static.largestDirectories.length > 0) {
                    console.log(`    Largest directories by lines:`);
                    results.static.largestDirectories.slice(0, 5).forEach(dir => {
                        console.log(`      - ${dir.path}: ${dir.lines} lines (${dir.files} files)`);
                    });
                }

                // Show directories with most files
                if (results.static.largestFileCountDirectories && results.static.largestFileCountDirectories.length > 0) {
                    console.log(`    Most files by directory:`);
                    results.static.largestFileCountDirectories.slice(0, 5).forEach(dir => {
                        console.log(`      - ${dir.path}: ${dir.files} files (${dir.lines} lines)`);
                    });
                }

                // Show most complex directories
                if (results.static.complexityByDirectory && results.static.complexityByDirectory.length > 0) {
                    console.log(`    Most complex directories:`);
                    results.static.complexityByDirectory.slice(0, 5).forEach(dir => {
                        console.log(`      - ${dir.path}: complexity ${dir.complexity} (${dir.jsFiles} JS files)`);
                    });
                }

                // Show largest directories by size
                if (results.static.largestSizeDirectories && results.static.largestSizeDirectories.length > 0) {
                    console.log(`    Largest directories by size:`);
                    results.static.largestSizeDirectories.slice(0, 5).forEach(dir => {
                        const size = DisplayUtils.formatFileSize(dir.size);
                        console.log(`      - ${dir.path}: ${size} (${dir.files} files)`);
                    });
                }

                // Show largest subdirectories separately
                if (results.static.largestSubdirectories && results.static.largestSubdirectories.length > 0) {
                    console.log(`    Largest subdirectories:`);
                    results.static.largestSubdirectories.slice(0, 5).forEach(dir => {
                        console.log(`      - ${dir.path}: ${dir.lines} lines (${dir.files} files)`);
                    });
                }

                // Show directories by depth
                if (results.static.directoryStatsByDepth) {
                    console.log(`    Directory statistics by depth:`);
                    for (const [depth, stats] of Object.entries(results.static.directoryStatsByDepth).slice(0, 5)) {
                        console.log(`      Depth ${depth}: ${stats.count} dirs, avg ${stats.avgLines.toFixed(1)} lines, ${stats.totalLines} total lines`);
                    }
                }

                if (results.static.directoryAvgLines !== undefined) {
                    console.log(`  Avg lines per directory: ${results.static.directoryAvgLines.toFixed(2)}`);
                    console.log(`  Avg files per directory: ${results.static.directoryAvgFiles.toFixed(2)}`);
                }
            }
        } else {
            console.log('  ❌ Structure metrics unavailable');
        }

        console.log('\n📋 README COMPLIANCE:');
        if (results.requirements && !results.requirements.error) {
            const complianceMetrics = {
                complianceScore: `${results.requirements.complianceScore}%`,
                satisfied: `${results.requirements.satisfiedRequirements}/${results.requirements.totalRequirements}`
            };
            console.log(DisplayUtils.formatKeyValuePairs(complianceMetrics));

            const status = results.requirements.complianceScore >= 90 ? '✅ Excellent compliance' : results.requirements.complianceScore >= 70 ? '⚠️ Good compliance but needs improvement' : '❌ Needs significant improvement';
            console.log(`  Status: ${status}`);

            const missing = [];
            if (!results.requirements.hasTermClassDocumentation) missing.push('Term Class');
            if (!results.requirements.hasTaskClassDocumentation) missing.push('Task Class');
            if (!results.requirements.hasTruthDocumentation) missing.push('Truth Values');
            if (!results.requirements.hasStampDocumentation) missing.push('Stamp System');
            if (!results.requirements.hasTestingStrategy) missing.push('Testing Strategy');
            if (!results.requirements.hasErrorHandling) missing.push('Error Handling');
            if (!results.requirements.hasSecurityImplementation) missing.push('Security');

            if (missing.length > 0) console.log(`  Missing key sections: ${missing.join(', ')}`);
        } else {
            console.log('  ❌ README compliance unavailable');
        }

        // Feature specifications analysis
        if (results.featurespecs && !results.featurespecs.error) {
            console.log('\n🎯 FEATURE SPECIFICATIONS:');
            const featureMetrics = {
                specificationsFound: results.featurespecs.specificationsFound,
                featureCompliance: `${results.featurespecs.overallFeatureCompliance}%`,
                implementedFeatures: `${Object.values(results.featurespecs.coverageByFeature).filter(f => f.implemented).length}/${results.featurespecs.features.length}`
            };
            console.log(DisplayUtils.formatKeyValuePairs(featureMetrics));

            if (results.featurespecs.testConnections && results.featurespecs.testConnections.length > 0) {
                console.log(`  Feature-to-Test Connections: ${results.featurespecs.testConnections.length}`);
            }

            if (results.featurespecs.implementationConnections && results.featurespecs.implementationConnections.length > 0) {
                console.log(`  Feature-to-Implementation Connections: ${results.featurespecs.implementationConnections.length}`);
            }
        } else {
            console.log('\n🎯 FEATURE SPECIFICATIONS: ❌ Not analyzed');
        }

        // Technical debt analysis
        if (results.technicaldebt && !results.technicaldebt.error) {
            console.log('\n💳 TECHNICAL DEBT:');
            const debtMetrics = {
                totalDebtScore: DisplayUtils.formatNumber(results.technicaldebt.totalDebtScore.toFixed(1)),
                avgDebtPerFile: results.technicaldebt.avgDebtScore ? results.technicaldebt.avgDebtScore.toFixed(2) : 'N/A',
                highRiskFiles: results.technicaldebt.highRiskFiles ? results.technicaldebt.highRiskFiles.length : 0,
                refactoringTargets: results.technicaldebt.refactoringTargets ? results.technicaldebt.refactoringTargets.length : 0
            };
            console.log(DisplayUtils.formatKeyValuePairs(debtMetrics));

            if (results.technicaldebt.highRiskFiles && results.technicaldebt.highRiskFiles.length > 0) {
                console.log(`  Top High Risk Files:`);
                results.technicaldebt.highRiskFiles.slice(0, 3).forEach(file => {
                    console.log(`    - ${path.basename(file.path)}: ${DisplayUtils.formatNumber(file.debtScore.toFixed(1))} debt score`);
                });
            }
        } else {
            console.log('\n💳 TECHNICAL DEBT: ❌ Not analyzed');
        }

        // Architecture analysis
        if (results.architecture && !results.architecture.error) {
            console.log('\n🏗️  ARCHITECTURE ANALYSIS:');
            const archMetrics = {
                filesInDependencyGraph: Object.keys(results.architecture.dependencyGraph).length,
                cyclicDependencies: results.architecture.cyclicDependencies.length,
                architecturalLayers: Object.keys(results.architecture.architecturalLayers).length,
                apiEntryPoints: results.architecture.apiEntryPoints.length
            };
            console.log(DisplayUtils.formatKeyValuePairs(archMetrics));

            if (results.architecture.cyclicDependencies.length > 0) {
                console.log(`  Cycles found (require resolution):`);
                results.architecture.cyclicDependencies.slice(0, 3).forEach((cycle, idx) => {
                    console.log(`    ${idx + 1}. ${cycle.slice(0, 3).join(' -> ')}${cycle.length > 3 ? '...' : ''}`);
                });
            }
        } else {
            console.log('\n🏗️  ARCHITECTURE ANALYSIS: ❌ Not analyzed');
        }

        // Planning indicators
        if (results.planning && !results.planning.error) {
            console.log('\n📋 PLANNING INDICATORS:');
            const planningMetrics = {
                developmentPace: results.planning.developmentVelocity.developmentPace || 'Unknown',
                refactoringTimeEstimate: results.planning.futureEstimates.refactoringTime || 'Unknown',
                maintenanceEffort: results.planning.futureEstimates.maintenanceEffort || 'Unknown'
            };
            console.log(DisplayUtils.formatKeyValuePairs(planningMetrics));

            if (results.planning.priorityRecommendations && results.planning.priorityRecommendations.length > 0) {
                console.log(`  Priority Recommendations:`);
                results.planning.priorityRecommendations.slice(0, 3).forEach(rec => {
                    console.log(`    - ${rec}`);
                });
            }
        } else {
            console.log('\n📋 PLANNING INDICATORS: ❌ Not analyzed');
        }
    }

    printSlowestTests(results) {
        const tests = results.tests;
        if (tests && tests.slowestTests) {
            // Handle both old and new structure
            const slowestTests = Array.isArray(tests.slowestTests) ? tests.slowestTests : tests.slowestTests.all;

            if (slowestTests && slowestTests.length > 0) {
                console.log('\n🐢 SLOWEST TESTS:');

                const headers = ['No.', 'Test Name', 'Duration', 'Status', 'Suite'];
                const rows = slowestTests.slice(0, 20).map((test, idx) => [
                    String(idx + 1),
                    DisplayUtils.truncateText(test.name, 46),
                    `${test.duration}ms`,
                    test.status,
                    DisplayUtils.truncateText(test.suite, 37)
                ]);

                console.log(DisplayUtils.createTable(headers, rows));
            } else {
                console.log('\n🐢 No slow tests data available');
            }
        } else {
            console.log('\n🐢 No slow tests data available');
        }
    }

    printLargestFiles(results) {
        const staticData = results.static;
        if (staticData && staticData.largestFiles && staticData.largestFiles.length > 0) {
            console.log('\n📄 LARGEST FILES:');

            const headers = ['No.', 'File Path', 'Lines', 'Size'];
            const rows = staticData.largestFiles.slice(0, 20).map((file, idx) => [
                String(idx + 1),
                DisplayUtils.truncateText(file.path, 40),
                String(file.lines),
                DisplayUtils.formatFileSize(file.size)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n📄 No largest files data available');
        }
    }

    printLowestCoverageFiles(results) {
        const coverage = results.coverage;
        if (coverage && coverage.fileAnalysis && coverage.fileAnalysis.length > 0) {
            console.log('\n📉 LOWEST COVERAGE FILES:');

            const headers = ['No.', 'File Path', 'Lines', 'Covered', 'Uncover', 'Size', '%'];
            const rows = coverage.fileAnalysis.slice(0, 20).map((file, idx) => [
                String(idx + 1),
                DisplayUtils.truncateText(file.filePath, 32),
                String(file.statements),
                String(file.covered),
                String(file.uncovered),
                DisplayUtils.formatFileSize(file.size),
                DisplayUtils.formatPercentage(file.lineCoverage / 100, 1)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n📉 No lowest coverage files data available');
        }
    }

    printCoverageByDirectory(results) {
        const coverage = results.coverage;
        if (coverage && coverage.detailedAnalysis && coverage.detailedAnalysis.directoriesSorted) {
            console.log('\n📁 COVERAGE BY DIRECTORY:');

            const headers = ['No.', 'Directory', 'Files', 'Stmts', '%'];
            const rows = coverage.detailedAnalysis.directoriesSorted.slice(0, 20).map((dir, idx) => [
                String(idx + 1),
                DisplayUtils.truncateText(dir.directory, 32),
                String(dir.files),
                String(dir.statements),
                DisplayUtils.formatPercentage(dir.coveragePercent / 100, 1)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n📁 No directory coverage data available');
        }
    }

    printLargestDirectories(results) {
        const staticData = results.static;
        if (staticData && staticData.largestDirectories && staticData.largestDirectories.length > 0) {
            console.log('\n🏗️  LARGEST DIRECTORIES (by lines):');

            const headers = ['No.', 'Directory', 'Lines', 'Files', 'JS Files'];
            const rows = staticData.largestDirectories.slice(0, 20).map((dir, idx) => [
                String(idx + 1),
                DisplayUtils.truncateText(dir.path, 32),
                String(dir.lines),
                String(dir.files),
                String(dir.jsFiles)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n🏗️  No largest directories data available');
        }
    }

    printMostFilesDirectories(results) {
        const staticData = results.static;
        if (staticData && staticData.largestFileCountDirectories && staticData.largestFileCountDirectories.length > 0) {
            console.log('\n📂 DIRECTORIES WITH MOST FILES:');

            const headers = ['No.', 'Directory', 'Files', 'Lines', 'JS Files'];
            const rows = staticData.largestFileCountDirectories.slice(0, 20).map((dir, idx) => [
                String(idx + 1),
                DisplayUtils.truncateText(dir.path, 32),
                String(dir.files),
                String(dir.lines),
                String(dir.jsFiles)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n📂 No most files directories data available');
        }
    }

    printComplexityByDirectory(results) {
        const staticData = results.static;
        if (staticData && staticData.complexityByDirectory && staticData.complexityByDirectory.length > 0) {
            console.log('\n🧩 COMPLEXITY BY DIRECTORY:');

            const headers = ['No.', 'Directory', 'Complexity', 'Files', 'JS Files'];
            const rows = staticData.complexityByDirectory.slice(0, 20).map((dir, idx) => [
                String(idx + 1),
                DisplayUtils.truncateText(dir.path, 32),
                String(dir.complexity),
                String(dir.files),
                String(dir.jsFiles)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n🧩 No complexity by directory data available');
        }
    }
}

// Factory for creating analyzers
class AnalyzerFactory {
    static createAnalyzer(type, options, verbose) {
        switch (type) {
            case 'tests':
                return new TestAnalyzer(options, verbose);
            case 'coverage':
                return new CoverageAnalyzer(options, verbose);
            case 'project':
                return new ProjectAnalyzer(options, verbose);
            case 'static':
                return new StaticAnalyzer(options, verbose);
            case 'requirements':
                return new RequirementsAnalyzer(options, verbose);
            case 'featurespecs':
                return new FeatureSpecificationAnalyzer(options, verbose);
            case 'technicaldebt':
                return new TechnicalDebtAnalyzer(options, verbose);
            case 'architecture':
                return new ArchitectureAnalyzer(options, verbose);
            case 'planning':
                return new PlanningAnalyzer(options, verbose);
            default:
                throw new Error(`Unknown analyzer type: ${type}`);
        }
    }

    static getAllAnalyzerTypes() {
        return ['tests', 'coverage', 'project', 'static', 'requirements', 'featurespecs', 'technicaldebt', 'architecture', 'planning'];
    }
}

// Configuration management for self-analyzer
class SelfAnalyzerConfig {
    constructor(options = {}) {
        this.defaults = {
            all: true,
            verbose: false,
            summaryOnly: false,
            slowest: false,
            timeout: 180000, // 3 minutes default timeout
            cacheEnabled: true,
            cacheTTL: 600000, // 10 minutes default cache time
            maxResultSize: 10000, // Maximum number of results to store
            debug: false,
            analyzeConcurrency: 1 // Number of concurrent analyses (1 = sequential)
        };

        // Merge options with defaults
        this.settings = {...this.defaults, ...options};

        // Validate configuration
        this.validate();
    }

    validate() {
        // Validate timeout
        if (typeof this.settings.timeout !== 'number' || this.settings.timeout <= 0) {
            this.settings.timeout = this.defaults.timeout;
        }

        // Validate cache settings
        if (typeof this.settings.cacheTTL !== 'number' || this.settings.cacheTTL <= 0) {
            this.settings.cacheTTL = this.defaults.cacheTTL;
        }

        // Validate concurrency
        if (typeof this.settings.analyzeConcurrency !== 'number' || this.settings.analyzeConcurrency < 1) {
            this.settings.analyzeConcurrency = this.defaults.analyzeConcurrency;
        }
    }

    update(options = {}) {
        this.settings = {...this.settings, ...options};
        this.validate();
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.validate();
    }

    getAll() {
        return {...this.settings};
    }
}

class SeNARSSelfAnalyzer {
    constructor(options = {}) {
        this.config = new SelfAnalyzerConfig(options);

        // If any specific analysis is requested, turn off 'all' mode
        if (AnalyzerFactory.getAllAnalyzerTypes().some(category => this.config.get(category))) {
            this.config.set('all', false);
        }

        this.analyzers = {};
        for (const type of AnalyzerFactory.getAllAnalyzerTypes()) {
            this.analyzers[type] = AnalyzerFactory.createAnalyzer(type, this.config.getAll(), this.config.get('verbose'));
        }

        this.display = new ResultDisplay(this.config.getAll());

        // NAR integration properties
        this.nar = null;
        this.integrationEnabled = false;

        // Result caching
        this.resultCache = new Map();
        this.cacheTimestamps = new Map();
    }

    /**
     * Connect to a NAR instance for reasoning integration
     * @param {Object} narInstance - The NAR instance to connect to
     */
    connectToNAR(narInstance) {
        this.nar = narInstance;
        this.integrationEnabled = !!narInstance;
    }

    /**
     * Enable or disable NAR integration
     * @param {boolean} enabled - Whether to enable integration
     */
    setIntegrationEnabled(enabled) {
        this.integrationEnabled = enabled;
    }

    /**
     * Get cache key for the current configuration
     */
    _getCacheKey() {
        const activeAnalyses = Object.keys(this.analyzers)
            .filter(category => this.config.get('all') || this.config.get(category))
            .sort()
            .join(',');

        return `analysis_${activeAnalyses}_v1`;
    }

    /**
     * Check if results are cached and valid
     */
    _getCachedResults() {
        if (!this.config.get('cacheEnabled')) {
            return null;
        }

        const cacheKey = this._getCacheKey();
        const cachedResults = this.resultCache.get(cacheKey);
        const cachedTime = this.cacheTimestamps.get(cacheKey);

        if (cachedResults && cachedTime) {
            const age = Date.now() - cachedTime;
            if (age < this.config.get('cacheTTL')) {
                if (this.config.get('verbose')) {
                    console.log(`📊 Using cached results (age: ${(age / 1000).toFixed(1)}s)`);
                }
                return cachedResults;
            } else {
                // Remove expired cache
                this.resultCache.delete(cacheKey);
                this.cacheTimestamps.delete(cacheKey);
            }
        }

        return null;
    }

    /**
     * Cache the results
     */
    _cacheResults(results) {
        if (!this.config.get('cacheEnabled')) {
            return;
        }

        const cacheKey = this._getCacheKey();
        this.resultCache.set(cacheKey, results);
        this.cacheTimestamps.set(cacheKey, Date.now());

        // Limit cache size
        if (this.resultCache.size > 10) { // Keep only recent 10 caches
            const keys = Array.from(this.resultCache.keys());
            for (let i = 0; i < keys.length - 10; i++) {
                this.resultCache.delete(keys[i]);
                this.cacheTimestamps.delete(keys[i]);
            }
        }
    }

    async runAnalysis() {
        // Check cache first
        const cachedResults = this._getCachedResults();
        if (cachedResults) {
            const results = cachedResults;

            // Display results based on requested analyses
            this.display.display(results);

            // Show additional tables if requested or in default mode
            if (this.config.get('slowest') || (this.config.get('all') && !this.config.get('summaryOnly'))) {
                this.display.printSlowestTests(results);
            }

            if (this.config.get('all') && !this.config.get('summaryOnly') && results.static) {
                this.display.printLargestFiles(results);
                this.display.printLargestDirectories(results);
                this.display.printMostFilesDirectories(results);
                this.display.printComplexityByDirectory(results);
            }

            if (this.config.get('all') && !this.config.get('summaryOnly') && results.coverage) {
                this.display.printLowestCoverageFiles(results);
                this.display.printCoverageByDirectory(results);
            }

            // If NAR integration is enabled, send results to NAR for reasoning
            if (this.integrationEnabled && this.nar) {
                await this._integrateWithNAR(results);
            }

            return results;
        }

        // Run analysis if not cached
        if (!this.config.get('summaryOnly') && !this.config.get('verbose')) {
            console.log('🔍 SeNARS Self-Analysis');
        }

        const results = {};

        // Run only the analyses requested via flags
        // Use concurrency setting to determine if analyses run in parallel or sequence
        if (this.config.get('analyzeConcurrency') > 1) {
            // Run analyses in parallel (up to the concurrency limit)
            const categoriesToRun = Object.entries(this.analyzers)
                .filter(([category, analyzer]) => this.config.get('all') || this.config.get(category))
                .map(([category, analyzer]) => ({category, analyzer}));

            // Split into batches based on concurrency
            for (let i = 0; i < categoriesToRun.length; i += this.config.get('analyzeConcurrency')) {
                const batch = categoriesToRun.slice(i, i + this.config.get('analyzeConcurrency'));
                const batchPromises = batch.map(async ({category, analyzer}) => {
                    try {
                        const result = await analyzer.analyze();
                        results[category] = result;
                    } catch (error) {
                        results[category] = {error: `Analysis failed: ${error.message}`};
                    }
                });

                await Promise.all(batchPromises);
            }
        } else {
            // Run analyses sequentially
            for (const [category, analyzer] of Object.entries(this.analyzers)) {
                if (this.config.get('all') || this.config.get(category)) {
                    try {
                        results[category] = await analyzer.analyze();
                    } catch (error) {
                        results[category] = {error: `Analysis failed: ${error.message}`};
                    }
                }
            }
        }

        // Display results based on requested analyses
        this.display.display(results);

        // Show additional tables if requested or in default mode
        if (this.config.get('slowest') || (this.config.get('all') && !this.config.get('summaryOnly'))) {
            this.display.printSlowestTests(results);
        }

        if (this.config.get('all') && !this.config.get('summaryOnly') && results.static) {
            this.display.printLargestFiles(results);
            this.display.printLargestDirectories(results);
            this.display.printMostFilesDirectories(results);
            this.display.printComplexityByDirectory(results);
        }

        if (this.config.get('all') && !this.config.get('summaryOnly') && results.coverage) {
            this.display.printLowestCoverageFiles(results);
            this.display.printCoverageByDirectory(results);
        }

        // If NAR integration is enabled, send results to NAR for reasoning
        if (this.integrationEnabled && this.nar) {
            await this._integrateWithNAR(results);
        }

        // Cache the results
        this._cacheResults(results);

        return results;
    }

    /**
     * Clear the result cache
     */
    clearCache() {
        this.resultCache.clear();
        this.cacheTimestamps.clear();
    }

    /**
     * Get configuration instance
     */
    getConfig() {
        return this.config;
    }

    /**
     * Integrate analysis results with the NAR system
     * @private
     */
    async _integrateWithNAR(results) {
        if (!this.nar) return;

        try {
            // Convert key metrics to Narsese statements
            const narseseStatements = this._convertToNarsese(results);

            // Input each statement to the NAR
            for (const statement of narseseStatements) {
                await this.nar.input(statement);
            }

            console.log(`📊 Integrated ${narseseStatements.length} analysis facts with NAR`);

            // Additionally, convert actionable insights to goals
            const goalStatements = this._convertInsightsToGoals(results);
            for (const goal of goalStatements) {
                await this.nar.input(goal);
            }

            if (goalStatements.length > 0) {
                console.log(`🎯 Added ${goalStatements.length} improvement goals to NAR`);
            }
        } catch (error) {
            console.error('❌ Error integrating with NAR:', error);
        }
    }

    /**
     * Convert analysis results to Narsese statements
     * @private
     */
    _convertToNarsese(results) {
        const statements = [];

        // Convert test results
        if (results.tests && !results.tests.error) {
            const passRate = results.tests.passedTests / Math.max(results.tests.totalTests, 1);
            const qualityLevel = passRate > 0.95 ? 'high' : passRate > 0.8 ? 'medium' : 'low';
            statements.push(`<test_quality --> ${qualityLevel}>. %${passRate.toFixed(2)};0.90%`);

            // System stability
            const stability = results.tests.failedTests === 0 ? 'stable' : 'unstable';
            statements.push(`<system_stability --> ${stability}>. %${(1 - results.tests.failedTests / results.tests.totalTests).toFixed(2)};0.90%`);
        }

        // Convert coverage results
        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            const coverageLevel = results.coverage.lines > 80 ? 'high' :
                results.coverage.lines > 50 ? 'medium' : 'low';
            statements.push(`<test_coverage --> ${coverageLevel}>. %${(results.coverage.lines / 100).toFixed(2)};0.90%`);
        }

        // Convert static analysis results
        if (results.static && !results.static.error) {
            // Code complexity
            if (results.static.avgComplexity !== undefined) {
                const complexityLevel = results.static.avgComplexity > 30 ? 'high' :
                    results.static.avgComplexity > 15 ? 'medium' : 'low';
                statements.push(`<code_complexity --> ${complexityLevel}>. %${Math.min(1.0, results.static.avgComplexity / 50).toFixed(2)};0.90%`);
            }

            // Code size
            if (results.static.totalLines !== undefined) {
                const sizeLevel = results.static.totalLines > 50000 ? 'large' :
                    results.static.totalLines > 20000 ? 'medium' : 'small';
                statements.push(`<code_size --> ${sizeLevel}>. %${Math.min(1.0, results.static.totalLines / 50000).toFixed(2)};0.90%`);
            }
        }

        // Convert technical debt results
        if (results.technicaldebt && !results.technicaldebt.error) {
            const debtLevel = results.technicaldebt.totalDebtScore > 2000 ? 'high' :
                results.technicaldebt.totalDebtScore > 1000 ? 'medium' : 'low';
            statements.push(`<technical_debt --> ${debtLevel}>. %${Math.min(1.0, results.technicaldebt.totalDebtScore / 3000).toFixed(2)};0.90%`);
        }

        // Convert architecture results
        if (results.architecture && !results.architecture.error) {
            const dependencyQuality = results.architecture.cyclicDependencies === 0 ? 'good' : 'poor';
            statements.push(`<architecture_quality --> ${dependencyQuality}>. %${(1 - results.architecture.cyclicDependencies / 10).toFixed(2)};0.90%`);
        }

        return statements;
    }

    /**
     * Convert actionable insights from results to goals
     * @private
     */
    _convertInsightsToGoals(results) {
        const goals = [];

        // Add improvement goals based on analysis results
        if (results.tests && results.tests.failedTests > 0) {
            goals.push(`(improve_test_stability)! %0.9;0.9%`);
        }

        if (results.coverage && results.coverage.lines < 80) {
            goals.push(`(increase_test_coverage)! %0.8;0.9%`);
        }

        if (results.static && results.static.avgComplexity > 20) {
            goals.push(`(reduce_code_complexity)! %0.7;0.9%`);
        }

        if (results.technicaldebt && results.technicaldebt.totalDebtScore > 1000) {
            goals.push(`(reduce_technical_debt)! %0.9;0.9%`);
        }

        if (results.architecture && results.architecture.cyclicDependencies.length > 0) {
            goals.push(`(resolve_cyclic_dependencies)! %0.8;0.9%`);
        }

        return goals;
    }

    /**
     * Get structured analysis results for external consumption
     */
    async getStructuredResults() {
        const results = await this.runAnalysis();

        return {
            metadata: {
                timestamp: Date.now(),
                type: 'self-analysis',
                version: '1.0'
            },
            results: results,
            summary: this._createSummary(results)
        };
    }

    /**
     * Create a summary of the analysis results
     * @private
     */
    _createSummary(results) {
        const summary = {};

        if (results.tests && !results.tests.error) {
            summary.tests = {
                passed: results.tests.passedTests,
                total: results.tests.totalTests,
                passRate: Math.round((results.tests.passedTests / results.tests.totalTests) * 100),
                status: results.tests.status
            };
        }

        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            summary.coverage = {
                lines: results.coverage.lines,
                functions: results.coverage.functions,
                branches: results.coverage.branches
            };
        }

        if (results.static && !results.static.error) {
            summary.code = {
                files: results.static.jsFiles,
                lines: results.static.totalLines,
                avgLinesPerFile: results.static.avgLinesPerFile,
                avgComplexity: results.static.avgComplexity
            };
        }

        if (results.technicaldebt && !results.technicaldebt.error) {
            summary.debt = {
                totalScore: results.technicaldebt.totalDebtScore,
                avgPerFile: results.technicaldebt.avgDebtScore,
                highRisk: results.technicaldebt.highRiskFiles?.length || 0
            };
        }

        return summary;
    }
}

// CLI argument parsing
const ARGUMENTS_CONFIG = {
    all: {aliases: ['--all', '-a'], type: Boolean, category: 'analysis'},
    tests: {aliases: ['--tests', '-t'], type: Boolean, category: 'analysis'},
    coverage: {aliases: ['--coverage', '-c'], type: Boolean, category: 'analysis'},
    static: {aliases: ['--static', '-s'], type: Boolean, category: 'analysis'},
    project: {aliases: ['--project', '-p'], type: Boolean, category: 'analysis'},
    requirements: {aliases: ['--requirements', '-r'], type: Boolean, category: 'analysis'},
    featurespecs: {aliases: ['--features', '--featurespecs', '-f'], type: Boolean, category: 'analysis'},
    technicaldebt: {aliases: ['--technicaldebt', '--debt', '-d'], type: Boolean, category: 'analysis'},
    architecture: {aliases: ['--architecture', '--arch', '-ar'], type: Boolean, category: 'analysis'},
    planning: {aliases: ['--planning', '--plan', '-pl'], type: Boolean, category: 'analysis'},
    slowest: {aliases: ['--slowest', '-sl'], type: Boolean, category: 'output'},
    verbose: {aliases: ['--verbose', '-v'], type: Boolean, category: 'output'},
    summaryOnly: {aliases: ['--summary-only', '-S'], type: Boolean, category: 'output'},
    help: {aliases: ['--help', '-h'], type: Boolean, category: 'meta'}
};

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        tests: false, coverage: false, static: false,
        project: false, requirements: false, featurespecs: false,
        technicaldebt: false, architecture: false, planning: false,
        slowest: false, verbose: false, summaryOnly: false,
        all: true, help: false
    };

    let hasInvalidArgs = false;

    for (const arg of args) {
        let matched = false;

        for (const [optionName, config] of Object.entries(ARGUMENTS_CONFIG)) {
            if (config.aliases.includes(arg)) {
                options[optionName] = config.type === Boolean ? true : options[optionName];
                matched = true;

                // If a specific analysis is requested, turn off 'all' mode
                if (config.category === 'analysis' && optionName !== 'slowest') {
                    options.all = false;
                }
                break;
            }
        }

        if (!matched) {
            console.log(`❌ Unknown option: ${arg}`);
            hasInvalidArgs = true;
        }
    }

    // If there were invalid arguments, show help
    if (hasInvalidArgs) {
        options.help = true;
    }

    return options;
}

function showHelp() {
    console.log(`
SeNARS Self-Analysis Script
Uses the system to analyze its own development status and provide insights

Usage: node self-analyze.js [options]

Options:
  --all, -a             Run all analyses (default behavior)
  --tests, -t           Run only test analysis
  --coverage, -c        Run only coverage analysis
  --static, -s          Run only static code analysis
  --project, -p         Run only project info analysis
  --requirements, -r    Run only requirements analysis
  --features, -f        Run only feature specifications analysis
  --technicaldebt, -d   Run only technical debt analysis
  --architecture, -ar   Run only architecture analysis
  --planning, -pl       Run only planning indicators analysis
  --slowest, -sl        Show slowest tests analysis (works with test analysis)
  --verbose, -v         Verbose output
  --summary-only, -S    Show only summary output
  --help, -h            Show this help message

Examples:
  node self-analyze.js                    # Run all analyses (default)
  node self-analyze.js -t -v              # Verbose test analysis only
  node self-analyze.js --coverage --slowest # Coverage + slowest tests
  node self-analyze.js -S                 # Summary output only
  node self-analyze.js -f                 # Feature specifications analysis only
  node self-analyze.js -d                 # Technical debt analysis only
  node self-analyze.js -ar                # Architecture analysis only
  node self-analyze.js -pl                # Planning indicators analysis only
`);
}

// Run the analyzer
async function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        return;
    }

    const analyzer = new SeNARSSelfAnalyzer(options);
    await analyzer.runAnalysis();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (basename(__filename) === process.argv[1]?.split('/').pop()) {
    main().catch(err => {
        console.error('Analysis failed:', err);
        process.exit(1);
    });
}

export default SeNARSSelfAnalyzer;