import {ChatOllama} from "@langchain/ollama";
import {TransformersJSModel} from './TransformersJSModel.js';

function bindTools(agent, lmProvider) {
    if (!agent?.tools?.registry) {
        lmProvider.tools = [];
        return;
    }

    const registeredTools = agent.tools.registry.getDiscoveredTools() || [];
    const tools = registeredTools.map(tool => ({
        name: tool.id,
        description: tool.description,
        schema: tool.parameters ?? tool.schema,
        invoke: async (args) => {
            const result = await agent.tools.executeTool(tool.id, args);
            if (result && typeof result.result !== 'undefined') {
                return typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
            }
            return JSON.stringify(result);
        }
    }));

    lmProvider.tools = tools;

    if (typeof lmProvider.bindTools === 'function') {
        lmProvider.bindTools(tools);
    }
}

export class LMProviderBuilder {
    static create(agent, lmConfig) {
        const providerName = lmConfig.provider ?? 'ollama';
        let lmProvider = null;

        if (providerName === 'ollama') {
            lmProvider = new ChatOllama({
                model: lmConfig.modelName,
                baseUrl: lmConfig.baseUrl,
                temperature: lmConfig.temperature,
            });
            lmProvider.name = 'ollama';
        } else if (providerName === 'transformers') {
            lmProvider = new TransformersJSModel({
                modelName: lmConfig.modelName,
                temperature: lmConfig.temperature,
            });
            lmProvider.name = 'transformers';
        }

        if (lmProvider) {
            bindTools(agent, lmProvider);
        }

        return lmProvider;
    }
}
