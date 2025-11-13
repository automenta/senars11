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
import { parseOllamaArgs } from './utils/ReplArgsParser.js';
import { LOG_TYPES, COLORS, DEFAULT_CONFIG } from './utils/ReplConstants.js';

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
          const errorResult = { error: "NAR system not initialized" };
          console.error('NAR system error:', errorResult.error);
          return JSON.stringify(errorResult);
        }

        try {
          // Process the arguments to ensure they match the expected NARControlTool format
          const processedArgs = parseNARControlArgs(rawArgs);

          // Execute the tool using our existing NARControlTool
          const narTool = new NARControlTool(nar);
          const result = await narTool.execute(processedArgs);
          return JSON.stringify(result);
        } catch (error) {
          const errorResult = { error: error.message };
          console.error('Error in SeNARSControlTool:', error);
          return JSON.stringify(errorResult);
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
    this.modelName = options.modelName || DEFAULT_CONFIG.OLLAMA.modelName;
    this.temperature = options.temperature || DEFAULT_CONFIG.OLLAMA.temperature;
    this.baseUrl = options.baseUrl || DEFAULT_CONFIG.OLLAMA.baseUrl;
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
      const errorMsg = "Agent not initialized. Call initialize() first.";
      console.error(errorMsg);
      yield { type: "agent_response", content: `❌ ${errorMsg}` };
      return;
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
        yield* this._executeToolCall(tc, input, assistantContent, toolCalls);
      }
    } catch (error) {
      const errorMsg = `❌ Streaming error: ${error.message}`;
      console.error('Streaming execution error:', { error, input });
      yield { type: "agent_response", content: errorMsg };
    }
  }

  // Helper method to execute a single tool call with its follow-up response
  async * _executeToolCall(toolCall, originalInput, assistantContent, allToolCalls) {
    const { name, args, id } = toolCall;

    // Yield the tool call notification
    yield { type: "tool_call", name, args };

    // Execute the tool
    const tool = this.tools.find(t => t.name === name);
    const toolResult = await this._executeTool(tool, name, args);
    yield { type: "tool_result", content: toolResult };

    // Create messages for final response with tool results
    const messagesWithResults = [
      new HumanMessage(originalInput),
      { role: "assistant", content: assistantContent, tool_calls: allToolCalls },
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
      console.error('Error in final response generation:', error);
      yield { type: "agent_response", content: errorResponse };
    }
  }

  // Helper method to execute a tool and return result or error message
  async _executeTool(tool, name, args) {
    if (!tool) {
      const errorMsg = `Error: Tool ${name} not found`;
      console.error(errorMsg);
      return errorMsg;
    }

    try {
      return await tool.invoke(args);
    } catch (error) {
      const errorMsg = `Error executing ${name}: ${error.message}`;
      console.error(errorMsg, { error, toolName: name, args });
      return errorMsg;
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
    {id: uuidv4(), type: LOG_TYPES.INFO, message: '🤖 Agent initialized - Type your query below', timestamp: Date.now()}
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const { isRawModeSupported } = useStdin();

  // Add log entry
  const addLog = React.useCallback((message, type = LOG_TYPES.INFO) => {
    setLogs(prevLogs => [
      ...prevLogs,
      { id: uuidv4(), type, message, timestamp: Date.now() }
    ].slice(-50)); // Keep last 50 logs
  }, []);

  // Handle input submission
  const handleSubmit = React.useCallback(async () => {
    const input = inputValue.trim();
    if (!input || isProcessing) return;

    setLogs(prevLogs => [
      ...prevLogs,
      { id: uuidv4(), type: LOG_TYPES.USER, message: `> ${input}`, timestamp: Date.now() }
    ].slice(-50));
    setInputValue('');
    setIsProcessing(true);

    try {
      // Process the input with streaming
      for await (const chunk of agent.streamExecution(input)) {
        switch (chunk.type) {
          case 'agent_response':
            addLog(`🤖 ${chunk.content}`, LOG_TYPES.SUCCESS);
            break;
          case 'tool_call':
            addLog(`🔧 Calling: ${chunk.name}(${JSON.stringify(chunk.args)})`, LOG_TYPES.INFO);
            break;
          case 'tool_result':
            addLog(`✅ ${chunk.content}`, LOG_TYPES.SUCCESS);
            break;
        }
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, LOG_TYPES.ERROR);
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, agent, addLog]);

  // Handle key inputs
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });

  // Format log entries
  const formatLogEntry = React.useCallback((log) => {
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
  }, []);

  // Header component
  const header = React.useMemo(() => React.createElement(
    Box,
    { flexDirection: 'row', justifyContent: 'space-between', paddingX: 1, backgroundColor: 'blue' },
    React.createElement(Text, { color: 'white', bold: true }, '🤖 SeNARS Agent REPL'),
    React.createElement(Text, { color: 'white' }, `Model: ${agent.modelName}`)
  ), [agent.modelName]);

  // Log Viewer component
  const logViewer = React.useMemo(() => React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1, padding: 1, maxHeight: '100%' },
    React.createElement(Text, { bold: true, color: 'cyan' }, `Conversation Log (${logs.length})`),
    React.createElement(
      Box,
      { flexDirection: 'column', flexGrow: 1, marginTop: 1, marginBottom: 1 },
      ...logs.slice(-20).map(formatLogEntry) // Show last 20 logs
    )
  ), [logs, formatLogEntry]);

  // Input Box component
  const inputBox = React.useMemo(() => React.createElement(
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
  ), [inputValue, isProcessing, handleSubmit]);

  // Status Bar component
  const statusBar = React.useMemo(() => React.createElement(
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
  ), [isProcessing, isRawModeSupported]);

  return React.createElement(
    Box,
    { flexDirection: 'column', width: '100%', height: '100%' },
    header,
    logViewer,
    inputBox,
    statusBar
  );
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
      const args = parseOllamaArgs();
      console.log('🤖 Starting SeNARS Agent REPL with Ollama...\n');
      console.log(`🔧 Configuration:`, args);

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
      console.error('❌ Error starting Agent REPL:', { error: error.message, stack: error.stack });
      process.exit(1);
    }
  }

  main();
}