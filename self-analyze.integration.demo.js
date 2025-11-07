#!/usr/bin/env node

import {NAR} from './src/nar/NAR.js';
import {SoftwareAnalyzer} from './src/tool/software/analyzers/SoftwareAnalyzer.js';
import {SelfAnalysisManager} from './src/integration/SelfAnalysisKnowledgeBaseConnector.js';

async function demoIntegration() {
    console.log('🚀 Starting SeNARS Self-Analysis Integration Demo...\n');

    // Create a NAR instance
    const nar = new NAR();
    await nar.initialize();
    console.log('✅ NAR initialized\n');

    // Method 1: Using the enhanced self-analyzer directly with NAR integration
    console.log('🔍 Method 1: Direct self-analyzer with NAR integration');
    const analyzer = new SoftwareAnalyzer({verbose: false});
    analyzer.connectToNAR(nar);  // Connect to NAR for automatic integration
    const results1 = await analyzer.runAnalysis();
    console.log('📊 Analysis completed and integrated with NAR\n');

    // Run a few reasoning cycles to process the new knowledge
    for (let i = 0; i < 5; i++) {
        await nar.step();
    }
    console.log('🔄 Ran 5 reasoning cycles to process analysis knowledge\n');

    // Method 2: Using the SelfAnalysisManager for more sophisticated integration
    console.log('🔍 Method 2: SelfAnalysisManager with advanced integration');
    const manager = new SelfAnalysisManager();
    manager.connectToNAR(nar);

    const analysisQuery = {
        categories: ['tests', 'coverage', 'static', 'technicaldebt', 'architecture']
    };

    const results2 = await manager.runAnalysisAndIntegrate(analysisQuery);
    console.log('📊 Advanced analysis and integration completed\n');

    // Run more reasoning cycles
    for (let i = 0; i < 10; i++) {
        await nar.step();
    }
    console.log('🔄 Ran 10 reasoning cycles to process advanced analysis\n');

    // Ask NAR some questions about the system based on the analysis
    console.log('❓ Querying NAR about system quality...');

    // Ask about system stability
    await nar.input('<system_stability --> ?what>?');
    await nar.step();

    // Ask about code quality
    await nar.input('<code_complexity --> ?what>?');
    await nar.step();

    // Ask about test coverage
    await nar.input('<test_coverage --> ?what>?');
    await nar.step();

    // Show recent beliefs
    const beliefs = nar.getBeliefs();
    console.log('\n🧠 Recent beliefs from analysis integration:');
    beliefs.slice(-5).forEach(belief => {
        console.log(`  - ${belief}`);
    });

    // Show recent goals (recommendations)
    console.log('\n🎯 Recent goals from analysis recommendations:');
    const goals = nar.getGoals();
    goals.slice(-5).forEach(goal => {
        console.log(`  - ${goal}`);
    });

    console.log('\n✨ Integration demo completed successfully!');

    return {
        directIntegration: results1,
        managerIntegration: results2,
        narBeliefs: beliefs,
        narGoals: goals
    };
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    demoIntegration().catch(console.error);
}

export default demoIntegration;