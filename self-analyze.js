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
import { SystemConfig } from './src/nar/SystemConfig.js';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
class SeNARSSelfAnalyzer {
  constructor() {
    this.config = SystemConfig.from({
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
   * Collect unit test results
   */
  collectTestResults() {
    console.log('\\n=== Collecting Unit Test Results ===');
    
    try {
      // Run the main test command which includes all tests
      const testResult = spawnSync('npm', ['test'], {
        cwd: process.cwd(),
        timeout: 60000, // 60 seconds timeout to ensure tests complete
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (testResult.status === 0) {
        // Jest output goes to stderr, not stdout
        const output = testResult.stderr || testResult.stdout;
        const lines = output.split('\\n');
        
        // Extract test statistics from the end of output
        let passedTests = 0;
        let totalTests = 0;
        let totalSuites = 0;

        for (const line of lines) {
          if (line.includes('Tests:')) {
            const match = line.match(/Tests:\\s*(\\d+)\\s+passed,\\s*(\\d+)\\s+total/);
            if (match) {
              passedTests = parseInt(match[1]) || 0;
              totalTests = parseInt(match[2]) || 0;
            }
          }
          if (line.includes('Test Suites:')) {
            const suiteMatch = line.match(/Test Suites:\\s*(\\d+)\\s+passed,\\s*(\\d+)\\s+total/);
            if (suiteMatch) {
              totalSuites = parseInt(suiteMatch[2]) || 0; // Total suites
            }
          }
        }

        const stats = {
          status: 'passing',
          totalTests: totalTests,
          passedTests: passedTests,
          failedTests: Math.max(0, totalTests - passedTests),
          testSuites: totalSuites,
          testDuration: 'unknown'
        };
        
        this.analysisResults.tests = stats;
        console.log(`Test results: ${stats.passedTests}/${stats.totalTests} tests passing (${stats.testSuites} suites)`);
        return stats;
      } else {
        console.log('Tests failed to run or timed out');
        // Fallback: try to get count from test directories
        const stats = this.estimateTestCount();
        this.analysisResults.tests = stats;
        console.log(`Estimated test results: ${stats.passedTests}/${stats.totalTests} tests`);
        return stats;
      }
    } catch (error) {
      console.log(`Test collection error: ${error.message}`);
      // Fallback: try to get count from test directories
      const stats = this.estimateTestCount();
      this.analysisResults.tests = stats;
      console.log(`Estimated test results: ${stats.passedTests}/${stats.totalTests} tests`);
      return stats;
    }
  }

  /**
   * Estimate test count by counting test files
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
    console.log('\\n=== Collecting Coverage Data ===');
    
    try {
      // Check if coverage exists
      const coveragePath = './coverage';
      if (fs.existsSync(coveragePath)) {
        const coverageFile = path.join(coveragePath, 'coverage-summary.json');
        if (fs.existsSync(coverageFile)) {
          const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
          
          const summary = coverageData.total;
          const coverageStats = {
            statements: summary.statements.pct,
            branches: summary.branches.pct,
            functions: summary.functions.pct,
            lines: summary.lines.pct
          };
          
          this.analysisResults.coverage = coverageStats;
          console.log(`Coverage: ${coverageStats.lines}% lines covered`);
          return coverageStats;
        }
      }
      
      // If no coverage file, try to run coverage (but don't run tests again)
      console.log('No coverage data found');
      this.analysisResults.coverage = { available: false };
      return null;
    } catch (error) {
      console.log(`Coverage collection error: ${error.message}`);
      this.analysisResults.coverage = { error: error.message };
      return null;
    }
  }

  /**
   * Collect package.json dependencies and project metadata
   */
  collectProjectInfo() {
    console.log('\\n=== Collecting Project Information ===');
    
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
    console.log('\\n=== Collecting Static Analysis ===');
    
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
        filesByType: {}
      };
      
      const countFiles = (dir) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            stats.directories++;
            countFiles(fullPath);
          } else if (item.isFile()) {
            if (item.name.endsWith('.js')) {
              stats.jsFiles++;
              const ext = path.extname(item.name).substring(1) || 'no_ext';
              stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1;
              
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\\n').length;
                stats.totalLines += lines;
              } catch (readError) {
                // Skip files that can't be read
              }
            }
          }
        }
      };
      
      countFiles(srcPath);
      
      this.analysisResults.static = stats;
      console.log(`Static analysis: ${stats.jsFiles} JS files, ~${stats.totalLines} lines`);
      return stats;
    } catch (error) {
      console.log(`Static analysis error: ${error.message}`);
      this.analysisResults.static = { error: error.message };
      return null;
    }
  }

  /**
   * Collect README compliance status
   */
  collectRequirementsAnalysis() {
    console.log('\\n=== Collecting Requirements Analysis ===');
    
    try {
      // Read README to check for key sections
      const readmeContent = fs.readFileSync('./README.md', 'utf8');
      
      const requirements = {
        hasCoreArchitecture: readmeContent.includes('Core Components Overview'),
        hasUsageExamples: readmeContent.includes('Usage Examples'),
        hasSpecifications: readmeContent.includes('Key Architectural Patterns'),
        hasTestingStrategy: readmeContent.includes('Testing Strategy'),
        systemSize: readmeContent.length
      };
      
      this.analysisResults.requirements = requirements;
      console.log(`Requirements analysis: Found ${Object.keys(requirements).length} sections`);
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
    console.log('\\n=== Converting Data to Narsese ===');
    
    const narseseInputs = [];
    
    // Add project information
    const project = this.analysisResults.project;
    if (project && !project.error) {
      narseseInputs.push(`(SeNARS --> project). %0.9;0.9%`);
      narseseInputs.push(`(version --> 10_0_0). %1.0;0.9%`); // Replace periods with underscores
      narseseInputs.push(`(dependencies --> ${project.dependencies}). %0.8;0.8%`);
      narseseInputs.push(`(dev_dependencies --> ${project.devDependencies}). %0.8;0.8%`);
    }
    
    // Add test results
    const tests = this.analysisResults.tests;
    if (tests && !tests.error) {
      narseseInputs.push(`(tests --> running). %0.9;0.9%`);
      const passRate = Math.floor(tests.passedTests / Math.max(tests.totalTests, 1) * 100); // Convert to integer
      narseseInputs.push(`(test_pass_rate --> ${passRate}). %0.9;0.8%`);
      narseseInputs.push(`(total_tests --> ${tests.totalTests}). %1.0;0.9%`);
      narseseInputs.push(`(failed_tests --> ${tests.failedTests}). %0.9;0.7%`);
    }
    
    // Add coverage data
    const coverage = this.analysisResults.coverage;
    if (coverage && !coverage.error && coverage.available !== false) {
      narseseInputs.push(`(code_coverage --> ${Math.floor(coverage.lines)}). %0.8;0.8%`);
      const quality = coverage.lines > 80 ? 'high' : coverage.lines > 50 ? 'medium' : 'low';
      narseseInputs.push(`(test_quality --> ${quality}). %0.7;0.8%`);
    }
    
    // Add static analysis
    const staticAnalysis = this.analysisResults.static;
    if (staticAnalysis && !staticAnalysis.error) {
      narseseInputs.push(`(code_size --> ${staticAnalysis.totalLines}). %0.8;0.9%`);
      narseseInputs.push(`(js_files --> ${staticAnalysis.jsFiles}). %1.0;0.9%`);
      narseseInputs.push(`(complexity --> medium). %0.7;0.8%`); // Based on file count
    }
    
    // Add requirements compliance
    const requirements = this.analysisResults.requirements;
    if (requirements && !requirements.error) {
      narseseInputs.push(`(requirements --> defined). %0.9;0.9%`);
      narseseInputs.push(`(documentation --> available). %0.9;0.8%`);
    }
    
    // Add some development-oriented goals and questions
    narseseInputs.push(`(system_improvement --> needed)! %0.8;0.9%`);
    narseseInputs.push(`(testing_quality --> improve)! %0.7;0.8%`);
    narseseInputs.push(`(code_coverage --> increase)! %0.6;0.7%`);
    narseseInputs.push(`(development_progress --> assess)?`);
    narseseInputs.push(`(system_state --> evaluate)?`);
    
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
    
    console.log(`\\n=== Feeding ${narseseInputs.length} Statements to NAR ===`);
    
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
    console.log('\\n=== System Self-Analysis Results ===');
    
    const state = this.nar.getReasoningState();
    console.log(`Cycles completed: ${state?.cycleCount || 0}`);
    console.log(`Total tasks: ${state?.taskCount?.totalTasks || 0}`);
    console.log(`Beliefs: ${state?.taskCount?.beliefs || 0}`);
    console.log(`Goals: ${state?.taskCount?.goals || 0}`);
    console.log(`Questions: ${state?.taskCount?.questions || 0}`);
    
    // Get meta-cognitive analysis
    const metaAnalysis = await this.nar.performMetaCognitiveReasoning();
    if (metaAnalysis && metaAnalysis.suggestions) {
      console.log(`\\nMeta-Cognitive Suggestions: ${metaAnalysis.suggestions.length}`);
      metaAnalysis.suggestions.forEach((suggestion, idx) => {
        console.log(`  ${idx + 1}. ${suggestion.message}`);
      });
    }
    
    // Get self-correction analysis
    const selfCorrection = await this.nar.performSelfCorrection();
    if (selfCorrection && selfCorrection.corrections) {
      console.log(`\\nSelf-Correction Items: ${selfCorrection.corrections.length}`);
      selfCorrection.corrections.forEach((correction, idx) => {
        console.log(`  ${idx + 1}. ${correction.message || correction.reason}`);
      });
    }
    
    // Get reasoning trace for insights
    const trace = this.nar.getReasoningTrace();
    console.log(`\\nReasoning Trace Events: ${trace.length}`);
    
    // Show recent events
    const recentEvents = trace.slice(-5);
    console.log('\\nRecent System Events:');
    recentEvents.forEach((event, idx) => {
      console.log(`  ${idx + 1}. ${event.eventType} - Cycle ${event.cycleCount}`);
    });
    
    // Get current beliefs (system knowledge)
    const beliefs = this.nar.getBeliefs();
    console.log(`\\nCurrent System Beliefs: ${beliefs.length}`);
    
    // Show analysis summary
    console.log('\\n=== Analysis Summary ===');
    console.log(JSON.stringify(this.analysisResults, null, 2));
    
    await this.nar.dispose();
  }
  
  /**
   * Generate a development plan based on analysis
   */
  generateDevelopmentPlan() {
    console.log('\\n=== Generating Development Plan ===');
    
    const plan = {
      priorities: [],
      recommendations: [],
      metrics: this.analysisResults
    };
    
    // Derive priorities from analysis
    const tests = this.analysisResults.tests;
    if (tests && tests.totalTests > 0) {
      const passRate = tests.passedTests / tests.totalTests;
      if (passRate < 0.95) {
        plan.priorities.push({
          priority: 'high',
          area: 'testing',
          reason: `Test pass rate is ${Math.round(passRate * 100)}%, below 95% target`,
          suggestedAction: 'Focus on fixing failing tests'
        });
      }
    }
    
    const coverage = this.analysisResults.coverage;
    if (coverage && !coverage.error && coverage.available !== false) {
      if (coverage.lines < 80) {
        plan.priorities.push({
          priority: 'medium',
          area: 'coverage',
          reason: `Code coverage is ${coverage.lines}%, below 80% target`,
          suggestedAction: 'Add more tests for better coverage'
        });
      }
    }
    
    const staticAnalysis = this.analysisResults.static;
    if (staticAnalysis && !staticAnalysis.error) {
      if (staticAnalysis.totalLines > 10000) { // Just a threshold example
        plan.priorities.push({
          priority: 'medium',
          area: 'refactoring',
          reason: `Codebase has ${staticAnalysis.totalLines} lines, consider refactoring`,
          suggestedAction: 'Review and refactor large components'
        });
      }
    }
    
    // Add general recommendations based on system insights
    plan.recommendations.push('Continue monitoring system performance');
    plan.recommendations.push('Regular execution of self-analysis');
    plan.recommendations.push('Use system reasoning to guide development priorities');
    
    console.log('Development Plan:');
    console.log(JSON.stringify(plan, null, 2));
    
    return plan;
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