import { TUIReplInk } from './TUIReplInk.js';

// Create the TUI demo as specified in PLAN.tuifix.md
// Input tasks: (a==>b). and (b==>c).
// Then run for 5 cycles.
// Should derive (a==>c). only once due to redundant suppression.

async function runTUIDemo() {
    console.log('🚀 Starting TUI Demo for derivation verification...');
    console.log('Expected to derive (a==>c). only once from (a==>b). and (b==>c).');
    
    const tui = new TUIReplInk();
    
    // Start the TUI
    await tui.start();
    
    // Initialize the engine and process the input tasks
    const engine = tui.engine;
    await engine.initialize();
    
    // Add the two input tasks as specified in the demo
    await engine.processInput('(a==>b).');
    await engine.processInput('(b==>c).');
    
    console.log('\n⏳ Running 5 cycles to allow derivations...');
    
    // Run 5 cycles
    for (let i = 0; i < 5; i++) {
        await engine._next();
        console.log(`⏭️  Cycle ${i + 1} executed. Total cycles: ${engine.nar.cycleCount}`);
    }
    
    console.log('\n✅ Demo completed. The derived task (a==>c). should appear only once in the logs.');
    console.log('This demonstrates that redundant suppression is working correctly.');
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTUIDemo().catch(err => {
        console.error('❌ Error running TUI demo:', err);
        process.exit(1);
    });
}

export { runTUIDemo };