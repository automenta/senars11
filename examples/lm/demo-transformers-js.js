#!/usr/bin/env node

import {App} from '@senars/agent';

// Set environment variable to suppress ONNX runtime warnings
process.env.ORT_LOG_LEVEL = '3';

async function demonstrateTransformersJS() {
    console.log('🚀 Demonstrating Transformers.js Integration with SeNARS');
    console.log('=====================================================\n');

    // Configuration to enable Transformers.js
    const config = {
        lm: {
            provider: 'transformers',        // Use Transformers.js provider
            modelName: 'Xenova/LaMini-Flan-T5-248M',  // Compact model for local inference
            enabled: true,                   // Enable LM functionality
            temperature: 0.1                 // Low temperature for more deterministic outputs
        },
        subsystems: {
            lm: true,                       // Enable LM subsystem
            tools: true,                    // Enable tools if needed
            embeddingLayer: true,           // Enable embedding layer for semantic reasoning
            rules: ['syllogistic-core', 'temporal']  // Core reasoning rules
        }
    };

    const app = new App(config);

    console.log('✅ Configuration created with Transformers.js provider');
    console.log(`   Provider: ${config.lm.provider}`);
    console.log(`   Model: ${config.lm.modelName}`);
    console.log(`   LM Enabled: ${config.lm.enabled}\n`);

    try {
        console.log('🚀 Starting SeNARS with Transformers.js LM...');
        const agent = await app.start({startAgent: true});

        console.log('✅ SeNARS started successfully with Transformers.js integration!\n');

        console.log('📊 System Status:');
        console.log(`   - Agent ID: ${agent.id}`);
        console.log(`   - LM Providers: ${agent.lm.providers.size}`);
        console.log(`   - Default Provider: ${agent.lm.providers.defaultProviderId}`);
        console.log(`   - LM Enabled: ${agent.lm.config.enabled || true}\n`);

        console.log('🧪 Running Inference Test...');
        const prompt = "Translate English to French: Hello, how are you?";
        console.log(`   Input: "${prompt}"`);

        try {
            const response = await agent.lm.generateText(prompt);
            console.log(`   Output: "${response}"\n`);
        } catch (e) {
            console.log(`   Error during inference: ${e.message}\n`);
        }

        console.log('💡 Benefits of Transformers.js Integration:');
        console.log('   - Zero-configuration compact LM option');
        console.log('   - Runs entirely offline on your CPU');
        console.log('   - Enables hybrid neuro-symbolic reasoning');
        console.log('   - Combines NAL (formal logic) with neural pattern recognition');
        console.log('   - Provides compact model suitable for local development\n');

        // Clean shutdown
        await app.shutdown();
        console.log('✅ Demonstration completed successfully!');

    } catch (error) {
        console.error('❌ Error during demonstration:', error.message);
        console.error('Stack:', error.stack);
        await app.shutdown().catch(() => {
        }); // Attempt cleanup
    }
}

// Run the demonstration
demonstrateTransformersJS().catch(console.error);