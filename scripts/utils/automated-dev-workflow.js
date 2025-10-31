#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

function showUsage() {
    console.log(`
Usage: node scripts/utils/automated-dev-workflow.js [options]

Options:
  --help, -h              Show this help message
  --visual-inspection     Run visual inspection tests with screenshots
  --tune-heuristics       Run heuristic tuning with visual feedback
  --regression-tests      Run full regression test suite
  --performance-bench     Run performance benchmarks
  --analysis              Run comprehensive analysis
  --demo-run              Run demonstration and capture results
  --all                   Run complete development workflow
  --with-ui               Include UI in operations (default: headless)
  --iterations <n>        Number of iterations for tuning (default: 5)

Examples:
  node scripts/utils/automated-dev-workflow.js --visual-inspection
  node scripts/utils/automated-dev-workflow.js --tune-heuristics --iterations 10
  node scripts/utils/automated-dev-workflow.js --all
    `);
}

if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

// Parse arguments
let operation = 'visual-inspection'; // default
let includeUI = args.includes('--with-ui');
let iterations = 5;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--visual-inspection') {
        operation = 'visual-inspection';
    } else if (args[i] === '--tune-heuristics') {
        operation = 'tune-heuristics';
    } else if (args[i] === '--regression-tests') {
        operation = 'regression-tests';
    } else if (args[i] === '--performance-bench') {
        operation = 'performance-bench';
    } else if (args[i] === '--analysis') {
        operation = 'analysis';
    } else if (args[i] === '--demo-run') {
        operation = 'demo-run';
    } else if (args[i] === '--all') {
        operation = 'all';
    } else if (args[i] === '--iterations' && args[i + 1]) {
        iterations = parseInt(args[i + 1]);
        i++;
    }
}

console.log(`Running automated development workflow: ${operation}`);

async function runWorkflow() {
    try {
        if (operation === 'visual-inspection' || operation === 'all') {
            console.log('\\n🔍 Running visual inspection tests...');
            const visualTest = spawn('npm', ['run', 'capture'], {
                stdio: 'inherit',
                cwd: join(__dirname, '../..')
            });
            
            await new Promise((resolve) => {
                visualTest.on('close', (code) => {
                    if (code !== 0) {
                        console.error('Visual inspection failed');
                        process.exit(code);
                    }
                    resolve();
                });
            });
        }

        if (operation === 'tune-heuristics' || operation === 'all') {
            console.log('\\n⚙️  Running heuristic tuning...');
            for (let i = 0; i < iterations; i++) {
                console.log(`\\nIteration ${i + 1}/${iterations}`);
                
                // Run analysis to gather data
                const analysis = spawn('npm', ['run', 'analyze'], {
                    stdio: 'pipe',
                    cwd: join(__dirname, '../..')
                });
                
                let analysisOutput = '';
                analysis.stdout.on('data', (data) => {
                    analysisOutput += data.toString();
                });
                
                await new Promise((resolve) => {
                    analysis.on('close', (code) => {
                        console.log(`Analysis iteration ${i + 1} completed with code: ${code}`);
                        resolve();
                    });
                });
                
                // Capture visualizations after each analysis
                const visual = spawn('npm', ['run', 'capture'], {
                    stdio: 'inherit',
                    cwd: join(__dirname, '../..')
                });
                
                await new Promise((resolve) => {
                    visual.on('close', (code) => {
                        console.log(`Visualization capture completed with code: ${code}`);
                        resolve();
                    });
                });
            }
        }

        if (operation === 'regression-tests' || operation === 'all') {
            console.log('\\n🧪 Running regression tests...');
            const testResult = spawn('npm', ['run', 'test:all'], {
                stdio: 'inherit',
                cwd: join(__dirname, '../..')
            });
            
            await new Promise((resolve) => {
                testResult.on('close', (code) => {
                    if (code !== 0) {
                        console.error('Regression tests failed');
                        process.exit(code);
                    }
                    resolve();
                });
            });
        }

        if (operation === 'performance-bench' || operation === 'all') {
            console.log('\\n⏱️  Running performance benchmarks...');
            const benchResult = spawn('npm', ['run', 'benchmark'], {
                stdio: 'inherit',
                cwd: join(__dirname, '../..')
            });
            
            await new Promise((resolve) => {
                benchResult.on('close', (code) => {
                    console.log(`Benchmark completed with code: ${code}`);
                    resolve();
                });
            });
        }

        if (operation === 'analysis' || operation === 'all') {
            console.log('\\n🧠 Running comprehensive analysis...');
            const analysisResult = spawn('npm', ['run', 'analyze'], {
                stdio: 'inherit',
                cwd: join(__dirname, '../..')
            });
            
            await new Promise((resolve) => {
                analysisResult.on('close', (code) => {
                    console.log(`Analysis completed with code: ${code}`);
                    resolve();
                });
            });
        }

        if (operation === 'demo-run' || operation === 'all') {
            console.log('\\n🎬 Running demonstration...');
            const demoResult = spawn('npm', ['run', 'demo'], {
                stdio: 'inherit',
                cwd: join(__dirname, '../..')
            });
            
            await new Promise((resolve) => {
                demoResult.on('close', (code) => {
                    console.log(`Demo completed with code: ${code}`);
                    resolve();
                });
            });
        }

        console.log('\\n✅ Automated development workflow completed successfully!');
    } catch (error) {
        console.error('Error running development workflow:', error);
        process.exit(1);
    }
}

runWorkflow();