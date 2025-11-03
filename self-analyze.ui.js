#!/usr/bin/env node

/**
 * Self-Analysis UI Launcher
 * Uses the general WebUILauncher with self-analysis data processing
 */

import {fileURLToPath} from 'url';
import {dirname} from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import SeNARSSelfAnalyzer from './self-analyze.js';
import {launchDataDrivenUI} from './src/ui/WebUILauncher.js';

// Need to re-parse arguments to ensure they're from this script context
const args = process.argv.slice(2);

/**
 * Self-analysis data processor function
 * @param {WebSocketMonitor} monitor - The WebSocket monitor instance
 */
const runSelfAnalysis = async (monitor) => {
    console.log('Starting SeNARS self-analysis...');
    
    try {
        const analyzer = new SeNARSSelfAnalyzer();
        await analyzer.initialize();
        
        // Collect all data
        analyzer.collectTestResults();
        analyzer.collectCoverage();
        analyzer.collectProjectInfo();
        analyzer.collectStaticAnalysis();
        analyzer.collectRequirementsAnalysis();
        
        // Generate development plan
        const developmentPlan = analyzer.generateDevelopmentPlan();
        
        // Convert to Narsese and input to NAR
        const narseseInputs = analyzer.convertToNarsese();
        
        console.log(`Feeding ${narseseInputs.length} Statements to NAR`);
        
        for (const input of narseseInputs) {
            try {
                await analyzer.nar.input(input);
            } catch (error) {
                console.log(`Failed to input: ${input} - ${error.message}`);
            }
        }
        
        // Run cycles to allow reasoning
        for (let i = 0; i < 30; i++) {
            await analyzer.nar.step();
        }
        
        // Get analysis results
        const analysisResults = analyzer.analysisResults;
        
        // Calculate pass rate for tests
        if (analysisResults.tests && !analysisResults.tests.error) {
            analysisResults.tests.passRate = Math.round(
                (analysisResults.tests.passedTests / Math.max(analysisResults.tests.totalTests, 1)) * 100
            );
        }
        
        // Identify missing documentation sections
        if (analysisResults.requirements && !analysisResults.requirements.error) {
            const missing = [];
            if (!analysisResults.requirements.hasTermClassDocumentation) missing.push('Term Class');
            if (!analysisResults.requirements.hasTaskClassDocumentation) missing.push('Task Class');
            if (!analysisResults.requirements.hasTruthDocumentation) missing.push('Truth Values');
            if (!analysisResults.requirements.hasStampDocumentation) missing.push('Stamp System');
            if (!analysisResults.requirements.hasTestingStrategy) missing.push('Testing Strategy');
            if (!analysisResults.requirements.hasErrorHandling) missing.push('Error Handling');
            if (!analysisResults.requirements.hasSecurityImplementation) missing.push('Security');
            
            analysisResults.requirements.missing = missing;
        }
        
        // Build complete analysis result
        const completeAnalysis = {
            ...analysisResults,
            developmentPlan,
            timestamp: new Date().toISOString()
        };
        
        // Store the analysis data for later requests
        monitor.selfAnalysisData = completeAnalysis;
        
        // Send the analysis data to all currently connected clients
        const clients = monitor.getClients();
        for (const client of clients) {
            monitor._sendToClient(client, {
                type: 'selfAnalysisData',
                payload: completeAnalysis
            });
        }
        
        console.log('Self-analysis completed and sent to UI');
        
        // Register a handler for future requests of self-analysis data
        monitor.registerClientMessageHandler('requestSelfAnalysisData', (message, client, monitorInstance) => {
            const data = monitorInstance.selfAnalysisData;
            const error = monitorInstance.selfAnalysisError;
            
            monitorInstance._sendToClient(client, data 
                ? { type: 'selfAnalysisData', payload: data }
                : { type: 'selfAnalysisError', payload: error || { message: 'No self-analysis data available' } }
            );
        });
        
        // Dispose of the analyzer's NAR
        await analyzer.nar.dispose();
        
        return completeAnalysis;
    } catch (error) {
        console.error('Self-analysis failed:', error.message);
        
        // Store error data for later requests
        const errorData = { message: error.message, timestamp: new Date().toISOString() };
        monitor.selfAnalysisError = errorData;
        
        // Send error to all connected clients
        monitor.getClients().forEach(client => 
            monitor._sendToClient(client, { type: 'selfAnalysisError', payload: errorData })
        );
        
        // Register a handler for future requests of self-analysis data
        monitor.registerClientMessageHandler('requestSelfAnalysisData', (message, client, monitorInstance) => {
            const error = monitorInstance.selfAnalysisError;
            monitorInstance._sendToClient(client, { 
                type: 'selfAnalysisError', 
                payload: error || { message: 'No self-analysis data available' } 
            });
        });
    }
};

// Launch the self-analysis UI
launchDataDrivenUI(runSelfAnalysis, process.argv.slice(2)).catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
});