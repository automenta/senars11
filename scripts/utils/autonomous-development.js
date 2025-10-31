#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

function showUsage() {
    console.log(`
Usage: node scripts/utils/autonomous-development.js [options]

Options:
  --help, -h              Show this help message
  --mode <mode>           Mode: tune-heuristics|ui-optimization|self-development (default: tune-heuristics)
  --generations <n>       Number of generations to run (default: 10)
  --population <n>        Population size for genetic algorithm (default: 5)
  --visual-feedback       Use visual feedback for optimization (default: true)
  --performance-goal      Optimize for performance metrics
  --ui-goal               Optimize for UI experience metrics
  --config-template <f>   Config template file for starting parameters
  --output-dir <dir>      Output directory (default: auto-development-results)
  --iterations <n>        Iterations per generation (default: 3)

Examples:
  node scripts/utils/autonomous-development.js --mode tune-heuristics
  node scripts/utils/autonomous-development.js --mode ui-optimization --generations 20
  node scripts/utils/autonomous-development.js --mode self-development --visual-feedback
    `);
}

if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

// Parse arguments
let mode = 'tune-heuristics';
let generations = 10;
let populationSize = 5;
let useVisualFeedback = true;
let optimizePerformance = false;
let optimizeUI = false;
let configTemplate = null;
let outputDir = 'auto-development-results';
let iterationsPerGen = 3;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
        mode = args[i + 1];
        i++;
    } else if (args[i] === '--generations' && args[i + 1]) {
        generations = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--population' && args[i + 1]) {
        populationSize = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--visual-feedback') {
        useVisualFeedback = true;
    } else if (args[i] === '--no-visual-feedback') {
        useVisualFeedback = false;
    } else if (args[i] === '--performance-goal') {
        optimizePerformance = true;
    } else if (args[i] === '--ui-goal') {
        optimizeUI = true;
    } else if (args[i] === '--config-template' && args[i + 1]) {
        configTemplate = args[i + 1];
        i++;
    } else if (args[i] === '--output-dir' && args[i + 1]) {
        outputDir = args[i + 1];
        i++;
    } else if (args[i] === '--iterations' && args[i + 1]) {
        iterationsPerGen = parseInt(args[i + 1]);
        i++;
    }
}

// Set default optimization goals based on mode
if (mode === 'tune-heuristics') {
    optimizePerformance = true;
} else if (mode === 'ui-optimization') {
    optimizeUI = true;
} else if (mode === 'self-development') {
    optimizePerformance = true;
    optimizeUI = true;
    useVisualFeedback = true;
}

console.log(`Running autonomous development in mode: ${mode}`);

// Define parameter ranges for evolution
const parameterRanges = {
    memory: {
        maxConcepts: { min: 10, max: 1000 },
        maxTasksPerConcept: { min: 5, max: 100 },
        priorityThreshold: { min: 0.01, max: 0.99 },
        priorityDecayRate: { min: 0.001, max: 0.1 }
    },
    reasoning: {
        inferenceThreshold: { min: 0.01, max: 0.99 },
        conceptForgottenRatio: { min: 0.01, max: 0.5 },
        taskForgottenRatio: { min: 0.01, max: 0.5 }
    },
    visualization: {
        updateInterval: { min: 100, max: 5000 },
        maxDisplayItems: { min: 10, max: 500 }
    }
};

async function generateRandomConfig() {
    const config = {
        memory: {},
        reasoning: {},
        visualization: {}
    };
    
    for (const category in parameterRanges) {
        for (const param in parameterRanges[category]) {
            const range = parameterRanges[category][param];
            // Generate random value within range
            config[category][param] = Math.random() * (range.max - range.min) + range.min;
        }
    }
    
    return config;
}

async function evaluateConfiguration(config, generation, individual) {
    console.log(`  Evaluating configuration ${individual} in generation ${generation}...`);
    
    // Create a temporary config file for this evaluation
    const tempConfigFile = `${outputDir}/temp-config-${generation}-${individual}.json`;
    await writeFile(tempConfigFile, JSON.stringify(config, null, 2));
    
    const evaluationResult = {};
    
    // If using visual feedback, run visualizations and capture results
    if (useVisualFeedback) {
        console.log(`    Running visual analysis...`);
        
        // For visual feedback, we'd run a demo and capture screenshots
        // In a real implementation, this would analyze visual outputs
        try {
            const visualProcess = spawn('node', ['run-demo.js'], {
                cwd: join(__dirname, '../..'),
                env: {
                    ...process.env,
                    SENARS_CONFIG_FILE: tempConfigFile
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let visualOutput = '';
            visualProcess.stdout.on('data', (data) => {
                visualOutput += data.toString();
            });
            
            visualProcess.stderr.on('data', (data) => {
                visualOutput += data.toString();
            });
            
            await new Promise((resolve) => {
                visualProcess.on('close', (code) => {
                    evaluationResult.visualSuccess = code === 0;
                    evaluationResult.visualOutput = visualOutput;
                    evaluationResult.visualExitCode = code;
                    resolve();
                });
            });
            
            // In a real system, we'd analyze the visual output here
            // For now, we'll just record that it ran successfully
            evaluationResult.visualScore = evaluationResult.visualSuccess ? Math.random() : 0;
            
        } catch (error) {
            console.error(`    Visual evaluation failed: ${error.message}`);
            evaluationResult.visualSuccess = false;
            evaluationResult.visualScore = 0;
        }
    }
    
    // If optimizing for performance, run benchmarks
    if (optimizePerformance) {
        console.log(`    Running performance analysis...`);
        
        try {
            const perfProcess = spawn('node', ['src/testing/runBenchmarks.js'], {
                cwd: join(__dirname, '../..'),
                env: {
                    ...process.env,
                    SENARS_CONFIG_FILE: tempConfigFile
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let perfOutput = '';
            perfProcess.stdout.on('data', (data) => {
                perfOutput += data.toString();
            });
            
            perfProcess.stderr.on('data', (data) => {
                perfOutput += data.toString();
            });
            
            await new Promise((resolve) => {
                perfProcess.on('close', (code) => {
                    evaluationResult.perfSuccess = code === 0;
                    evaluationResult.perfOutput = perfOutput;
                    evaluationResult.perfExitCode = code;
                    resolve();
                });
            });
            
            // Simple performance scoring based on success and arbitrary metrics
            evaluationResult.perfScore = evaluationResult.perfSuccess ? 
                (0.5 + Math.random() * 0.5) : 0; // Random score for demo purposes
                
        } catch (error) {
            console.error(`    Performance evaluation failed: ${error.message}`);
            evaluationResult.perfSuccess = false;
            evaluationResult.perfScore = 0;
        }
    }
    
    // Calculate overall fitness score
    let totalScore = 0;
    let scoreCount = 0;
    
    if (useVisualFeedback) {
        totalScore += evaluationResult.visualScore * 0.4; // 40% weight to visual
        scoreCount += 0.4;
    }
    
    if (optimizePerformance) {
        totalScore += evaluationResult.perfScore * 0.6; // 60% weight to performance
        scoreCount += 0.6;
    }
    
    evaluationResult.fitness = scoreCount > 0 ? totalScore / scoreCount : 0;
    
    // Clean up temp file
    try {
        await execAsync(`rm -f ${tempConfigFile}`);
    } catch (error) {
        // Ignore cleanup errors
    }
    
    return evaluationResult;
}

async function selectParents(population) {
    // Simple tournament selection
    const tournamentSize = 3;
    const selected = [];
    
    for (let i = 0; i < 2; i++) {
        const tournament = [];
        for (let j = 0; j < tournamentSize; j++) {
            const randomIdx = Math.floor(Math.random() * population.length);
            tournament.push(population[randomIdx]);
        }
        
        // Select the best in tournament
        tournament.sort((a, b) => b.fitness - a.fitness);
        selected.push(tournament[0]);
    }
    
    return selected;
}

async function crossover(parent1, parent2) {
    // Simple crossover - average parameter values
    const child = JSON.parse(JSON.stringify(parent1.config)); // Deep copy
    
    for (const category in child) {
        for (const param in child[category]) {
            // Mix values from both parents
            const val1 = parent1.config[category][param];
            const val2 = parent2.config[category][param];
            child[category][param] = (val1 + val2) / 2;
        }
    }
    
    return child;
}

async function mutate(config, mutationRate = 0.1) {
    // Apply random mutations to parameters
    for (const category in parameterRanges) {
        for (const param in parameterRanges[category]) {
            if (Math.random() < mutationRate) {
                const range = parameterRanges[category][param];
                config[category][param] = Math.random() * (range.max - range.min) + range.min;
            }
        }
    }
    
    return config;
}

async function runAutonomousDevelopment() {
    try {
        console.log(`\\n🤖 Starting autonomous development in mode: ${mode}`);
        console.log(`📊 Parameters: generations=${generations}, population=${populationSize}`);
        
        // Create output directory
        await execAsync(`mkdir -p ${outputDir} ${outputDir}/generations ${outputDir}/configs ${outputDir}/results`);
        
        // Initialize population
        let population = [];
        console.log('\\n🌱 Initializing population...');
        
        for (let i = 0; i < populationSize; i++) {
            const config = await generateRandomConfig();
            population.push({
                config: config,
                id: i
            });
        }
        
        const evolutionHistory = [];
        
        // Main evolution loop
        for (let gen = 0; gen < generations; gen++) {
            console.log(`\\n GenerationType ${gen + 1}/${generations}`);
            
            // Evaluate entire population
            for (let i = 0; i < population.length; i++) {
                const individual = population[i];
                const result = await evaluateConfiguration(individual.config, gen, i);
                
                individual.fitness = result.fitness;
                individual.evaluation = result;
                
                console.log(`    Individual ${i}: Fitness = ${individual.fitness.toFixed(4)}`);
            }
            
            // Sort by fitness (descending)
            population.sort((a, b) => b.fitness - a.fitness);
            
            // Record best of generation
            const bestOfGen = population[0];
            evolutionHistory.push({
                generation: gen,
                bestFitness: bestOfGen.fitness,
                averageFitness: population.reduce((sum, ind) => sum + ind.fitness, 0) / population.length,
                bestConfig: bestOfGen.config
            });
            
            console.log(`    Best fitness: ${bestOfGen.fitness.toFixed(4)}`);
            
            // Save best config of generation
            await writeFile(
                `${outputDir}/generations/gen-${gen}-best.json`, 
                JSON.stringify(bestOfGen.config, null, 2)
            );
            
            // Create next generation (except for the last generation)
            if (gen < generations - 1) {
                const nextPopulation = [population[0]]; // Elitism: keep best
                
                while (nextPopulation.length < populationSize) {
                    const [parent1, parent2] = await selectParents(population);
                    let childConfig = await crossover(parent1, parent2);
                    childConfig = await mutate(childConfig);
                    
                    nextPopulation.push({
                        config: childConfig,
                        id: nextPopulation.length
                    });
                }
                
                population = nextPopulation;
            }
        }
        
        // Select overall best
        population.sort((a, b) => b.fitness - a.fitness);
        const bestOverall = population[0];
        
        // Generate final report
        const finalReport = {
            timestamp: new Date().toISOString(),
            mode: mode,
            parameters: {
                generations,
                populationSize,
                useVisualFeedback,
                optimizePerformance,
                optimizeUI
            },
            evolutionHistory,
            bestConfiguration: bestOverall.config,
            bestFitness: bestOverall.fitness,
            summary: {
                initialAverage: evolutionHistory[0].averageFitness,
                finalAverage: evolutionHistory[evolutionHistory.length - 1].averageFitness,
                bestFitness: bestOverall.fitness
            }
        };
        
        await writeFile(`${outputDir}/final-report.json`, JSON.stringify(finalReport, null, 2));
        
        console.log('\\n🎉 Autonomous development completed!');
        console.log(`🏆 Best fitness achieved: ${bestOverall.fitness.toFixed(4)}`);
        console.log(`📊 Results saved to: ${outputDir}/`);
        
        // Print summary to console
        console.log('\\n📈 Evolution Summary:');
        console.log(`  Initial average fitness: ${finalReport.summary.initialAverage.toFixed(4)}`);
        console.log(`  Final average fitness: ${finalReport.summary.finalAverage.toFixed(4)}`);
        console.log(`  Best fitness: ${finalReport.summary.bestFitness.toFixed(4)}`);
        console.log(`  Improvement: ${((finalReport.summary.finalAverage / finalReport.summary.initialAverage - 1) * 100).toFixed(2)}% average`);
        
    } catch (error) {
        console.error('Error running autonomous development:', error);
        process.exit(1);
    }
}

runAutonomousDevelopment();