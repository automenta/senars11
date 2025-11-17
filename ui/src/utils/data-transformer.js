/**
 * DataTransformer - Converts and normalizes data structures for consistent handling
 */
class DataTransformer {
    // Transform NARS event data for UI consumption
    static transformEventData(eventType, rawData) {
        switch (eventType) {
            case 'concept.created':
                return this._transformConceptData(rawData);
            case 'task.added':
            case 'task.processed':
            case 'task.input':
                return this._transformTaskData(rawData);
            case 'belief.added':
                return this._transformBeliefData(rawData);
            case 'question.answered':
                return this._transformQuestionData(rawData);
            case 'reasoning.derivation':
                return this._transformDerivationData(rawData);
            case 'memorySnapshot':
                return this._transformMemorySnapshot(rawData);
            default:
                return rawData;
        }
    }

    static _transformConceptData(data) {
        return {
            id: data.term?.toString() || `concept_${Date.now()}`,
            term: data.term,
            label: data.term?.toString() || 'Unknown Concept',
            type: 'concept',
            creationTime: Date.now(),
            ...data
        };
    }

    static _transformTaskData(data) {
        return {
            id: data.task?.id || data.id || `task_${Date.now()}`,
            task: data.task,
            label: data.task?.toString?.() || data.toString?.() || 'Unknown Task',
            type: 'task',
            timestamp: Date.now(),
            ...data
        };
    }

    static _transformBeliefData(data) {
        return {
            id: data.task?.id || data.id || `belief_${Date.now()}`,
            task: data.task,
            label: data.task?.toString?.() || data.toString?.() || 'Unknown Belief',
            type: 'belief',
            timestamp: Date.now(),
            ...data
        };
    }

    static _transformQuestionData(data) {
        return {
            id: data.task?.id || data.id || `question_${Date.now()}`,
            task: data.task,
            label: data.task?.toString?.() || data.toString?.() || 'Unknown Question',
            type: 'question',
            timestamp: Date.now(),
            ...data
        };
    }

    static _transformDerivationData(data) {
        return {
            id: data.id || `derivation_${Date.now()}`,
            label: data.toString?.() || 'Unknown Derivation',
            type: 'derivation',
            timestamp: Date.now(),
            ...data
        };
    }

    static _transformMemorySnapshot(data) {
        const concepts = Array.isArray(data.concepts) 
            ? data.concepts.map(c => this._transformConceptData(c))
            : [];

        return {
            concepts,
            timestamp: Date.now(),
            nodeCount: concepts.length
        };
    }

    // Normalize different data formats from NARS events
    static normalizeNodeData(type, data) {
        const normalized = { ...data };
        normalized.type = type;
        normalized.id = normalized.id || this._generateId(type, data);
        normalized.label = normalized.label || this._generateLabel(type, data);
        return normalized;
    }

    static _generateId(type, data) {
        if (data?.id) return data.id;
        if (data?.task?.id) return data.task.id;
        if (data?.term) return data.term.toString();
        return `${type}_${Date.now()}`;
    }

    static _generateLabel(type, data) {
        if (data?.label) return data.label;
        if (data?.task?.toString) return data.task.toString();
        if (data?.term?.toString) return data.term.toString();
        if (data?.toString) return data.toString();
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    // Convert flat data to hierarchical structure if needed
    static toHierarchical(data) {
        if (Array.isArray(data)) {
            return {
                nodes: data.filter(item => !item.source && !item.target),
                edges: data.filter(item => item.source && item.target)
            };
        }
        return data;
    }

    // Flatten nested data structures for easier processing
    static flatten(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }

        const flattened = {};
        this._flattenRecursive(data, flattened, '');
        return flattened;
    }

    static _flattenRecursive(obj, target, prefix) {
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this._flattenRecursive(value, target, newKey);
            } else {
                target[newKey] = value;
            }
        }
    }
}

export default DataTransformer;