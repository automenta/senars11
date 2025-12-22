import {createTestAgent} from './factories.js';
import {assertEventuallyTrue, getTerms, hasTermMatch} from './testHelpers.js';

export const DEFAULT_LM_RESPONSES = {
    '"Dogs are animals"': '<dog --> animal>.',
    '"Birds can fly"': '<bird --> [fly]>.',
    '"Canaries are birds"': '<canary --> bird>.',
    '"bird"': '<bird --> animal>.',
    'Translate the following formal logic': 'In simple terms, if you exercise, you will be healthy.',
    'clear, simple, natural language explanation': 'Birds are a type of animal.',
    'contradiction or conflict': 'Revised belief: Most birds can fly, but some cannot.',
    'revise this belief': '<bird --> animal>. %0.95;0.9%',
    'contains a contradiction': 'The resolved belief is: exercise usually improves health.',
    'generalizable procedure or schema': 'IF hungry THEN find_food; IF found_food THEN eat',
    'sequence of conditional steps': 'Step 1: Identify problem. Step 2: Research solutions. Step 3: Apply best solution.',
    'improve the reasoning': 'Focus on gathering more evidence before concluding.',
    'calibrate the confidence': 'Confidence should be reduced to 0.7 due to limited evidence.',
    'clarify the following': 'Do you mean bird as in the animal, or bird as slang term?',
    'temporal or causal': 'First exercise, then improved health follows as a result.',
    '"First exercise then health"': '(exercise ==> health).',
    '"conflict: birds fly but penguins dont"': '<bird --> [can_fly]>. %0.7;0.8%',
    'Concept property elaboration': '<bird --> [fly]>.'
};

export const createLMNALTestAgent = async (mockResponses = {}, config = {}) => {
    const {app, agent, cleanup} = await createTestAgent(config);

    // Only mock if LM is enabled
    if (!config.lm || config.lm.enabled !== false) {
        const jestModule = await import('@jest/globals');
        jestModule.jest.spyOn(agent.lm, 'generateText').mockImplementation(async (prompt) => {
            const allResponses = {...DEFAULT_LM_RESPONSES, ...mockResponses};
            for (const [pattern, response] of Object.entries(allResponses)) {
                if (prompt.includes(pattern)) return response;
            }
            return '';
        });
    }

    return {app, agent, cleanup};
};

export const assertLMTranslation = async (agent, input, expectedPatterns) => {
    await agent.input(input);
    await assertEventuallyTrue(
        () => hasTermMatch(getTerms(agent), ...expectedPatterns),
        {description: `LM translation of "${input}" → [${expectedPatterns.join(', ')}]`}
    );
};

export const assertNALDerivation = async (agent, premises, conclusionPatterns) => {
    for (const premise of premises) await agent.input(premise);
    await assertEventuallyTrue(
        () => hasTermMatch(getTerms(agent), ...conclusionPatterns),
        {description: `NAL derives [${conclusionPatterns.join(' ')}] from premises`}
    );
};
