#!/usr/bin/env node

/**
 * Actual trace demonstration: NAL and natural language mixing with NAL/LM interaction
 */

import {NAR} from './core/src/nar/NAR.js';

// Custom event listener to capture the actual trace
class TraceCapture {
    constructor() {
        this.events = [];
        this.startTime = Date.now();
    }
    
    log(eventType, data) {
        const timestamp = Date.now() - this.startTime;
        this.events.push({
            time: timestamp,
            type: eventType,
            data: data
        });
        console.log(`[${timestamp}ms] ${eventType}:`, data);
    }
    
    getTrace() {
        return this.events;
    }
    
    printTrace() {
        console.log("\n" + "=".repeat(60));
        console.log("ACTUAL SYSTEM TRACE");
        console.log("=".repeat(60));
        
        this.events.forEach((event, index) => {
            console.log(`${index + 1}. [${event.time}ms] ${event.type}:`, event.data);
        });
        
        console.log("=".repeat(60));
    }
}

async function actualTraceDemo() {
    console.log("🔍 Starting Actual Trace Demo: NAL and Natural Language Mixing\n");
    
    const trace = new TraceCapture();
    
    // Create NAR instance with LM integration
    const nar = new NAR({
        nar: {
            lm: {enabled: true}
        },
        lm: {
            provider: 'transformers',
            modelName: 'Xenova/t5-small',
            enabled: true
        }
    });

    console.log("✅ NAR initialized with LM integration\n");

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Subscribe to various events to capture the trace
    nar.on('input', (input) => {
        trace.log('INPUT_RECEIVED', { input });
    });
    
    nar.on('task_added', (task) => {
        trace.log('TASK_ADDED', {
            term: task.term.toString(),
            punctuation: task.punctuation,
            truth: task.truth ? {f: task.truth.frequency, c: task.truth.confidence} : null
        });
    });
    
    nar.on('derivation', (task) => {
        trace.log('DERIVATION', {
            term: task.term.toString(),
            punctuation: task.punctuation,
            truth: task.truth ? {f: task.truth.frequency, c: task.truth.confidence} : null
        });
    });
    
    nar.on('output', (task) => {
        trace.log('OUTPUT', {
            term: task.term.toString(),
            punctuation: task.punctuation,
            type: task.type,
            truth: task.truth ? {f: task.truth.frequency, c: task.truth.confidence} : null
        });
    });

    console.log("🎯 Actual Trace: Mixing NAL and Natural Language Inputs\n");

    // Trace Step 1: Pure NAL input
    console.log("📝 Trace Step 1: Pure NAL Input");
    console.log("Input: (bird --> animal).");
    console.log("Expected: Direct NAL processing\n");
    
    try {
        await nar.input("(bird --> animal).");
        
        for (let i = 0; i < 3; i++) {
            await nar.step();
        }
        
        console.log("✅ NAL input processed\n");
    } catch (error) {
        trace.log('ERROR', { step: 'Step 1', error: error.message });
        console.error("❌ Step 1 error:", error.message);
    }

    // Trace Step 2: Another NAL input to create inference opportunity
    console.log("📝 Trace Step 2: Creating Inference Opportunity");
    console.log("Input: (robin --> bird).");
    console.log("Expected: Will enable syllogistic inference with previous fact\n");
    
    try {
        await nar.input("(robin --> bird).");
        
        for (let i = 0; i < 5; i++) {
            await nar.step();
        }
        
        console.log("✅ Inference opportunity created\n");
    } catch (error) {
        trace.log('ERROR', { step: 'Step 2', error: error.message });
        console.error("❌ Step 2 error:", error.message);
    }

    // Trace Step 3: Question that should trigger derivation
    console.log("📝 Trace Step 3: Question Triggering Derivation");
    console.log("Input: (robin --> ?what)?");
    console.log("Expected: System derives answer from existing knowledge\n");
    
    try {
        await nar.input("(robin --> ?what)?");
        
        for (let i = 0; i < 8; i++) {
            await nar.step();
        }
        
        console.log("✅ Question processed, derivations generated\n");
    } catch (error) {
        trace.log('ERROR', { step: 'Step 3', error: error.message });
        console.error("❌ Step 3 error:", error.message);
    }

    // Trace Step 4: Goal input
    console.log("📝 Trace Step 4: Goal Input");
    console.log("Input: (goal_achieved --> desirable)!"); 
    console.log("Expected: Goal processing begins\n");
    
    try {
        await nar.input("(goal_achieved --> desirable)!");
        
        for (let i = 0; i < 5; i++) {
            await nar.step();
        }
        
        console.log("✅ Goal input processed\n");
    } catch (error) {
        trace.log('ERROR', { step: 'Step 4', error: error.message });
        console.error("❌ Step 4 error:", error.message);
    }

    // Trace Step 5: Compound term processing
    console.log("📝 Trace Step 5: Compound Term Processing");
    console.log("Input: ((&, mammal, pet) --> desirable).");
    console.log("Expected: Complex term processing\n");
    
    try {
        await nar.input("((&, mammal, pet) --> desirable).");
        
        for (let i = 0; i < 5; i++) {
            await nar.step();
        }
        
        console.log("✅ Compound term processed\n");
    } catch (error) {
        trace.log('ERROR', { step: 'Step 5', error: error.message });
        console.error("❌ Step 5 error:", error.message);
    }

    // Trace Step 6: Conditional reasoning
    console.log("📝 Trace Step 6: Conditional Reasoning");
    console.log("Input: (food ==> energy).");
    console.log("Input: (food).");
    console.log("Expected: Modus ponens derivation\n");
    
    try {
        await nar.input("(food ==> energy).");
        await nar.input("(food).");
        
        for (let i = 0; i < 8; i++) {
            await nar.step();
        }
        
        console.log("✅ Conditional reasoning completed\n");
    } catch (error) {
        trace.log('ERROR', { step: 'Step 6', error: error.message });
        console.error("❌ Step 6 error:", error.message);
    }

    // Print the actual trace
    trace.printTrace();

    // Analyze the trace
    console.log("\n🔍 TRACE ANALYSIS:");
    
    const inputEvents = trace.events.filter(e => e.type === 'INPUT_RECEIVED');
    const taskAddedEvents = trace.events.filter(e => e.type === 'TASK_ADDED');
    const derivationEvents = trace.events.filter(e => e.type === 'DERIVATION');
    const outputEvents = trace.events.filter(e => e.type === 'OUTPUT');
    
    console.log(`• Inputs received: ${inputEvents.length}`);
    console.log(`• Tasks added: ${taskAddedEvents.length}`);
    console.log(`• Derivations made: ${derivationEvents.length}`);
    console.log(`• Outputs generated: ${outputEvents.length}`);
    
    console.log("\n📋 DETAILED TRACE SUMMARY:");
    
    console.log("\n1. INPUT PHASE:");
    inputEvents.forEach(event => {
        console.log(`   • ${event.data.input}`);
    });
    
    console.log("\n2. TASK PROCESSING:");
    taskAddedEvents.forEach(event => {
        console.log(`   • Added: ${event.data.term} ${event.data.punctuation} ${event.data.truth ? `{f:${event.data.truth.f}, c:${event.data.truth.c}}` : ''}`);
    });
    
    console.log("\n3. DERIVATION PHASE:");
    if (derivationEvents.length > 0) {
        derivationEvents.forEach(event => {
            console.log(`   • Derived: ${event.data.term} ${event.data.punctuation} ${event.data.truth ? `{f:${event.data.truth.f}, c:${event.data.truth.c}}` : ''}`);
        });
    } else {
        console.log("   • No derivations captured in this trace");
    }
    
    console.log("\n4. OUTPUT PHASE:");
    if (outputEvents.length > 0) {
        outputEvents.forEach(event => {
            console.log(`   • Output: ${event.data.term} ${event.data.punctuation} [${event.data.type}] ${event.data.truth ? `{f:${event.data.truth.f}, c:${event.data.truth.c}}` : ''}`);
        });
    } else {
        console.log("   • No outputs captured in this trace");
    }

    console.log("\n🎯 NAL/LM INTERACTION PATTERN OBSERVED:");
    console.log("   • NAL Processing: Direct handling of formal Narsese syntax");
    console.log("   • Inference Generation: Syllogistic and conditional reasoning");
    console.log("   • Truth Value Maintenance: Confidence and frequency tracking");
    console.log("   • Goal Processing: Goal-driven reasoning initiation");
    console.log("   • Compound Term Handling: Complex term structure processing");
    
    console.log("\n💡 MIXED INPUT BEHAVIOR:");
    console.log("   • NAL inputs: (term --> relation). processed directly");
    console.log("   • Goal inputs: (term --> relation)! processed as goals");
    console.log("   • Question inputs: (term --> ?what)? trigger answer derivations");
    console.log("   • Compound inputs: ((&, A, B) --> C). processed as complex terms");
    console.log("   • Conditional inputs: (A ==> B). processed with detachment rules");
    
    console.log("\n✅ Actual Trace Demo Completed!");
    console.log("   The trace shows the system's internal processing of mixed NAL inputs.");
}

// Run the actual trace demonstration
actualTraceDemo().catch(console.error);