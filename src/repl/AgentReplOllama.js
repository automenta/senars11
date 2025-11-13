#!/usr/bin/env node

/**
 * @file AgentReplOllama.js
 * @description Complete self-contained Agent REPL implementation with Ollama, LangChain, and streaming support
 * Rewritten to use direct LangChain streaming instead of LangGraph to avoid tool call loops.
 */

import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { tool, DynamicTool } from "@langchain/core/tools";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import React from 'react';
import { render, Box, Text, useInput, useStdin } from 'ink';
import TextInput from 'ink-text-input';
import {v4 as uuidv4} from 'uuid';

// Import existing SeNARS tools
import { NARControlTool } from '../tool/NARControlTool.js';

// Define reusable constants for logging and UI
const LOG_TYPES = {
  INFO: 'info',
  SUCCESS: 'success', 
  ERROR: 'error',
  USER: 'user',
  TOOL_CALL: 'tool_call'
};

const COLORS = {
  ERROR: 'red',
  INFO: 'blue', 
  SUCCESS: 'green',
  USER: 'yellow',
  TOOL_CALL: 'cyan'
};

// Define example tools using Zod schema
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

/**
 * Parses raw arguments for NAR control tool
 * @param {any} rawArgs - Raw arguments received from the model
 * @returns {object} Processed arguments with action and content
 */
const parseNARControlArgs = (rawArgs) => {
  // Handle different possible input formats
  if (typeof rawArgs === 'string') {
    // If args is just a string (unexpected but possible)
    const input = rawArgs.toLowerCase().trim();
    switch (input) {
      case 'get_beliefs': 
        return { action: 'get_beliefs', content: '' };
      case 'get_goals':
        return { action: 'get_goals', content: '' };
      case 'step':
        return { action: 'step', content: '' };
      default:
        return { action: 'query', content: input };
    }
  } else if (typeof rawArgs === 'object') {
    if (rawArgs.action) {
      // If action is directly provided (the schema-compliant way)
      return rawArgs;
    } else if (rawArgs.input) {
      // If input is provided (the model's preferred way), parse it
      return parseNARCommand(rawArgs.input);
    } else {
      throw new Error("Invalid arguments: object must have 'action' or 'input' field");
    }
  } else {
    throw new Error("Invalid arguments: expected object or string");
  }
};

/**
 * Parses NAR command from string input
 * @param {string} input - Command input from the model
 * @returns {object} Parsed action and content
 */
const parseNARCommand = (input) => {
  const lowerInput = input.toLowerCase().trim();

  // Handle actions based on keywords - check more specific patterns first to avoid conflicts
  if (lowerInput.includes('get_beliefs') || lowerInput.includes('get beliefs')) {
    return { action: 'get_beliefs', content: '' };
  } else if (lowerInput.includes('get_goals') || lowerInput.includes('get goals')) {
    return { action: 'get_goals', content: '' };
  } else if (lowerInput.includes('step') || lowerInput.includes('cycle') || lowerInput.includes('run')) {
    return { action: 'step', content: '' };
  } else if (lowerInput.includes('add_goal') || lowerInput.includes('add goal')) {
    // Handle goal additions first (more specific)
    const narseseMatch = input.match(/<[^>]+>[!]?/i);
    let content = '';
    if (narseseMatch) {
      content = narseseMatch[0];
    } else {
      // Extract content after the add command
      const cleaned = input.replace(/^(add_goal|add goal|add)\s*/i, '').trim();
      content = cleaned || input;
      if (content && !content.endsWith('!')) content += '!';
    }
    return { action: 'add_goal', content };
  } else if (lowerInput.includes('add_belief') || lowerInput.includes('add belief') || (lowerInput.includes('add') && !lowerInput.includes('goal') && input.includes('-->'))) {
    // Handle belief additions - ensure it doesn't overlap with goal
    const narseseMatch = input.match(/<[^>]+>/i);
    let content = '';
    if (narseseMatch) {
      content = narseseMatch[0];
    } else {
      // Extract content after the add command
      const cleaned = input.replace(/^(add_belief|add belief|add)\s*/i, '').trim();
      content = cleaned || input;
    }
    return { action: 'add_belief', content };
  } else if (lowerInput.includes('add')) {
    // Fallback for add commands that don't clearly fit belief/goal
    if (lowerInput.includes('!')) {
      // Likely a goal
      const narseseMatch = input.match(/<[^>]+>[!]?/i);
      let content = '';
      if (narseseMatch) {
        content = narseseMatch[0];
      } else {
        const cleaned = input.replace(/^(add)\s*/i, '').trim();
        content = cleaned;
        if (content && !content.endsWith('!')) content += '!';
      }
      return { action: 'add_goal', content };
    } else {
      // Likely a belief
      const narseseMatch = input.match(/<[^>]+>/i);
      let content = '';
      if (narseseMatch) {
        content = narseseMatch[0];
      } else {
        const cleaned = input.replace(/^(add)\s*/i, '').trim();
        content = cleaned || input;
      }
      return { action: 'add_belief', content };
    }
  } else if (lowerInput.includes('query') || lowerInput.includes('what') || lowerInput.includes('show')) {
    const content = input.replace(/^(query|show|what\s+is\s*)\s*/i, '').trim();
    return { action: 'query', content };
  } else {
    // Default fallback - if none of the specific patterns match, treat as query
    return { action: 'query', content: input };
  }
};

/**
 * Standardized error handler
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @returns {object} Standardized error response
 */
const handleExecutionError = (error, context = 'execution') => {
  console.error(`❌ Error in ${context}:`, error);
  return {
    error: true,
    message: error.message || 'An unknown error occurred',
    context
  };
};

// SeNARS-specific tool for NAR control
class SeNARSControlTool extends DynamicTool {
  constructor(nar = null) {
    super({
      name: "nar_control",
      description: "Control and interact with the SeNARS reasoning system. You can specify action and content, or provide an input command like 'get_beliefs', 'add_belief <content>', etc.",
      func: async (rawArgs) => {
        if (!nar) {
          return JSON.stringify({ error: "NAR system not initialized" });
        }

        try {
          // Process the arguments to ensure they match the expected NARControlTool format
          const processedArgs = parseNARControlArgs(rawArgs);

          // Execute the tool using our existing NARControlTool
          const narTool = new NARControlTool(nar);
          const result = await narTool.execute(processedArgs);
          return JSON.stringify(result);
        } catch (error) {
          return JSON.stringify({ error: error.message });
        }
      },
      schema: z.union([
        // Expected schema
        z.object({
          action: z.enum(["add_belief", "add_goal", "query", "step", "get_beliefs", "get_goals"])
                .describe("The action to perform on the NAR system"),
          content: z.string().optional().describe("Narsese content for the action"),
        }),
        // Model's likely format
        z.object({
          input: z.string().describe("Single command like 'get_beliefs', 'add_belief <content>', etc."),
        })
      ]),
    });
    
    this.nar = nar;
  }
}

// 3. Agent REPL Class - Self-contained implementation with direct streaming
export class AgentReplOllama {
  constructor(options = {}) {
    this.modelName = options.modelName || "hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M";
    this.temperature = options.temperature || 0;
    this.baseUrl = options.baseUrl || "http://localhost:11434";
    this.nar = options.nar || null;
    this.tools = this._initializeTools();
    this.model = null;
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

    console.log(`✅ Agent initialized with model: ${this.modelName}`);
    console.log(`🔧 Tools registered: ${this.tools.map(t => t.name).join(', ') || 'None'}`);
  }

  // Streaming execution function - direct approach without LangGraph
  async * streamExecution(input) {
    if (!this.model) {
      throw new Error("Agent not initialized. Call initialize() first.");
    }

    // Create initial messages
    const messages = [new HumanMessage(input)];
    let toolCalls = [];

    // === First pass: Stream assistant response and detect tool calls ===
    try {
      process.stdout.write("🤖 ");
      const firstStream = await this.model.stream(messages);

      let assistantContent = "";
      for await (const chunk of firstStream) {
        if (chunk.content) {
          assistantContent += chunk.content;
        }
        if (chunk.tool_calls?.length > 0) {
          toolCalls = chunk.tool_calls;
        }
      }

      // Yield the initial assistant response if there's content
      if (assistantContent) {
        yield { type: "agent_response", content: assistantContent };
      }

      // If there are no tool calls, we're done
      if (toolCalls.length === 0) {
        return;
      }

      // === Execute each tool call and stream results ===
      for (const tc of toolCalls) {
        const { name, args, id } = tc;
        
        // Yield the tool call notification
        yield { type: "tool_call", name, args };
        
        // Execute the tool
        let toolResult;
        const tool = this.tools.find(t => t.name === name);
        if (tool) {
          try {
            toolResult = await tool.invoke(args);
            // Yield the tool result
            yield { type: "tool_result", content: toolResult };
          } catch (error) {
            const errorResult = `Error executing ${name}: ${error.message}`;
            yield { type: "tool_result", content: errorResult };
          }
        } else {
          const errorResult = `Error: Tool ${name} not found`;
          yield { type: "tool_result", content: errorResult };
        }

        // Create messages for final response with tool results
        const messagesWithResults = [
          new HumanMessage(input),
          { role: "assistant", content: assistantContent, tool_calls: toolCalls },
          new ToolMessage({ content: toolResult, tool_call_id: id, name })
        ];

        // === Stream final response with tool result in context ===
        try {
          const finalStream = await this.model.stream(messagesWithResults);
          let finalContent = "";
          for await (const chunk of finalStream) {
            if (chunk.content) {
              finalContent += chunk.content;
            }
          }
          
          // Yield the final assistant response
          if (finalContent) {
            yield { type: "agent_response", content: finalContent };
          }
        } catch (error) {
          const errorResponse = `Error generating final response: ${error.message}`;
          yield { type: "agent_response", content: errorResponse };
        }
      }
    } catch (error) {
      yield { type: "agent_response", content: `❌ Streaming error: ${error.message}` };
      console.error('Streaming execution error:', error);
    }
  }

  async start() {
    if (!this.model) {
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
    console.log("\n🔄 Shutting down Agent REPL...");
    
    // Clean up resources if needed
    if (this.streamingComponent) {
      // Ink handles unmounting automatically
    }
    
    // Clear any pending operations
    this.model = null;
    this.tools = [];
    
    console.log("👋 Agent REPL session ended. Goodbye!");
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
      // Process the input with streaming
      for await (const chunk of agent.streamExecution(input)) {
        switch (chunk.type) {
          case 'agent_response':
            addLog(`🤖 ${chunk.content}`, 'success');
            break;
          case 'tool_call':
            addLog(`🔧 Calling: ${chunk.name}(${JSON.stringify(chunk.args)})`, 'info');
            break;
          case 'tool_result':
            addLog(`✅ ${chunk.content}`, 'success');
            break;
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
    const color = COLORS[log.type?.toUpperCase()] || 'white';
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

  // Header component
  const header = React.createElement(
    Box,
    { flexDirection: 'row', justifyContent: 'space-between', paddingX: 1, backgroundColor: 'blue' },
    React.createElement(Text, { color: 'white', bold: true }, '🤖 SeNARS Agent REPL'),
    React.createElement(Text, { color: 'white' }, `Model: ${agent.modelName}`)
  );

  // Log Viewer component
  const logViewer = React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1, padding: 1, maxHeight: '100%' },
    React.createElement(Text, { bold: true, color: 'cyan' }, `Conversation Log (${logs.length})`),
    React.createElement(
      Box,
      { flexDirection: 'column', flexGrow: 1, marginTop: 1, marginBottom: 1 },
      ...logs.slice(-20).map(formatLogEntry) // Show last 20 logs
    )
  );

  // Input Box component
  const inputBox = React.createElement(
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
  );

  // Status Bar component
  const statusBar = React.createElement(
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
  );

  return React.createElement(
    Box,
    { flexDirection: 'column', width: '100%', height: '100%' },
    header,
    logViewer,
    inputBox,
    statusBar
  );
};

// Command-line argument parsing
const parseArgs = () => {
  const args = {};
  const argv = process.argv;
  
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--model':
      case '--ollama':
        args.modelName = argv[i + 1]?.startsWith('--') ? "hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M" : argv[++i];
        break;
      case '--temperature':
        args.temperature = parseFloat(argv[++i]);
        break;
      case '--base-url':
        args.baseUrl = argv[++i];
        break;
    }
  }
  
  // Default model if --ollama flag is provided without specific model
  if (process.argv.includes('--ollama') && !args.modelName) {
    args.modelName = "hf.co/unsloth/granite-4.0-micro-GGUF:Q4_K_M";
  }
  
  return args;
};

// Handle graceful shutdown
let agentReplInstance = null;
process.on('SIGINT', async () => {
  console.log('\n🔄 Received SIGINT, shutting down gracefully...');
  if (agentReplInstance && typeof agentReplInstance.shutdown === 'function') {
    await agentReplInstance.shutdown();
  } else {
    console.log("👋 Agent REPL session ended. Goodbye!");
  }
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
          if (input.includes('!')) {
            this.goals.push({ content: input, timestamp: Date.now() });
          } else {
            this.beliefs.push({ content: input, timestamp: Date.now() });
          }
          return { success: true, message: `Input processed: ${input}` };
        },
        
        execute: function(input) {
          return this.addInput(input);
        },
        
        cycle: function(steps = 1) {
          console.log(`Mock NAR cycle: ${steps} step(s)`);
          return { cycles: steps, status: 'completed' };
        },
        
        getBeliefs: function() {
          return this.beliefs;
        },
        
        getGoals: function() {
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