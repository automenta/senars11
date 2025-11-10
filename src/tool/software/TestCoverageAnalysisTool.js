/**
 * @file src/tools/analysis/TestCoverageAnalysisTool.js
 * @description Tool for analyzing test coverage and source code relationships
 */

import {SoftwareAnalysisTool} from './SoftwareAnalysisTool.js';
import fs from 'fs';
import path from 'path';

/**
 * Tool for analyzing test coverage and mapping source code relationships to tests
 */
export class TestCoverageAnalysisTool extends SoftwareAnalysisTool {
    constructor(config = {}) {
        super(config);
        this.name = 'TestCoverageAnalysisTool';
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        return 'Analyzes test coverage metrics and maps source code relationships to tests for causal analysis';
    }

    /**
     * Get parameter schema for the tool
     * @returns {object} - Parameter schema
     */
    getParameterSchema() {
        return {
            type: 'object',
            properties: {
                verbose: {
                    type: 'boolean',
                    description: 'Enable verbose output',
                    default: false
                },
                topN: {
                    type: 'number',
                    description: 'Number of top results to show',
                    default: 10
                },
                includeFailing: {
                    type: 'boolean',
                    description: 'Include failing test analysis',
                    default: true
                },
                includePassing: {
                    type: 'boolean',
                    description: 'Include passing test analysis',
                    default: true
                }
            },
            required: []
        };
    }

    /**
     * Perform the test coverage analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        const {verbose = false, topN = 10, includeFailing = true, includePassing = true} = params;

        // Collect test file relationships and coverage data
        const testResults = await this._collectTestResults();
        const coverageData = await this._collectCoverageData();
        
        // Only perform detailed source mapping if we have actual test results
        let sourceMappings = {};
        if (testResults.totalTests > 0) {
            sourceMappings = await this._mapSourceToTests(testResults, coverageData);
        } else {
            // If no actual test results, still try to map based on file structure
            sourceMappings = await this._mapSourceToTests(testResults, coverageData);
        }

        const results = {
            summary: {
                totalTests: testResults.totalTests || 0,
                passedTests: testResults.passedTests || 0,
                failedTests: Array.isArray(testResults.failedTests) ? testResults.failedTests.length : testResults.failedTests || 0,
                coveragePercentage: coverageData?.lines || 0
            }
        };

        // Only analyze if we have actual test results
        if (testResults.totalTests > 0) {
            // Analyze culprits of failing tests
            if (includeFailing && Array.isArray(testResults.failedTests) && testResults.failedTests.length > 0) {
                results.failingTestCulprits = await this._analyzeFailingTestCulprits(testResults.failedTests, sourceMappings, topN);
            }

            // Analyze supports of passing tests
            if (includePassing && Array.isArray(testResults.passedTestDetails) && testResults.passedTestDetails.length > 0) {
                results.passingTestSupports = await this._analyzePassingTestSupports(testResults.passedTestDetails, sourceMappings, topN);
            } else if (includePassing && Array.isArray(testResults.passedTestDetails) && testResults.passedTestDetails.length === 0 && Array.isArray(testResults.passedTestFiles) && testResults.passedTestFiles.length > 0) {
                // Fallback to using the passed test files if detailed test info is not available
                results.passingTestSupports = await this._analyzePassingTestSupports(testResults.passedTestFiles, sourceMappings, topN);
            }
        } else {
            // When no test results, we can't provide meaningful test-to-source mappings
            results.failingTestCulprits = [];
            results.passingTestSupports = {
                topSupports: [],
                bottomSupports: []
            };
        }

        // Additional causal analysis (but results quality depends on having real test data)
        results.causalAnalysis = await this._performCausalAnalysis(sourceMappings, topN);

        if (verbose) {
            console.log('🔍 Test Coverage Analysis completed');
            console.log(`📊 Total tests: ${results.summary.totalTests}`);
            console.log(`✅ Passed: ${results.summary.passedTests}`);
            console.log(`❌ Failed: ${results.summary.failedTests}`);
            console.log(`📈 Coverage: ${results.summary.coveragePercentage}%`);
        }

        return results;
    }

    /**
     * Collect test results from the project
     * @private
     */
    async _collectTestResults() {
        // This would normally run tests and collect results
        // For now, we'll simulate by reading existing test reports
        // In a real implementation, we'd run the test framework
        try {
            // Try to read existing test report from various common locations
            const possiblePaths = [
                './test-results.json', 
                './test-result.json', 
                './junit.xml', // check if this should be parsed differently
                './coverage/test-results.json' // some coverage setups output here
            ];
            
            for (const path of possiblePaths) {
                if (fs.existsSync(path)) {
                    const testReport = JSON.parse(fs.readFileSync(path, 'utf8'));
                    return this._parseTestReport(testReport);
                }
            }

            // If no existing test report, try to run tests to get results
            const {spawnSync} = await import('child_process');
            // Try different possible config file names
            const possibleConfigs = ['jest.config.cjs', 'jest.config.js', 'jest.config.json', 'package.json'];
            
            for (const config of possibleConfigs) {
                if (fs.existsSync(config)) {
                    const testResult = spawnSync('npx', ['jest', `--config`, config, '--json', '--testLocationInResults', '--verbose=false'], {
                        cwd: process.cwd(),
                        timeout: 180000, // 3 minutes timeout
                        encoding: 'utf8',
                        stdio: ['pipe', 'pipe', 'pipe'],
                        env: {
                            ...process.env,
                            NODE_NO_WARNINGS: '1',
                            NODE_OPTIONS: '--experimental-vm-modules'
                        }
                    });

                    if (testResult.status === 0 && testResult.stdout) {
                        try {
                            // Jest might output additional text alongside JSON, so parse carefully
                            let output = testResult.stdout.trim();
                            
                            // Find the JSON part in the output (Jest sometimes prefixes with extra messages)
                            const jsonStart = output.indexOf('{');
                            const jsonEnd = output.lastIndexOf('}') + 1;
                            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                                output = output.substring(jsonStart, jsonEnd);
                            }
                            
                            const testOutput = JSON.parse(output);
                            return this._parseTestReport(testOutput);
                        } catch (parseError) {
                            // If parsing fails, try other config files
                            continue;
                        }
                    }
                }
            }

            // If all configs fail, try running without explicit config
            const testResult = spawnSync('npx', ['jest', '--json', '--testLocationInResults'], {
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

            if (testResult.status === 0 && testResult.stdout) {
                try {
                    let output = testResult.stdout.trim();
                    
                    // Find the JSON part in the output
                    const jsonStart = output.indexOf('{');
                    const jsonEnd = output.lastIndexOf('}') + 1;
                    if (jsonStart !== -1 && jsonEnd > jsonStart) {
                        output = output.substring(jsonStart, jsonEnd);
                    }
                    
                    const testOutput = JSON.parse(output);
                    return this._parseTestReport(testOutput);
                } catch (parseError) {
                    console.debug('Failed to parse Jest output with auto-detection');
                }
            }

            console.log('⚠️ No test results file found and jest execution did not produce results');
            return {
                totalTests: 0,
                passedTests: 0,
                failedTests: [],
                passedTestDetails: []
            };
        } catch (error) {
            console.error('❌ Error collecting test results:', error.message);
            console.error('Stack:', error.stack);
            return {
                totalTests: 0,
                passedTests: 0,
                failedTests: [],
                passedTestDetails: []
            };
        }
    }

    /**
     * Parse test report into structured format
     * @private
     */
    _parseTestReport(testReport) {
        if (!testReport || !testReport.numTotalTestSuites) {
            return {
                totalTests: 0,
                passedTests: 0,
                failedTests: [],
                passedTestDetails: []
            };
        }

        const results = {
            totalTests: testReport.numTotalTests || 0,
            passedTests: testReport.numPassedTests || 0,
            failedTests: [],
            passedTestDetails: []
        };

        // Extract failed and passed tests from test suites
        if (testReport.testResults) {
            for (const suite of testReport.testResults) {
                if (suite.testResults) {
                    for (const test of suite.testResults) {
                        if (test.status === 'failed') {
                            results.failedTests.push({
                                name: test.title,
                                file: suite.name,
                                duration: test.duration,
                                errors: test.failureMessages || []
                            });
                        } else if (test.status === 'passed') {
                            results.passedTestDetails.push({
                                name: test.title,
                                file: suite.name,
                                duration: test.duration
                            });
                        }
                    }
                }
            }
        }

        return results;
    }

    /**
     * Collect coverage data
     * @private
     */
    async _collectCoverageData() {
        try {
            if (fs.existsSync('./coverage/coverage-summary.json')) {
                const coverageSummary = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json', 'utf8'));
                if (coverageSummary && coverageSummary.total) {
                    const total = coverageSummary.total;
                    return {
                        lines: total.lines.pct,
                        statements: total.statements.pct,
                        functions: total.functions.pct,
                        branches: total.branches.pct
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Error collecting coverage data:', error.message);
            return null;
        }
    }

    /**
     * Map source files to test relationships
     * @private
     */
    async _mapSourceToTests(testResults, coverageData) {
        // This would involve more complex analysis of how tests interact with source files
        // For now, we'll create a basic mapping based on file paths and coverage

        const sourceToTestMap = {};

        // Collect all test files to process
        const allTests = [...(testResults.passedTestDetails || []), ...(testResults.failedTests || [])];

        if (allTests.length === 0) {
            // If no test results found, try to map based on file structure
            return this._mapByFileStructure();
        }

        // Group tests by their test file path first (not individual test cases)
        // This ensures that all test cases from the same test file are treated together
        const testsByFile = {};
        for (const test of allTests) {
            if (!testsByFile[test.file]) {
                testsByFile[test.file] = [];
            }
            testsByFile[test.file].push(test);
        }

        // Simplified and more direct mapping approach to ensure proper grouping
        for (const [testFilePath, testGroup] of Object.entries(testsByFile)) {
            let foundMapping = false;

            // First, try simple and direct conversions that are most likely to succeed
            const basename = path.basename(testFilePath, path.extname(testFilePath))
                .replace(/(\.test|_test|test_|\.spec|_spec|spec_|Test)/g, '');

            // Try most common mappings in order of likelihood
            const potentialMappings = [
                // Direct directory mapping: tests/unit/task/Task.test.js -> src/task/Task.js
                testFilePath.replace(/tests?[\/\\](unit|integration|e2e)[\/\\]/, 'src/').replace(/(\.test|_test|test_|\.spec|_spec|spec_)/g, ''),
                // Direct conversion: tests/somepath/file.test.js -> src/somepath/file.js
                testFilePath.replace(/tests?[\/\\]/, 'src/').replace(/(\.test|_test|test_|\.spec|_spec|spec_)/g, ''),
                // Alternative: try to find by basename in src directory
                path.join('src', basename + '.js'),
                // Check in common subdirectories
                ...['core', 'task', 'memory', 'reason', 'utils', 'util'].map(subdir => path.join('src', subdir, basename + '.js'))
            ];

            // Check each potential mapping
            for (const mapping of potentialMappings) {
                const normalizedMapping = mapping.replace(/\\/g, '/'); // Normalize path separators
                if (fs.existsSync(normalizedMapping) && path.extname(normalizedMapping) === '.js') {
                    if (!sourceToTestMap[normalizedMapping]) {
                        sourceToTestMap[normalizedMapping] = [];
                    }
                    for (const test of testGroup) {
                        const testAlreadyAdded = sourceToTestMap[normalizedMapping].some(t =>
                            t.name === test.name && t.file === test.file
                        );
                        if (!testAlreadyAdded) {
                            sourceToTestMap[normalizedMapping].push(test);
                        }
                    }
                    foundMapping = true;
                    break; // Use first valid mapping to avoid over-duplication
                }
            }

            // If no mapping found with patterns, try to find by basename across all source files
            if (!foundMapping) {
                const allSourceFiles = this._getAllSourceFiles();
                const matchingSource = allSourceFiles.find(sourceFile => {
                    const sourceBasename = path.basename(sourceFile, path.extname(sourceFile));
                    return sourceBasename === basename;
                });

                if (matchingSource && fs.existsSync(matchingSource)) {
                    if (!sourceToTestMap[matchingSource]) {
                        sourceToTestMap[matchingSource] = [];
                    }
                    for (const test of testGroup) {
                        const testAlreadyAdded = sourceToTestMap[matchingSource].some(t =>
                            t.name === test.name && t.file === test.file
                        );
                        if (!testAlreadyAdded) {
                            sourceToTestMap[matchingSource].push(test);
                        }
                    }
                    foundMapping = true;
                }
            }
        }

        return sourceToTestMap;
    }

    /**
     * Map by file structure when no test results available
     * @private
     */
    _mapByFileStructure() {
        const sourceToTestMap = {};

        // Look for common patterns in the project structure
        const testDirs = ['tests', 'test', 'spec', '__tests__'];
        const sourceDirs = ['src', 'lib', 'source'];

        // Get all source files first
        const allSourceFiles = this._getAllSourceFiles();

        for (const sourceFile of allSourceFiles) {
            // Extract basename to match with test files
            const sourceBasename = path.basename(sourceFile, '.js');
            
            // Look for corresponding test files in various patterns
            for (const testDir of testDirs) {
                const testPatterns = [
                    path.join(testDir, sourceBasename + '.test.js'),
                    path.join(testDir, sourceBasename + '.spec.js'),
                    path.join(testDir, sourceBasename + '_test.js'),
                    path.join(testDir, sourceBasename + '_spec.js'),
                    // Also check subdirectories that might mirror src structure
                    ...['unit', 'integration', 'e2e'].map(subdir => 
                        path.join(testDir, subdir, sourceBasename + '.test.js')
                    )
                ];

                for (const testPattern of testPatterns) {
                    if (fs.existsSync(testPattern)) {
                        if (!sourceToTestMap[sourceFile]) {
                            sourceToTestMap[sourceFile] = [];
                        }
                        // Create a mock test object
                        sourceToTestMap[sourceFile].push({
                            name: path.basename(testPattern),
                            file: testPattern,
                            duration: 0
                        });
                        // Don't break - a source file might have multiple test files
                    }
                }
            }
        }

        return sourceToTestMap;
    }

    /**
     * Recursively scan directory
     * @private
     */
    _scanDirectory(dir, callback) {
        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                this._scanDirectory(fullPath, callback);
            } else {
                callback(fullPath);
            }
        }
    }

    /**
     * Analyze culprits of failing tests
     * @private
     */
    async _analyzeFailingTestCulprits(failedTests, sourceMappings, topN) {
        // Count how often each source file is associated with failing tests
        const culpritCounts = {};

        for (const test of failedTests) {
            for (const [sourceFile, tests] of Object.entries(sourceMappings)) {
                if (tests.some(t => t.name === test.name)) {
                    culpritCounts[sourceFile] = (culpritCounts[sourceFile] || 0) + 1;
                }
            }
        }

        // Sort by count and return top N
        const sortedCulprits = Object.entries(culpritCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([sourceFile, count]) => ({
                sourceFile,
                failingTestCount: count
            }));

        return sortedCulprits;
    }

    /**
     * Analyze supports of passing tests
     * @private
     */
    async _analyzePassingTestSupports(passedTests, sourceMappings, topN) {
        // Count how often each source file is associated with passing tests
        const supportCounts = {};

        for (const test of passedTests) {
            for (const [sourceFile, tests] of Object.entries(sourceMappings)) {
                if (tests.some(t => t.name === test.name)) {
                    supportCounts[sourceFile] = (supportCounts[sourceFile] || 0) + 1;
                }
            }
        }

        // Sort by count and return top N and bottom N
        const sortedSupports = Object.entries(supportCounts)
            .sort((a, b) => b[1] - a[1]);

        const topSupports = sortedSupports
            .slice(0, topN)
            .map(([sourceFile, count]) => ({
                sourceFile,
                passingTestCount: count
            }));

        const bottomSupports = sortedSupports
            .slice(Math.max(0, sortedSupports.length - topN))
            .reverse()
            .map(([sourceFile, count]) => ({
                sourceFile,
                passingTestCount: count
            }));

        return {
            topSupports,
            bottomSupports
        };
    }

    /**
     * Perform general causal analysis
     * @private
     */
    async _performCausalAnalysis(sourceMappings, topN) {
        const analysis = {
            highCausalFiles: [],  // Files involved in many tests
            lowCausalFiles: [],   // Files involved in few tests
            testCohesion: {}      // How cohesive tests are around certain files
        };

        // Calculate how many tests each source file is involved in
        const fileTestCounts = {};
        for (const [sourceFile, tests] of Object.entries(sourceMappings)) {
            fileTestCounts[sourceFile] = tests.length;
        }

        // If all files have the same low test count (e.g., 1), the data is likely artificial
        // and not meaningful for ranking
        const testCounts = Object.values(fileTestCounts);
        if (testCounts.length > 0) {
            const uniqueCounts = [...new Set(testCounts)];
            
            // If all counts are the same and low (e.g., all 1s), it's likely artificial mapping
            if (uniqueCounts.length === 1 && uniqueCounts[0] <= 1) {
                // In this case, don't return any meaningful ranking since the data isn't reliable
                // Instead, we'll just return empty arrays indicating unreliable data
                return {
                    highCausalFiles: [],
                    lowCausalFiles: [],
                    testCohesion: {}
                };
            }
        }

        // Sort by test count for high and low causal analysis
        const sortedFiles = Object.entries(fileTestCounts)
            .sort((a, b) => b[1] - a[1]);

        analysis.highCausalFiles = sortedFiles
            .slice(0, topN)
            .map(([sourceFile, count]) => ({sourceFile, testCount: count}));

        analysis.lowCausalFiles = sortedFiles
            .slice(Math.max(0, sortedFiles.length - topN))
            .reverse()
            .map(([sourceFile, count]) => ({sourceFile, testCount: count}));

        return analysis;
    }

    /**
     * Get all source files in the project
     * @private
     */
    _getAllSourceFiles() {
        const sourceFiles = [];

        // Look in common source directories
        const sourceDirs = ['src', 'lib', 'source', 'dist'];

        for (const dir of sourceDirs) {
            if (fs.existsSync(dir)) {
                this._scanDirectoryForJS(dir, sourceFiles);
            }
        }

        return sourceFiles;
    }

    /**
     * Scan directory recursively for JS files
     * @private
     */
    _scanDirectoryForJS(dir, result) {
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            return;
        }

        // Skip node_modules and other common directories that shouldn't be source code
        const dirName = path.basename(dir);
        if (dirName === 'node_modules' || dirName === '.git' || dirName.startsWith('.')) {
            return;
        }

        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            // Skip hidden directories and node_modules
            if (item.isDirectory()) {
                if (item.name !== 'node_modules' && !item.name.startsWith('.')) {
                    this._scanDirectoryForJS(fullPath, result);
                }
            } else if (item.name.endsWith('.js') &&
                !item.name.includes('test') &&
                !item.name.includes('spec') &&
                !item.name.includes('node_modules')) {
                result.push(fullPath);
            }
        }
    }

    /**
     * Get direct source mapping based on test file path
     * @private
     */
    _getDirectSourceMapping(testFilePath) {
        const testName = path.basename(testFilePath, path.extname(testFilePath));

        // Most common patterns: try multiple approaches
        const directPatterns = [
            // Pattern 1: tests/unit/somepath/file.test.js -> src/somepath/file.js
            testFilePath.replace(/tests?[\/\\](unit|integration|e2e)[\/\\]/, 'src/').replace(/(\.test|_test|test_|\.spec|_spec|spec_)/, '').replace(/\\/g, '/'),
            // Pattern 2: tests/somepath/file.test.js -> src/somepath/file.js  
            testFilePath.replace(/tests?[\/\\]/, 'src/').replace(/(\.test|_test|test_|\.spec|_spec|spec_)/, '').replace(/\\/g, '/'),
            // Pattern 3: Same path but change extension
            testFilePath.replace(/(\.test|_test|test_|\.spec|_spec|spec_)\./, '.').replace(/\.js$/, '.js'),
            // Pattern 4: Replace test suffix and convert to src
            testFilePath.replace(/tests?[\/\\]/, 'src/').replace(/(\.test|_test|test_|\.spec|_spec|spec_)\./, '.').replace(/\\/g, '/')
        ];

        for (const pattern of directPatterns) {
            if (fs.existsSync(pattern) && path.extname(pattern) === '.js') {
                return pattern;
            }
        }
        return null;
    }

    /**
     * Find potential matches based on name similarity
     * @private
     */
    _findNameBasedMatches(testFilePath) {
        const testBasename = path.basename(testFilePath, path.extname(testFilePath))
            .replace(/(\.test|_test|test_|\.spec|_spec|spec_|Test)/g, '');
        const matches = [];

        // Look for source files with similar names
        const allSourceFiles = this._getAllSourceFiles();
        for (const sourceFile of allSourceFiles) {
            const sourceBasename = path.basename(sourceFile, path.extname(sourceFile));
            if (testBasename === sourceBasename ||
                testBasename.startsWith(sourceBasename) ||
                sourceBasename.startsWith(testBasename)) {
                matches.push(sourceFile);
            }
        }

        return matches;
    }

    /**
     * Check if a test file is related to a source file based on name and directory structure
     * @private
     */
    _isTestRelatedToSource(testFilePath, sourceFile) {
        const testBasename = path.basename(testFilePath, path.extname(testFilePath))
            .replace(/(\.test|_test|test_|\.spec|_spec|spec_|Test)/g, '');
        const sourceBasename = path.basename(sourceFile, path.extname(sourceFile));

        // Check if names match
        if (testBasename === sourceBasename ||
            testBasename.startsWith(sourceBasename) ||
            sourceBasename.startsWith(testBasename)) {

            // Check if directory structure indicates a relationship
            const testDirParts = path.dirname(testFilePath).split(/[\/\\]/).filter(p => p);
            const sourceDirParts = path.dirname(sourceFile).split(/[\/\\]/).filter(p => p);

            // Normalize test directory by removing test-specific parts
            const normalizedTestDirs = testDirParts.filter(dir =>
                !['test', 'tests', 'spec', '__tests__', 'unit', 'integration', 'e2e', 'e2e-tests'].includes(dir.toLowerCase())
            );

            // Check for directory similarity (a simplified check)
            return normalizedTestDirs.some(normDir =>
                sourceDirParts.includes(normDir)
            ) || testBasename === sourceBasename;
        }

        return false;
    }
}