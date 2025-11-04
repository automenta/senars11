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
      let testResult = spawnSync('npx', ['jest', '--json', '--silent'], {
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
        
        let parsedResult = this.parseTestOutput(output);
        
        if (parsedResult && parsedResult.testResults) {
          const individualTestResults = this.extractIndividualTestResults(parsedResult.testResults);
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
            testFiles: getTestFilesList() // Using helper function
          };
        }
      }

      // Fallback to npm test
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
          let fallbackParsed = JSON.parse(output.trim());
          if (fallbackParsed.testResults) {
            const individualTestResults = this.extractIndividualTestResults(fallbackParsed.testResults);
            return {
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
              individualTestResults,
              slowestTests: this.getSlowestTests(individualTestResults),
              testFiles: getTestFilesList()
            };
          }
        } catch (parseError) {
          if (this.verbose) console.log('❌ Fallback test result parsing failed:', parseError.message);
        }
      }

      return this.createEmptyTestResult('Unable to parse test results');

    } catch (error) {
      if (this.verbose) console.log(`❌ Test collection error: ${error.message}`);
      return this.createEmptyTestResult(error.message);
    }
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
      if (testSuite.assertionResults) {
        for (const testResult of testSuite.assertionResults) {
          individualResults.push({
            name: testResult.title,
            status: testResult.status,
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

  getSlowestTests(individualTestResults) {
    if (!individualTestResults || individualTestResults.length === 0) return [];
    
    const sortedTests = [...individualTestResults]
      .filter(test => test.duration && test.duration > 0)
      .sort((a, b) => b.duration - a.duration);
    
    return sortedTests.slice(0, TOP_N).map(test => ({
      name: test.name,
      duration: test.duration,
      suite: test.suite,
      status: test.status
    }));
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
      let coverageData = null;
      const coveragePath = './coverage';
      
      if (fs.existsSync(coveragePath)) {
        const coverageFile = path.join(coveragePath, 'coverage-summary.json');
        if (fs.existsSync(coverageFile)) {
          try {
            coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
          } catch (parseError) {
            if (this.verbose) console.log('❌ Error parsing coverage file:', parseError.message);
            return { available: false, error: `Parse error: ${parseError.message}` };
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
          return { available: false, error: `Command execution error: ${result.error.message}` };
        }
        
        if (result.status === 0) {
          const coverageFile = './coverage/coverage-summary.json';
          if (fs.existsSync(coverageFile)) {
            try {
              coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
            } catch (parseError) {
              if (this.verbose) console.log('❌ Error parsing generated coverage file:', parseError.message);
              return { available: false, error: `Parse error: ${parseError.message}` };
            }
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
        
        coverageStats.fileAnalysis = analyzeCoverageByFile();
        return coverageStats;
      } else {
        if (this.verbose) console.log('❌ No coverage data found or generated');
        return { available: false };
      }
    } catch (error) {
      if (this.verbose) console.log(`❌ Coverage collection error: ${error.message}`);
      return { error: error.message };
    }
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
        largestFiles: [],
        complexityMetrics: {},
        dependencyInfo: {}
      };

      const countFiles = (dir) => {
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

              let content;
              try {
                content = fs.readFileSync(fullPath, 'utf8');
              } catch (readError) {
                if (this.verbose) console.log(`⚠️ Cannot read file: ${fullPath}`, readError.message);
                continue; // Skip files that can't be read
              }
              
              try {
                const lines = content.split('\n').length;
                stats.totalLines += lines;

                const imports = extractImports(content);
                const complexity = calculateComplexityMetrics(content);

                stats.fileDetails.push({
                  path: path.relative('.', fullPath),
                  lines,
                  size: content.length,
                  imports,
                  complexity
                });
              } catch (processingError) {
                if (this.verbose) console.log(`⚠️ Error processing file: ${fullPath}`, processingError.message);
                continue; // Skip files that cause processing errors
              }
            }
          }
        }
      };

      countFiles(srcPath);

      stats.fileDetails.sort((a, b) => b.lines - a.lines);
      stats.largestFiles = stats.fileDetails.slice(0, TOP_N);

      if (stats.fileDetails.length > 0) {
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
      }

      return stats;
    } catch (error) {
      if (this.verbose) console.log(`❌ Static analysis error: ${error.message}`);
      return { error: error.message };
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
      
      const requirements = {
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
    if (results.project && !results.project.error) {
      console.log(`📦 ${results.project.name} v${results.project.version} (${results.project.dependencies} deps, ${results.project.devDependencies} devDeps)`);
    }
    
    if (results.tests && !results.tests.error) {
      const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
      const statusEmoji = passRate >= 95 ? '✅' : passRate >= 80 ? '⚠️' : '❌';
      console.log(`🧪 Tests: ${results.tests.passedTests}/${results.tests.totalTests} (${passRate}%) ${statusEmoji}`);
    }
    
    if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
      const coverageStatus = results.coverage.lines >= 80 ? '✅' : results.coverage.lines >= 50 ? '⚠️' : '❌';
      console.log(`_coverage: ${results.coverage.lines}% lines ${coverageStatus}`);
    }
    
    if (results.static && !results.static.error) {
      console.log(`📁 Code: ${results.static.jsFiles} files, ~${results.static.totalLines} lines, avg: ${results.static.avgLinesPerFile}/file`);
    }
    
    if (results.requirements && !results.requirements.error) {
      const complianceStatus = results.requirements.complianceScore >= 90 ? '✅' : results.requirements.complianceScore >= 70 ? '⚠️' : '❌';
      console.log(`📋 README: ${results.requirements.complianceScore}% compliance ${complianceStatus}`);
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
      if (results.static.largestFile) console.log(`  Largest File: ${results.static.largestFile.path} (${results.static.largestFile.lines} lines)`);
      if (results.static.smallestFile) console.log(`  Smallest File: ${results.static.smallestFile.path} (${results.static.smallestFile.lines} lines)`);
      if (results.static.avgComplexity !== undefined) {
        console.log(`  Avg Cyclomatic Complexity: ${results.static.avgComplexity.toFixed(2)}`);
        console.log(`  Avg Functions/File: ${results.static.avgFunctionCount.toFixed(2)}`);
      }
      
      console.log(`  File types: ${Object.entries(results.static.filesByType).map(([ext, count]) => `${ext}:${count}`).join(', ')}`);
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
  }

  printSlowestTests(results) {
    const tests = results.tests;
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
      default: throw new Error(`Unknown analyzer type: ${type}`);
    }
  }
  
  static getAllAnalyzerTypes() {
    return ['tests', 'coverage', 'project', 'static', 'requirements'];
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
    }
    
    if (this.options.all && !this.options.summaryOnly && results.coverage) {
      this.display.printLowestCoverageFiles(results);
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
  slowest: { aliases: ['--slowest', '-sl'], type: Boolean, category: 'output' },
  verbose: { aliases: ['--verbose', '-v'], type: Boolean, category: 'output' },
  summaryOnly: { aliases: ['--summary-only', '-S'], type: Boolean, category: 'output' },
  help: { aliases: ['--help', '-h'], type: Boolean, category: 'meta' }
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { 
    tests: false, coverage: false, static: false, 
    project: false, requirements: false, slowest: false,
    verbose: false, summaryOnly: false, all: true, help: false
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

if (basename(__filename) === process.argv[1]?.split('/').pop()) {
  main().catch(err => {
    console.error('Analysis failed:', err);
    process.exit(1);
  });
}

export default SeNARSSelfAnalyzer;