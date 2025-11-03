#!/usr/bin/env node

/**
 * SeNARS Self-Analysis Script
 * Uses the system to analyze its own development status and provide insights
 * 
 * Usage: node self-analyze.js [options]
 * 
 * Options:
 * --all, -a          Run all analyses (default behavior)
 * --tests, -t        Run only test analysis
 * --coverage, -c     Run only coverage analysis
 * --static, -s       Run only static code analysis
 * --project, -p      Run only project info analysis
 * --requirements, -r Run only requirements analysis
 * --slowest, -sl     Show slowest tests analysis
 * --verbose, -v      Verbose output
 * --summary-only, -S Show only summary output
 * --help, -h         Show this help message
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class SeNARSSelfAnalyzer {
  constructor(options = {}) {
    this.options = {
      tests: false,
      coverage: false,
      static: false,
      project: false,
      requirements: false,
      slowest: false,
      verbose: false,
      summaryOnly: false,
      all: true, // default to all if no specific analysis is requested
      ...options
    };
    
    // If any specific analysis is requested, turn off 'all' mode
    if (this.options.tests || this.options.coverage || this.options.static || 
        this.options.project || this.options.requirements || this.options.slowest) {
      this.options.all = false;
    }
    
    this.analysisResults = {};
  }

  /**
   * Collect unit test results with detailed information for code coverage analysis
   */
  collectTestResults() {
    if (this.options.verbose) {
      console.log('\n🔍 Collecting Unit Test Results...');
    }
    
    try {
      // Try to run tests with JSON output for detailed individual test results
      let testResult = spawnSync('npx', ['jest', '--json', '--silent'], {
        cwd: process.cwd(),
        timeout: 180000, // 3 minutes timeout for large test suites
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_NO_WARNINGS: '1',
          NODE_OPTIONS: '--experimental-vm-modules'
        }
      });

      if (testResult.status === 0 || testResult.status === 1) { // Accept 1 (some tests failed) as valid result
        // Parse the JSON output from Jest
        const output = testResult.stdout || testResult.stderr;
        
        try {
          let parsedResult = null;
          
          // Try to parse the whole output as JSON (Jest typically outputs complete JSON)
          try {
            parsedResult = JSON.parse(output.trim());
          } catch (e) {
            // If that fails, try to extract JSON from the output
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0]);
            }
          }
          
          if (parsedResult && parsedResult.testResults) {
            // Extract detailed individual test results
            const individualTestResults = this.extractIndividualTestResults(parsedResult.testResults);
            
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
              slowestTests: this.getSlowestTests(individualTestResults),
              testFiles: this.getTestFilesList()
            };
            
            this.analysisResults.tests = stats;
            return stats;
          }
        } catch (jsonError) {
          if (this.options.verbose) {
            console.log(`❌ JSON parsing error: ${jsonError.message}`);
          }
        }
      }
      
      // If JSON run failed, try regular test command
      const altTestResult = spawnSync('npm', ['test', '--', '--json'], {
        cwd: process.cwd(),
        timeout: 120000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      if (altTestResult.status === 0 || altTestResult.status === 1) {
        const output = altTestResult.stdout || altTestResult.stderr;
        try {
          let fallbackParsed = JSON.parse(output.trim());
          if (fallbackParsed.testResults) {
            const individualTestResults = this.extractIndividualTestResults(fallbackParsed.testResults);
            const stats = {
              status: altTestResult.status === 0 ? 'success' : 'partial',
              totalTests: fallbackParsed.numTotalTests || 0,
              passedTests: fallbackParsed.numPassedTests || 0,
              failedTests: fallbackParsed.numFailedTests || 0,
              skippedTests: fallbackParsed.numPendingTests || 0,
              todoTests: fallbackParsed.numTodoTests || 0,
              testSuites: fallbackParsed.numTotalTestSuites || 0,
              totalSuites: fallbackParsed.numTotalTestSuites || 0,
              passedSuites: fallbackParsed.numPassedTestSuites || 0,
              failedSuites: fallbackParsed.numFailedTestSuites || 0,
              testDuration: fallbackParsed.endTime ? (fallbackParsed.endTime - fallbackParsed.startTime) : 'unknown',
              individualTestResults: individualTestResults,
              slowestTests: this.getSlowestTests(individualTestResults),
              testFiles: this.getTestFilesList()
            };
            
            this.analysisResults.tests = stats;
            return stats;
          }
        } catch (parseError) {
          if (this.options.verbose) {
            console.log('❌ Fallback test result parsing failed:', parseError.message);
          }
        }
      }
      
      // If all parsing fails, return basic stats
      const fallbackStats = {
        status: 'error',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        testSuites: 0,
        testFiles: this.getTestFilesList(),
        error: 'Unable to parse test results'
      };
      
      this.analysisResults.tests = fallbackStats;
      return fallbackStats;
      
    } catch (error) {
      if (this.options.verbose) {
        console.log(`❌ Test collection error: ${error.message}`);
      }
      const fallbackStats = {
        status: 'error',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        testSuites: 0,
        testFiles: this.getTestFilesList(),
        error: error.message
      };
      
      this.analysisResults.tests = fallbackStats;
      return fallbackStats;
    }
  }

  /**
   * Get list of test files
   */
  getTestFilesList() {
    const testFiles = [];
    const searchPaths = ['./tests', './test', './src'];
    
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        this.collectTestFilesRecursively(searchPath, testFiles);
      }
    }
    
    return testFiles;
  }
  
  /**
   * Recursively collect test files
   */
  collectTestFilesRecursively(dir, testFiles) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        this.collectTestFilesRecursively(fullPath, testFiles);
      } else if (item.isFile()) {
        // Check if it's a test file (has .test.js, .spec.js, or _test.js, _spec.js pattern)
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

  /**
   * Extract individual test results from Jest JSON output
   */
  extractIndividualTestResults(testResultsArray) {
    const individualResults = [];
    
    if (!testResultsArray) return individualResults;
    
    for (const testSuite of testResultsArray) {
      const suiteName = testSuite.name || testSuite.testFilePath;
      
      if (testSuite.assertionResults) {
        // Jest uses assertionResults for individual test results
        for (const testResult of testSuite.assertionResults) {
          individualResults.push({
            name: testResult.title,
            status: testResult.status, // 'passed', 'failed', 'pending', 'todo'
            duration: testResult.duration || 0,
            suite: suiteName,
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
  
  /**
   * Get the slowest tests
   */
  getSlowestTests(individualTestResults) {
    if (!individualTestResults || individualTestResults.length === 0) return [];
    
    // Sort tests by duration in descending order
    const sortedTests = [...individualTestResults]
      .filter(test => test.duration && test.duration > 0)  // Only include tests with duration > 0
      .sort((a, b) => b.duration - a.duration);
    
    // Return top 10 slowest tests
    return sortedTests.slice(0, 10).map(test => ({
      name: test.name,
      duration: test.duration,
      suite: test.suite,
      status: test.status
    }));
  }

  /**
   * Collect code coverage data (if available)
   */
  collectCoverage() {
    if (this.options.verbose) {
      console.log('\n🔍 Collecting Coverage Data...');
    }
    
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
        if (this.options.verbose) {
          console.log('No existing coverage data found, attempting to generate...');
        }
        
        // Try to run coverage
        const result = spawnSync('npm', ['test', '--', '--coverage', '--coverageReporters=json-summary'], {
          cwd: process.cwd(),
          timeout: 120000, // 2 minutes timeout
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        if (result.status === 0) {
          // Check again for coverage file after running coverage command
          const coverageFile = './coverage/coverage-summary.json';
          if (fs.existsSync(coverageFile)) {
            coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
          }
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
        return coverageStats;
      } else {
        if (this.options.verbose) {
          console.log('❌ No coverage data found or generated');
        }
        this.analysisResults.coverage = { available: false };
        return null;
      }
    } catch (error) {
      if (this.options.verbose) {
        console.log(`❌ Coverage collection error: ${error.message}`);
      }
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
          
          // Get file size for sorting
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
        });
        
        // Sort by lowest coverage first, then by largest file size, then by most statements
        files.sort((a, b) => {
          // Primary sort: by coverage percentage (ascending)
          if (a.lineCoverage !== b.lineCoverage) {
            return a.lineCoverage - b.lineCoverage;
          }
          // Secondary sort: by file size (descending) for files with same coverage
          if (a.size !== b.size) {
            return b.size - a.size;
          }
          // Tertiary sort: by number of statements (descending) for files with same coverage and size
          return b.statements - a.statements;
        });
        
        // Return top 10 lowest coverage files
        return files.slice(0, 10);
      }
      
      return [];
    } catch (error) {
      if (this.options.verbose) {
        console.log(`❌ File coverage analysis error: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Collect package.json dependencies and project metadata
   */
  collectProjectInfo() {
    if (this.options.verbose) {
      console.log('\n🔍 Collecting Project Information...');
    }
    
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
      return projectInfo;
    } catch (error) {
      if (this.options.verbose) {
        console.log(`❌ Project info collection error: ${error.message}`);
      }
      this.analysisResults.project = { error: error.message };
      return null;
    }
  }

  /**
   * Perform static code analysis by counting files and lines
   */
  collectStaticAnalysis() {
    if (this.options.verbose) {
      console.log('\n🔍 Collecting Static Analysis...');
    }
    
    try {
      const srcPath = './src';
      if (!fs.existsSync(srcPath)) {
        if (this.options.verbose) {
          console.log('❌ Source directory not found');
        }
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
        largestFiles: [], // Track the largest files
        complexityMetrics: {}, // Track complexity metrics for graph analysis
        dependencyInfo: {} // Track dependency information
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
                
                // Extract potential dependencies/imports
                const imports = this.extractImports(content);
                
                // Calculate complexity metrics
                const complexity = this.calculateComplexityMetrics(content);
                
                // Track file details
                stats.fileDetails.push({
                  path: path.relative('.', fullPath),
                  lines: lines,
                  size: content.length,
                  imports: imports,
                  complexity: complexity
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
        
        // Calculate aggregate complexity metrics
        const allComplexity = stats.fileDetails.map(f => f.complexity);
        if (allComplexity.length > 0) {
          stats.avgComplexity = allComplexity.reduce((sum, comp) => sum + comp.cyclomatic, 0) / allComplexity.length;
          stats.avgFunctionCount = allComplexity.reduce((sum, comp) => sum + comp.functionCount, 0) / allComplexity.length;
        }
      }
      
      this.analysisResults.static = stats;
      return stats;
    } catch (error) {
      if (this.options.verbose) {
        console.log(`❌ Static analysis error: ${error.message}`);
      }
      this.analysisResults.static = { error: error.message };
      return null;
    }
  }
  
  /**
   * Extract import statements from file content
   */
  extractImports(content) {
    const imports = [];
    const importRegex = /(import\s+|from\s+|require\(\s*)["'](.*?\.(js|ts))["']/gi;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[2];
      if (imp && !imp.startsWith('.') && !imp.startsWith('/')) { // Only external imports
        imports.push(imp);
      }
    }
    
    // Also extract relative imports
    const relativeImportRegex = /(import\s+|from\s+|require\(\s*)["'](\.{1,2}\/.*?\.(js|ts))["']/gi;
    while ((match = relativeImportRegex.exec(content)) !== null) {
      imports.push(match[2]);
    }
    
    return [...new Set(imports)]; // Return unique imports
  }
  
  /**
   * Calculate complexity metrics from file content
   */
  calculateComplexityMetrics(content) {
    const lines = content.split('\n');
    
    let functionCount = 0;
    let classCount = 0;
    let conditionalCount = 0; // if, else if, else, switch, case, for, while, try, catch
    let cyclomatic = 1; // Base complexity is 1
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('function ') || trimmed.includes('function(') || 
          trimmed.includes('=>') || trimmed.includes('function*')) {
        functionCount++;
      }
      if (trimmed.includes('class ')) {
        classCount++;
      }
      
      // Count complexity-increasing constructs
      if (trimmed.includes('if (') || trimmed.includes('else if')) {
        conditionalCount++;
        cyclomatic++;
      }
      if (trimmed.includes('for (') || trimmed.includes('while (') || trimmed.includes('do {')) {
        conditionalCount++;
        cyclomatic++;
      }
      if (trimmed.includes('switch (')) {
        conditionalCount++;
        cyclomatic++; // Switch is one complexity point
      }
      if (trimmed.includes('try ') || trimmed.includes('catch (')) {
        conditionalCount++;
        cyclomatic++;
      }
      // Count boolean operators that increase complexity
      if (trimmed.includes(' && ') || trimmed.includes(' || ')) {
        cyclomatic++;
      }
    }
    
    return {
      lines: lines.length,
      functionCount: functionCount,
      classCount: classCount,
      conditionalCount: conditionalCount,
      cyclomatic: cyclomatic
    };
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
    if (this.options.verbose) {
      console.log('\n🔍 Collecting Requirements Analysis...');
    }
    
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
        hasBeliefGoalDistinction: readmeContent.includes('Belief vs. Goal') || readmeContent.toLowerCase().includes('belief') && readmeContent.includes('goal'),
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
      return requirements;
    } catch (error) {
      if (this.options.verbose) {
        console.log(`❌ Requirements analysis error: ${error.message}`);
      }
      this.analysisResults.requirements = { error: error.message };
      return null;
    }
  }

  /**
   * Run the analysis based on options
   */
  async runAnalysis() {
    if (!this.options.summaryOnly && !this.options.verbose) {
      console.log('🔍 SeNARS Self-Analysis');
    }
    
    // Run only the analyses requested via flags
    if (this.options.all || this.options.tests) {
      this.collectTestResults();
    }
    if (this.options.all || this.options.coverage) {
      this.collectCoverage();
    }
    if (this.options.all || this.options.project) {
      this.collectProjectInfo();
    }
    if (this.options.all || this.options.static) {
      this.collectStaticAnalysis();
    }
    if (this.options.all || this.options.requirements) {
      this.collectRequirementsAnalysis();
    }

    // Display results based on requested analyses
    this.displayResults();
  }
  
  /**
   * Display results based on options
   */
  displayResults() {
    if (this.options.summaryOnly) {
      this.printSummary();
    } else if (this.options.verbose) {
      this.printDetailedResults();
    } else {
      this.printConciseResults();
    }
    
    // Show slowest tests if requested or in default mode
    if (this.options.slowest || (this.options.all && !this.options.summaryOnly)) {
      this.printSlowestTests();
    }
    
    // Show largest files in default mode
    if (this.options.all && !this.options.summaryOnly && this.analysisResults.static) {
      this.printLargestFiles();
    }
    
    // Show lowest coverage files in default mode
    if (this.options.all && !this.options.summaryOnly && this.analysisResults.coverage) {
      this.printLowestCoverageFiles();
    }
  }
  
  /**
   * Print summary results
   */
  printSummary() {
    const results = this.analysisResults;
    
    // Project metrics
    if (results.project && !results.project.error) {
      console.log(`📦 ${results.project.name} v${results.project.version} (${results.project.dependencies} deps, ${results.project.devDependencies} devDeps)`);
    }
    
    // Test metrics
    if (results.tests && !results.tests.error) {
      const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
      console.log(`🧪 Tests: ${results.tests.passedTests}/${results.tests.totalTests} (${passRate}%) ${passRate >= 95 ? '✅' : passRate >= 80 ? '⚠️' : '❌'}`);
    }
    
    // Coverage metrics
    if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
      console.log(`_coverage: ${results.coverage.lines}% lines ${results.coverage.lines >= 80 ? '✅' : results.coverage.lines >= 50 ? '⚠️' : '❌'}`);
    }
    
    // Code structure
    if (results.static && !results.static.error) {
      console.log(`📁 Code: ${results.static.jsFiles} files, ~${results.static.totalLines} lines, avg: ${results.static.avgLinesPerFile}/file`);
    }
    
    // README compliance
    if (results.requirements && !results.requirements.error) {
      console.log(`📋 README: ${results.requirements.complianceScore}% compliance ${results.requirements.complianceScore >= 90 ? '✅' : results.requirements.complianceScore >= 70 ? '⚠️' : '❌'}`);
    }
  }
  
  /**
   * Print concise but informative results with tables
   */
  printConciseResults() {
    const results = this.analysisResults;
    
    console.log('\n📊 PROJECT OVERVIEW:');
    
    // Project metrics table
    if (results.project && !results.project.error) {
      console.log(`  Project: ${results.project.name} v${results.project.version}`);
      console.log(`  Dependencies: ${results.project.dependencies} regular, ${results.project.devDependencies} dev`);
      console.log(`  Scripts: ${results.project.scripts} defined`);
    }
    
    // Test metrics table
    if (results.tests && !results.tests.error) {
      const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
      console.log(`  Tests: ${results.tests.passedTests}/${results.tests.totalTests} passed (${passRate}%)`);
      console.log(`  Status: ${passRate >= 95 ? '✅ Excellent' : passRate >= 80 ? '⚠️ Good' : '❌ Needs attention'}`);
      console.log(`  Failed: ${results.tests.failedTests}, Todo: ${results.tests.todoTests}, Skipped: ${results.tests.skippedTests}`);
      console.log(`  Suites: ${results.tests.testSuites}, Files: ${results.tests.testFiles.length}`);
    }
    
    // Coverage metrics table
    if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
      console.log(`  Coverage: Lines: ${results.coverage.lines}%, Functions: ${results.coverage.functions}%, Branches: ${results.coverage.branches}%`);
      console.log(`  Status: ${results.coverage.lines >= 80 ? '✅ Good' : results.coverage.lines >= 50 ? '⚠️ Moderate' : '❌ Low'}`);
    }
    
    // Code structure table
    if (results.static && !results.static.error) {
      console.log(`  Code: ${results.static.jsFiles} JS files, ~${results.static.totalLines} lines`);
      console.log(`  Avg: ${results.static.avgLinesPerFile}/file, Median: ${results.static.medianLinesPerFile}/file`);
      console.log(`  Directories: ${results.static.directories}, Types: ${Object.keys(results.static.filesByType).length}`);
    }
    
    // README compliance table
    if (results.requirements && !results.requirements.error) {
      console.log(`  Documentation: ${results.requirements.complianceScore}% compliance (${results.requirements.satisfiedRequirements}/${results.requirements.totalRequirements})`);
      console.log(`  Status: ${results.requirements.complianceScore >= 90 ? '✅ Excellent' : results.requirements.complianceScore >= 70 ? '⚠️ Good' : '❌ Needs work'}`);
    }
  }
  
  /**
   * Print detailed results (verbose mode)
   */
  printDetailedResults() {
    const results = this.analysisResults;
    
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
      if (results.tests.skippedTests !== undefined) {
        console.log(`  Skipped: ${results.tests.skippedTests}`);
      }
      if (results.tests.todoTests !== undefined) {
        console.log(`  Todo: ${results.tests.todoTests}`);
      }
      console.log(`  Suites: ${results.tests.testSuites}`);
      console.log(`  Pass Rate: ${passRate}%`);
      console.log(`  Status: ${passRate >= 95 ? '✅ Excellent' : passRate >= 80 ? '⚠️ Good but needs improvement' : '❌ Needs attention'}`);
      
      if (results.tests.testFiles) {
        console.log(`  Test Files: ${results.tests.testFiles.length} found`);
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
      if (results.static.largestFile) {
        console.log(`  Largest File: ${results.static.largestFile.path} (${results.static.largestFile.lines} lines)`);
      }
      if (results.static.smallestFile) {
        console.log(`  Smallest File: ${results.static.smallestFile.path} (${results.static.smallestFile.lines} lines)`);
      }
      if (results.static.avgComplexity !== undefined) {
        console.log(`  Avg Cyclomatic Complexity: ${results.static.avgComplexity.toFixed(2)}`);
        console.log(`  Avg Functions/File: ${results.static.avgFunctionCount.toFixed(2)}`);
      }
      
      // Show file type distribution
      console.log(`  File types: ${Object.entries(results.static.filesByType).map(([ext, count]) => `${ext}:${count}`).join(', ')}`);
    } else {
      console.log('  ❌ Structure metrics unavailable');
    }
    
    console.log('\n📋 README COMPLIANCE:');
    if (results.requirements && !results.requirements.error) {
      console.log(`  Compliance Score: ${results.requirements.complianceScore}%`);
      console.log(`  Satisfied: ${results.requirements.satisfiedRequirements}/${results.requirements.totalRequirements}`);
      console.log(`  Status: ${results.requirements.complianceScore >= 90 ? '✅ Excellent compliance' : results.requirements.complianceScore >= 70 ? '⚠️ Good compliance but needs improvement' : '❌ Needs significant improvement'}`);
      
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
   * Print slowest tests as a table
   */
  printSlowestTests() {
    const tests = this.analysisResults.tests;
    if (tests && tests.slowestTests && tests.slowestTests.length > 0) {
      console.log('\n🐢 SLOWEST TESTS:');
      console.log('  ┌─────┬──────────────────────────────────────────────────────┬──────────┬─────────┬─────────────────────────────────────────┐');
      console.log('  │ No. │ Test Name                                            │ Duration │ Status  │ Suite                                   │');
      console.log('  ├─────┼──────────────────────────────────────────────────────┼──────────┼─────────┼─────────────────────────────────────────┤');
      tests.slowestTests.forEach((test, idx) => {
        const name = test.name.length > 44 ? test.name.substring(0, 41) + '...' : test.name;
        const suite = test.suite.length > 44 ? test.suite.substring(0, 41) + '...' : test.suite;
        const duration = test.duration.toString().padStart(6);
        const status = test.status.padEnd(7);
        console.log(`  │ ${String(idx + 1).padStart(3)} │ ${name.padEnd(48)} │ ${duration}ms │ ${status} │ ${suite.padEnd(39)} │`);
      });
      console.log('  └─────┴──────────────────────────────────────────────────────┴──────────┴─────────┴─────────────────────────────────────────┘');
    } else if (tests) {
      console.log('\n🐢 No slow tests data available');
    }
  }
  
  /**
   * Print largest files as a table
   */
  printLargestFiles() {
    const staticData = this.analysisResults.static;
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
    } else if (staticData) {
      console.log('\n📄 No largest files data available');
    }
  }
  
  /**
   * Print lowest coverage files as a table
   */
  printLowestCoverageFiles() {
    const coverage = this.analysisResults.coverage;
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
    } else if (coverage) {
      console.log('\n📉 No lowest coverage files data available');
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tests: false,
    coverage: false,
    static: false,
    project: false,
    requirements: false,
    slowest: false,
    verbose: false,
    summaryOnly: false,
    all: true, // default to all if no specific analysis is requested
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--all':
      case '-a':
        options.all = true;
        break;
      case '--tests':
      case '-t':
        options.tests = true;
        options.all = false;
        break;
      case '--coverage':
      case '-c':
        options.coverage = true;
        options.all = false;
        break;
      case '--static':
      case '-s':
        options.static = true;
        options.all = false;
        break;
      case '--project':
      case '-p':
        options.project = true;
        options.all = false;
        break;
      case '--requirements':
      case '-r':
        options.requirements = true;
        options.all = false;
        break;
      case '--slowest':
      case '-sl':
        options.slowest = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--summary-only':
      case '-S':
        options.summaryOnly = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.log(`Unknown option: ${arg}`);
        options.help = true;
        break;
    }
  }
  
  // If any specific analysis is requested, turn off 'all' mode
  if (options.tests || options.coverage || options.static || 
      options.project || options.requirements) {
    options.all = false;
  }
  
  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
SeNARS Self-Analysis Script
Uses the system to analyze its own development status and provide insights

Usage: node self-analyze.js [options]

Options:
  --all, -a          Run all analyses (default behavior)
  --tests, -t        Run only test analysis
  --coverage, -c     Run only coverage analysis
  --static, -s       Run only static code analysis
  --project, -p      Run only project info analysis
  --requirements, -r Run only requirements analysis
  --slowest, -sl     Show slowest tests analysis (works with test analysis)
  --verbose, -v      Verbose output
  --summary-only, -S Show only summary output
  --help, -h         Show this help message

Examples:
  node self-analyze.js                    # Run all analyses (default)
  node self-analyze.js -t -v              # Verbose test analysis only
  node self-analyze.js --coverage --slowest # Coverage + slowest tests
  node self-analyze.js -S                 # Summary output only
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

// Run main function when the script is executed directly
if (basename(__filename) === process.argv[1]?.split('/').pop()) {
  main().catch(err => {
    console.error('Analysis failed:', err);
    process.exit(1);
  });
}

export default SeNARSSelfAnalyzer;