export class ToolDiscovery {
    static discover(toolClasses) {
        const discovered = [];

        for (const toolClass of toolClasses) {
            try {
                const toolMetadata = this._analyze(toolClass);

                if (toolMetadata) {
                    discovered.push(toolMetadata);
                }
            } catch (error) {
                // Ignore errors
            }
        }

        return discovered;
    }

    static _analyze(toolClass) {
        try {
            // Check if it's a class (function) or object
            let toolInstance;

            if (typeof toolClass === 'function') {
                // Try to instantiate it to test it
                toolInstance = new toolClass();
            } else {
                toolInstance = toolClass;
            }

            // Check required methods
            const hasRequiredMethods = [
                'execute',
                'getDescription'
            ].every(method => typeof toolInstance[method] === 'function');

            if (!hasRequiredMethods) {
                return null;
            }

            // Generate metadata
            const className = toolClass.name ?? 'AnonymousTool';
            const toolId = className
                .replace(/tool$/i, '')
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .toLowerCase();

            return this._createToolMetadataObject(toolClass, toolInstance, className, toolId);
        } catch (error) {
            return null;
        }
    }

    static _createToolMetadataObject(toolClass, toolInstance, className, toolId) {
        return {
            id: toolId,
            name: className,
            class: toolClass,
            description: toolInstance.getDescription(),
            category: toolInstance.getCategory?.() ?? 'general',
            parameters: toolInstance.getParameterSchema?.() ?? {type: 'object', properties: {}},
            capabilities: toolInstance.getCapabilities?.() ?? [],
            parameterSchema: toolInstance.getParameterSchema ? toolInstance.getParameterSchema() : null,
            supportsStreaming: typeof toolInstance.stream === 'function',
            supportsValidation: typeof toolInstance.validate === 'function'
        };
    }

    static isToolLike(obj) {
        // Check if it has the required methods
        const hasExecute = typeof obj.prototype?.execute === 'function' ||
            typeof obj.execute === 'function';
        const hasGetDescription = typeof obj.prototype?.getDescription === 'function' ||
            typeof obj.getDescription === 'function';

        return hasExecute && hasGetDescription;
    }
}
