import {Repl} from './src/tui/Repl.js';

// Create a simple test to verify the REPL functionality
const repl = new Repl();

// Initialize the NAR
await repl.nar.initialize();

console.log("Testing input processing...");

// Test input
try {
    const result = await repl.nar.input("(a --> b).");
    console.log("Input processed successfully:", result);
    
    // Process one step to ensure tasks are processed
    await repl.nar.step();
    
    // Get stats
    const stats = repl.nar.getStats();
    console.log("Memory stats after input:");
    console.log("- Total concepts in memoryUsage:", stats.memoryStats.memoryUsage?.concepts);
    console.log("- Total concepts in totalConcepts:", stats.memoryStats.totalConcepts);
    console.log("- Total tasks in memoryUsage:", stats.memoryStats.memoryUsage?.totalTasks);
    console.log("- Total tasks in totalTasks:", stats.memoryStats.totalTasks);
} catch (error) {
    console.error("Error during test:", error);
}

console.log("Test completed");