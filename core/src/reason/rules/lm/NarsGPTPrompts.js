/**
 * @file NarsGPTPrompts.js
 * Prompt templates for NARS-GPT style reasoning with negated belief formatting.
 */

const formatTruth = (truth) => {
    const f = truth?.f ?? truth?.frequency ?? 0.5;
    const c = truth?.c ?? truth?.confidence ?? 0;
    const isNeg = f < 0.5;
    return {prefix: isNeg ? 'NOT: ' : '', f: isNeg ? 1 - f : f, c};
};

export const NarsGPTPrompts = {
    question: (context, question) => `Answer the question according to what the following memory items, which the answer should be based on, suggest:

${context}

The question: ${question}

Please only answer according to the listed memory items and what can be inferred from them.
If the answer cannot be determined from the memory items, say "I don't know based on my current knowledge."
Include certainty information if relevant (e.g., "I am fairly certain..." or "It is likely that...").`,

    belief: (context, sentence) => `Encode the sentence into memory items. Consider the existing memory items for consistent term usage:

${context}

The sentence: ${sentence}

Provide the encoding in the following format:
- Use inheritance (-->) for "is a" relationships
- Use similarity (<->) for "is similar to" relationships  
- Use implication (==>) for "if...then" relationships
- Include truth values {frequency confidence} where frequency is how often it's true (0-1) and confidence is certainty (0-1)

Example outputs:
(bird --> animal). {0.95 0.9}
(penguin --> bird). {1.0 0.9}
(bird --> flyer). {0.8 0.8}`,

    goal: (context, goal) => `Given the current knowledge and the goal to achieve, suggest actions or sub-goals:

${context}

Goal to achieve: ${goal}

Suggest concrete steps or sub-goals that would help achieve this goal.
Format each as a goal statement ending with !
Consider what is currently known when making suggestions.`,

    questionWithGPTKnowledge: (context, question) => `Answer the question. You may use the following memory items as well as your general knowledge:

${context}

The question: ${question}

Provide your best answer. If using information from the memory items, indicate this.
If using general knowledge not in the memory, note that as well.`,

    formatBuffer: (buffer) => {
        if (!buffer?.length) return '(No relevant memory items found)';
        return buffer.map((item, i) => {
            const task = item.task ?? item;
            const term = task.term?.toString?.() ?? String(task.term ?? task);
            const {prefix, f, c} = formatTruth(task.truth);
            return `${i + 1}. ${prefix}${term}${task.truth ? ` {${f.toFixed(2)} ${c.toFixed(2)}}` : ''}`;
        }).join('\n');
    },

    formatBelief: (termStr, truth) => {
        const {prefix, f, c} = formatTruth(truth);
        return `${prefix}${termStr} {${f.toFixed(2)} ${c.toFixed(2)}}`;
    }
};

export default NarsGPTPrompts;
