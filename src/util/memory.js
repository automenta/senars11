// Collect tasks from all concepts in memory
export const collectTasksFromAllConcepts = (memory, filterFn = null) => {
    return memory.getAllConcepts()
        .flatMap(concept => filterFn ? concept.getAllTasks().filter(filterFn) : concept.getAllTasks());
};
