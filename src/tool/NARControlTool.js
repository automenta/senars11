/**
 * @file src/tool/NARControlTool.js
 * @description Tool that allows LLM to control and interact with the NAR system
 */

import {BaseTool} from './BaseTool.js';

export class NARControlTool extends BaseTool {
    constructor(nar = null) {
        super();
        this.nar = nar;
        this.name = 'nar_control';
        this.description = 'Control and interact with the NARS reasoning system';
        this.schema = {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['add_belief', 'add_goal', 'query', 'step', 'get_beliefs', 'get_goals'],
                    description: 'The action to perform on the NAR system. Choose add_belief to add a belief statement in Narsese format, add_goal to add a goal statement, query to query the system, step to execute a single reasoning cycle, get_beliefs to retrieve current beliefs, or get_goals to retrieve current goals.'
                },
                content: {
                    type: 'string',
                    description: 'The Narsese content for the action (e.g., "(a --> b)." for beliefs, "(a --> b)! " for goals). Required for add_belief, add_goal, and query actions.'
                }
            },
            required: ['action'],
            additionalProperties: false
        };
    }

    async execute(args) {
        if (!this.nar) {
            return {error: 'NAR system not initialized'};
        }

        const {action, content} = args;

        try {
            switch (action) {
                case 'add_belief':
                    if (!content) {
                        return {error: 'Content required for adding belief'};
                    }
                    await this._addBelief(content);
                    return {success: true, message: `Belief added: ${content}`};

                case 'add_goal':
                    if (!content) {
                        return {error: 'Content required for adding goal'};
                    }
                    await this._addGoal(content);
                    return {success: true, message: `Goal added: ${content}`};

                case 'query':
                    if (!content) {
                        return {error: 'Content required for query'};
                    }
                    const queryResult = await this._query(content);
                    return {success: true, result: queryResult};

                case 'step':
                    await this._step();
                    return {success: true, message: 'Single reasoning step executed'};

                case 'get_beliefs':
                    const beliefs = await this._getBeliefs();
                    return {success: true, beliefs};

                case 'get_goals':
                    const goals = await this._getGoals();
                    return {success: true, goals};

                default:
                    return {error: `Unknown action: ${action}`};
            }
        } catch (error) {
            return {error: `Tool execution failed: ${error.message}`};
        }
    }

    async _addBelief(content) {
        // Execute Narsese statement to add a belief using the full NAR input pipeline
        try {
            if (this.nar.input) {
                const result = await this.nar.input(content);

                // Run a reasoning step to ensure processing
                if (this.nar.step) {
                    await this.nar.step();
                } else if (this.nar.cycle) {
                    await this.nar.cycle(1);
                }

                return result;
            } else if (this.nar.addInput) {
                const result = await this.nar.addInput(content);

                // Run a cycle to ensure the belief gets properly stored in memory
                if (this.nar.step) {
                    await this.nar.step();
                } else if (this.nar.cycle) {
                    await this.nar.cycle(1);
                }

                return result;
            } else if (this.nar.execute) {
                const result = await this.nar.execute(content);

                // Run a cycle to ensure the belief gets properly stored in memory
                if (this.nar.step) {
                    await this.nar.step();
                } else if (this.nar.cycle) {
                    await this.nar.cycle(1);
                }

                return result;
            }
        } catch (error) {
            console.error(`Error adding belief "${content}":`, error);
            throw error;
        }
    }

    async _addGoal(content) {
        // Execute Narsese statement to add a goal (typically ends with !)
        try {
            if (this.nar.input) {
                const result = await this.nar.input(content);

                // Run a reasoning step to ensure processing
                if (this.nar.step) {
                    await this.nar.step();
                } else if (this.nar.cycle) {
                    await this.nar.cycle(1);
                }

                return result;
            } else if (this.nar.addInput) {
                const result = await this.nar.addInput(content);

                // Run a cycle to ensure the goal gets properly stored in memory
                if (this.nar.step) {
                    await this.nar.step();
                } else if (this.nar.cycle) {
                    await this.nar.cycle(1);
                }

                return result;
            } else if (this.nar.execute) {
                const result = await this.nar.execute(content);

                // Run a cycle to ensure the goal gets properly stored in memory
                if (this.nar.step) {
                    await this.nar.step();
                } else if (this.nar.cycle) {
                    await this.nar.cycle(1);
                }

                return result;
            }
        } catch (error) {
            console.error(`Error adding goal "${content}":`, error);
            throw error;
        }
    }

    async _query(content) {
        // Execute a query to the NAR system by adding the query as a question task
        try {
            // Input the query content as a question to the NAR
            if (this.nar.addInput) {
                // Ensure the content ends with '?' for questions
                let questionContent = content.trim();
                if (!questionContent.endsWith('?')) {
                    // Only add '?' if no other punctuation is present
                    if (!['.', '!', '?'].includes(questionContent.slice(-1))) {
                        questionContent += '?';
                    }
                }
                await this.nar.addInput(questionContent);

                // Run a step to process the query
                if (this.nar.step) {
                    await this.nar.step();
                } else if (this.nar.cycle) {
                    await this.nar.cycle(1);
                }

                // For now, return a success message since actual query results might need different handling
                return `Query "${questionContent}" processed`;
            } else if (this.nar.execute) {
                await this.nar.execute(content);
                return `Query "${content}" executed`;
            } else {
                // Fallback: just return all beliefs if we can't process the query properly
                const beliefs = this.nar.getBeliefs ? this.nar.getBeliefs() : [];
                return beliefs.length > 0 ? beliefs : 'No results found for the query';
            }
        } catch (error) {
            console.error(`Error querying "${content}":`, error);
            return 'Error executing query';
        }
    }

    async _step() {
        // Execute a single reasoning step
        try {
            if (this.nar.cycle) {
                await this.nar.cycle(1); // Execute 1 cycle
            } else if (this.nar.step) {
                await this.nar.step();
            }
        } catch (error) {
            console.error('Error executing reasoning step:', error);
            throw error;
        }
    }

    async _getBeliefs() {
        // Get current beliefs from the NAR system
        try {
            if (this.nar.getBeliefs) {
                return this.nar.getBeliefs();
            }
            return [];
        } catch (error) {
            console.error('Error getting beliefs:', error);
            return [];
        }
    }

    async _getGoals() {
        // Get current goals from the NAR system
        try {
            if (this.nar.getGoals) {
                return this.nar.getGoals();
            }
            return [];
        } catch (error) {
            console.error('Error getting goals:', error);
            return [];
        }
    }
}