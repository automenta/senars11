export const collectTasksFromAllConcepts = (memory, filterFn = null) =>
    memory.getAllConcepts()
        .flatMap(concept => filterFn ? concept.getAllTasks().filter(filterFn) : concept.getAllTasks());

export const collectConceptsWithCriteria = (memory, criteria = {}) => {
    const {minTaskCount = 0, hasUnresolvedTasks = false, termPattern = null} = criteria;
    
    return memory.getAllConcepts().filter(concept =>
        concept.getAllTasks().length >= minTaskCount &&
        (!hasUnresolvedTasks || concept.hasUnresolvedTasks()) &&
        (!termPattern || new RegExp(termPattern).test(concept.term.toString()))
    );
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
