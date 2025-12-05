import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * MCP Server for exposing SeNARS services as MCP tools using the official SDK
 */
export class Server {
    constructor(options = {}) {
        this.options = options;
        this.nar = options.nar || null;

        // Initialize McpServer
        this.server = new McpServer({
            name: "SeNARS-MCP-Server",
            version: "1.0.0"
        });

        this.registerTools();
    }

    registerTools() {
        this.server.tool(
            "reason",
            {
                premises: z.array(z.string()).describe("A list of premises in Narsese or natural language"),
                goal: z.string().optional().describe("A goal to achieve or question to answer")
            },
            async ({ premises, goal }) => {
                if (!this.nar) {
                    return { content: [{ type: "text", text: "NAR instance not available." }] };
                }

                try {
                    const inputTasks = [];
                    for (const premise of premises) {
                        await this.nar.input(premise);
                    }
                    if (goal) {
                        await this.nar.input(goal);
                    }

                    // Run a few cycles to process
                    const derivations = await this.nar.runCycles(10);

                    // Deduplicate and format results
                    const uniqueDerivations = new Map();

                    derivations.flat().forEach(task => {
                        if (task && task.term) {
                            const termStr = task.term.toString();
                            // Keep the one with highest confidence
                            if (!uniqueDerivations.has(termStr) || (task.truth && uniqueDerivations.get(termStr).truth && task.truth.confidence > uniqueDerivations.get(termStr).truth.confidence)) {
                                uniqueDerivations.set(termStr, task);
                            }
                        }
                    });

                    // Generate Rich Report
                    const reportLines = ["### SeNARS Reasoning Trace"];
                    reportLines.push(`**Input**: ${premises.length} premises` + (goal ? `, Goal: \`${goal}\`` : ""));
                    reportLines.push(`**Cycles Executed**: 10`);
                    reportLines.push("");

                    if (uniqueDerivations.size > 0) {
                        reportLines.push("**Derived Conclusions**:");
                        let idx = 1;
                        for (const task of uniqueDerivations.values()) {
                            const termStr = task.term.toString();
                            const truthStr = task.truth
                                ? `_{f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)}}_`
                                : "";
                            const typeStr = task.punctuation === '!' ? '[GOAL]' : task.punctuation === '?' ? '[QUESTION]' : '[BELIEF]';

                            reportLines.push(`${idx}. **${typeStr}** \`${termStr}\` ${truthStr}`);
                            idx++;
                        }
                    } else {
                        reportLines.push("_No new conclusions derived in this window._");
                    }

                    const report = reportLines.join("\n");

                    return {
                        content: [{
                            type: "text",
                            text: report
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{ type: "text", text: `Error during reasoning: ${error.message}` }],
                        isError: true
                    };
                }
            }
        );

        this.server.tool(
            "memory-query",
            {
                query: z.string().describe("The concept to query from memory"),
                limit: z.number().default(10).describe("Max number of results")
            },
            async ({ query, limit }) => {
                if (!this.nar) {
                     return { content: [{ type: "text", text: "NAR instance not available." }] };
                }

                try {
                    const results = this.nar.query(query);
                    const sliced = (results || []).slice(0, limit);

                    const reportLines = [`### Memory Query: \`${query}\``];
                    reportLines.push(`Found ${sliced.length} results (limit: ${limit})`);
                    reportLines.push("");

                    sliced.forEach((task, i) => {
                        const truthStr = task.truth
                            ? `_{f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)}}_`
                            : "";
                        const termStr = task.term ? task.term.toString() : 'unknown';
                        reportLines.push(`${i+1}. \`${termStr}\` ${truthStr}`);
                    });

                    return {
                        content: [{
                            type: "text",
                            text: reportLines.join("\n")
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{ type: "text", text: `Error during memory query: ${error.message}` }],
                        isError: true
                    };
                }
            }
        );

        this.server.tool(
            "execute-tool",
            {
                toolName: z.string().describe("Name of the tool to execute"),
                parameters: z.record(z.any()).describe("Parameters for the tool")
            },
            async ({ toolName, parameters }) => {
                 if (!this.nar) {
                     return { content: [{ type: "text", text: "NAR instance not available." }] };
                }

                try {
                    const result = await this.nar.executeTool(toolName, parameters);
                    return {
                        content: [{
                            type: "text",
                            text: `### Tool Execution: ${toolName}\n` +
                                  `**Success**: ${result.success !== false}\n` +
                                  `**Result**: \n\`\`\`json\n${JSON.stringify(result.result ?? result, null, 2)}\n\`\`\``
                        }]
                    };
                } catch (error) {
                     return {
                        content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
                        isError: true
                     };
                }
            }
        );
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        // We log to stderr so we don't interfere with stdout (which is used for JSON-RPC)
        console.error("SeNARS MCP Server started on Stdio");
    }

    async stop() {
        await this.server.close();
    }
}
