#!/usr/bin/env node

/**
 * Hybrid Demo: NL ↔ Narsese interaction using Ollama
 * Demonstrates the hybrid neurosymbolic capabilities with Ollama integration
 */

import {NAR} from '../core/src/nar/NAR.js';
import {LangChainProvider} from '../core/src/lm/LangChainProvider.js';
import {HybridDemoOrchestrator, HybridDemoConfig, RuleFactory} from '../core/src/lm/HybridDemoUtils.js';

async function createHybridDemo() {
    console.log("🚀 Starting Hybrid Demo: NL ↔ Narsese via Ollama\n");

    // Configure the demo with ergonomic API
    const config = new HybridDemoConfig()
        .withModel('hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M')
        .withTimeout(30000)
        .withBaseURL('http://localhost:11434')
        .withRules(true, true)
        .withTracing(true)
        .build();

    // Create orchestrator and run the demo
    const orchestrator = new HybridDemoOrchestrator(config);

    await orchestrator
        .initialize(NAR, LangChainProvider)
        .then(() => orchestrator.setupRules(RuleFactory))
        .then(() => orchestrator.runScenarios())
        .then(() => orchestrator.showFinalState())
        .then(() => orchestrator.printCapabilities())
        .then(() => orchestrator.shutdown());
}

createHybridDemo().catch(console.error);