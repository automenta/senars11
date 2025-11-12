#!/usr/bin/env node

/**
 * @file AgentReplOllama.js
 * @description Complete self-contained Agent REPL implementation with Ollama, LangChain, and streaming support
 * This implements the LangGraph-based agent with proper streaming, tool calls, and MCP integration.
 */

import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import React from 'react';
import { render, Box, Text, useInput, useStdin } from 'ink';
import TextInput from 'ink-text-input';
import {v4 as uuidv4} from 'uuid';

// Import existing SeNARS tools
import { NARControlTool } from '../tool/NARControlTool.js';

// 1. Define example tools using Zod schema (can be extended with SeNARS tools)
const getWeather = tool(async ({ location }) => {
  // Simulate API call
  await new Promise(r => setTimeout(r, 500));
  return `Sunny, 22°C in ${location}`;
}, {
  name: "get_weather",
  description: "Get current weather for a location",
  schema: z.object({
    location: z.string().describe("City name"),
  }),
});

// 2. SeNARS-specific tool for NAR control (using the existing NARControlTool)
import { DynamicTool } from "@langchain/core/tools";

class SeNARSControlTool extends DynamicTool {
  constructor(nar = null) {
    super({
      name: "nar_control",
      description: "Control and interact with the SeNARS reasoning system",
      func: async (args) => {
        if (!nar) {
          return JSON.stringify({ error: "NAR system not initialized" });
        }

        // Execute the tool using our existing NARControlTool
        const narTool = new NARControlTool(nar);
        const result = await narTool.execute(args);
        return JSON.stringify(result);
      },
      schema: z.object({
        action: z.enum(["add_belief", "add_goal", "query", "step", "get_beliefs", "get_goals"]).describe(
          "The action to perform on the NAR system"
        ),
        content: z.string().optional().describe("Narsese content for the action"),
      }),
    });
    
    this.nar = nar;
  }
}

// 3. Agent REPL Class - Self-contained implementation
export class AgentReplOllama {
  constructor(options = {}) {
    this.modelName = options.modelName || "llama3.2";
    this.temperature = options.temperature || 0;
    this.baseUrl = options.baseUrl || "http://localhost:11434";
    this.nar = options.nar || null;
    this.tools = this._initializeTools();
    this.graph = null;
    this.streamingComponent = null;
  }

  _initializeTools() {
    // Use the SeNARS control tool with NAR instance if available
    const tools = [getWeather]; // Add example tool
    
    if (this.nar) {
      const senarsTool = new SeNARSControlTool(this.nar);
      tools.push(senarsTool);
    }
    
    return tools;
  }

  async initialize() {
    // Initialize Ollama model with tools
    this.model = new ChatOllama({
      model: this.modelName,
      baseUrl: this.baseUrl,
      temperature: this.temperature,
    }).bindTools(this.tools);

    // Define agent state - compatible with newer LangGraph versions
    const AgentState = Annotation.Root({
      messages: Annotation({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
    });
    
    this.AgentState = AgentState;

    // Create nodes
    this.agentNode = async (state) => {
      const { messages } = state;
      try {
        const response = await this.model.invoke(messages);
        return { messages: [response] };
      } catch (error) {
        console.error("Error in agent node:", error);
        return { messages: [new AIMessage({ content: `Error: ${error.message}` })] };
      }
    };

    this.toolsNode = new ToolNode(this.tools);

    // Build the graph
    this.graph = new StateGraph(this.AgentState)
      .addNode("agent", this.agentNode)
      .addNode("tools", this.toolsNode)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", (state) => {
        const lastMsg = state.messages[state.messages.length - 1];
        return lastMsg?.tool_calls?.length > 0 ? "tools" : END;
      })
      .addEdge("tools", "agent")
      .compile();

    console.log(`✅ Agent initialized with model: ${this.modelName}`);
    console.log(`🔧 Tools registered: ${this.tools.map(t => t.name).join(', ') || 'None'}`);
  }

  // Streaming execution function - follows the exact pattern from the example
  async * streamExecution(input) {
    if (!this.graph) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    const stream = await this.graph.stream(
      { messages: [new HumanMessage(input)] },
      { streamMode: "values" }
    );

    // Stream the execution following the example code pattern
    for await (const chunk of stream) {
      const lastMsg = chunk.messages[chunk.messages.length - 1];
      if (!lastMsg) continue;

      // Print agent thoughts - check message type properly using constructor name like in UI
      if (lastMsg.constructor.name === 'AIMessage' && (!lastMsg.tool_calls || lastMsg.tool_calls.length === 0)) {
        yield { type: "agent_response", content: lastMsg.content };
      }

      // Print tool calls
      if (lastMsg.tool_calls?.length > 0) {
        for (const tc of lastMsg.tool_calls) {
          yield { type: "tool_call", name: tc.name, args: tc.args };
        }
      }

      // Print tool results
      if (lastMsg.constructor.name === 'ToolMessage' || lastMsg._getType?.() === "tool") {
        yield { type: "tool_result", content: lastMsg.content };
      }
    }
  }

  async start() {
    if (!this.graph) {
      await this.initialize();
    }

    console.log('🤖 SeNARS Agent REPL with Ollama - Streaming Support');
    console.log('=================================================');
    
    // Start the Ink UI
    this.streamingComponent = React.createElement(AgentStreamingUI, { 
      agent: this,
      nar: this.nar
    });
    
    render(this.streamingComponent);
  }

  async shutdown() {
    if (this.streamingComponent) {
      // Ink handles unmounting automatically
    }
    console.log("\n👋 Agent REPL session ended. Goodbye!");
  }
}

// React UI Component for streaming display
const AgentStreamingUI = ({ agent, nar }) => {
  const [logs, setLogs] = React.useState([
    {id: uuidv4(), type: 'info', message: '🤖 Agent initialized - Type your query below', timestamp: Date.now()}
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const { isRawModeSupported } = useStdin();

  // Add log entry
  const addLog = (message, type = 'info') => {
    setLogs(prevLogs => [
      ...prevLogs,
      { id: uuidv4(), type, message, timestamp: Date.now() }
    ].slice(-50)); // Keep last 50 logs
  };

  // Handle input submission
  const handleSubmit = async () => {
    const input = inputValue.trim();
    if (!input || isProcessing) return;

    setLogs(prevLogs => [
      ...prevLogs,
      { id: uuidv4(), type: 'user', message: `> ${input}`, timestamp: Date.now() }
    ].slice(-50));
    setInputValue('');
    setIsProcessing(true);

    try {
      // Process the input with streaming - following the example code pattern
      console.log('Starting stream for input:', input); // Debug logging
      const stream = await agent.graph.stream(
        { messages: [new HumanMessage(input)] },
        { streamMode: "values" }
      );

      for await (const chunk of stream) {
        const lastMsg = chunk.messages[chunk.messages.length - 1];
        if (!lastMsg) continue;

        // Print agent thoughts - check message type properly
        if (lastMsg.constructor.name === 'AIMessage' && (!lastMsg.tool_calls || lastMsg.tool_calls.length === 0)) {
          addLog(`🤖 ${lastMsg.content || 'No content'}`, 'success');
        }
        else if (lastMsg.constructor.name === 'ToolMessage' || lastMsg._getType?.() === "tool") {
          // Print tool results
          addLog(`✅ ${lastMsg.content || 'No tool result'}`, 'success');
        }

        // Print tool calls
        if (lastMsg.tool_calls?.length > 0) {
          for (const tc of lastMsg.tool_calls) {
            addLog(`🔧 Calling: ${tc.name}(${JSON.stringify(tc.args)})`, 'info');
          }
        }
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle key inputs
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });

  // Format log entries
  const formatLogEntry = (log) => {
    let color = 'white';
    switch (log.type) {
      case 'error': color = 'red'; break;
      case 'info': color = 'blue'; break;
      case 'success': color = 'green'; break;
      case 'user': color = 'yellow'; break;
      case 'tool_call': color = 'cyan'; break;
    }

    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    return React.createElement(
      Box,
      { key: log.id, flexDirection: 'row' },
      React.createElement(
        Text,
        { color },
        `${timestamp} ${log.message}`
      )
    );
  };

  return React.createElement(
    Box,
    { flexDirection: 'column', width: '100%', height: '100%' },
    
    // Header
    React.createElement(
      Box,
      { flexDirection: 'row', justifyContent: 'space-between', paddingX: 1, backgroundColor: 'blue' },
      React.createElement(Text, { color: 'white', bold: true }, '🤖 SeNARS Agent REPL'),
      React.createElement(Text, { color: 'white' }, `Model: ${agent.modelName}`)
    ),
    
    // Log Viewer
    React.createElement(
      Box,
      { flexDirection: 'column', flexGrow: 1, padding: 1, maxHeight: '100%' },
      React.createElement(Text, { bold: true, color: 'cyan' }, `Conversation Log (${logs.length})`),
      React.createElement(
        Box,
        { flexDirection: 'column', flexGrow: 1, marginTop: 1, marginBottom: 1 },
        ...logs.slice(-20).map(formatLogEntry) // Show last 20 logs
      )
    ),
    
    // Input Box
    React.createElement(
      Box,
      { borderStyle: 'round', width: '100%' },
      React.createElement(
        Box,
        { flexDirection: 'row', alignItems: 'center' },
        React.createElement(Text, { color: 'green', bold: true }, '> '),
        React.createElement(
          TextInput,
          {
            value: inputValue,
            onChange: setInputValue,
            onSubmit: handleSubmit,
            placeholder: isProcessing ? 'Processing...' : 'Enter query for agent (e.g., "What is the weather in Paris?")...',
            disabled: isProcessing
          }
        )
      )
    ),
    
    // Status Bar
    React.createElement(
      Box,
      { paddingX: 1, backgroundColor: 'gray', width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
      React.createElement(
        Box,
        { flexDirection: 'row' },
        React.createElement(Text, { color: 'white' }, `Status: ${isProcessing ? '🔄 Processing' : '✅ Ready'} | `),
        React.createElement(Text, { color: 'white' }, `Raw Mode: ${isRawModeSupported ? 'Yes' : 'No'}`)
      ),
      React.createElement(
        Box,
        { flexDirection: 'row' },
        React.createElement(Text, { color: 'yellow' }, 'Ctrl+C to exit')
      )
    )
  );
};

// Command-line argument parsing
function parseArgs() {
  const args = {};
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--model' || process.argv[i] === '--ollama') {
      // Check for model name in next argument
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
        args.modelName = process.argv[i + 1];
        i++; // Skip the next arg since we used it
      } else {
        // Default to granite model if no specific model provided after --ollama
        args.modelName = "hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M";
      }
    } else if (process.argv[i] === '--temperature') {
      args.temperature = parseFloat(process.argv[i + 1]);
      i++; // Skip the next arg
    } else if (process.argv[i] === '--base-url') {
      args.baseUrl = process.argv[i + 1];
      i++; // Skip the next arg
    }
  }
  return args;
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Agent REPL session ended. Goodbye!');
  process.exit(0);
});

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    try {
      const args = parseArgs();
      
      console.log('🤖 Starting SeNARS Agent REPL with Ollama...\n');
      
      // Create a more sophisticated mock NAR for testing
      const mockNAR = {
        beliefs: [],
        goals: [],
        tasks: [],
        
        addInput: function(input) {
          console.log(`Mock NAR addInput: ${input}`);
          // In a real implementation, this would process Narsese input
          if (input.includes('!')) {
            // Goal input - ends with !
            this.goals.push({ content: input, timestamp: Date.now() });
          } else if (input.includes('?')) {
            // Query input - ends with ?
            // This would trigger a query in the real system
          } else {
            // Belief input
            this.beliefs.push({ content: input, timestamp: Date.now() });
          }
          return { success: true, message: `Input processed: ${input}` };
        },
        
        execute: function(input) {
          console.log(`Mock NAR execute: ${input}`);
          return this.addInput(input);
        },
        
        cycle: function(steps = 1) {
          console.log(`Mock NAR cycle: ${steps} step(s)`);
          // In a real implementation, this would run the reasoning cycle
          return { cycles: steps, status: 'completed' };
        },
        
        getBeliefs: function() {
          console.log('Mock NAR getBeliefs');
          return this.beliefs;
        },
        
        getGoals: function() {
          console.log('Mock NAR getGoals');
          return this.goals;
        },
        
        addTask: function(task) {
          this.tasks.push(task);
          return { success: true, taskId: task.id || Date.now() };
        }
      };
      
      const agentRepl = new AgentReplOllama({
        ...args,
        nar: mockNAR  // In a real implementation, this would be the actual NAR instance
      });
      
      await agentRepl.start();
    } catch (error) {
      console.error('❌ Error starting Agent REPL:', error);
      process.exit(1);
    }
  }
  
  main();
}