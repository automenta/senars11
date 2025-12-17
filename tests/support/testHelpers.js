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

export const assertEventuallyTrue = async (predicate, {
    timeout = 5000,
    interval = 100,
    description = 'condition'
} = {}) => {
    const result = await waitForCondition(predicate, timeout, interval);
    if (!result) throw new Error(`Timeout waiting for: ${description}`);
};

export const getTermStrings = ({ concepts = [], beliefs = [], questions = [], goals = [] }) => [
    ...concepts.map(c => c.term.toString()),
    ...beliefs.map(b => b.term.toString()),
    ...questions.map(q => q.term.toString()),
    ...goals.map(g => g.term.toString())
];

export const getTerms = (agent) => getTermStrings({
    concepts: agent.getConcepts(),
    beliefs: agent.getBeliefs(),
    questions: agent.getQuestions(),
    goals: agent.getGoals()
});

export const hasTermMatch = (terms, ...patterns) =>
    terms.some(t => patterns.every(p => t.includes(p)));

export const assertContainsTerm = (terms, ...patterns) => {
    const match = hasTermMatch(terms, ...patterns);
    if (!match) {
        throw new Error(
            `No term matching patterns: ${patterns.join(', ')}\nActual terms: ${terms.slice(0, 5).join(', ')}${terms.length > 5 ? '...' : ''}`
        );
    }
};

export const matchesTerm = (...patterns) => (terms) => hasTermMatch(terms, ...patterns);

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

export const createTestAgent = async (overrides = {}) => {
    const { App } = await import('../../agent/src/app/App.js');
    const app = new App(createMockConfig(overrides));
    const agent = await app.start({ startAgent: true });
    await wait(100);
    return { app, agent, cleanup: async () => app.shutdown() };
};

export const withTestAgent = (fn) => async () => {
    const { app, agent, cleanup } = await createTestAgent();
    try {
        await fn(agent);
    } finally {
        await cleanup();
    }
};
