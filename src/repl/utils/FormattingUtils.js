/**
 * Utility class for formatting NARS objects for display
 */
export class FormattingUtils {
    /**
     * Format a task for display
     * @param {Object} task - The task to format
     * @returns {string} Formatted task string
     */
    static formatTask(task) {
        if (!task) return 'undefined task';

        const sentence = task.sentence || task;
        const term = sentence.term ? sentence.term.toString() : sentence.toString();
        const punctuation = sentence.punctuation || '.';

        let truth = '';
        if (sentence.truth) {
            const f = (sentence.truth.frequency ?? 0).toFixed(2);
            const c = (sentence.truth.confidence ?? 0).toFixed(2);
            truth = ` %${f};${c}%`;
        }

        return `${term}${punctuation}${truth}`;
    }

    /**
     * Format a concept for display
     * @param {Object} concept - The concept to format
     * @returns {string} Formatted concept string
     */
    static formatConcept(concept) {
        if (!concept) return 'undefined concept';
        return concept.term ? concept.term.toString() : concept.toString();
    }
}
