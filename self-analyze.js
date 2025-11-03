#!/usr/bin/env node

/**
 * SeNARS Self-Analysis Script
 * Uses the system to analyze its own development status and provide insights
 * 
 * TODO NOTES:
 * - Run with a 'timeout' (~10s) until it self-exits properly
 * - Test counting is not working properly - currently shows 0/0 tests even though system has 842 tests
 * - spawnSync with 'npm test' is not capturing output correctly from Jest (goes to stderr)
 * - Line counting function is inaccurate - showing 256 total lines instead of actual count
 * - Need to improve test result parsing to capture individual test status (pass/fail) 
 * - Need to integrate with coverage tools to get per-file coverage metrics
 * - Should analyze individual test files and their relationships to source code
 * - Need better error handling for spawned processes
 * - Should track test execution time and performance metrics
 * - Could add test dependency analysis to understand coverage gaps
 */

import { NAR } from './src/nar/NAR.js';
import { NARBuilder } from './src/nar/NARBuilder.js';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
class SeNARSSelfAnalyzer {
  constructor() {
    this.config = NARBuilder.from({
      memory: { capacity: 1000 },
      cycle: { delay: 1 },
      metacognition: { 
        selfOptimization: { enabled: true }
      }
    });
    
    this.nar = null;
    this.analysisResults = {};
  }

  async initialize() {
    this.nar = new NAR(this.config);
    await this.nar.initialize();
    console.log('SeNARS Self-Analyzer initialized');
  }

  /**
   * Collect unit test results with detailed information for code coverage analysis
   */
  collectTestResults() {
    console.log('\n=== Collecting Unit Test Results ===');
    
    // First, let's get detailed information about test files
    const testFileDetails = this.getDetailedTestFileList();
    console.log(`Found ${testFileDetails.totalTestFiles} test files across ${Object.keys(testFileDetails.structure).length} directories`);
    
    try {
      // Try to run tests with JSON output for detailed individual test results
      const testResult = spawnSync('npm', ['test', '--', '--json', '--silent'], {
        cwd: process.cwd(),
        timeout: 180000, // 3 minutes timeout for large test suites
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (testResult.status === 0 || testResult.status === 1) { // Accept 1 (some tests failed) as valid result
        // Parse the JSON output from Jest
        const output = testResult.stdout || testResult.stderr;
        
        try {
          // Extract the JSON object from the output (might be embedded in other text)
          const lines = output.split('\n');
          let parsedResult = null;
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
              try {
                parsedResult = JSON.parse(trimmedLine);
                break;
              } catch (e) {
                // Continue to next line if parsing fails
              }
            }
          }
          
          if (!parsedResult) {
            // If the JSON isn't on a single line, try to find JSON block
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                parsedResult = JSON.parse(jsonMatch[0]);
              } catch (e) {
                console.log('Could not parse JSON from test output');
              }
            }
          }
          
          if (parsedResult && parsedResult.testResults) {
            // Extract detailed individual test results
            const individualTestResults = this.extractIndividualTestResults(parsedResult.testResults);
            
            // Map test files to source files to enable coverage analysis
            const testToSourceMap = this.mapTestsToSource(individualTestResults, testFileDetails.testFiles);
            
            const stats = {
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
              individualTestResults: individualTestResults,
              testFiles: testFileDetails.testFiles,
              testDirStructure: testFileDetails.structure,
              testToSourceMap: testToSourceMap,
              coverageConnection: this.assessCoveragePotential(individualTestResults, testFileDetails.testFiles)
            };
            
            this.analysisResults.tests = stats;
            console.log(`Test results: ${stats.passedTests}/${stats.totalTests} tests passing (${stats.passedSuites}/${stats.totalSuites} suites), ${individualTestResults.length} individual results captured`);
            return stats;
          }
        } catch (jsonError) {
          console.log(`JSON parsing error: ${jsonError.message}`);
          // Continue with alternative approach
        }
      } else {
        console.log('Tests failed to run with JSON output, collecting file-based data only');
      }
      
      // Fallback: if JSON didn't work, run with more verbose output to parse results
      const altTestResult = spawnSync('npm', ['test', '--', '--verbose', '--passWithNoTests'], {
        cwd: process.cwd(),
        timeout: 120000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const detailedResults = this.parseTestOutputDetailed(altTestResult.stdout || altTestResult.stderr);
      detailedResults.testFiles = testFileDetails.testFiles;
      detailedResults.testDirStructure = testFileDetails.structure;
      detailedResults.testToSourceMap = this.mapTestsToSource([], testFileDetails.testFiles);
      detailedResults.coverageConnection = this.assessCoveragePotential([], testFileDetails.testFiles);
      
      this.analysisResults.tests = detailedResults;
      console.log(`Parsed test results: ${detailedResults.passedTests}/${detailedResults.totalTests} tests passing from output analysis`);
      return detailedResults;
      
    } catch (error) {
      console.log(`Test collection error: ${error.message}`);
      const fallbackStats = {
        status: 'error',
        totalTests: testFileDetails.totalTestFiles,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        testSuites: 0,
        testFiles: testFileDetails.testFiles,
        testDirStructure: testFileDetails.structure,
        error: error.message,
        coverageConnection: { potential: 0, testFileCount: testFileDetails.totalTestFiles, sourceFileCount: this.getSourceFileCount() }
      };
      
      this.analysisResults.tests = fallbackStats;
      console.log(`Error fallback: ${testFileDetails.totalTestFiles} test files identified`);
      return fallbackStats;
    }
  }

  /**
   * Parse test output with more comprehensive patterns
   */
  parseTestOutput(output) {
    const lines = output.split('\n');
    
    // Extract test statistics with more comprehensive patterns
    let passedTests = 0;
    let totalTests = 0;
    let failedTests = 0;
    let totalSuites = 0;

    for (const line of lines) {
      // Pattern for "Test Suites: x passed, y total"
      const suitesMatch = line.match(/Test Suites:\\s*(\\d+)\\s+passed,\\s*(\\d+)\\s+total/);
      if (suitesMatch) {
        totalSuites = parseInt(suitesMatch[2]) || 0;
      }
      
      // Alternative suites pattern - looking for format like "X/Y tests passed"
      const suitesMatch2 = line.match(/(\d+)\/(\d+)\s+tests\s+passed/);
      if (suitesMatch2) {
        const passedCount = parseInt(suitesMatch2[1]) || 0;
        const totalCount = parseInt(suitesMatch2[2]) || 0;
        passedTests = passedCount;
        totalTests = totalCount;
        failedTests = Math.max(0, totalCount - passedCount);
      }
      
      // Pattern for "x tests passed, y failed, z total"
      const testMatch = line.match(/Tests:\\s*(\\d+)\\s+passed,\\s*(\\d+)\\s+total/);
      if (testMatch) {
        passedTests = parseInt(testMatch[1]) || 0;
        totalTests = parseInt(testMatch[2]) || 0;
        failedTests = Math.max(0, totalTests - passedTests);
      }
      
      // Alternative test patterns
      const testsMatch2 = line.match(/Tests:\\s*(\\d+)\\s+passed,\\s*(\\d+)\\s+failed,\\s*(\\d+)\\s+total/);
      if (testsMatch2) {
        passedTests = parseInt(testsMatch2[1]) || 0;
        failedTests = parseInt(testsMatch2[2]) || 0;
        totalTests = parseInt(testsMatch2[3]) || 0;
      }
      
      // Pattern for "X/XX tests passed"
      const testsMatch3 = line.match(/(\d+)\/(\d+)\s+tests\s+passed/);
      if (testsMatch3) {
        passedTests = parseInt(testsMatch3[1]) || 0;
        totalTests = parseInt(testsMatch3[2]) || 0;
        failedTests = Math.max(0, totalTests - passedTests);
      }
    }

    // If no tests were detected but we found test files, make an estimate
    if (totalTests === 0) {
      // This is just an estimate - in a real system we would need better detection
      return {
        status: 'estimated',
        totalTests: 0, // We'll get this from our file counter instead
        passedTests: 0,
        failedTests: 0,
        testSuites: totalSuites,
        testDuration: 'unknown'
      };
    }

    return {
      status: 'passing',
      totalTests: totalTests,
      passedTests: passedTests,
      failedTests: failedTests,
      skippedTests: totalTests - passedTests - failedTests,
      testSuites: totalSuites,
      testDuration: 'unknown'
    };
  }

  /**
   * Get detailed list of test files with locations
   */
  getDetailedTestFileList() {
    try {
      const result = {
        totalTestFiles: 0,
        testFiles: [],
        structure: {}
      };
      
      // Look for test files in both tests/ directory and src/ directory
      const searchPaths = ['./tests', './test', './src'];
      
      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          this.collectTestFilesRecursively(searchPath, result);
        }
      }
      
      return result;
    } catch (error) {
      console.log(`Error getting test file list: ${error.message}`);
      return { totalTestFiles: 0, testFiles: [], structure: {} };
    }
  }
  
  /**
   * Recursively collect test files
   */
  collectTestFilesRecursively(dir, result) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Initialize structure for this directory
        const relDir = path.relative('.', fullPath);
        result.structure[relDir] = result.structure[relDir] || [];
        
        this.collectTestFilesRecursively(fullPath, result);
      } else if (item.isFile()) {
        // Check if it's a test file (has .test.js, .spec.js, or _test.js, _spec.js pattern)
        const isTestFile = item.name.endsWith('.test.js') || 
                          item.name.endsWith('.spec.js') ||
                          item.name.includes('_test.js') || 
                          item.name.includes('_spec.js');
        
        if (isTestFile) {
          const relPath = path.relative('.', fullPath);
          const stats = fs.statSync(fullPath);
          result.testFiles.push({
            path: relPath,
            name: item.name,
            directory: path.relative('.', dir),
            size: stats.size,
            modified: stats.mtime,
            lines: this.countFileLines(fullPath)
          });
          result.totalTestFiles++;
          
          // Add to structure
          const parentDir = path.relative('.', dir);
          if (!result.structure[parentDir]) {
            result.structure[parentDir] = [];
          }
          result.structure[parentDir].push(relPath);
        }
      }
    }
  }
  
  /**
   * Count lines in a file
   */
  countFileLines(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.split('\n').length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract individual test results from Jest JSON output
   */
  extractIndividualTestResults(testResultsArray) {
    const individualResults = [];
    
    for (const testSuite of testResultsArray) {
      const suiteName = testSuite.testFilePath;
      
      if (testSuite.testResults) {
        for (const testResult of testSuite.testResults) {
          individualResults.push({
            name: testResult.title,
            status: testResult.status, // 'passed', 'failed', 'pending', 'todo'
            duration: testResult.duration,
            suite: suiteName,
            ancestorTitles: testResult.ancestorTitles || [],
            failureMessages: testResult.failureMessages || [],
            location: testResult.location || null,
            fullName: (testResult.ancestorTitles ? testResult.ancestorTitles.join(' > ') + ' > ' : '') + testResult.title
          });
        }
      }
    }
    
    return individualResults;
  }

  /**
   * Map test files to their corresponding source files for coverage analysis
   */
  mapTestsToSource(individualTestResults, testFiles) {
    const testToSourceMap = {};
    
    for (const testFile of testFiles) {
      // Try to find corresponding source file by matching naming patterns
      let sourcePath = null;
      
      // Remove test suffixes to find source file
      let potentialSourcePath = testFile.path
        .replace(/\.test\.js$/, '.js')
        .replace(/\.spec\.js$/, '.js')
        .replace(/_test\.js$/, '.js')
        .replace(/_spec\.js$/, '.js');
      
      // Convert test paths to src paths
      if (potentialSourcePath.startsWith('tests/')) {
        potentialSourcePath = potentialSourcePath.replace('tests/', 'src/');
      } else if (potentialSourcePath.startsWith('test/')) {
        potentialSourcePath = potentialSourcePath.replace('test/', 'src/');
      }
      
      // Check if the potential source file exists
      if (fs.existsSync(potentialSourcePath)) {
        sourcePath = potentialSourcePath;
      }
      
      testToSourceMap[testFile.path] = {
        testFile: testFile.path,
        potentialSourceFile: sourcePath,
        exists: sourcePath && fs.existsSync(sourcePath)
      };
    }
    
    return testToSourceMap;
  }

  /**
   * Assess potential for code coverage based on test-to-source mapping
   */
  assessCoveragePotential(individualTestResults, testFiles) {
    const sourceFileCount = this.getSourceFileCount();
    const mappedTests = this.mapTestsToSource(individualTestResults, testFiles);
    
    // Count how many source files have corresponding tests
    const sourceFilesWithTests = new Set();
    for (const [testPath, mapping] of Object.entries(mappedTests)) {
      if (mapping.exists) {
        sourceFilesWithTests.add(mapping.potentialSourceFile);
      }
    }
    
    return {
      potential: sourceFilesWithTests.size,
      testFileCount: testFiles.length,
      sourceFileCount: sourceFileCount,
      sourceFilesWithTests: Array.from(sourceFilesWithTests),
      coveragePotentialPercentage: sourceFileCount > 0 ? Math.round((sourceFilesWithTests.size / sourceFileCount) * 100) : 0
    };
  }

  /**
   * Count total source files in src directory
   */
  getSourceFileCount() {
    try {
      let count = 0;
      const countFiles = (dir) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            countFiles(fullPath);
          } else if (item.isFile() && item.name.endsWith('.js')) {
            if (!fullPath.includes('/tests/') && !fullPath.includes('/test/')) {
              count++;
            }
          }
        }
      };
      
      if (fs.existsSync('./src')) {
        countFiles('./src');
      }
      
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Parse test output with more comprehensive patterns for detailed analysis
   */
  parseTestOutputDetailed(output) {
    const lines = output.split('\n');
    
    // Extract test statistics with comprehensive patterns
    let passedTests = 0;
    let totalTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let todoTests = 0;
    let totalSuites = 0;
    let passedSuites = 0;
    let failedSuites = 0;

    // Patterns to match different Jest output formats
    for (const line of lines) {
      // Pattern for "Test Suites: x passed, y failed, z total"
      const suiteMatch = line.match(/Test Suites:\s*(\d+)\s+passed,\s*(\d+)\s+failed,\s*(\d+)\s+total/);
      if (suiteMatch) {
        passedSuites = parseInt(suiteMatch[1]) || 0;
        failedSuites = parseInt(suiteMatch[2]) || 0;
        totalSuites = parseInt(suiteMatch[3]) || 0;
      }
      
      // Alternative suite pattern
      const suiteMatch2 = line.match(/Test Suites:\s*(\d+)\s+passed,\s*(\d+)\s+total/);
      if (suiteMatch2) {
        passedSuites = parseInt(suiteMatch2[1]) || 0;
        totalSuites = parseInt(suiteMatch2[2]) || 0;
        failedSuites = Math.max(0, totalSuites - passedSuites);
      }
      
      // Pattern for "Tests: x passed, y failed, z skipped, w todo, total"
      const testMatch = line.match(/Tests:\s*(\d+)\s+passed,\s*(\d+)\s+failed,\s*(\d+)\s+skipped,\s*(\d+)\s+todo,\s*\d+\s+total/);
      if (testMatch) {
        passedTests = parseInt(testMatch[1]) || 0;
        failedTests = parseInt(testMatch[2]) || 0;
        skippedTests = parseInt(testMatch[3]) || 0;
        todoTests = parseInt(testMatch[4]) || 0;
        totalTests = passedTests + failedTests + skippedTests + todoTests;
      }
      
      // Alternative test pattern: "Tests: x passed, y failed, z skipped, total"
      const testMatch2 = line.match(/Tests:\s*(\d+)\s+passed,\s*(\d+)\s+failed,\s*(\d+)\s+skipped,\s*\d+\s+total/);
      if (testMatch2) {
        passedTests = parseInt(testMatch2[1]) || 0;
        failedTests = parseInt(testMatch2[2]) || 0;
        skippedTests = parseInt(testMatch2[3]) || 0;
        totalTests = passedTests + failedTests + skippedTests;
      }
      
      // Alternative test pattern: "Tests: x passed, y failed, z total"
      const testMatch3 = line.match(/Tests:\s*(\d+)\s+passed,\s*(\d+)\s+failed,\s*(\d+)\s+total/);
      if (testMatch3) {
        passedTests = parseInt(testMatch3[1]) || 0;
        failedTests = parseInt(testMatch3[2]) || 0;
        totalTests = parseInt(testMatch3[3]) || 0;
        skippedTests = Math.max(0, totalTests - passedTests - failedTests);
      }
      
      // Pattern for "x tests passed, y skipped, z total"
      const testMatch4 = line.match(/(\d+)\s+tests?\s+passed,\s*(\d+)\s+skipped,\s*(\d+)\s+total/);
      if (testMatch4) {
        passedTests = parseInt(testMatch4[1]) || 0;
        skippedTests = parseInt(testMatch4[2]) || 0;
        totalTests = parseInt(testMatch4[3]) || 0;
        failedTests = Math.max(0, totalTests - passedTests - skippedTests);
      }
      
      // Pattern for "x tests passed, y total"  
      const testMatch5 = line.match(/(\d+)\s+tests?\s+passed,\s*(\d+)\s+total/);
      if (testMatch5) {
        passedTests = parseInt(testMatch5[1]) || 0;
        totalTests = parseInt(testMatch5[2]) || 0;
        failedTests = Math.max(0, totalTests - passedTests);
      }
    }

    // If no test data was found, return defaults
    return {
      status: 'parsed',
      totalTests: totalTests,
      passedTests: passedTests,
      failedTests: failedTests,
      skippedTests: skippedTests,
      todoTests: todoTests,
      testSuites: totalSuites,
      totalSuites: totalSuites,
      passedSuites: passedSuites,
      failedSuites: failedSuites,
      testDuration: 'unknown'
    };
  }

  /**
   * Estimate test count by counting test files (fallback method)
   */
  estimateTestCount() {
    try {
      const testPath = './tests';
      if (!fs.existsSync(testPath)) {
        return { status: 'no_tests_found', totalTests: 0, passedTests: 0, failedTests: 0, testSuites: 0 };
      }

      let testCount = 0;
      let suiteCount = 0;

      const countFiles = (dir) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            suiteCount++; // Each subdirectory could be considered a test suite
            countFiles(fullPath);
          } else if (item.isFile() && (item.name.endsWith('.test.js') || item.name.endsWith('.spec.js'))) {
            testCount++;
          }
        }
      };
      
      countFiles(testPath);
      
      return {
        status: 'estimated',
        totalTests: testCount,
        passedTests: testCount, // Assume all are passing in estimation
        failedTests: 0,
        testSuites: suiteCount
      };
    } catch (error) {
      return { status: 'error', totalTests: 0, passedTests: 0, failedTests: 0, testSuites: 0, error: error.message };
    }
  }

  /**
   * Collect code coverage data (if available)
   */
  collectCoverage() {
    console.log('\n=== Collecting Coverage Data ===');
    
    try {
      // First, check if coverage exists
      let coverageData = null;
      const coveragePath = './coverage';
      
      if (fs.existsSync(coveragePath)) {
        const coverageFile = path.join(coveragePath, 'coverage-summary.json');
        if (fs.existsSync(coverageFile)) {
          coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        }
      }
      
      // If no coverage file exists, try to generate it
      if (!coverageData) {
        console.log('No existing coverage data found, attempting to generate...');
        
        try {
          // Try to run coverage
          const result = spawnSync('npm', ['run', 'test:coverage'], {
            cwd: process.cwd(),
            timeout: 120000, // 2 minutes timeout
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          if (result.status === 0) {
            // Check again for coverage file after running coverage command
            if (fs.existsSync(coverageFile)) {
              coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
            }
          } else {
            console.log('Coverage generation failed, falling back to alternative approaches');
            
            // Try alternative coverage script name
            const altResult = spawnSync('npm', ['test', '--', '--coverage'], {
              cwd: process.cwd(),
              timeout: 120000,
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'pipe']
            });
            
            if (altResult.status === 0) {
              // Look for coverage file in the standard location
              const altCoverageFile = './coverage/coverage-summary.json';
              if (fs.existsSync(altCoverageFile)) {
                coverageData = JSON.parse(fs.readFileSync(altCoverageFile, 'utf8'));
              }
            }
          }
        } catch (genError) {
          console.log(`Coverage generation error: ${genError.message}`);
        }
      }
      
      if (coverageData) {
        const summary = coverageData.total;
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
        
        // Perform detailed analysis of coverage by file
        coverageStats.fileAnalysis = this.analyzeCoverageByFile();
        
        this.analysisResults.coverage = coverageStats;
        console.log(`Coverage: ${coverageStats.lines}% lines, ${coverageStats.functions}% functions, ${coverageStats.branches}% branches, ${coverageStats.statements}% statements covered`);
        
        // Highlight coverage issues
        if (coverageStats.lines < 80) {
          console.log(`  ❌ Low line coverage: ${coverageStats.lines}% (target: 80%+)`);
        } else if (coverageStats.lines < 90) {
          console.log(`  ⚠️ Moderate line coverage: ${coverageStats.lines}% (target: 90%+)`);
        } else {
          console.log(`  ✅ Good line coverage: ${coverageStats.lines}%`);
        }
        
        return coverageStats;
      } else {
        console.log('No coverage data found or generated');
        this.analysisResults.coverage = { available: false };
        return null;
      }
    } catch (error) {
      console.log(`Coverage collection error: ${error.message}`);
      this.analysisResults.coverage = { error: error.message };
      return null;
    }
  }
  
  /**
   * Analyze coverage data by file if available
   */
  analyzeCoverageByFile() {
    try {
      const coverageDetailPath = './coverage/coverage-final.json';
      if (fs.existsSync(coverageDetailPath)) {
        const coverageDetail = JSON.parse(fs.readFileSync(coverageDetailPath, 'utf8'));
        
        // Convert to array of file coverage objects
        const files = Object.entries(coverageDetail).map(([filePath, coverage]) => {
          if (filePath.startsWith('./')) {
            filePath = path.resolve(filePath);
          }
          
          const summary = coverage.s;
          const statementKeys = Object.keys(summary);
          const coveredStatements = statementKeys.filter(key => summary[key] > 0).length;
          const statementCount = statementKeys.length;
          
          const lineCoverage = statementCount > 0 ? (coveredStatements / statementCount) * 100 : 100;
          
          return {
            filePath: path.relative(process.cwd(), filePath),
            lineCoverage: parseFloat(lineCoverage.toFixed(2)),
            statements: statementCount,
            covered: coveredStatements,
            uncovered: statementCount - coveredStatements
          };
        });
        
        // Sort by lowest coverage first
        files.sort((a, b) => a.lineCoverage - b.lineCoverage);
        
        // Return top 10 lowest coverage files
        return files.slice(0, 10);
      }
      
      return [];
    } catch (error) {
      console.log(`File coverage analysis error: ${error.message}`);
      return [];
    }
  }

  /**
   * Collect package.json dependencies and project metadata
   */
  collectProjectInfo() {
    console.log('\n=== Collecting Project Information ===');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      
      const projectInfo = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        scripts: Object.keys(packageJson.scripts || {}).length
      };
      
      this.analysisResults.project = projectInfo;
      console.log(`Project: ${projectInfo.name} v${projectInfo.version}`);
      return projectInfo;
    } catch (error) {
      console.log(`Project info collection error: ${error.message}`);
      this.analysisResults.project = { error: error.message };
      return null;
    }
  }

  /**
   * Perform static code analysis by counting files and lines
   */
  collectStaticAnalysis() {
    console.log('\n=== Collecting Static Analysis ===');
    
    try {
      const srcPath = './src';
      if (!fs.existsSync(srcPath)) {
        console.log('Source directory not found');
        this.analysisResults.static = { error: 'src directory not found' };
        return null;
      }
      
      // Recursively count files and estimate lines
      const stats = {
        jsFiles: 0,
        totalLines: 0,
        directories: 0,
        filesByType: {},
        fileDetails: [], // Track details for each file
        largestFiles: [] // Track the largest files
      };
      
      const countFiles = (dir) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            stats.directories++;
            countFiles(fullPath);
          } else if (item.isFile()) {
            const ext = path.extname(item.name).substring(1) || 'no_ext';
            stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1;
            
            if (item.name.endsWith('.js')) {
              stats.jsFiles++;
              
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n').length;
                stats.totalLines += lines;
                
                // Track file details
                stats.fileDetails.push({
                  path: path.relative('.', fullPath),
                  lines: lines,
                  size: content.length
                });
              } catch (readError) {
                // Skip files that can't be read
              }
            }
          }
        }
      };
      
      countFiles(srcPath);
      
      // Sort files by line count and get largest files
      stats.fileDetails.sort((a, b) => b.lines - a.lines);
      stats.largestFiles = stats.fileDetails.slice(0, 10); // Top 10 largest files
      
      // Calculate statistics
      if (stats.fileDetails.length > 0) {
        const lineCounts = stats.fileDetails.map(f => f.lines);
        stats.avgLinesPerFile = Math.round(stats.totalLines / stats.fileDetails.length);
        stats.medianLinesPerFile = this.calculateMedian(lineCounts);
        stats.largestFile = stats.fileDetails[0];
        stats.smallestFile = stats.fileDetails[stats.fileDetails.length - 1];
      }
      
      this.analysisResults.static = stats;
      console.log(`Static analysis: ${stats.jsFiles} JS files, ~${stats.totalLines} lines, avg: ${stats.avgLinesPerFile} lines/file`);
      return stats;
    } catch (error) {
      console.log(`Static analysis error: ${error.message}`);
      this.analysisResults.static = { error: error.message };
      return null;
    }
  }
  
  /**
   * Helper method to calculate median
   */
  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Collect README compliance status
   */
  collectRequirementsAnalysis() {
    console.log('\n=== Collecting Requirements Analysis ===');
    
    try {
      // Read README to check for key sections
      const readmeContent = fs.readFileSync('./README.md', 'utf8');
      
      // Check for specific sections and key concepts in README
      const requirements = {
        // Key architectural patterns
        hasImmutableDataFoundation: readmeContent.includes('Immutable Data Foundation'),
        hasComponentBasedArchitecture: readmeContent.includes('Component-Based Architecture'),
        hasDualMemoryArchitecture: readmeContent.includes('Dual Memory Architecture'),
        hasHybridReasoningIntegration: readmeContent.includes('Hybrid Reasoning Integration'),
        hasLayerBasedExtensibility: readmeContent.includes('Layer-Based Extensibility'),
        
        // Core data structures
        hasTermClassDocumentation: readmeContent.includes('`Term` Class') || readmeContent.toLowerCase().includes('term') && readmeContent.includes('knowledge'),
        hasTaskClassDocumentation: readmeContent.includes('`Task` Class') || readmeContent.toLowerCase().includes('task') && readmeContent.includes('unit of work'),
        hasTruthDocumentation: readmeContent.includes('`Truth` Value Representation') || readmeContent.toLowerCase().includes('truth value'),
        hasStampDocumentation: readmeContent.includes('`Stamp` and Evidence Tracking') || readmeContent.toLowerCase().includes('stamp') && readmeContent.includes('evidence'),
        
        // System architecture
        hasNARDocumentation: readmeContent.includes('`NAR` (NARS Reasoner Engine)') || readmeContent.toLowerCase().includes('nar') && readmeContent.includes('orchestrator'),
        hasMemoryDocumentation: readmeContent.includes('Memory and Focus Management') || readmeContent.toLowerCase().includes('memory') && readmeContent.includes('concept'),
        hasParserDocumentation: readmeContent.includes('Parser System') || readmeContent.toLowerCase().includes('parser') && readmeContent.includes('narsese'),
        hasLMDocumentation: readmeContent.includes('Language Model Integration') || readmeContent.toLowerCase().includes('lm integration'),
        
        // Core concepts
        hasBeliefGoalDistinction: readmeContent.includes('Belief vs. Goal') || readmeContent.toLowerCase().includes('belief') && readmeContent.toLowerCase().includes('goal'),
        hasUsageExamples: readmeContent.includes('Usage Examples'),
        hasTestingStrategy: readmeContent.includes('Testing Strategy'),
        hasAPIConventions: readmeContent.includes('API Conventions') || readmeContent.includes('conventions'),
        hasErrorHandling: readmeContent.includes('Error Handling') || readmeContent.includes('robustness'),
        hasSecurityImplementation: readmeContent.includes('Security Implementation'),
        
        // Vision and objectives
        hasCompoundIntelligence: readmeContent.includes('Compound Intelligence Architecture') || readmeContent.includes('compound intelligence'),
        hasReinforcementLearning: readmeContent.includes('General-Purpose Reinforcement Learning') || readmeContent.includes('reinforcement learning'),
        hasKeyObjectives: readmeContent.includes('Key Design Objectives') || readmeContent.includes('simplicity') || readmeContent.includes('robustness') || readmeContent.includes('consistency'),
        
        // Technical challenges
        hasTechnicalChallenges: readmeContent.includes('Core Technical Challenges'),
        
        // System size and completeness
        systemSize: readmeContent.length,
        hasLongTermSpec: readmeContent.includes('Long-Term Specification'),
        hasUserExperienceGoals: readmeContent.includes('User Experience Goals'),
        hasTechnicalExcellence: readmeContent.includes('Technical Excellence Standards'),
        
        // Directory structure
        hasDirectoryStructure: readmeContent.includes('Directory Structure'),
        
        // Overall assessment
        readmeComplete: readmeContent.length > 5000, // Reasonable length check
      };
      
      // Count how many requirements are satisfied
      const satisfiedCount = Object.values(requirements).filter(value => value === true).length;
      const totalCount = Object.keys(requirements).length;
      
      requirements.complianceScore = Math.round((satisfiedCount / totalCount) * 100);
      requirements.satisfiedRequirements = satisfiedCount;
      requirements.totalRequirements = totalCount;
      
      this.analysisResults.requirements = requirements;
      console.log(`Requirements analysis: ${requirements.satisfiedRequirements}/${requirements.totalRequirements} requirements satisfied (${requirements.complianceScore}% compliance)`);
      return requirements;
    } catch (error) {
      console.log(`Requirements analysis error: ${error.message}`);
      this.analysisResults.requirements = { error: error.message };
      return null;
    }
  }

  /**
   * Convert collected data to Narsese format
   */
  convertToNarsese() {
    console.log('\n=== Converting Data to Narsese ===');
    
    const narseseInputs = [];
    
    // Add project information
    const project = this.analysisResults.project;
    if (project && !project.error) {
      narseseInputs.push(`(SeNARS --> project). %0.9;0.9%`);
      narseseInputs.push(`(version --> ${project.version.replace(/\./g, '_')}). %1.0;0.9%`); // Replace periods with underscores
      narseseInputs.push(`(dependencies --> ${project.dependencies}). %0.8;0.8%`);
      narseseInputs.push(`(dev_dependencies --> ${project.devDependencies}). %0.8;0.8%`);
    }
    
    // Add detailed test results
    const tests = this.analysisResults.tests;
    if (tests && !tests.error) {
      narseseInputs.push(`(tests --> running). %0.9;0.9%`);
      const passRate = Math.floor(tests.passedTests / Math.max(tests.totalTests, 1) * 100); // Convert to integer
      narseseInputs.push(`(test_pass_rate --> ${passRate}). %0.9;0.8%`);
      narseseInputs.push(`(total_tests --> ${tests.totalTests}). %1.0;0.9%`);
      narseseInputs.push(`(passed_tests --> ${tests.passedTests}). %0.9;0.8%`);
      narseseInputs.push(`(failed_tests --> ${tests.failedTests}). %0.9;0.7%`);
      narseseInputs.push(`(skipped_tests --> ${tests.skippedTests}). %0.7;0.7%`);
      if (tests.todoTests !== undefined) {
        narseseInputs.push(`(todo_tests --> ${tests.todoTests}). %0.7;0.7%`);
      }
      narseseInputs.push(`(test_suites --> ${tests.testSuites}). %0.8;0.8%`);
      narseseInputs.push(`(passed_suites --> ${tests.passedSuites}). %0.8;0.8%`);
      narseseInputs.push(`(failed_suites --> ${tests.failedSuites}). %0.8;0.7%`);
      
      // Add test coverage potential information
      if (tests.coverageConnection) {
        narseseInputs.push(`(coverage_potential --> ${tests.coverageConnection.coveragePotentialPercentage}). %0.7;0.8%`);
        narseseInputs.push(`(testable_files --> ${tests.coverageConnection.potential}). %0.8;0.8%`);
        narseseInputs.push(`(total_source_files --> ${tests.coverageConnection.sourceFileCount}). %0.8;0.8%`);
      }
      
      // Add information about test file distribution
      if (tests.testFiles) {
        narseseInputs.push(`(test_files_count --> ${tests.testFiles.length}). %0.8;0.8%`);
      }
      if (tests.testDirStructure) {
        narseseInputs.push(`(test_directories --> ${Object.keys(tests.testDirStructure).length}). %0.7;0.7%`);
      }
    }
    
    // Add coverage data
    const coverage = this.analysisResults.coverage;
    if (coverage && !coverage.error && coverage.available !== false) {
      narseseInputs.push(`(code_coverage --> ${Math.floor(coverage.lines)}). %0.8;0.8%`);
      const quality = coverage.lines > 80 ? 'high' : coverage.lines > 50 ? 'medium' : 'low';
      narseseInputs.push(`(test_quality --> ${quality}). %0.7;0.8%`);
    }
    
    // Add detailed static analysis
    const staticAnalysis = this.analysisResults.static;
    if (staticAnalysis && !staticAnalysis.error) {
      narseseInputs.push(`(code_size --> ${staticAnalysis.totalLines}). %0.8;0.9%`);
      narseseInputs.push(`(js_files --> ${staticAnalysis.jsFiles}). %1.0;0.9%`);
      narseseInputs.push(`(directories --> ${staticAnalysis.directories}). %0.8;0.8%`);
      narseseInputs.push(`(avg_lines_per_file --> ${staticAnalysis.avgLinesPerFile}). %0.7;0.8%`);
      
      // Add info about largest files
      if (staticAnalysis.largestFile) {
        narseseInputs.push(`(largest_file --> ${staticAnalysis.largestFile.lines}). %0.6;0.7%`);
      }
      
      // Determine complexity based on file count and average lines
      const complexity = staticAnalysis.jsFiles > 50 ? (staticAnalysis.avgLinesPerFile > 100 ? 'high' : 'medium') : 'low';
      narseseInputs.push(`(complexity --> ${complexity}). %0.7;0.8%`);
    }
    
    // Add comprehensive requirements compliance
    const requirements = this.analysisResults.requirements;
    if (requirements && !requirements.error) {
      narseseInputs.push(`(requirements --> defined). %0.9;0.9%`);
      narseseInputs.push(`(documentation --> available). %0.9;0.8%`);
      narseseInputs.push(`(readme_compliance --> ${requirements.complianceScore}). %0.8;0.8%`);
      narseseInputs.push(`(requirements_satisfied --> ${requirements.satisfiedRequirements}). %0.8;0.8%`);
      narseseInputs.push(`(total_requirements --> ${requirements.totalRequirements}). %0.8;0.8%`);
      
      // Add specific architectural compliance
      narseseInputs.push(`(immutable_architecture_implemented --> ${requirements.hasImmutableDataFoundation}). %0.9;0.8%`);
      narseseInputs.push(`(component_architecture_implemented --> ${requirements.hasComponentBasedArchitecture}). %0.9;0.8%`);
      narseseInputs.push(`(dual_memory_architecture_implemented --> ${requirements.hasDualMemoryArchitecture}). %0.9;0.8%`);
      narseseInputs.push(`(hybrid_reasoning_implemented --> ${requirements.hasHybridReasoningIntegration}). %0.9;0.8%`);
      
      // Add core data structure compliance
      narseseInputs.push(`(term_class_documented --> ${requirements.hasTermClassDocumentation}). %0.8;0.7%`);
      narseseInputs.push(`(task_class_documented --> ${requirements.hasTaskClassDocumentation}). %0.8;0.7%`);
      narseseInputs.push(`(truth_documented --> ${requirements.hasTruthDocumentation}). %0.8;0.7%`);
      narseseInputs.push(`(stamp_documented --> ${requirements.hasStampDocumentation}). %0.8;0.7%`);
      
      // Add system architecture compliance
      narseseInputs.push(`(nar_documented --> ${requirements.hasNARDocumentation}). %0.8;0.7%`);
      narseseInputs.push(`(memory_documented --> ${requirements.hasMemoryDocumentation}). %0.8;0.7%`);
      narseseInputs.push(`(parser_documented --> ${requirements.hasParserDocumentation}). %0.8;0.7%`);
      narseseInputs.push(`(lm_integration_documented --> ${requirements.hasLMDocumentation}). %0.8;0.7%`);
      
      // Add vision elements compliance
      narseseInputs.push(`(compound_intelligence_vision_present --> ${requirements.hasCompoundIntelligence}). %0.8;0.7%`);
      narseseInputs.push(`(reinforcement_learning_vision_present --> ${requirements.hasReinforcementLearning}). %0.8;0.7%`);
    }
    
    // Add development-oriented goals based on analysis gaps
    narseseInputs.push(`(system_improvement --> needed)! %0.8;0.9%`);
    narseseInputs.push(`(testing_quality --> improve)! %0.7;0.8%`);
    narseseInputs.push(`(code_coverage --> increase)! %0.6;0.7%`);
    narseseInputs.push(`(documentation_quality --> enhance)! %0.7;0.7%`);
    narseseInputs.push(`(architecture_compliance --> achieve)! %0.8;0.8%`);
    
    // Add questions for NARS reasoning
    narseseInputs.push(`(development_progress --> assess)?`);
    narseseInputs.push(`(system_state --> evaluate)?`);
    narseseInputs.push(`(improvement_areas --> identify)?`);
    narseseInputs.push(`(architecture_gaps --> analyze)?`);
    narseseInputs.push(`(priority_tasks --> determine)?`);
    
    // Add specific questions based on compliance analysis
    if (requirements && !requirements.error) {
      if (!requirements.hasTermClassDocumentation) {
        narseseInputs.push(`(term_implementation --> needed)?`);
      }
      if (!requirements.hasTaskClassDocumentation) {
        narseseInputs.push(`(task_implementation --> needed)?`);
      }
      if (!requirements.hasTruthDocumentation) {
        narseseInputs.push(`(truth_implementation --> needed)?`);
      }
      if (!requirements.hasStampDocumentation) {
        narseseInputs.push(`(stamp_implementation --> needed)?`);
      }
      if (!requirements.hasTestingStrategy) {
        narseseInputs.push(`(testing_strategy --> develop)?`);
      }
      if (!requirements.hasErrorHandling) {
        narseseInputs.push(`(error_handling --> implement)?`);
      }
      if (!requirements.hasSecurityImplementation) {
        narseseInputs.push(`(security_implementation --> need)?`);
      }
    }
    
    return narseseInputs;
  }

  /**
   * Run the complete analysis
   */
  async runAnalysis() {
    console.log('Starting SeNARS Self-Analysis...');
    
    await this.initialize();
    
    // Collect all data
    this.collectTestResults();
    this.collectCoverage();
    this.collectProjectInfo();
    this.collectStaticAnalysis();
    this.collectRequirementsAnalysis();
    
    // Convert to Narsese and input to NAR
    const narseseInputs = this.convertToNarsese();
    
    console.log(`\n=== Feeding ${narseseInputs.length} Statements to NAR ===`);
    
    for (const input of narseseInputs) {
      try {
        await this.nar.input(input);
      } catch (error) {
        console.log(`Failed to input: ${input} - ${error.message}`);
      }
    }
    
    // Run cycles to allow reasoning
    for (let i = 0; i < 30; i++) {
      await this.nar.step();
    }
    
    // Get system's analysis
    console.log('\n=== System Self-Analysis Results ===');
    
    const state = this.nar.getReasoningState();
    console.log(`Cycles completed: ${state?.cycleCount || 0}`);
    console.log(`Total tasks: ${state?.taskCount?.totalTasks || 0}`);
    console.log(`Beliefs: ${state?.taskCount?.beliefs || 0}`);
    console.log(`Goals: ${state?.taskCount?.goals || 0}`);
    console.log(`Questions: ${state?.taskCount?.questions || 0}`);
    
    // Get meta-cognitive analysis
    const metaAnalysis = await this.nar.performMetaCognitiveReasoning();
    if (metaAnalysis && metaAnalysis.suggestions) {
      console.log(`\nMeta-Cognitive Suggestions: ${metaAnalysis.suggestions.length}`);
      metaAnalysis.suggestions.forEach((suggestion, idx) => {
        console.log(`  ${idx + 1}. ${suggestion.message}`);
      });
    }
    
    // Get self-correction analysis
    const selfCorrection = await this.nar.performSelfCorrection();
    if (selfCorrection && selfCorrection.corrections) {
      console.log(`\nSelf-Correction Items: ${selfCorrection.corrections.length}`);
      selfCorrection.corrections.forEach((correction, idx) => {
        console.log(`  ${idx + 1}. ${correction.message || correction.reason}`);
      });
    }
    
    // Get reasoning trace for insights
    const trace = this.nar.getReasoningTrace();
    console.log(`\nReasoning Trace Events: ${trace.length}`);
    
    // Show recent events
    const recentEvents = trace.slice(-5);
    console.log('\nRecent System Events:');
    recentEvents.forEach((event, idx) => {
      console.log(`  ${idx + 1}. ${event.eventType} - Cycle ${event.cycleCount}`);
    });
    
    // Get current beliefs (system knowledge)
    const beliefs = this.nar.getBeliefs();
    console.log(`\nCurrent System Beliefs: ${beliefs.length}`);
    
    // Show comprehensive analysis summary
    console.log('\n=== Detailed Analysis Summary ===');
    this.printAnalysisSummary();
    
    await this.nar.dispose();
  }
  
  /**
   * Print a formatted analysis summary
   */
  printAnalysisSummary() {
    const results = this.analysisResults;
    
    console.log('\n📊 PROJECT METRICS:');
    if (results.project && !results.project.error) {
      console.log(`  Name: ${results.project.name}`);
      console.log(`  Version: ${results.project.version}`);
      console.log(`  Dependencies: ${results.project.dependencies} regular, ${results.project.devDependencies} dev`);
    } else {
      console.log('  ❌ Project info unavailable');
    }
    
    console.log('\n🧪 TESTING METRICS:');
    if (results.tests && !results.tests.error) {
      const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
      console.log(`  Total Tests: ${results.tests.totalTests}`);
      console.log(`  Passed: ${results.tests.passedTests}`);
      console.log(`  Failed: ${results.tests.failedTests}`);
      if (results.tests.skippedTests !== undefined) {
        console.log(`  Skipped: ${results.tests.skippedTests}`);
      }
      console.log(`  Suites: ${results.tests.testSuites}`);
      console.log(`  Pass Rate: ${passRate}%`);
      if (passRate >= 95) {
        console.log('  Status: ✅ Excellent');
      } else if (passRate >= 80) {
        console.log('  Status: ⚠️ Good but needs improvement');
      } else {
        console.log('  Status: ❌ Needs attention');
      }
    } else {
      console.log('  ❌ Test metrics unavailable');
    }
    
    console.log('\n Coverage Metrics:');
    if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
      console.log(`  Lines: ${results.coverage.lines}%`);
      console.log(`  Functions: ${results.coverage.functions}%`);
      console.log(`  Branches: ${results.coverage.branches}%`);
      console.log(`  Statements: ${results.coverage.statements}%`);
      
      if (results.coverage.fileAnalysis && results.coverage.fileAnalysis.length > 0) {
        console.log(`  Lowest coverage files:`);
        results.coverage.fileAnalysis.slice(0, 3).forEach((file, idx) => {
          console.log(`    ${idx + 1}. ${file.filePath} (${file.lineCoverage}%)`);
        });
      }
    } else {
      console.log('  ❌ Coverage metrics unavailable');
    }
    
    console.log('\n 📁 CODE STRUCTURE:');
    if (results.static && !results.static.error) {
      console.log(`  JS Files: ${results.static.jsFiles}`);
      console.log(`  Total Lines: ${results.static.totalLines}`);
      console.log(`  Directories: ${results.static.directories}`);
      console.log(`  Avg Lines/File: ${results.static.avgLinesPerFile}`);
      if (results.static.largestFile) {
        console.log(`  Largest File: ${results.static.largestFile.path} (${results.static.largestFile.lines} lines)`);
      }
      console.log(`  Complexity: ${results.static.complexity}`);
    } else {
      console.log('  ❌ Structure metrics unavailable');
    }
    
    console.log('\n 📋 README COMPLIANCE:');
    if (results.requirements && !results.requirements.error) {
      console.log(`  Compliance Score: ${results.requirements.complianceScore}%`);
      console.log(`  Satisfied: ${results.requirements.satisfiedRequirements}/${results.requirements.totalRequirements}`);
      
      if (results.requirements.complianceScore >= 90) {
        console.log('  Status: ✅ Excellent compliance');
      } else if (results.requirements.complianceScore >= 70) {
        console.log('  Status: ⚠️ Good compliance but needs improvement');
      } else {
        console.log('  Status: ❌ Needs significant improvement');
      }
      
      // Highlight key missing areas
      const missing = [];
      if (!results.requirements.hasTermClassDocumentation) missing.push('Term Class');
      if (!results.requirements.hasTaskClassDocumentation) missing.push('Task Class');
      if (!results.requirements.hasTruthDocumentation) missing.push('Truth Values');
      if (!results.requirements.hasStampDocumentation) missing.push('Stamp System');
      if (!results.requirements.hasTestingStrategy) missing.push('Testing Strategy');
      if (!results.requirements.hasErrorHandling) missing.push('Error Handling');
      if (!results.requirements.hasSecurityImplementation) missing.push('Security');
      
      if (missing.length > 0) {
        console.log(`  Missing key sections: ${missing.join(', ')}`);
      }
    } else {
      console.log('  ❌ README compliance unavailable');
    }
  }
  
  /**
   * Generate a development plan based on analysis
   */
  generateDevelopmentPlan() {
    console.log('\n=== Generating Development Plan ===');
    
    const plan = {
      priorities: [],
      recommendations: [],
      metrics: this.analysisResults,
      narsInsights: [],
      actionItems: []
    };
    
    // Derive priorities from analysis with more sophisticated logic using detailed test information
    const tests = this.analysisResults.tests;
    if (tests) {
      if (tests.totalTests > 0) {
        const passRate = tests.passedTests / Math.max(tests.totalTests, 1);
        
        // Analyze detailed test results if available
        if (tests.individualTestResults) {
          // Count failed tests and analyze patterns
          const failedTests = tests.individualTestResults.filter(t => t.status === 'failed');
          const pendingTests = tests.individualTestResults.filter(t => t.status === 'pending');
          const todoTests = tests.individualTestResults.filter(t => t.status === 'todo');
          
          if (failedTests.length > 0) {
            plan.priorities.push({
              priority: 'high',
              area: 'testing',
              reason: `${failedTests.length} tests are failing out of ${tests.totalTests}, impacting stability`,
              suggestedAction: `Focus on fixing ${failedTests.length} failing tests first, then improve overall test quality`
            });
          }
          
          if (pendingTests.length > 0 || todoTests.length > 0) {
            plan.priorities.push({
              priority: 'medium',
              area: 'testing',
              reason: `There are ${pendingTests.length} pending and ${todoTests.length} todo tests that need implementation`,
              suggestedAction: `Convert pending/todo tests to proper test implementations`
            });
          }
        }
        
        // General pass rate analysis
        if (passRate < 0.50) {
          plan.priorities.push({
            priority: 'critical',
            area: 'testing',
            reason: `Critical test pass rate is only ${Math.round(passRate * 100)}%, system may be unstable`,
            suggestedAction: 'Urgently fix failing tests and ensure basic functionality works'
          });
        } else if (passRate < 0.80) {
          plan.priorities.push({
            priority: 'high',
            area: 'testing',
            reason: `Test pass rate is ${Math.round(passRate * 100)}%, below 80% target`,
            suggestedAction: 'Focus on fixing failing tests and improving test quality'
          });
        } else if (passRate < 0.95) {
          plan.priorities.push({
            priority: 'medium',
            area: 'testing',
            reason: `Test pass rate is ${Math.round(passRate * 100)}%, could be improved to 95%+`,
            suggestedAction: 'Continue improving tests to reach 95%+ pass rate'
          });
        } else if (passRate < 1.0) {
          plan.priorities.push({
            priority: 'low',
            area: 'testing',
            reason: `Test pass rate is ${Math.round(passRate * 100)}%, aim for 100%`,
            suggestedAction: 'Continue improving tests to reach 100% pass rate'
          });
        } else {
          plan.priorities.push({
            priority: 'low',
            area: 'testing',
            reason: `Test pass rate is at 100%, maintain quality`,
            suggestedAction: 'Maintain current quality standards'
          });
        }
      } else {
        // If no tests are running but test files exist, prioritize running them
        if (tests.testFiles && tests.testFiles.length > 0) {
          plan.priorities.push({
            priority: 'high',
            area: 'testing',
            reason: `Test files exist (${tests.testFiles.length}) but no tests are running`,
            suggestedAction: `Configure and run the ${tests.testFiles.length} existing test files to establish baseline`
          });
        } else {
          // If no test results and no test files found, prioritize setting up testing
          plan.priorities.push({
            priority: 'high',
            area: 'testing',
            reason: 'No test results found and no test files detected, need to establish testing framework',
            suggestedAction: 'Set up and create initial test suite'
          });
        }
      }
    } else {
      // If we couldn't get test results, prioritize setting up testing
      plan.priorities.push({
        priority: 'high',
        area: 'testing',
        reason: 'No test results found, need to establish testing framework',
        suggestedAction: 'Set up and run comprehensive test suite'
      });
    }
    
    // Test-to-source mapping and coverage potential analysis
    if (tests && tests.coverageConnection) {
      const coveragePotential = tests.coverageConnection.coveragePotentialPercentage;
      if (coveragePotential > 0) {
        plan.priorities.push({
          priority: 'high',
          area: 'coverage',
          reason: `Tests exist for ${coveragePotential}% of source files, implement coverage reporting to measure and improve`,
          suggestedAction: `Set up code coverage reporting and aim to increase from current ${coveragePotential}% potential`
        });
      }
    }
    
    const coverage = this.analysisResults.coverage;
    if (coverage && !coverage.error && coverage.available !== false) {
      if (coverage.lines < 80) {
        plan.priorities.push({
          priority: 'high',
          area: 'coverage',
          reason: `Code coverage is ${coverage.lines}%, below 80% target`,
          suggestedAction: 'Add more tests for better coverage'
        });
      } else if (coverage.lines < 90) {
        plan.priorities.push({
          priority: 'medium',
          area: 'coverage',
          reason: `Code coverage is ${coverage.lines}%, could be improved to 90%+`,
          suggestedAction: 'Continue expanding test coverage'
        });
      }
    } else {
      plan.priorities.push({
        priority: 'high',
        area: 'coverage',
        reason: 'No code coverage data available',
        suggestedAction: 'Set up code coverage reporting'
      });
    }
    
    // Check static analysis results
    const staticAnalysis = this.analysisResults.static;
    if (staticAnalysis && !staticAnalysis.error) {
      // Check for very large files that may need refactoring
      if (staticAnalysis.largestFiles && staticAnalysis.largestFiles.length > 0) {
        const largestFile = staticAnalysis.largestFiles[0];
        if (largestFile && largestFile.lines > 500) {
          plan.priorities.push({
            priority: 'high',
            area: 'refactoring',
            reason: `Largest file (${largestFile.path}) has ${largestFile.lines} lines, consider refactoring`,
            suggestedAction: `Break down large file ${largestFile.path} into smaller, more manageable modules`
          });
        } else if (largestFile && largestFile.lines > 300) {
          plan.priorities.push({
            priority: 'medium',
            area: 'refactoring',
            reason: `Largest file (${largestFile.path}) has ${largestFile.lines} lines, could be refactored`,
            suggestedAction: `Consider breaking down large file ${largestFile.path}`
          });
        }
      }
      
      // Check average lines per file
      if (staticAnalysis.avgLinesPerFile > 200) {
        plan.priorities.push({
          priority: 'medium',
          area: 'refactoring',
          reason: `Average file size is ${staticAnalysis.avgLinesPerFile} lines, higher than recommended`,
          suggestedAction: 'Review codebase for potential refactoring opportunities to create smaller modules'
        });
      }
    }
    
    // Check README compliance
    const requirements = this.analysisResults.requirements;
    if (requirements && !requirements.error) {
      if (requirements.complianceScore < 80) {
        plan.priorities.push({
          priority: 'high',
          area: 'documentation',
          reason: `README compliance is ${requirements.complianceScore}%, below 80% target`,
          suggestedAction: 'Improve documentation to match system specifications'
        });
      } else if (requirements.complianceScore < 90) {
        plan.priorities.push({
          priority: 'medium',
          area: 'documentation',
          reason: `README compliance is ${requirements.complianceScore}%, could be improved`,
          suggestedAction: 'Continue improving documentation to reach 90%+ compliance'
        });
      }
      
      // Check for specific missing elements
      if (!requirements.hasTermClassDocumentation) {
        plan.priorities.push({
          priority: 'high',
          area: 'core_implementation',
          reason: 'Term class implementation and documentation not found in README',
          suggestedAction: 'Implement and document the Term class as specified'
        });
      }
      if (!requirements.hasTaskClassDocumentation) {
        plan.priorities.push({
          priority: 'high',
          area: 'core_implementation',
          reason: 'Task class implementation and documentation not found in README',
          suggestedAction: 'Implement and document the Task class as specified'
        });
      }
      if (!requirements.hasTruthDocumentation) {
        plan.priorities.push({
          priority: 'high',
          area: 'core_implementation',
          reason: 'Truth value implementation and documentation not found in README',
          suggestedAction: 'Implement and document the Truth value system as specified'
        });
      }
      if (!requirements.hasStampDocumentation) {
        plan.priorities.push({
          priority: 'high',
          area: 'core_implementation',
          reason: 'Stamp implementation and documentation not found in README',
          suggestedAction: 'Implement and document the Stamp system as specified'
        });
      }
      if (!requirements.hasTestingStrategy) {
        plan.priorities.push({
          priority: 'high',
          area: 'quality_assurance',
          reason: 'Testing strategy not documented in README',
          suggestedAction: 'Document the testing strategy as specified'
        });
      }
      if (!requirements.hasErrorHandling) {
        plan.priorities.push({
          priority: 'high',
          area: 'robustness',
          reason: 'Error handling not documented in README',
          suggestedAction: 'Implement and document error handling as specified'
        });
      }
      if (!requirements.hasSecurityImplementation) {
        plan.priorities.push({
          priority: 'high',
          area: 'security',
          reason: 'Security implementation not documented in README',
          suggestedAction: 'Implement and document security features as specified'
        });
      }
    }
    
    // Add action items based on priorities
    plan.priorities.forEach(priority => {
      plan.actionItems.push({
        area: priority.area,
        priority: priority.priority,
        task: priority.suggestedAction,
        estimatedTime: this.estimateEffort(priority.priority),
        dependsOn: this.getDependencies(priority.area)
      });
    });
    
    // Add general recommendations based on system insights
    plan.recommendations.push('Continue monitoring system performance and run self-analysis regularly');
    plan.recommendations.push('Use system reasoning to guide development priorities');
    plan.recommendations.push('Focus on the highest priority items identified in this analysis');
    plan.recommendations.push('Regularly update the README to reflect implemented features');
    
    console.log('Development Plan:');
    console.log(JSON.stringify(plan, null, 2));
    
    return plan;
  }
  
  /**
   * Estimate effort based on priority
   */
  estimateEffort(priority) {
    switch(priority) {
      case 'high':
        return '1-2 weeks';
      case 'medium':
        return '3-5 days';
      case 'low':
        return '1-2 days';
      default:
        return 'unknown';
    }
  }
  
  /**
   * Get dependencies between areas
   */
  getDependencies(area) {
    const dependencies = {
      'core_implementation': ['architecture'],
      'testing': ['core_implementation'],
      'coverage': ['testing'],
      'refactoring': ['testing'],
      'documentation': ['core_implementation'],
      'quality_assurance': ['core_implementation', 'testing'],
      'robustness': ['core_implementation', 'testing'],
      'security': ['core_implementation', 'robustness']
    };
    
    return dependencies[area] || [];
  }
}

// Run the analyzer
async function main() {
  const analyzer = new SeNARSSelfAnalyzer();
  await analyzer.runAnalysis();
  analyzer.generateDevelopmentPlan();
}

// Check if this script is being run directly (not imported)
import { fileURLToPath } from 'url';
import { dirname, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run main function when the script is executed directly
if (basename(__filename) === process.argv[1]?.split('/').pop()) {
  main().catch(err => {
    console.error('Analysis failed:', err);
    process.exit(1);
  });
}

export default SeNARSSelfAnalyzer;