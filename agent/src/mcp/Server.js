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
                    for (const premise of premises) {
                        await this.nar.input(premise);
                    }
                    if (goal) {
                        await this.nar.input(goal);
                    }

                    // Run a few cycles to process
                    const derivations = await this.nar.runCycles(10);

                    // Format results
                    const conclusions = Array.from(new Set(
                        derivations
                            .flat()
                            .filter(d => d && d.term)
                            .map(d => d.term.toString())
                    ));

                    const resultData = {
                        conclusions: conclusions.length > 0 ? conclusions : ["Processed premises, no immediate conclusions"],
                        derivationSteps: [`Processed ${premises.length} premises`, `Ran 10 inference cycles`]
                    };

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(resultData, null, 2)
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
                    const formatted = (results || []).slice(0, limit).map(task => ({
                        content: task.term ? task.term.toString() : 'unknown',
                        confidence: task.truth ? task.truth.confidence : 0,
                        timestamp: new Date().toISOString()
                    }));

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({ results: formatted, count: formatted.length }, null, 2)
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
                            text: JSON.stringify({
                                result: result.result ?? result,
                                success: result.success !== false,
                                error: result.error
                            }, null, 2)
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
