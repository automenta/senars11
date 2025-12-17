export const wait = (ms) => new Promise(r => setTimeout(r, ms));

export const waitForCondition = async (predicate, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            if (await predicate()) return true;
        } catch { }
        await wait(interval);
    }
    return false;
};

export const getTermStrings = ({ concepts = [], beliefs = [], questions = [], goals = [] }) => [
    ...concepts.map(c => c.term.toString()),
    ...beliefs.map(b => b.term.toString()),
    ...questions.map(q => q.term.toString()),
    ...goals.map(g => g.term.toString())
];

export const hasTermMatch = (terms, ...patterns) =>
    terms.some(t => patterns.every(p => t.includes(p)));

export const inputAll = async (agent, inputs) =>
    Promise.all(inputs.map(i => agent.input(i)));

export const mockLM = (jest, agent, responses) => {
    jest.spyOn(agent.lm, 'generateText').mockImplementation(async (prompt) => {
        for (const [pattern, response] of Object.entries(responses)) {
            if (prompt.includes(pattern)) return response;
        }
        return '';
    });
};

export const createMockConfig = (overrides = {}) => ({
    lm: { provider: 'transformers', modelName: 'mock-model', enabled: true },
    subsystems: { lm: true },
    ...overrides
});
