/**
 * @file mockEmbeddingsData.js
 * @description Pre-generated embeddings and LM responses for multi-step reasoning tests
 */

/**
 * Generate a semantic embedding cluster where related terms have similar vectors
 * @param {number} baseValue - Base value for the cluster
 * @param {number} dim - Embedding dimension
 */
function generateClusterEmbedding(baseValue, dim = 64) {
    const embedding = new Array(dim);
    for (let i = 0; i < dim; i++) {
        embedding[i] = Math.sin(baseValue + i * 0.05) * 0.4 + 0.5 + Math.random() * 0.1;
    }
    return embedding;
}

// Semantic clusters: related concepts share similar base values
const CLUSTERS = {
    ANIMALS: 100,
    BIRDS: 105,
    WEATHER: 200,
    EMOTIONS: 250,
    GOALS: 300,
    PROBLEMS: 400
};

/**
 * Pre-computed embeddings for test terms
 * Related concepts have similar vectors for semantic similarity testing
 */
export const embeddings = {
    // Animal hierarchy
    'animal': generateClusterEmbedding(CLUSTERS.ANIMALS),
    'bird': generateClusterEmbedding(CLUSTERS.BIRDS),
    'canary': generateClusterEmbedding(CLUSTERS.BIRDS + 1),
    'robin': generateClusterEmbedding(CLUSTERS.BIRDS + 2),
    'sparrow': generateClusterEmbedding(CLUSTERS.BIRDS + 3),
    'fly': generateClusterEmbedding(CLUSTERS.BIRDS + 0.5),
    'feathers': generateClusterEmbedding(CLUSTERS.BIRDS + 0.3),
    'yellow': generateClusterEmbedding(CLUSTERS.BIRDS + 1.2),

    // Weather -> Emotion chain
    'sunny_day': generateClusterEmbedding(CLUSTERS.WEATHER),
    'rain': generateClusterEmbedding(CLUSTERS.WEATHER + 5),
    'umbrella': generateClusterEmbedding(CLUSTERS.WEATHER + 6),
    'good_mood': generateClusterEmbedding(CLUSTERS.EMOTIONS),
    'happy': generateClusterEmbedding(CLUSTERS.EMOTIONS + 1),

    // Goals
    'write_book': generateClusterEmbedding(CLUSTERS.GOALS),
    'research_topic': generateClusterEmbedding(CLUSTERS.GOALS + 1),
    'draft_content': generateClusterEmbedding(CLUSTERS.GOALS + 2),
    'publish': generateClusterEmbedding(CLUSTERS.GOALS + 3),

    // Problem solving
    'solve_problem': generateClusterEmbedding(CLUSTERS.PROBLEMS),
    'analogy': generateClusterEmbedding(CLUSTERS.PROBLEMS + 1),
    'puzzle': generateClusterEmbedding(CLUSTERS.PROBLEMS + 2),

    // Activity/Results for hypothesis generation
    'activity': generateClusterEmbedding(350),
    'results': generateClusterEmbedding(355),
    'exercise': generateClusterEmbedding(352),
    'health': generateClusterEmbedding(358)
};

/**
 * Mock LM responses keyed by prompt patterns
 * Each pattern maps to an expected response for that rule type
 */
export const responses = {
    // Concept Elaboration Rule patterns
    '"bird"': '<bird --> animal>.',
    '"canary"': '<canary --> [yellow]>.',
    '"robin"': '<robin --> [red_breast]>.',
    '"sunny_day"': '<sunny_day --> [warm]>.',
    '"rain"': '<rain --> [wet]>.',
    '"exercise"': '<exercise --> activity>.',

    // Hypothesis Generation patterns
    'plausible and testable hypothesis': 'Hypothesis: (exercise ==> health)',
    'Activity correlates with results': 'Hypothesis: Increased activity leads to better results.',

    // Goal Decomposition patterns
    'Decompose the following goal': 'Sub-goal: research_topic\nSub-goal: draft_content\nSub-goal: publish',
    'write_book': 'Sub-goal: research_topic\nSub-goal: draft_content',

    // Variable Grounding patterns
    'concrete values for the variable': 'robin\ncanary\nsparrow',
    'plausible, concrete values': 'robin\ncanary',

    // Analogical Reasoning patterns
    'Think of a similar': 'Analogy: solving a puzzle. Solution: break into pieces, solve each, combine.',
    'well-understood problem': 'Analogy: building a house. Start with foundation, then walls, then roof.',

    // Narsese Translation patterns
    '"Dogs are animals"': '<dog --> animal>.',
    '"Birds can fly"': '<bird --> [fly]>.',
    '"Canaries are birds"': '<canary --> bird>.',
    '"Rain makes things wet"': '(rain ==> wet).',
    '"Exercise improves health"': '(exercise ==> health).',

    // Schema Induction patterns
    'common pattern': '($x --> animal) ==> ($x --> [alive])',

    // Belief Revision patterns  
    'revise this belief': '<bird --> animal>. %0.95;0.9%',

    // Explanation Generation
    'explain why': 'Birds evolved from dinosaurs and inherited flight capability.'
};

/**
 * Complete mock data export for use in tests
 */
export const mockData = {
    embeddings,
    responses
};

export default mockData;
