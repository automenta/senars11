#!/usr/bin/env node

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TOP_N = 20;

class BaseAnalyzer {
  constructor() {
    if (this.constructor === BaseAnalyzer) {
      throw new Error("Cannot instantiate abstract class BaseAnalyzer");
    }
  }

  async analyze() {
    throw new Error("analyze method must be implemented");
  }
}

class TestAnalyzer extends BaseAnalyzer {
  constructor(options, verbose) {
    super();
    this.options = options;
    this.verbose = verbose;
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Unit Test Results...');

    try {
      // Try jest first
      const testResult = spawnSync('npx', ['jest', '--json', '--silent'], {
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

      if (testResult.error) {
        if (this.verbose) console.log('❌ Jest command execution failed:', testResult.error.message);
        return this.createEmptyTestResult('Command execution error');
      }
      
      if (testResult.status === 0 || testResult.status === 1) {
        const output = testResult.stdout || testResult.stderr;
        if (!output) {
          if (this.verbose) console.log('❌ No output from Jest command');
          return this.createEmptyTestResult('No output from Jest');
        }
        
        const parsedResult = this.parseTestOutput(output);
        
        if (parsedResult && parsedResult.testResults) {
          const individualTestResults = this.extractIndividualTestResults(parsedResult.testResults);
          return this._buildTestResult(testResult, parsedResult, individualTestResults);
        }
      }

      // Fallback to npm test
      return await this._runFallbackTest();
    } catch (error) {
      if (this.verbose) console.log(`❌ Test collection error: ${error.message}`);
      return this.createEmptyTestResult(error.message);
    }
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
      testFiles: getTestFilesList(),
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
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
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
    const altTestResult = spawnSync('npm', ['test', '--', '--json'], {
      cwd: process.cwd(),
      timeout: 120000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (altTestResult.error) {
      if (this.verbose) console.log('❌ NPM test command execution failed:', altTestResult.error.message);
      return this.createEmptyTestResult('NPM test command execution error');
    }
    
    if (altTestResult.status === 0 || altTestResult.status === 1) {
      const output = altTestResult.stdout || altTestResult.stderr;
      if (!output) {
        if (this.verbose) console.log('❌ No output from NPM test command');
        return this.createEmptyTestResult('No output from NPM test');
      }
      
      try {
        const fallbackParsed = JSON.parse(output.trim());
        if (fallbackParsed.testResults) {
          const individualTestResults = this.extractIndividualTestResults(fallbackParsed.testResults);
          return this._buildTestResult(altTestResult, fallbackParsed, individualTestResults);
        }
      } catch (parseError) {
        if (this.verbose) console.log('❌ Fallback test result parsing failed:', parseError.message);
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
      testFiles: getTestFilesList(),
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

class CoverageAnalyzer extends BaseAnalyzer {
  constructor(options, verbose) {
    super();
    this.options = options;
    this.verbose = verbose;
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Coverage Data...');

    try {
      let coverageData = await this._loadOrCreateCoverage();
      
      if (coverageData) {
        return this._buildCoverageStats(coverageData);
      } else {
        if (this.verbose) console.log('❌ No coverage data found or generated');
        return { available: false };
      }
    } catch (error) {
      if (this.verbose) console.log(`❌ Coverage collection error: ${error.message}`);
      return { error: error.message };
    }
  }

  async _loadOrCreateCoverage() {
    let coverageData = null;
    const coveragePath = './coverage';
    
    if (fs.existsSync(coveragePath)) {
      const coverageFile = path.join(coveragePath, 'coverage-summary.json');
      if (fs.existsSync(coverageFile)) {
        try {
          coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        } catch (parseError) {
          if (this.verbose) console.log('❌ Error parsing coverage file:', parseError.message);
          return null;
        }
      }
    }

    if (!coverageData) {
      if (this.verbose) console.log('No existing coverage data found, attempting to generate...');
      
      const result = spawnSync('npm', ['test', '--', '--coverage', '--coverageReporters=json-summary'], {
        cwd: process.cwd(),
        timeout: 120000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      if (result.error) {
        if (this.verbose) console.log('❌ Coverage command execution failed:', result.error.message);
        return null;
      }
      
      if (result.status === 0) {
        const coverageFile = './coverage/coverage-summary.json';
        if (fs.existsSync(coverageFile)) {
          try {
            coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
          } catch (parseError) {
            if (this.verbose) console.log('❌ Error parsing generated coverage file:', parseError.message);
            return null;
          }
        }
      }
    }
    
    return coverageData;
  }

  _buildCoverageStats(coverageData) {
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
    
    coverageStats.fileAnalysis = analyzeCoverageByFile();
    
    // Additional detailed analysis
    coverageStats.detailedAnalysis = this._analyzeDetailedCoverage(coverageData);
    
    return coverageStats;
  }

  _analyzeDetailedCoverage(coverageData) {
    const detailedAnalysis = {
      lowCoverageFiles: [],
      coverageByDirectory: {},
      uncoveredBlocks: []
    };

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
      
      // Update directory stats
      detailedAnalysis.coverageByDirectory[directory].files++;
      detailedAnalysis.coverageByDirectory[directory].statements += total;
      detailedAnalysis.coverageByDirectory[directory].covered += covered;
    }
    
    // Calculate directory coverage percentages
    for (const [dir, stats] of Object.entries(detailedAnalysis.coverageByDirectory)) {
      stats.coveragePercent = stats.statements > 0 ? (stats.covered / stats.statements) * 100 : 100;
    }
    
    // Sort low coverage files by coverage percentage
    detailedAnalysis.lowCoverageFiles.sort((a, b) => a.coverage - b.coverage);
    
    // Sort directories by coverage percentage
    detailedAnalysis.directoriesSorted = Object.entries(detailedAnalysis.coverageByDirectory)
      .map(([dir, stats]) => ({ directory: dir, ...stats }))
      .sort((a, b) => a.coveragePercent - b.coveragePercent);
    
    return detailedAnalysis;
  }
}

class ProjectAnalyzer extends BaseAnalyzer {
  constructor(options, verbose) {
    super();
    this.options = options;
    this.verbose = verbose;
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Project Information...');

    try {
      if (!fs.existsSync('./package.json')) {
        if (this.verbose) console.log('❌ package.json not found');
        return { error: 'package.json not found' };
      }
      
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length,
        scripts: Object.keys(packageJson.scripts || {}).length
      };
    } catch (error) {
      if (this.verbose) console.log(`❌ Project info collection error: ${error.message}`);
      return { error: error.message };
    }
  }
}

class StaticAnalyzer extends BaseAnalyzer {
  constructor(options, verbose) {
    super();
    this.options = options;
    this.verbose = verbose;
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Static Analysis...');

    try {
      const srcPath = './src';
      if (!fs.existsSync(srcPath)) {
        if (this.verbose) console.log('❌ Source directory not found');
        return { error: 'src directory not found' };
      }

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

      this._traverseDirectory(srcPath, stats);

      stats.fileDetails.sort((a, b) => b.lines - a.lines);
      stats.largestFiles = stats.fileDetails.slice(0, TOP_N);

      if (stats.fileDetails.length > 0) {
        this._calculateSummaryStats(stats);
        this._calculateRiskMetrics(stats);
      }

      return stats;
    } catch (error) {
      if (this.verbose) console.log(`❌ Static analysis error: ${error.message}`);
      return { error: error.message };
    }
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

  _traverseDirectory(dir, stats) {
    if (!fs.existsSync(dir)) {
      if (this.verbose) console.log(`❌ Directory does not exist: ${dir}`);
      return;
    }
    
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch (readError) {
      if (this.verbose) console.log(`❌ Cannot read directory: ${dir}`, readError.message);
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
        depth: relativeDir.split(path.sep).length || 1 // Depth of directory
      };
    }
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        stats.directories++;
        const subDirPath = path.relative('.', fullPath);
        // Add subdirectory to parent's subdirectory list
        stats.directoryStats[relativeDir].subdirectories.push(subDirPath);
        this._traverseDirectory(fullPath, stats);
      } else if (item.isFile()) {
        this._processFile(item, fullPath, stats, relativeDir);
      }
    }
  }

  _processFile(item, fullPath, stats, parentDir) {
    const ext = path.extname(item.name).substring(1) || 'no_ext';
    stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1;

    if (item.name.endsWith('.js')) {
      stats.jsFiles++;
      const content = this._readFileContent(fullPath);
      if (content) {
        const lines = content.split('\n').length;
        stats.totalLines += lines;

        const imports = extractImports(content);
        const complexity = calculateComplexityMetrics(content);

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

  _readFileContent(fullPath) {
    try {
      return fs.readFileSync(fullPath, 'utf8');
    } catch (readError) {
      if (this.verbose) console.log(`⚠️ Cannot read file: ${fullPath}`, readError.message);
      return null;
    }
  }

  _calculateSummaryStats(stats) {
    const lineCounts = stats.fileDetails.map(f => f.lines);
    stats.avgLinesPerFile = Math.round(stats.totalLines / stats.fileDetails.length);
    stats.medianLinesPerFile = calculateMedian(lineCounts);
    stats.largestFile = stats.fileDetails[0];
    stats.smallestFile = stats.fileDetails[stats.fileDetails.length - 1];

    const allComplexity = stats.fileDetails.map(f => f.complexity);
    if (allComplexity.length > 0) {
      stats.avgComplexity = allComplexity.reduce((sum, comp) => sum + comp.cyclomatic, 0) / allComplexity.length;
      stats.avgFunctionCount = allComplexity.reduce((sum, comp) => sum + comp.functionCount, 0) / allComplexity.length;
    }
    
    // Calculate directory averages and detailed stats
    const directoryEntries = Object.entries(stats.directoryStats);
    if (directoryEntries.length > 0) {
      stats.directoryAvgLines = directoryEntries.reduce((sum, [, dirStats]) => sum + dirStats.lines, 0) / directoryEntries.length;
      stats.directoryAvgFiles = directoryEntries.reduce((sum, [, dirStats]) => sum + dirStats.files, 0) / directoryEntries.length;
      stats.largestDirectory = directoryEntries.reduce((max, current) => current[1].lines > max[1].lines ? current : max)[1];
      stats.mostFilesDirectory = directoryEntries.reduce((max, current) => current[1].files > max[1].files ? current : max)[1];
      
      // Create arrays for detailed directory analysis
      stats.largestDirectories = directoryEntries
        .map(([, dirStats]) => dirStats)
        .sort((a, b) => b.lines - a.lines)
        .slice(0, TOP_N);
      
      stats.largestFileCountDirectories = directoryEntries
        .map(([, dirStats]) => dirStats)
        .sort((a, b) => b.files - a.files)
        .slice(0, TOP_N);
      
      stats.complexityByDirectory = directoryEntries
        .map(([, dirStats]) => dirStats)
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, TOP_N);
      
      stats.largestSizeDirectories = directoryEntries
        .map(([, dirStats]) => dirStats)
        .sort((a, b) => b.size - a.size)
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
        .sort((a, b) => b.lines - a.lines)
        .slice(0, TOP_N);
      
      stats.subdirectoriesWithMostFiles = allSubdirectories
        .sort((a, b) => b.files - a.files)
        .slice(0, TOP_N);
      
      // Calculate directory averages by type
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
        stats.directoryStatsByDepth[depth] = {
          count: dirs.length,
          avgLines: dirs.reduce((sum, dir) => sum + dir.lines, 0) / dirs.length,
          avgFiles: dirs.reduce((sum, dir) => sum + dir.files, 0) / dirs.length,
          avgComplexity: dirs.reduce((sum, dir) => sum + dir.complexity, 0) / dirs.length,
          totalLines: dirs.reduce((sum, dir) => sum + dir.lines, 0),
          totalFiles: dirs.reduce((sum, dir) => sum + dir.files, 0)
        };
      }
    }
  }
}

class RequirementsAnalyzer extends BaseAnalyzer {
  constructor(options, verbose) {
    super();
    this.options = options;
    this.verbose = verbose;
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Requirements Analysis...');

    try {
      if (!fs.existsSync('./README.md')) {
        if (this.verbose) console.log('❌ README.md not found');
        return { error: 'README.md not found' };
      }
      
      const readmeContent = fs.readFileSync('./README.md', 'utf8');
      
      const requirements = this._analyzeRequirements(readmeContent);
      
      const satisfiedCount = Object.values(requirements).filter(value => value === true).length;
      const totalCount = Object.keys(requirements).length;

      requirements.complianceScore = Math.round((satisfiedCount / totalCount) * 100);
      requirements.satisfiedRequirements = satisfiedCount;
      requirements.totalRequirements = totalCount;

      return requirements;
    } catch (error) {
      if (this.verbose) console.log(`❌ Requirements analysis error: ${error.message}`);
      return { error: error.message };
    }
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
}

class PlanningAnalyzer extends BaseAnalyzer {
  constructor(options, verbose) {
    super();
    this.options = options;
    this.verbose = verbose;
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Planning and Roadmap Indicators...');

    try {
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
    } catch (error) {
      if (this.verbose) console.log(`❌ Planning analysis error: ${error.message}`);
      return { error: error.message };
    }
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
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
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
  constructor(options, verbose) {
    super();
    this.options = options;
    this.verbose = verbose;
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Architecture and Dependency Analysis...');

    try {
      const srcPath = './src';
      if (!fs.existsSync(srcPath)) {
        if (this.verbose) console.log('❌ Source directory not found');
        return { error: 'src directory not found' };
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
    } catch (error) {
      if (this.verbose) console.log(`❌ Architecture analysis error: ${error.message}`);
      return { error: error.message };
    }
  }

  _buildDependencyGraph(dir, architecture) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        this._buildDependencyGraph(fullPath, architecture);
      } else if (item.isFile() && item.name.endsWith('.js')) {
        const relativePath = path.relative('.', fullPath);
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
      if (this.verbose) console.log(`⚠️ Cannot read file: ${filePath}`, readError.message);
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
    
    architecture.couplingMetrics = { afferent, efferent, instability };
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
  constructor(options, verbose) {
    super();
    this.options = options;
    this.verbose = verbose;
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Technical Debt Indicators...');

    try {
      const srcPath = './src';
      if (!fs.existsSync(srcPath)) {
        if (this.verbose) console.log('❌ Source directory not found');
        return { error: 'src directory not found' };
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
    } catch (error) {
      if (this.verbose) console.log(`❌ Technical debt analysis error: ${error.message}`);
      return { error: error.message };
    }
  }

  _analyzeDirectory(dir, debtIndicators) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

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
    const content = this._readFileContent(filePath);
    if (!content) return;

    const relativePath = path.relative('.', filePath);
    const lines = content.split('\n');
    const complexityMetrics = calculateComplexityMetrics(content);
    
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
      if (this.verbose) console.log(`⚠️ Cannot read file: ${filePath}`, readError.message);
      return null;
    }
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
    super();
    this.options = options;
    this.verbose = verbose;
    this.specDir = './specifications';
    this.featureSpecs = new Map();
  }

  async analyze() {
    if (this.verbose) console.log('\n🔍 Collecting Feature Specifications...');

    try {
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
    } catch (error) {
      if (this.verbose) console.log(`❌ Feature specification collection error: ${error.message}`);
      return { error: error.message };
    }
  }

  async _loadSpecFiles() {
    if (!fs.existsSync(this.specDir)) return;

    const items = fs.readdirSync(this.specDir, { withFileTypes: true });

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
          if (this.verbose) console.log(`⚠️ Error parsing spec file ${fullPath}:`, parseError.message);
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
        { id: 'core-knowledge-representation', title: 'Core Knowledge Representation', 
          description: 'System for representing knowledge using Terms and Tasks', 
          requirements: ['Term class implementation', 'Task class implementation', 'Truth value handling'],
          status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown' },
        { id: 'reasoning-engine', title: 'NARS Reasoner Engine', 
          description: 'Core reasoning engine (NAR) for processing tasks and knowledge', 
          requirements: ['NAR implementation', 'Inference mechanisms', 'Concept handling'],
          status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown' },
        { id: 'memory-management', title: 'Memory and Focus Management', 
          description: 'System for managing concepts and tasks in memory', 
          requirements: ['Concept memory', 'Event buffer', 'Focus control'],
          status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown' },
        { id: 'parsing', title: 'Parser System', 
          description: 'System for parsing Narsese input', 
          requirements: ['Narsese parser', 'Input handling', 'Syntax validation'],
          status: 'defined', implementationStatus: 'unknown', testStatus: 'unknown' }
      ];
      
      for (const feature of features) {
        this.featureSpecs.set(feature.id, feature);
      }
    }
  }

  async _mapFeaturesToTests() {
    const testFiles = getTestFilesList();
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
        if (this.verbose) console.log(`⚠️ Could not read test file ${testFile}:`, e.message);
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
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        await this._traverseAndMapFeatures(fullPath, connections);
      } else if (item.isFile() && item.name.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relativePath = path.relative('.', fullPath);

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
          if (this.verbose) console.log(`⚠️ Could not read implementation file ${fullPath}:`, e.message);
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

// Helper functions
function getTestFilesList() {
  const testFiles = [];
  const searchPaths = ['./tests', './test', './src'];
  
  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      collectTestFilesRecursively(searchPath, testFiles);
    }
  }
  
  return testFiles;
}

function collectTestFilesRecursively(dir, testFiles) {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      collectTestFilesRecursively(fullPath, testFiles);
    } else if (item.isFile()) {
      const isTestFile = item.name.endsWith('.test.js') || 
                        item.name.endsWith('.spec.js') ||
                        item.name.includes('_test.js') || 
                        item.name.includes('_spec.js');
      
      if (isTestFile) {
        const relPath = path.relative('.', fullPath);
        testFiles.push(relPath);
      }
    }
  }
}

function extractImports(content) {
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

function calculateComplexityMetrics(content) {
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

function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function analyzeCoverageByFile() {
  try {
    const coverageDetailPath = './coverage/coverage-final.json';
    if (!fs.existsSync(coverageDetailPath)) return [];

    let coverageDetail;
    try {
      coverageDetail = JSON.parse(fs.readFileSync(coverageDetailPath, 'utf8'));
    } catch (parseError) {
      console.log('❌ Error parsing coverage-final.json:', parseError.message);
      return [];
    }
    
    const files = Object.entries(coverageDetail).map(([filePath, coverage]) => {
      if (filePath.startsWith('./')) {
        filePath = path.resolve(filePath);
      }
      
      // Validate coverage structure before accessing properties
      if (!coverage || !coverage.s) {
        console.log(`⚠️ Invalid coverage structure for file: ${filePath}`);
        return null;
      }
      
      const summary = coverage.s;
      const statementKeys = Object.keys(summary);
      const coveredStatements = statementKeys.filter(key => summary[key] > 0).length;
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
      
      return {
        filePath: path.relative(process.cwd(), filePath),
        lineCoverage: parseFloat(lineCoverage.toFixed(2)),
        statements: statementCount,
        covered: coveredStatements,
        uncovered: statementCount - coveredStatements,
        size: fileSize
      };
    }).filter(Boolean); // Remove null entries
    
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
    }
  }

  printSummary(results) {
    console.log('📋 PROJECT SUMMARY:');
    
    if (results.project && !results.project.error) {
      console.log(`  📦 ${results.project.name} v${results.project.version}`);
      console.log(`     Dependencies: ${results.project.dependencies} regular, ${results.project.devDependencies} dev`);
    }
    
    if (results.tests && !results.tests.error) {
      const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
      const statusEmoji = passRate >= 95 ? '✅' : passRate >= 80 ? '⚠️' : '❌';
      console.log(`  🧪 Tests: ${results.tests.passedTests}/${results.tests.totalTests} (${passRate}%) ${statusEmoji}`);
      
      if (results.tests.failedTests > 0) {
        console.log(`     ⚠️  ${results.tests.failedTests} failed tests need attention`);
      }
      if (results.tests.failedTests === 0 && results.tests.passedTests > 0) {
        console.log(`     ✅ All tests passing - good stability`);
      }
    }
    
    if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
      const coverageStatus = results.coverage.lines >= 80 ? '✅' : results.coverage.lines >= 50 ? '⚠️' : '❌';
      console.log(`  📊 Coverage: ${results.coverage.lines}% lines ${coverageStatus}`);
      
      if (results.coverage.lines < 80) {
        console.log(`     ⚠️  Consider adding more tests for better coverage`);
      } else {
        console.log(`     ✅ Good test coverage - code reliability likely high`);
      }
    }
    
    if (results.static && !results.static.error) {
      console.log(`  📁 Code: ${results.static.jsFiles} files, ~${results.static.totalLines} lines`);
      console.log(`     Avg: ${results.static.avgLinesPerFile}/file, ${results.static.directories} dirs`);
      
      // Add insights about code health
      if (results.static.avgLinesPerFile > 300) {
        console.log(`     ⚠️  High avg lines per file - consider refactoring large files`);
      } else {
        console.log(`     ✅ Reasonable file sizes - good maintainability`);
      }
      
      // Identify potentially risky areas
      if (results.static.largestFile && results.static.largestFile.lines > 1000) {
        console.log(`     ⚠️  Largest file: ${results.static.largestFile.path} (${results.static.largestFile.lines} lines) - potential refactoring target`);
      }
      
      if (results.static.largestDirectories && results.static.largestDirectories.length > 0) {
        const largestDir = results.static.largestDirectories[0];
        console.log(`     🏗️  Largest directory: ${largestDir.path} (${largestDir.lines} lines) - major code area`);
      }
      
      if (results.static.avgComplexity && results.static.avgComplexity > 20) {
        console.log(`     ⚠️  High avg complexity (${results.static.avgComplexity.toFixed(2)}) - consider simplification`);
      } else if (results.static.avgComplexity) {
        console.log(`     ✅ Reasonable complexity (${results.static.avgComplexity.toFixed(2)}) - good maintainability`);
      }
    }
    
    if (results.requirements && !results.requirements.error) {
      const complianceStatus = results.requirements.complianceScore >= 90 ? '✅' : results.requirements.complianceScore >= 70 ? '⚠️' : '❌';
      console.log(`  📋 README: ${results.requirements.complianceScore}% compliance ${complianceStatus}`);
      
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
        insights.push(`Fix ${results.tests.failedTests} failing tests to ensure stability`);
        risks.push(`${results.tests.failedTests} failing tests indicate potential instability`);
      }
      if (results.coverage && results.coverage.lines < 80) {
        insights.push(`Improve test coverage (${results.coverage.lines}% < 80%) to catch potential issues`);
        risks.push(`Low test coverage (${results.coverage.lines}%) increases bug risk`);
      }
    }
    
    // Code structure insights
    if (results.static && !results.static.error) {
      if (results.static.avgLinesPerFile > 300) {
        insights.push(`Refactor large files (avg > 300 lines) to improve maintainability`);
        risks.push(`High avg file size (${results.static.avgLinesPerFile}) may complicate maintenance`);
      }
      if (results.static.avgComplexity > 20) {
        insights.push(`Simplify complex code (avg complexity > 20) to reduce bugs`);
        risks.push(`High avg complexity (${results.static.avgComplexity.toFixed(2)}) increases bug risk`);
      }
      if (results.static.largestFile && results.static.largestFile.lines > 1000) {
        insights.push(`Split ${results.static.largestFile.path} (${results.static.largestFile.lines} lines) into smaller modules`);
        risks.push(`Very large file (${results.static.largestFile.path}) is a maintenance risk`);
      }
      
      // Risk metrics insights
      if (results.static.riskMetrics) {
        if (results.static.riskMetrics.highRiskFiles.length > 0) {
          risks.push(`${results.static.riskMetrics.highRiskFiles.length} high-risk files need attention`);
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
        insights.push(`Consider splitting ${largestDir.path} (${largestDir.lines} lines) for better organization`);
        risks.push(`Large directory (${largestDir.path}) may benefit from modularization`);
      }
    }
    
    // Coverage insights
    if (results.coverage && results.coverage.detailedAnalysis && results.coverage.detailedAnalysis.lowCoverageFiles) {
      const lowCoverageCount = results.coverage.detailedAnalysis.lowCoverageFiles.filter(f => f.coverage < 30).length;
      if (lowCoverageCount > 0) {
        insights.push(`Focus on testing ${lowCoverageCount} critically low-coverage files (<30%)`);
        risks.push(`${lowCoverageCount} low-coverage files pose quality risks`);
      }
    }
    
    // Technical debt insights
    if (results.technicaldebt && !results.technicaldebt.error && results.technicaldebt.highRiskFiles) {
      if (results.technicaldebt.highRiskFiles.length > 0) {
        insights.push(`Address technical debt in ${results.technicaldebt.highRiskFiles.length} high-debt files`);
        risks.push(`High technical debt (${results.technicaldebt.totalDebtScore.toFixed(1)} score) slows development`);
        recommendations.push(`Target top debt files: ${results.technicaldebt.highRiskFiles.slice(0, 3).map(f => path.basename(f.path)).join(', ')}`);
      }
    }
    
    // Architecture insights
    if (results.architecture && !results.architecture.error) {
      if (results.architecture.cyclicDependencies.length > 0) {
        risks.push(`${results.architecture.cyclicDependencies.length} cyclic dependencies detected`);
        recommendations.push(`Resolve cyclic dependencies to improve modularity`);
      }
      
      if (results.architecture.apiEntryPoints.length > 0) {
        planningIndicators.push(`Identified ${results.architecture.apiEntryPoints.length} main entry points`);
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
      console.log(`  Name: ${results.project.name}`);
      console.log(`  Version: ${results.project.version}`);
      console.log(`  Description: ${results.project.description || 'No description'}`);
      console.log(`  Dependencies: ${results.project.dependencies} regular, ${results.project.devDependencies} dev`);
      console.log(`  Scripts: ${results.project.scripts} defined`);
    } else {
      console.log('  ❌ Project info unavailable');
    }
    
    console.log('\n🧪 TESTING METRICS:');
    if (results.tests && !results.tests.error) {
      const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
      console.log(`  Total Tests: ${results.tests.totalTests}`);
      console.log(`  Passed: ${results.tests.passedTests}`);
      console.log(`  Failed: ${results.tests.failedTests}`);
      if (results.tests.skippedTests !== undefined) console.log(`  Skipped: ${results.tests.skippedTests}`);
      if (results.tests.todoTests !== undefined) console.log(`  Todo: ${results.tests.todoTests}`);
      console.log(`  Suites: ${results.tests.testSuites}`);
      console.log(`  Pass Rate: ${passRate}%`);
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
      console.log(`  Lines: ${results.coverage.lines}%`);
      console.log(`  Functions: ${results.coverage.functions}%`);
      console.log(`  Branches: ${results.coverage.branches}%`);
      console.log(`  Statements: ${results.coverage.statements}%`);
      
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
            .map(([dir, stats]) => ({ directory: dir, ...stats }))
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
      console.log(`  JS Files: ${results.static.jsFiles}`);
      console.log(`  Total Lines: ${results.static.totalLines}`);
      console.log(`  Directories: ${results.static.directories}`);
      console.log(`  Avg Lines/File: ${results.static.avgLinesPerFile}`);
      console.log(`  Median Lines/File: ${results.static.medianLinesPerFile}`);
      if (results.static.largestFile) console.log(`  Largest File: ${results.static.largestFile.path} (${results.static.largestFile.lines} lines)`);
      if (results.static.smallestFile) console.log(`  Smallest File: ${results.static.smallestFile.path} (${results.static.smallestFile.lines} lines)`);
      if (results.static.avgComplexity !== undefined) {
        console.log(`  Avg Cyclomatic Complexity: ${results.static.avgComplexity.toFixed(2)}`);
        console.log(`  Avg Functions/File: ${results.static.avgFunctionCount.toFixed(2)}`);
      }
      
      console.log(`  File types: ${Object.entries(results.static.filesByType).map(([ext, count]) => `${ext}:${count}`).join(', ')}`);
      
      // Show directory statistics if available
      if (results.static.directoryStats) {
        console.log(`  Directory Statistics:`);
        const dirs = Object.entries(results.static.directoryStats).map(([path, stats]) => ({ path, ...stats }));
        
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
            const size = dir.size > 1024 ? `${Math.round(dir.size / 1024)}KB` : `${dir.size}B`;
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
      console.log(`  Compliance Score: ${results.requirements.complianceScore}%`);
      console.log(`  Satisfied: ${results.requirements.satisfiedRequirements}/${results.requirements.totalRequirements}`);
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
      console.log(`  Specifications Found: ${results.featurespecs.specificationsFound}`);
      console.log(`  Feature Compliance: ${results.featurespecs.overallFeatureCompliance}%`);
      
      const implementedFeatures = Object.values(results.featurespecs.coverageByFeature)
        .filter(f => f.implemented).length;
      console.log(`  Implemented Features: ${implementedFeatures}/${results.featurespecs.features.length}`);
      
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
      console.log(`  Total Debt Score: ${results.technicaldebt.totalDebtScore.toFixed(1)}`);
      console.log(`  Avg Debt per File: ${results.technicaldebt.avgDebtScore ? results.technicaldebt.avgDebtScore.toFixed(2) : 'N/A'}`);
      console.log(`  High Risk Files: ${results.technicaldebt.highRiskFiles ? results.technicaldebt.highRiskFiles.length : 0}`);
      console.log(`  Refactoring Targets: ${results.technicaldebt.refactoringTargets ? results.technicaldebt.refactoringTargets.length : 0}`);
      
      if (results.technicaldebt.highRiskFiles && results.technicaldebt.highRiskFiles.length > 0) {
        console.log(`  Top High Risk Files:`);
        results.technicaldebt.highRiskFiles.slice(0, 3).forEach(file => {
          console.log(`    - ${path.basename(file.path)}: ${file.debtScore.toFixed(1)} debt score`);
        });
      }
    } else {
      console.log('\n💳 TECHNICAL DEBT: ❌ Not analyzed');
    }
    
    // Architecture analysis
    if (results.architecture && !results.architecture.error) {
      console.log('\n🏗️  ARCHITECTURE ANALYSIS:');
      console.log(`  Files in Dependency Graph: ${Object.keys(results.architecture.dependencyGraph).length}`);
      console.log(`  Cyclic Dependencies: ${results.architecture.cyclicDependencies.length}`);
      console.log(`  Architectural Layers: ${Object.keys(results.architecture.architecturalLayers).length}`);
      console.log(`  API Entry Points: ${results.architecture.apiEntryPoints.length}`);
      
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
      console.log(`  Development Pace: ${results.planning.developmentVelocity.developmentPace || 'Unknown'}`);
      console.log(`  Refactoring Time Estimate: ${results.planning.futureEstimates.refactoringTime || 'Unknown'}`);
      console.log(`  Maintenance Effort: ${results.planning.futureEstimates.maintenanceEffort || 'Unknown'}`);
      
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
        console.log('  ┌─────┬──────────────────────────────────────────────────────┬──────────┬─────────┬─────────────────────────────────────────┐');
        console.log('  │ No. │ Test Name                                            │ Duration │ Status  │ Suite                                   │');
        console.log('  ├─────┼──────────────────────────────────────────────────────┼──────────┼─────────┼─────────────────────────────────────────┤');
        slowestTests.forEach((test, idx) => {
          const name = test.name.length > 44 ? test.name.substring(0, 41) + '...' : test.name;
          const suite = test.suite.length > 44 ? test.suite.substring(0, 41) + '...' : test.suite;
          const duration = test.duration.toString().padStart(6);
          const status = test.status.padEnd(7);
          console.log(`  │ ${String(idx + 1).padStart(3)} │ ${name.padEnd(48)} │ ${duration}ms │ ${status} │ ${suite.padEnd(39)} │`);
        });
        console.log('  └─────┴──────────────────────────────────────────────────────┴──────────┴─────────┴─────────────────────────────────────────┘');
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
      console.log('  ┌─────┬────────────────────────────────────────┬─────────┬──────────┐');
      console.log('  │ No. │ File Path                              │ Lines   │ Size     │');
      console.log('  ├─────┼────────────────────────────────────────┼─────────┼──────────┤');
      staticData.largestFiles.forEach((file, idx) => {
        const filePath = file.path.length > 38 ? file.path.substring(0, 35) + '...' : file.path;
        const lines = file.lines.toString().padStart(7);
        const size = (file.size > 1024 ? `${Math.round(file.size / 1024)}KB` : `${file.size}B`).padStart(8);
        console.log(`  │ ${String(idx + 1).padStart(3)} │ ${filePath.padEnd(38)} │ ${lines} │ ${size} │`);
      });
      console.log('  └─────┴────────────────────────────────────────┴─────────┴──────────┘');
    } else {
      console.log('\n📄 No largest files data available');
    }
  }

  printLowestCoverageFiles(results) {
    const coverage = results.coverage;
    if (coverage && coverage.fileAnalysis && coverage.fileAnalysis.length > 0) {
      console.log('\n📉 LOWEST COVERAGE FILES:');
      console.log('  ┌─────┬────────────────────────────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐');
      console.log('  │ No. │ File Path                              │ Lines   │ Covered │ Uncover │ Size    │ %       │');
      console.log('  ├─────┼────────────────────────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤');
      coverage.fileAnalysis.forEach((file, idx) => {
        const filePath = file.filePath.length > 38 ? file.filePath.substring(0, 35) + '...' : file.filePath;
        const statements = file.statements.toString().padStart(7);
        const covered = file.covered.toString().padStart(7);
        const uncover = file.uncovered.toString().padStart(7);
        const size = (file.size > 1024 ? `${Math.round(file.size / 1024)}KB` : `${file.size}B`).padStart(7);
        const percent = file.lineCoverage.toFixed(1).padStart(5) + '%';
        console.log(`  │ ${String(idx + 1).padStart(3)} │ ${filePath.padEnd(38)} │ ${statements} │ ${covered} │ ${uncover} │ ${size} │ ${percent} │`);
      });
      console.log('  └─────┴────────────────────────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘');
    } else {
      console.log('\n📉 No lowest coverage files data available');
    }
  }

  printCoverageByDirectory(results) {
    const coverage = results.coverage;
    if (coverage && coverage.detailedAnalysis && coverage.detailedAnalysis.directoriesSorted) {
      console.log('\n📁 COVERAGE BY DIRECTORY:');
      console.log('  ┌─────┬────────────────────────────────────────┬─────────┬─────────┬─────────┐');
      console.log('  │ No. │ Directory                              │ Files   │ Stmts   │ %       │');
      console.log('  ├─────┼────────────────────────────────────────┼─────────┼─────────┼─────────┤');
      coverage.detailedAnalysis.directoriesSorted.forEach((dir, idx) => {
        const dirPath = dir.directory.length > 38 ? dir.directory.substring(0, 35) + '...' : dir.directory;
        const files = dir.files.toString().padStart(7);
        const statements = dir.statements.toString().padStart(7);
        const percent = dir.coveragePercent.toFixed(1).padStart(5) + '%';
        console.log(`  │ ${String(idx + 1).padStart(3)} │ ${dirPath.padEnd(38)} │ ${files} │ ${statements} │ ${percent} │`);
      });
      console.log('  └─────┴────────────────────────────────────────┴─────────┴─────────┴─────────┘');
    } else {
      console.log('\n📁 No directory coverage data available');
    }
  }

  printLargestDirectories(results) {
    const staticData = results.static;
    if (staticData && staticData.largestDirectories && staticData.largestDirectories.length > 0) {
      console.log('\n🏗️  LARGEST DIRECTORIES (by lines):');
      console.log('  ┌─────┬────────────────────────────────────────┬─────────┬─────────┬─────────┐');
      console.log('  │ No. │ Directory                              │ Lines   │ Files   │ JS Files│');
      console.log('  ├─────┼────────────────────────────────────────┼─────────┼─────────┼─────────┤');
      staticData.largestDirectories.forEach((dir, idx) => {
        const dirPath = dir.path.length > 38 ? dir.path.substring(0, 35) + '...' : dir.path;
        const lines = dir.lines.toString().padStart(7);
        const files = dir.files.toString().padStart(7);
        const jsFiles = dir.jsFiles.toString().padStart(9);
        console.log(`  │ ${String(idx + 1).padStart(3)} │ ${dirPath.padEnd(38)} │ ${lines} │ ${files} │ ${jsFiles} │`);
      });
      console.log('  └─────┴────────────────────────────────────────┴─────────┴─────────┴─────────┘');
    } else {
      console.log('\n🏗️  No largest directories data available');
    }
  }

  printMostFilesDirectories(results) {
    const staticData = results.static;
    if (staticData && staticData.largestFileCountDirectories && staticData.largestFileCountDirectories.length > 0) {
      console.log('\n📂 DIRECTORIES WITH MOST FILES:');
      console.log('  ┌─────┬────────────────────────────────────────┬─────────┬─────────┬─────────┐');
      console.log('  │ No. │ Directory                              │ Files   │ Lines   │ JS Files│');
      console.log('  ├─────┼────────────────────────────────────────┼─────────┼─────────┼─────────┤');
      staticData.largestFileCountDirectories.forEach((dir, idx) => {
        const dirPath = dir.path.length > 38 ? dir.path.substring(0, 35) + '...' : dir.path;
        const files = dir.files.toString().padStart(7);
        const lines = dir.lines.toString().padStart(7);
        const jsFiles = dir.jsFiles.toString().padStart(9);
        console.log(`  │ ${String(idx + 1).padStart(3)} │ ${dirPath.padEnd(38)} │ ${files} │ ${lines} │ ${jsFiles} │`);
      });
      console.log('  └─────┴────────────────────────────────────────┴─────────┴─────────┴─────────┘');
    } else {
      console.log('\n📂 No most files directories data available');
    }
  }

  printComplexityByDirectory(results) {
    const staticData = results.static;
    if (staticData && staticData.complexityByDirectory && staticData.complexityByDirectory.length > 0) {
      console.log('\n🧩 COMPLEXITY BY DIRECTORY:');
      console.log('  ┌─────┬────────────────────────────────────────┬─────────┬─────────┬─────────┐');
      console.log('  │ No. │ Directory                              │ Complexity│Files  │ JS Files│');
      console.log('  ├─────┼────────────────────────────────────────┼─────────┼─────────┼─────────┤');
      staticData.complexityByDirectory.forEach((dir, idx) => {
        const dirPath = dir.path.length > 38 ? dir.path.substring(0, 35) + '...' : dir.path;
        const complexity = dir.complexity.toString().padStart(9);
        const files = dir.files.toString().padStart(7);
        const jsFiles = dir.jsFiles.toString().padStart(9);
        console.log(`  │ ${String(idx + 1).padStart(3)} │ ${dirPath.padEnd(38)} │ ${complexity} │ ${files} │ ${jsFiles} │`);
      });
      console.log('  └─────┴────────────────────────────────────────┴─────────┴─────────┴─────────┘');
    } else {
      console.log('\n🧩 No complexity by directory data available');
    }
  }
}

// Main analyzer class
// Factory for creating analyzers
class AnalyzerFactory {
  static createAnalyzer(type, options, verbose) {
    switch (type) {
      case 'tests': return new TestAnalyzer(options, verbose);
      case 'coverage': return new CoverageAnalyzer(options, verbose);
      case 'project': return new ProjectAnalyzer(options, verbose);
      case 'static': return new StaticAnalyzer(options, verbose);
      case 'requirements': return new RequirementsAnalyzer(options, verbose);
      case 'featurespecs': return new FeatureSpecificationAnalyzer(options, verbose);
      case 'technicaldebt': return new TechnicalDebtAnalyzer(options, verbose);
      case 'architecture': return new ArchitectureAnalyzer(options, verbose);
      case 'planning': return new PlanningAnalyzer(options, verbose);
      default: throw new Error(`Unknown analyzer type: ${type}`);
    }
  }
  
  static getAllAnalyzerTypes() {
    return ['tests', 'coverage', 'project', 'static', 'requirements', 'featurespecs', 'technicaldebt', 'architecture', 'planning'];
  }
}

class SeNARSSelfAnalyzer {
  constructor(options = {}) {
    this.options = { all: true, verbose: false, summaryOnly: false, slowest: false, ...options };
    
    // If any specific analysis is requested, turn off 'all' mode
    if (AnalyzerFactory.getAllAnalyzerTypes().some(category => this.options[category])) {
      this.options.all = false;
    }
    
    this.analyzers = {};
    for (const type of AnalyzerFactory.getAllAnalyzerTypes()) {
      this.analyzers[type] = AnalyzerFactory.createAnalyzer(type, this.options, this.options.verbose);
    }
    
    this.display = new ResultDisplay(this.options);
  }

  async runAnalysis() {
    if (!this.options.summaryOnly && !this.options.verbose) console.log('🔍 SeNARS Self-Analysis');

    const results = {};
    
    // Run only the analyses requested via flags
    for (const [category, analyzer] of Object.entries(this.analyzers)) {
      if (this.options.all || this.options[category]) {
        results[category] = await analyzer.analyze();
      }
    }

    // Display results based on requested analyses
    this.display.display(results);
    
    // Show additional tables if requested or in default mode
    if (this.options.slowest || (this.options.all && !this.options.summaryOnly)) {
      this.display.printSlowestTests(results);
    }
    
    if (this.options.all && !this.options.summaryOnly && results.static) {
      this.display.printLargestFiles(results);
      this.display.printLargestDirectories(results);
      this.display.printMostFilesDirectories(results);
      this.display.printComplexityByDirectory(results);
    }
    
    if (this.options.all && !this.options.summaryOnly && results.coverage) {
      this.display.printLowestCoverageFiles(results);
      this.display.printCoverageByDirectory(results);
    }
  }
}

// CLI argument parsing
const ARGUMENTS_CONFIG = {
  all: { aliases: ['--all', '-a'], type: Boolean, category: 'analysis' },
  tests: { aliases: ['--tests', '-t'], type: Boolean, category: 'analysis' },
  coverage: { aliases: ['--coverage', '-c'], type: Boolean, category: 'analysis' },
  static: { aliases: ['--static', '-s'], type: Boolean, category: 'analysis' },
  project: { aliases: ['--project', '-p'], type: Boolean, category: 'analysis' },
  requirements: { aliases: ['--requirements', '-r'], type: Boolean, category: 'analysis' },
  featurespecs: { aliases: ['--features', '--featurespecs', '-f'], type: Boolean, category: 'analysis' },
  technicaldebt: { aliases: ['--technicaldebt', '--debt', '-d'], type: Boolean, category: 'analysis' },
  architecture: { aliases: ['--architecture', '--arch', '-ar'], type: Boolean, category: 'analysis' },
  planning: { aliases: ['--planning', '--plan', '-pl'], type: Boolean, category: 'analysis' },
  slowest: { aliases: ['--slowest', '-sl'], type: Boolean, category: 'output' },
  verbose: { aliases: ['--verbose', '-v'], type: Boolean, category: 'output' },
  summaryOnly: { aliases: ['--summary-only', '-S'], type: Boolean, category: 'output' },
  help: { aliases: ['--help', '-h'], type: Boolean, category: 'meta' }
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

// Check if this script is being run directly (not imported)
import { fileURLToPath } from 'url';
import { dirname, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (basename(__filename) === process.argv[1]?.split('/').pop()) {
  main().catch(err => {
    console.error('Analysis failed:', err);
    process.exit(1);
  });
}

export default SeNARSSelfAnalyzer;