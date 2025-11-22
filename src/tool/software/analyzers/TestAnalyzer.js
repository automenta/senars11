import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import * as dfd from 'danfojs';
import {collectTestFiles, isExcludedPath} from '../../../util/FileUtils.js';
import {runTestsAndGetCoverage} from '../../../util/Testing.js';
import {BaseAnalyzer} from './BaseAnalyzer.js';

const TOP_N = 20;

export class TestAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Unit Test Results...');

        return await this.safeAnalyze(async () => {
            // Try to run tests with coverage
            const testResult = await runTestsAndGetCoverage();

            if (testResult && (testResult.status === 0 || testResult.status === 1)) {
                const output = testResult.stdout || testResult.stderr;
                if (output) {
                    const parsedResult = this.parseTestOutput(output);

                    if (parsedResult && parsedResult.testResults) {
                        const individualTestResults = this.extractIndividualTestResults(parsedResult.testResults);
                        // Enhance test results with coverage data
                        const enhancedTestResults = await this.enhanceWithCoverageData(individualTestResults);
                        return this._buildTestResult(testResult, parsedResult, enhancedTestResults);
                    }
                }
            }

            // Fallback: try running tests without coverage
            return await this._runFallbackTest();
        }, 'Test collection failed');
    }

    _buildTestResult(testResult, parsedResult, individualTestResults) {
        // Prepare coverage analysis data
        const coverageAnalysis = {
            sourceFileToTestsMap: this.sourceFileToTestsMap || new Map(),
            testToSourceFilesMap: this.testToSourceFilesMap || new Map(),
            topFailingTestContributors: this.getTopFailingTestContributors(individualTestResults),
            topPassingTestSupporters: this.getTopPassingTestSupporters(individualTestResults),
            bottomPassingTestSupporters: this.getBottomPassingTestSupporters(individualTestResults),
            detailedFailingTestContributors: this.getDetailedFailingTestContributors(individualTestResults),
            detailedPassingTestSupporters: this.getDetailedPassingTestSupporters(individualTestResults)
        };

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
            testFiles: collectTestFiles(),
            failureAnalysis: this._analyzeFailures(individualTestResults),
            coverageAnalysis
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
        const testBasename = testSuiteName.startsWith('./') ? testSuiteName.substring(2) : testSuiteName;
        const nameWithoutExt = testBasename.replace(/\.[^/.]+$/, '');

        // Common test naming patterns
        if (nameWithoutExt.endsWith('.test') || nameWithoutExt.endsWith('.spec')) {
            const implName = nameWithoutExt.replace(/\.test$/, '').replace(/\.spec$/, '');
            possibleNames.push(implName + '.js');
        }

        // If test name contains implementation name
        possibleNames.push(nameWithoutExt + '.js');

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
                    severity: 'medium'
                });
            }
        }

        return causes;
    }

    getTopFailingTestContributors(individualTestResults) {
        if (!this.testToSourceFilesMap || this.testToSourceFilesMap.size === 0) return [];

        const fileFailureCounts = {};
        const fileFailureDetails = {};
        const failingTests = individualTestResults.filter(t => t.status === 'failed');

        for (const test of failingTests) {
            const sourceFiles = this.testToSourceFilesMap.get(test.fullName);
            if (sourceFiles) {
                for (const sourceFile of sourceFiles) {
                    fileFailureCounts[sourceFile] = (fileFailureCounts[sourceFile] || 0) + 1;

                    // Track detailed failure information
                    if (!fileFailureDetails[sourceFile]) {
                        fileFailureDetails[sourceFile] = {
                            failureMessages: [],
                            testNames: [],
                            failureTypes: {}
                        };
                    }

                    fileFailureDetails[sourceFile].testNames.push(test.fullName);
                    if (test.failureMessages) {
                        fileFailureDetails[sourceFile].failureMessages.push(...test.failureMessages);

                        // Categorize failure types
                        for (const message of test.failureMessages) {
                            let type = 'unknown';
                            if (message.includes('timeout')) {
                                type = 'timeout';
                            } else if (message.includes('undefined') || message.includes('null')) {
                                type = 'null_reference';
                            } else if (message.includes('not found') || message.includes('404')) {
                                type = 'not_found';
                            } else if (message.includes('expected') && message.includes('received')) {
                                type = 'assertion';
                            } else if (message.includes('Cannot read property') || message.includes('TypeError')) {
                                type = 'type_error';
                            }

                            fileFailureDetails[sourceFile].failureTypes[type] =
                                (fileFailureDetails[sourceFile].failureTypes[type] || 0) + 1;
                        }
                    }
                }
            }
        }

        return Object.entries(fileFailureCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, TOP_N)
            .map(([file, count]) => ({
                file,
                count,
                details: fileFailureDetails[file]
            }));
    }

    getDetailedFailingTestContributors(individualTestResults) {
        if (!this.testToSourceFilesMap || this.testToSourceFilesMap.size === 0) return [];

        const fileFailureAnalysis = {};
        const failingTests = individualTestResults.filter(t => t.status === 'failed');

        for (const test of failingTests) {
            const sourceFiles = this.testToSourceFilesMap.get(test.fullName);
            if (sourceFiles) {
                for (const sourceFile of sourceFiles) {
                    if (!fileFailureAnalysis[sourceFile]) {
                        fileFailureAnalysis[sourceFile] = {
                            failureCount: 0,
                            tests: [],
                            failurePatterns: {},
                            avgDuration: 0,
                            totalDuration: 0
                        };
                    }

                    const analysis = fileFailureAnalysis[sourceFile];
                    analysis.failureCount++;
                    analysis.tests.push({
                        name: test.fullName,
                        duration: test.duration || 0,
                        failureMessages: test.failureMessages || []
                    });

                    analysis.totalDuration += test.duration || 0;

                    // Analyze failure patterns
                    if (test.failureMessages) {
                        for (const message of test.failureMessages) {
                            let pattern = 'unknown';
                            if (message.includes('timeout')) {
                                pattern = 'timeout';
                            } else if (message.includes('undefined') || message.includes('null')) {
                                pattern = 'null_reference';
                            } else if (message.includes('not found')) {
                                pattern = 'resource_not_found';
                            } else if (message.includes('expected') && message.includes('received')) {
                                pattern = 'assertion_failure';
                            } else if (message.includes('Cannot read property') || message.includes('TypeError')) {
                                pattern = 'type_error';
                            }

                            analysis.failurePatterns[pattern] = (analysis.failurePatterns[pattern] || 0) + 1;
                        }
                    }
                }
            }
        }

        // Calculate average durations
        for (const [file, analysis] of Object.entries(fileFailureAnalysis)) {
            if (analysis.tests.length > 0) {
                analysis.avgDuration = analysis.totalDuration / analysis.tests.length;
            }
        }

        return Object.entries(fileFailureAnalysis)
            .sort(([, a], [, b]) => b.failureCount - a.failureCount)
            .slice(0, TOP_N)
            .map(([file, analysis]) => ({
                file,
                ...analysis
            }));
    }

    getTopPassingTestSupporters(individualTestResults) {
        if (!this.testToSourceFilesMap || this.testToSourceFilesMap.size === 0) return [];

        const fileSuccessCounts = {};
        const fileSuccessDetails = {};
        const passingTests = individualTestResults.filter(t => t.status === 'passed');

        for (const test of passingTests) {
            const sourceFiles = this.testToSourceFilesMap.get(test.fullName);
            if (sourceFiles) {
                for (const sourceFile of sourceFiles) {
                    fileSuccessCounts[sourceFile] = (fileSuccessCounts[sourceFile] || 0) + 1;

                    // Track detailed success information
                    if (!fileSuccessDetails[sourceFile]) {
                        fileSuccessDetails[sourceFile] = {
                            testNames: [],
                            totalDuration: 0,
                            avgDuration: 0
                        };
                    }

                    fileSuccessDetails[sourceFile].testNames.push(test.fullName);
                    fileSuccessDetails[sourceFile].totalDuration += test.duration || 0;
                }
            }
        }

        // Calculate average durations
        for (const [file, details] of Object.entries(fileSuccessDetails)) {
            if (details.testNames.length > 0) {
                details.avgDuration = details.totalDuration / details.testNames.length;
            }
        }

        return Object.entries(fileSuccessCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, TOP_N)
            .map(([file, count]) => ({
                file,
                count,
                details: fileSuccessDetails[file]
            }));
    }

    getBottomPassingTestSupporters(individualTestResults) {
        if (!this.testToSourceFilesMap || this.testToSourceFilesMap.size === 0) return [];

        const fileSuccessCounts = {};
        const fileSuccessDetails = {};
        const passingTests = individualTestResults.filter(t => t.status === 'passed');

        for (const test of passingTests) {
            const sourceFiles = this.testToSourceFilesMap.get(test.fullName);
            if (sourceFiles) {
                for (const sourceFile of sourceFiles) {
                    fileSuccessCounts[sourceFile] = (fileSuccessCounts[sourceFile] || 0) + 1;

                    // Track detailed success information
                    if (!fileSuccessDetails[sourceFile]) {
                        fileSuccessDetails[sourceFile] = {
                            testNames: [],
                            totalDuration: 0,
                            avgDuration: 0
                        };
                    }

                    fileSuccessDetails[sourceFile].testNames.push(test.fullName);
                    fileSuccessDetails[sourceFile].totalDuration += test.duration || 0;
                }
            }
        }

        // Also consider files that are not covered by any passing tests.
        const allSourceFiles = [...this.sourceFileToTestsMap.keys()];
        for (const sourceFile of allSourceFiles) {
            if (!fileSuccessCounts[sourceFile]) {
                fileSuccessCounts[sourceFile] = 0;
                fileSuccessDetails[sourceFile] = {
                    testNames: [],
                    totalDuration: 0,
                    avgDuration: 0
                };
            }
        }

        // Calculate average durations
        for (const [file, details] of Object.entries(fileSuccessDetails)) {
            if (details.testNames.length > 0) {
                details.avgDuration = details.totalDuration / details.testNames.length;
            }
        }

        return Object.entries(fileSuccessCounts)
            .sort(([, a], [, b]) => a - b)
            .slice(0, TOP_N)
            .map(([file, count]) => ({
                file,
                count,
                details: fileSuccessDetails[file]
            }));
    }

    getDetailedPassingTestSupporters(individualTestResults) {
        if (!this.testToSourceFilesMap || this.testToSourceFilesMap.size === 0) return [];

        const fileSuccessAnalysis = {};
        const passingTests = individualTestResults.filter(t => t.status === 'passed');

        for (const test of passingTests) {
            const sourceFiles = this.testToSourceFilesMap.get(test.fullName);
            if (sourceFiles) {
                for (const sourceFile of sourceFiles) {
                    if (!fileSuccessAnalysis[sourceFile]) {
                        fileSuccessAnalysis[sourceFile] = {
                            successCount: 0,
                            tests: [],
                            totalDuration: 0,
                            avgDuration: 0,
                            minDuration: Infinity,
                            maxDuration: 0
                        };
                    }

                    const analysis = fileSuccessAnalysis[sourceFile];
                    analysis.successCount++;
                    analysis.tests.push({
                        name: test.fullName,
                        duration: test.duration || 0
                    });

                    const duration = test.duration || 0;
                    analysis.totalDuration += duration;
                    analysis.minDuration = Math.min(analysis.minDuration, duration);
                    analysis.maxDuration = Math.max(analysis.maxDuration, duration);
                }
            }
        }

        // Calculate average durations
        for (const [file, analysis] of Object.entries(fileSuccessAnalysis)) {
            if (analysis.successCount > 0) {
                analysis.avgDuration = analysis.totalDuration / analysis.successCount;
            }

            // Handle edge cases
            if (analysis.minDuration === Infinity) {
                analysis.minDuration = 0;
            }
        }

        return Object.entries(fileSuccessAnalysis)
            .sort(([, a], [, b]) => b.successCount - a.successCount)
            .slice(0, TOP_N)
            .map(([file, analysis]) => ({
                file,
                ...analysis
            }));
    }

    async enhanceWithCoverageData(individualTestResults) {
        this.log('Enhancing test results with detailed coverage data...');
        const testToSourceFilesMap = new Map();
        const sourceFileToTestsMap = new Map();

        const testFiles = [...new Set(individualTestResults.map(t => t.suite))];

        for (const testFile of testFiles) {
            this.log(`  - Analyzing coverage for: ${testFile}`);
            try {
                const jestRun = spawnSync('npx', [
                    'jest',
                    '--config', 'jest.config.cjs',
                    '--coverage',
                    '--coverageReporters=json',
                    '--json',
                    testFile
                ], {
                    cwd: process.cwd(),
                    timeout: 60000,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: {...process.env, NODE_NO_WARNINGS: '1', NODE_OPTIONS: '--experimental-vm-modules'}
                });

                if (jestRun.stdout) {
                    const result = JSON.parse(jestRun.stdout);
                    if (result.coverageMap) {
                        const coveredFiles = Object.keys(result.coverageMap);
                        const sourceFiles = coveredFiles
                            .map(f => path.relative(process.cwd(), f))
                            .filter(f => f.startsWith('src' + path.sep) && !isExcludedPath(f));

                        const testsInFile = individualTestResults.filter(t => t.suite === testFile);
                        for (const test of testsInFile) {
                            testToSourceFilesMap.set(test.fullName, sourceFiles);
                        }

                        for (const sourceFile of sourceFiles) {
                            if (!sourceFileToTestsMap.has(sourceFile)) {
                                sourceFileToTestsMap.set(sourceFile, []);
                            }
                            sourceFileToTestsMap.get(sourceFile).push(...testsInFile.map(t => ({
                                testName: t.fullName,
                                testStatus: t.status,
                            })));
                        }
                    }
                }
            } catch (error) {
                this.log(`  - Failed to get coverage for ${testFile}: ${error.message}`, 'warn');
            }
        }

        this.testToSourceFilesMap = testToSourceFilesMap;
        this.sourceFileToTestsMap = sourceFileToTestsMap;

        const enhancedTestResults = individualTestResults.map(testResult => {
            const coveredSourceFiles = this.testToSourceFilesMap.get(testResult.fullName) || [];
            return {...testResult, coveredSourceFiles};
        });

        this.log('Finished enhancing test results.');
        return enhancedTestResults;
    }

    async _runFallbackTest() {
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

        if (jestResult.status === 0 || jestResult.status === 1) {
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
                const jsonMatch = output.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonStr = jsonMatch[0];
                    const fallbackParsed = JSON.parse(jsonStr);
                    if (fallbackParsed.testResults) {
                        const individualTestResults = this.extractIndividualTestResults(fallbackParsed.testResults);
                        return this._buildTestResult(altTestResult, fallbackParsed, individualTestResults);
                    }
                } else {
                    const fallbackParsed = JSON.parse(output.trim());
                    if (fallbackParsed.testResults) {
                        const individualTestResults = this.extractIndividualTestResults(fallbackParsed.testResults);
                        return this._buildTestResult(altTestResult, fallbackParsed, individualTestResults);
                    }
                }
            } catch (parseError) {
                this.log('❌ Fallback test result parsing failed:', 'error', {error: parseError.message});
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
            testFiles: collectTestFiles(),
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
            const testDirectory = testSuite.testFilePath ? path.dirname(testSuite.testFilePath) : (suiteName ? path.dirname(suiteName) : '');

            if (testSuite.assertionResults) {
                for (const testResult of testSuite.assertionResults) {
                    individualResults.push({
                        name: testResult.title,
                        status: testResult.status,
                        duration: testResult.duration || 0,
                        suite: suiteName,
                        directory: testDirectory,
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
            const testDf = new dfd.DataFrame(individualTestResults);

            const durationValues = testDf['duration'].values;
            const validIndices = [];
            for (let i = 0; i < durationValues.length; i++) {
                if (durationValues[i] > 0) {
                    validIndices.push(i);
                }
            }

            if (validIndices.length > 0) {
                const validTests = validIndices.map(i => individualTestResults[i]);
                const sortedValidTests = [...validTests].sort((a, b) => b.duration - a.duration);

                const slowestTests = sortedValidTests.slice(0, TOP_N).map(test => ({
                    name: test.name,
                    duration: test.duration,
                    suite: test.suite,
                    directory: test.directory,
                    status: test.status
                }));

                const testsByDirectory = {};
                for (const test of validTests) {
                    if (!testsByDirectory[test.directory]) {
                        testsByDirectory[test.directory] = [];
                    }
                    testsByDirectory[test.directory].push(test);
                }

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
                all: [],
                byDirectory: {}
            };
        } catch (error) {
            this.log(`⚠️ Error processing tests with danfojs: ${error.message}`, 'warn');
            const sortedTests = [...individualTestResults]
                .filter(test => test.duration && test.duration > 0)
                .sort((a, b) => b.duration - a.duration);

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
                slowestTestsByDir[dir] = sortedDirTests.slice(0, 3);
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
