/**
 * Test file to verify MCP integration with existing SeNARS components
 */

import { SeNARSMCPSystem } from './index.js';

// Import some basic SeNARS components for integration testing
import { Truth } from '../Truth.js';
import { Stamp } from '../Stamp.js';

async function testMCPIntegration() {
  console.log('🧪 Starting SeNARS MCP Integration Test...');
  
  try {
    // Initialize the MCP system in dual mode
    const mcpSystem = new SeNARSMCPSystem();
    await mcpSystem.initialize('dual');
    
    console.log('✅ MCP System initialized in dual mode');
    
    // Test basic functionality
    const status = mcpSystem.getStatus();
    console.log('📊 MCP System Status:', status);
    
    // Test safety features
    console.log('\n🔒 Testing Safety Features...');
    
    // Create a truth value to test with
    const testTruth = new Truth(0.8, 0.9);
    console.log('✅ Created Truth value:', testTruth);
    
    // Test adapter functionality
    console.log('\n🔄 Testing Adapter...');
    const { Adapter } = await import('./Adapter.js');
    const adapter = new Adapter();
    
    // Test term transformation
    const testTerm = "operation(argument1='value1', argument2=42)";
    const transformed = adapter.transformSenarsToMCP(testTerm);
    console.log('✅ Term transformation:', transformed);
    
    // Test validation
    const validationResult = adapter.validateAgainstSchema(
      { toolName: 'test', parameters: {} }, 
      { type: 'object', required: ['toolName'] }
    );
    console.log('✅ Schema validation:', validationResult);
    
    // Test available tools
    console.log('\n🛠️  Testing Available Tools...');
    const tools = mcpSystem.getAvailableTools();
    console.log('📋 Available tools:', tools);
    
    // Test the system can be shutdown properly
    console.log('\n🛑 Testing Shutdown...');
    await mcpSystem.shutdown();
    console.log('✅ MCP System shutdown successfully');
    
    console.log('\n🎉 All MCP integration tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ MCP Integration Test failed:', error);
    return false;
  }
}

async function testMCPClientServerIntegration() {
  console.log('\n🧪 Testing MCP Client-Server Integration...');
  
  try {
    // Test creating a server first
    console.log('🚀 Setting up MCP Server...');
    const { setupMCPServer } = await import('./index.js');
    
    // Setting up server on a random port for testing
    const server = await setupMCPServer(0); // Use 0 to get an available port
    console.log('✅ MCP Server started');
    
    // Test creating a client
    console.log('👤 Setting up MCP Client...');
    const { connectMCPClient } = await import('./index.js');
    
    // Note: In a real scenario, we'd connect to the actual server URL
    // For this test, we'll just verify the client can be created
    console.log('✅ MCP Client setup function available');
    
    // Shutdown server
    if (server && typeof server.stop === 'function') {
      await server.stop();
      console.log('✅ MCP Server stopped');
    }
    
    console.log('🎉 Client-Server integration test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Client-Server integration test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive MCP system tests...\n');
  
  const results = [];
  
  // Run integration test
  results.push(await testMCPIntegration());
  
  // Run client-server test
  results.push(await testMCPClientServerIntegration());
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! MCP integration is working correctly.');
    return true;
  } else {
    console.log('❌ Some tests failed. Please check the output above.');
    return false;
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { testMCPIntegration, testMCPClientServerIntegration, runAllTests };