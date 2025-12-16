/**
 * Embedding Layer Demo — Word/token embeddings with gradient flow
 * Run: node examples/tensor-logic/embedding-demo.mjs
 */
import { T } from '../../core/src/functor/backends/NativeBackend.js';
import { Embedding, Linear, Sequential } from '../../core/src/functor/Module.js';
import { LossFunctor } from '../../core/src/functor/LossFunctor.js';
import { AdamOptimizer } from '../../core/src/functor/Optimizer.js';

console.log('=== Tensor Logic: Embedding Layer ===\n');

// Create embedding table: 10 words, 4-dim embeddings
const embedding = new Embedding(10, 4);
console.log('Embedding table:', embedding.weight.shape, '→ [vocab_size, embedding_dim]');

// Look up word indices
const wordIndices = T.tensor([0, 3, 7, 2]);
console.log('\nWord indices:', wordIndices.toArray());

const embedded = embedding.forward(wordIndices);
console.log('Embedded shape:', embedded.shape, '→ [4 words, 4 dims]');
console.log('First word embedding:', embedded.toArray()[0].map(v => v.toFixed(3)));

// Example: Simple sentiment classifier
console.log('\n--- Sentiment Classifier Training ---');

// Vocabulary: 0=bad, 1=terrible, 2=ok, 3=good, 4=great, 5=amazing
// Positive examples (label=1): [3,4], [4,5], [5,3]
// Negative examples (label=0): [0,1], [1,0], [0,2]
const data = [
    { x: [3, 4], y: 1 },  // "good great" → positive
    { x: [4, 5], y: 1 },  // "great amazing" → positive
    { x: [0, 1], y: 0 },  // "bad terrible" → negative
    { x: [1, 0], y: 0 },  // "terrible bad" → negative
];

// Simple classifier: embed → mean pool → linear → sigmoid
const sentimentEmbed = new Embedding(6, 8);  // 6 words, 8-dim
const classifier = new Linear(8, 1);
const loss_fn = new LossFunctor(T);
const optimizer = new AdamOptimizer(0.1);

const allParams = () => new Map([
    ['embed', sentimentEmbed.weight],
    ['cls.weight', classifier.weight],
    ['cls.bias', classifier.bias]
]);

console.log('Training embedding-based sentiment classifier...');

for (let epoch = 0; epoch < 100; epoch++) {
    let totalLoss = 0;

    for (const { x, y } of data) {
        optimizer.zeroGrad(allParams());

        // Forward: embed words → mean pool → classify
        const indices = T.tensor(x);
        const embeddings = sentimentEmbed.forward(indices);  // [2, 8]
        const pooled = T.mean(embeddings, 0);  // [8] - mean over words
        const logit = classifier.forward(pooled.reshape([1, 8]));  // [1, 1]
        const pred = T.sigmoid(logit);

        const target = T.tensor([[y]]);
        const loss = loss_fn.binaryCrossEntropy(pred, target);
        totalLoss += loss.data[0];

        loss.backward();
        optimizer.step(allParams());
    }

    if (epoch % 25 === 0)
        console.log(`Epoch ${epoch}: loss=${(totalLoss / data.length).toFixed(4)}`);
}

// Test predictions
console.log('\n--- Predictions ---');
for (const { x, y } of data) {
    const embeddings = sentimentEmbed.forward(T.tensor(x));
    const pooled = T.mean(embeddings, 0);
    const pred = T.sigmoid(classifier.forward(pooled.reshape([1, 8]))).data[0];
    console.log(`[${x}] → ${pred.toFixed(3)} (expected: ${y}) ${Math.round(pred) === y ? '✓' : '✗'}`);
}

// Show learned embeddings
console.log('\n--- Learned Word Vectors ---');
const words = ['bad', 'terrible', 'ok', 'good', 'great', 'amazing'];
words.forEach((word, i) => {
    const vec = sentimentEmbed.forward(T.tensor([i])).toArray()[0];
    console.log(`${word.padEnd(10)}: [${vec.slice(0, 4).map(v => v.toFixed(2)).join(', ')}...]`);
});

// Similar words should have similar embeddings
const sim_good_great = T.cosineSimilarity(
    sentimentEmbed.forward(T.tensor([3])),
    sentimentEmbed.forward(T.tensor([4]))
);
const sim_good_bad = T.cosineSimilarity(
    sentimentEmbed.forward(T.tensor([3])),
    sentimentEmbed.forward(T.tensor([0]))
);
console.log(`\nSimilarity(good, great): ${sim_good_great.data[0].toFixed(3)}`);
console.log(`Similarity(good, bad):   ${sim_good_bad.data[0].toFixed(3)}`);

console.log('\n✅ Embedding demo complete!');
