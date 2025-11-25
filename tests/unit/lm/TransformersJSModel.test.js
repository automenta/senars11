
import { TransformersJSModel } from '../../../src/lm/TransformersJSModel.js';
import { HumanMessage, ToolMessage, AIMessage } from '@langchain/core/messages';

describe('TransformersJSModel', () => {
    it('should format messages with tool definitions', async () => {
        const model = new TransformersJSModel({});
        const tools = [{
            name: 'calc',
            description: 'Calculate stuff',
            parameters: { type: 'object', properties: { x: { type: 'number' } } }
        }];

        model.bindTools(tools);

        const messages = [new HumanMessage('Add 1 + 1')];
        const formatted = model._formatMessages(messages);

        expect(formatted).toContain('You are a helpful assistant');
        expect(formatted).toContain('calc: Calculate stuff');
        expect(formatted).toContain('Action: <tool_name>');
        expect(formatted).toContain('User: Add 1 + 1');
    });

    it('should parse tool calls from output', async () => {
        const model = new TransformersJSModel({});
        const output = `Sure.
Action: calc
Action Input: {"x": 2}
`;
        const parsed = model._parseOutput(output);
        expect(parsed.tool_calls).toHaveLength(1);
        expect(parsed.tool_calls[0].name).toBe('calc');
        expect(parsed.tool_calls[0].args).toEqual({x: 2});
        expect(parsed.content).toBe('Sure.');
    });
});
