#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, writeFile, readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

function showUsage() {
    console.log(`
Usage: node scripts/utils/config-comparison.js [options]

Options:
  --help, -h              Show this help message
  --run <configs>         Run comparison between configs (comma-separated)
  --benchmark             Run performance benchmarks for each config
  --analysis              Run analysis for each config  
  --demo                  Run demo for each config
  --output <dir>          Output directory for results (default: comparison-results)
  --timeout <ms>          Timeout for each run (default: 60000)

Examples:
  node scripts/utils/config-comparison.js --run default,aggressive,conservative
  node scripts/utils/config-comparison.js --run my-config1,my-config2 --benchmark
  node scripts/utils/config-comparison.js --run experimental --analysis --demo
    `);
}

if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

// Parse arguments
let configList = ['default']; // default
let runBenchmark = args.includes('--benchmark');
let runAnalysis = args.includes('--analysis');
let runDemo = args.includes('--demo');
let outputDir = 'comparison-results';
let timeout = 60000;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run' && args[i + 1]) {
        configList = args[i + 1].split(',');
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputDir = args[i + 1];
        i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
        timeout = parseInt(args[i + 1]);
        i++;
    }
}

// Default to at least running analysis if no specific mode is specified
if (!runBenchmark && !runAnalysis && !runDemo) {
    runAnalysis = true;
}

console.log(`Running configuration comparison: ${configList.join(', ')}`);

async function runConfigComparison() {
    try {
        console.log(`\\n📊 Starting configuration comparison...`);
        
        // Create output directory
        await exec(`mkdir -p ${outputDir} ${outputDir}/configs ${outputDir}/results`);
        
        const results = {};
        
        for (const config of configList) {
            console.log(`\\n🧪 Testing configuration: ${config}`);
            
            // Create a temporary config file or environment setting for this test
            const configResult = {};
            
            if (runAnalysis) {
                console.log(`  Running analysis for ${config}...`);
                try {
                    const analysisProcess = spawn('node', [`comprehensive_analysis.js`], {
                        env: { 
                            ...process.env,
                            SENARS_CONFIG: config 
                        },
                        cwd: join(__dirname, '../..'),
                        timeout: timeout
                    });
                    
                    let analysisOutput = '';
                    analysisProcess.stdout.on('data', (data) => {
                        analysisOutput += data.toString();
                    });
                    
                    analysisProcess.stderr.on('data', (data) => {
                        console.error(`  Error in analysis for ${config}:`, data.toString());
                    });
                    
                    await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(() => {
                            analysisProcess.kill();
                            reject(new Error(`Analysis for ${config} timed out`));
                        }, timeout);
                        
                        analysisProcess.on('close', (code) => {
                            clearTimeout(timeoutId);
                            configResult.analysis = {
                                exitCode: code,
                                output: analysisOutput,
                                success: code === 0
                            };
                            resolve();
                        });
                    });
                    
                    // Save analysis output
                    await writeFile(`${outputDir}/results/analysis_${config}.txt`, analysisOutput);
                    
                } catch (error) {
                    console.error(`  Analysis failed for ${config}:`, error.message);
                    configResult.analysis = { success: false, error: error.message };
                }
            }
            
            if (runBenchmark) {
                console.log(`  Running benchmarks for ${config}...`);
                try {
                    const benchmarkProcess = spawn('node', ['src/testing/runBenchmarks.js'], {
                        env: { 
                            ...process.env,
                            SENARS_CONFIG: config 
                        },
                        cwd: join(__dirname, '../..'),
                        timeout: timeout
                    });
                    
                    let benchmarkOutput = '';
                    benchmarkProcess.stdout.on('data', (data) => {
                        benchmarkOutput += data.toString();
                    });
                    
                    benchmarkProcess.stderr.on('data', (data) => {
                        console.error(`  Error in benchmarks for ${config}:`, data.toString());
                    });
                    
                    await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(() => {
                            benchmarkProcess.kill();
                            reject(new Error(`Benchmark for ${config} timed out`));
                        }, timeout);
                        
                        benchmarkProcess.on('close', (code) => {
                            clearTimeout(timeoutId);
                            configResult.benchmark = {
                                exitCode: code,
                                output: benchmarkOutput,
                                success: code === 0
                            };
                            resolve();
                        });
                    });
                    
                    // Save benchmark output
                    await writeFile(`${outputDir}/results/benchmark_${config}.txt`, benchmarkOutput);
                    
                } catch (error) {
                    console.error(`  Benchmark failed for ${config}:`, error.message);
                    configResult.benchmark = { success: false, error: error.message };
                }
            }
            
            if (runDemo) {
                console.log(`  Running demo for ${config}...`);
                try {
                    // Note: For demo runs with different configs, we'd need to implement 
                    // configuration passing to the demo script, which is a more complex task
                    const demoProcess = spawn('node', ['run-demo.js'], {
                        env: { 
                            ...process.env,
                            SENARS_CONFIG: config 
                        },
                        cwd: join(__dirname, '../..'),
                        timeout: timeout
                    });
                    
                    let demoOutput = '';
                    demoProcess.stdout.on('data', (data) => {
                        demoOutput += data.toString();
                    });
                    
                    demoProcess.stderr.on('data', (data) => {
                        console.error(`  Error in demo for ${config}:`, data.toString());
                    });
                    
                    await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(() => {
                            demoProcess.kill();
                            reject(new Error(`Demo for ${config} timed out`));
                        }, timeout);
                        
                        demoProcess.on('close', (code) => {
                            clearTimeout(timeoutId);
                            configResult.demo = {
                                exitCode: code,
                                output: demoOutput,
                                success: code === 0
                            };
                            resolve();
                        });
                    });
                    
                    // Save demo output
                    await writeFile(`${outputDir}/results/demo_${config}.txt`, demoOutput);
                    
                } catch (error) {
                    console.error(`  Demo failed for ${config}:`, error.message);
                    configResult.demo = { success: false, error: error.message };
                }
            }
            
            results[config] = configResult;
        }
        
        // Generate summary report
        const summary = {
            timestamp: new Date().toISOString(),
            configurations: configList,
            results: results,
            summary: {}
        };
        
        // Calculate summary statistics
        for (const config in results) {
            const configResult = results[config];
            summary.summary[config] = {
                analysis_success: configResult.analysis?.success || false,
                benchmark_success: configResult.benchmark?.success || false,
                demo_success: configResult.demo?.success || false
            };
        }
        
        // Write summary report
        await writeFile(`${outputDir}/comparison-summary.json`, JSON.stringify(summary, null, 2));
        
        console.log('\\n✅ Configuration comparison completed!');
        console.log(`📊 Results saved to: ${outputDir}/`);
        
        // Print summary to console
        console.log('\\n📈 Summary:');
        for (const config in summary.summary) {
            const stats = summary.summary[config];
            console.log(`  ${config}:`);
            console.log(`    Analysis: ${stats.analysis_success ? '✅' : '❌'}`);
            console.log(`    Benchmark: ${stats.benchmark_success ? '✅' : '❌'}`);
            console.log(`    Demo: ${stats.demo_success ? '✅' : '❌'}`);
        }
        
    } catch (error) {
        console.error('Error running configuration comparison:', error);
        process.exit(1);
    }
}

runConfigComparison();