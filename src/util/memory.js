export const collectTasksFromAllConcepts = (memory, filterFn = null) => 
    memory.getAllConcepts()
        .flatMap(concept => filterFn ? concept.getAllTasks().filter(filterFn) : concept.getAllTasks());

export const collectConceptsWithCriteria = (memory, criteria = {}) => {
    const {minTaskCount = 0, hasUnresolvedTasks = false, termPattern = null} = criteria;
    
    return memory.getAllConcepts().filter(concept => {
        // Filter by minimum task count
        if (concept.getAllTasks().length < minTaskCount) return false;
        
        // Filter by unresolved tasks
        if (hasUnresolvedTasks && !concept.hasUnresolvedTasks()) return false;
        
        // Filter by term pattern
        if (termPattern && !new RegExp(termPattern).test(concept.term.toString())) return false;
        
        return true;
    });
};

export const getMemoryStats = memory => {
    const concepts = memory.getAllConcepts();
    const tasks = concepts.flatMap(concept => concept.getAllTasks());
    
    return {
        conceptCount: concepts.length,
        taskCount: tasks.length,
        beliefCount: tasks.filter(t => t.type === 'BELIEF').length,
        goalCount: tasks.filter(t => t.type === 'GOAL').length,
        questionCount: tasks.filter(t => t.type === 'QUESTION').length,
        averageTasksPerConcept: concepts.length > 0 ? tasks.length / concepts.length : 0
    };
};
