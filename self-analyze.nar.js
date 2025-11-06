#!/usr/bin/env node

import SeNARSSelfAnalyzer from './self-analyze.js';
import {Knowing} from './src/knowledge/Knowing.js';
import {SelfAnalysisKnowledgeFactory} from './src/knowledge/SelfAnalysisKnowledgeFactory.js';
// Check if this script is being run directly (not imported)
import {fileURLToPath} from 'url';
import {basename, dirname} from 'path';

/**
 * Enhanced SeNARS Self Analyzer with Knowledge Integration
 * Extends the base self-analyzer to automatically integrate findings with a NAR system
 */
export class SeNARSSelfAnalyzerNAR extends SeNARSSelfAnalyzer {
    constructor(options = {}) {
        super(options);
        this.knowing = new Knowing({verbose: this.config.get('verbose')});
        this.nar = null;
        this.integrationEnabled = false;
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
     * Override the _integrateWithNAR method to use the knowledge system
     * @private
     */
    async _integrateWithNAR(results) {
        if (!this.nar) return;

        try {
            console.log('🧠 Initializing Knowledge System Integration...');

            // Create knowledge objects from analysis results
            await this._createKnowledgeFromResults(results);

            // Get all tasks from the knowledge system
            const knowledgeTasks = await this.knowing.getAllTasks();
            const knowledgeRelationships = await this.knowing.getAllRelationships();

            // Input knowledge tasks to the NAR
            let taskCount = 0;
            for (const task of knowledgeTasks) {
                if (task && typeof task === 'string') {
                    try {
                        await this.nar.input(task);
                        taskCount++;
                    } catch (error) {
                        console.error(`❌ Error inputting knowledge task: ${task}`, error.message);
                    }
                }
            }

            // Input relationships to the NAR
            let relationshipCount = 0;
            for (const relationship of knowledgeRelationships) {
                if (relationship && typeof relationship === 'string') {
                    try {
                        await this.nar.input(relationship);
                        relationshipCount++;
                    } catch (error) {
                        console.error(`❌ Error inputting knowledge relationship: ${relationship}`, error.message);
                    }
                }
            }

            console.log(`📊 Integrated ${taskCount} knowledge tasks and ${relationshipCount} relationships with NAR`);

            // Also include legacy conversion for comprehensive coverage
            const legacyNarseseStatements = this._convertToNarsese(results);
            for (const statement of legacyNarseseStatements) {
                if (statement && typeof statement === 'string') {
                    try {
                        await this.nar.input(statement);
                    } catch (error) {
                        console.error(`❌ Error inputting legacy statement: ${statement}`, error.message);
                    }
                }
            }

            console.log(`📊 Plus ${legacyNarseseStatements.length} legacy statements`);

            // Additionally, convert actionable insights to goals
            const goalStatements = this._convertInsightsToGoals(results);
            for (const goal of goalStatements) {
                if (goal && typeof goal === 'string') {
                    try {
                        await this.nar.input(goal);
                    } catch (error) {
                        console.error(`❌ Error inputting goal: ${goal}`, error.message);
                    }
                }
            }

            if (goalStatements.length > 0) {
                console.log(`🎯 Added ${goalStatements.length} improvement goals to NAR`);
            }

            // Display knowledge system statistics if verbose
            if (this.config.get('verbose')) {
                const summary = await this.knowing.getSummary();
                console.log('🧠 Knowledge System Summary:');
                console.log(`   Total Knowledge Items: ${summary.stats.totalKnowledgeItems}`);
                console.log(`   Total Tasks: ${summary.stats.totalTasks}`);
                console.log(`   Total Relationships: ${summary.stats.totalRelationships}`);
                console.log(`   Knowledge by Type:`, JSON.stringify(summary.stats.knowledgeByType, null, 2));
            }
        } catch (error) {
            console.error('❌ Error in knowledge system integration:', error);
        }
    }

    /**
     * Create knowledge objects from analysis results using the SelfAnalysisKnowledgeFactory
     * @private
     */
    async _createKnowledgeFromResults(results) {
        console.log('🧠 Creating knowledge objects from analysis results...');

        if (results.static && !results.static.error) {
            console.log('   Creating FileAnalysisKnowledge...');
            const fileKnowledge = SelfAnalysisKnowledgeFactory.autoDetectSelfAnalysisKnowledge(results.static, 'file_analysis', {verbose: this.config.get('verbose')});
            await this.knowing.addKnowledge(fileKnowledge);

            console.log('   Creating DirectoryStructureKnowledge...');
            const directoryKnowledge = SelfAnalysisKnowledgeFactory.autoDetectSelfAnalysisKnowledge({directoryStats: results.static.directoryStats}, 'directory_structure', {verbose: this.config.get('verbose')});
            await this.knowing.addKnowledge(directoryKnowledge);
        }

        if (results.tests && !results.tests.error) {
            console.log('   Creating TestResultKnowledge...');
            const testKnowledge = SelfAnalysisKnowledgeFactory.autoDetectSelfAnalysisKnowledge(results.tests, 'test_results', {verbose: this.config.get('verbose')});
            await this.knowing.addKnowledge(testKnowledge);
        }

        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            console.log('   Creating coverage-related FileAnalysisKnowledge...');
            const coverageKnowledge = SelfAnalysisKnowledgeFactory.autoDetectSelfAnalysisKnowledge(results.coverage, 'coverage_analysis', {verbose: this.config.get('verbose')});
            await this.knowing.addKnowledge(coverageKnowledge);
        }

        if (results.architecture && !results.architecture.error) {
            console.log('   Creating DependencyGraphKnowledge...');
            const dependencyKnowledge = SelfAnalysisKnowledgeFactory.autoDetectSelfAnalysisKnowledge(results.architecture, 'dependency_graph', {verbose: this.config.get('verbose')});
            await this.knowing.addKnowledge(dependencyKnowledge);
        }

        // Add other analysis results as needed
        if (results.technicaldebt && !results.technicaldebt.error) {
            console.log('   Creating TechnicalDebt Knowledge...');
            const debtKnowledge = SelfAnalysisKnowledgeFactory.autoDetectSelfAnalysisKnowledge(results.technicaldebt, 'technical_debt', {verbose: this.config.get('verbose')});
            await this.knowing.addKnowledge(debtKnowledge);
        }

        if (results.requirements && !results.requirements.error) {
            console.log('   Creating Requirements Knowledge...');
            const reqKnowledge = SelfAnalysisKnowledgeFactory.autoDetectSelfAnalysisKnowledge(results.requirements, 'requirements', {verbose: this.config.get('verbose')});
            await this.knowing.addKnowledge(reqKnowledge);
        }

        console.log(`   Knowledge system now contains ${this.knowing.getAllKnowledge().length} knowledge sources`);
    }

    /**
     * Get the knowledge system instance
     */
    getKnowingSystem() {
        return this.knowing;
    }

    /**
     * Reset the knowledge system
     */
    resetKnowledge() {
        this.knowing.clear();
    }
}

// CLI argument parsing for the NAR-enhanced version
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
SeNARS Self-Analysis Script with NAR Integration
Uses the system to analyze its own development status and provide insights
Automatically integrates findings with a NAR reasoning system

Usage: node self-analyze.nar.js [options]

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
  node self-analyze.nar.js                  # Run all analyses with NAR integration
  node self-analyze.nar.js -t -v            # Verbose test analysis with NAR
  node self-analyze.nar.js --coverage --slowest # Coverage + slowest tests with NAR
  node self-analyze.nar.js -S               # Summary output only with NAR
  node self-analyze.nar.js -f               # Feature specs analysis with NAR
`);
}

// Run the analyzer with potential NAR connection
async function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        return;
    }

    const analyzer = new SeNARSSelfAnalyzerNAR(options);

    // If we want to connect to a NAR instance, we would do it here
    // For now, this is designed to work with an external NAR connection
    // Example: analyzer.connectToNAR(narInstance);

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

export default SeNARSSelfAnalyzerNAR;