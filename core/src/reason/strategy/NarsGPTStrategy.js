/**
 * @file NarsGPTStrategy.js
 * @description NARS-GPT style premise formation strategy.
 *
 * Emulates NARS-GPT's attention buffer and term deduplication mechanics:
 * - Embedding-based relevance scoring for memory retrieval
 * - Recency-weighted sampling
 * - Term deduplication via embedding similarity
 * - Grounding verification for goals
 * - Eternalization of temporal beliefs
 *
 * SeNARS Enhancements beyond original NARS-GPT:
 * - EventBus integration for observability
 * - Multi-strategy composition support
 * - NAL truth revision for LM outputs
 * - Configurable scoring weights
 */

import { PremiseFormationStrategy } from './PremiseFormationStrategy.js';

export class NarsGPTStrategy extends PremiseFormationStrategy {
  /**
   * @param {object} config
   * @param {EmbeddingLayer} config.embeddingLayer - Embedding layer for similarity
   * @param {EventBus} config.eventBus - Optional EventBus for observability
   * @param {number} config.relevantViewSize - Max relevant items (default: 30)
   * @param {number} config.recentViewSize - Max recent items (default: 10)
   * @param {number} config.atomCreationThreshold - Similarity threshold for new atoms (0.95)
   * @param {number} config.eternalizationDistance - Steps before eternalization (3)
   * @param {boolean} config.perspectiveSwapEnabled - Enable I/You exchange (true)
   * @param {object} config.weights - Scoring weights {relevance, recency}
   */
  constructor(config = {}) {
    super({ priority: config.priority ?? 0.9, ...config });
    this._name = 'NarsGPT';

    this.embeddingLayer = config.embeddingLayer ?? null;
    this.eventBus = config.eventBus ?? null;
    this.relevantViewSize = config.relevantViewSize ?? 30;
    this.recentViewSize = config.recentViewSize ?? 10;
    this.atomCreationThreshold = config.atomCreationThreshold ?? 0.95;
    this.eternalizationDistance = config.eternalizationDistance ?? 3;
    this.perspectiveSwapEnabled = config.perspectiveSwapEnabled ?? true;

    // SeNARS enhancement: configurable scoring weights
    this.weights = {
      relevance: config.weights?.relevance ?? 0.7,
      recency: config.weights?.recency ?? 0.3
    };

    // Grounding registry: sentences that have been grounded
    this.groundings = new Map(); // sentence -> embedding
    this.atoms = new Map(); // term string -> { embedding, type }

    // SeNARS enhancement: track strategy metrics
    this._metrics = {
      attentionBufferBuilds: 0,
      atomizations: 0,
      groundingChecks: 0,
      perspectiveSwaps: 0
    };
  }

  get name() {
    return this._name;
  }

  get metrics() {
    return { ...this._metrics, ...this._stats };
  }

  /**
   * Generate candidates using NARS-GPT's attention buffer approach.
   * Combines relevance (embedding similarity) with recency.
   */
  async* generateCandidates(primaryTask, context) {
    if (!context.memory) return;

    const memory = context.memory;
    const termString = primaryTask.term?.toString?.() ?? String(primaryTask.term);

    // Build attention buffer: relevant + recent items
    const attentionBuffer = await this.buildAttentionBuffer(
      termString, memory, context.currentTime ?? Date.now()
    );

    // SeNARS enhancement: emit event for observability
    this._emit('narsgpt:candidates', {
      query: termString,
      bufferSize: attentionBuffer.length
    });

    for (const item of attentionBuffer) {
      this._recordCandidate();
      yield {
        term: item.task.term,
        type: 'narsgpt-attention',
        priority: item.score,
        sourceTask: item.task,
        metadata: { relevance: item.relevance, recency: item.recency }
      };
    }
  }

  /**
   * Build the NARS-GPT attention buffer: merge relevant + recent items.
   */
  async buildAttentionBuffer(queryText, memory, currentTime) {
    this._metrics.attentionBufferBuilds++;

    if (!memory) return [];

    const relevant = await this._getRelevantItems(queryText, memory);
    const recent = this._getRecentItems(memory, currentTime);

    // Merge and deduplicate
    const seen = new Set();
    const merged = [];

    for (const item of relevant) {
      const key = item.task.term?.toString?.() ?? String(item.task);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    for (const item of recent) {
      const key = item.task.term?.toString?.() ?? String(item.task);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    // Sort by combined score
    return merged.sort((a, b) => b.score - a.score);
  }

  /**
   * Get items relevant to query via embedding similarity.
   */
  async _getRelevantItems(queryText, memory) {
    if (!this.embeddingLayer) return [];

    const results = [];

    try {
      const queryEmbedding = await this.embeddingLayer.getEmbedding(queryText);
      const concepts = memory.concepts ?? memory._concepts;
      if (!concepts) return [];

      for (const [, concept] of concepts) {
        const beliefs = concept.beliefs ?? [];
        for (const task of beliefs) {
          const taskText = task.term?.toString?.() ?? String(task.term);
          const taskEmbedding = await this.embeddingLayer.getEmbedding(taskText);
          const relevance = this.embeddingLayer.calculateSimilarity(queryEmbedding, taskEmbedding);

          if (relevance > 0.3) {
            results.push({
              task,
              relevance,
              recency: 0,
              score: relevance * this.weights.relevance
            });
          }
        }

        if (results.length >= this.relevantViewSize) break;
      }
    } catch (e) {
      // Graceful degradation if embeddings fail
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, this.relevantViewSize);
  }

  /**
   * Get recent items by lastUsed timestamp.
   */
  _getRecentItems(memory, currentTime) {
    const results = [];
    const concepts = memory.concepts ?? memory._concepts;
    if (!concepts) return [];

    const allTasks = [];
    for (const [, concept] of concepts) {
      const beliefs = concept.beliefs ?? [];
      for (const task of beliefs) {
        const lastUsed = task.stamp?.occurrenceTime ?? task.creationTime ?? 0;
        allTasks.push({ task, lastUsed });
      }
    }

    allTasks.sort((a, b) => b.lastUsed - a.lastUsed);

    for (const { task, lastUsed } of allTasks.slice(0, this.recentViewSize)) {
      const recency = Math.max(0, 1 - (currentTime - lastUsed) / 100000);
      results.push({
        task,
        relevance: 0,
        recency,
        score: recency * this.weights.recency
      });
    }

    return results;
  }

  /**
   * Atomize: Check if term should unify with existing or create new atom.
   */
  async atomize(termString, type = 'NOUN') {
    this._metrics.atomizations++;

    if (!this.embeddingLayer) {
      return { isNew: true, unifiedTerm: null };
    }

    try {
      const embedding = await this.embeddingLayer.getEmbedding(termString);

      for (const [existingTerm, data] of this.atoms) {
        if (data.type !== type) continue;

        const similarity = this.embeddingLayer.calculateSimilarity(embedding, data.embedding);
        if (similarity >= this.atomCreationThreshold) {
          this._emit('narsgpt:atomUnified', { term: termString, unifiedTo: existingTerm, similarity });
          return { isNew: false, unifiedTerm: existingTerm };
        }
      }

      this.atoms.set(termString, { embedding, type });
      this._emit('narsgpt:atomCreated', { term: termString, type });
      return { isNew: true, unifiedTerm: null };
    } catch (e) {
      return { isNew: true, unifiedTerm: null };
    }
  }

  /**
   * Ground a Narsese sentence by registering its embedding.
   */
  async ground(narsese, sentence) {
    if (!this.embeddingLayer) return;

    try {
      const embedding = await this.embeddingLayer.getEmbedding(sentence);
      this.groundings.set(narsese, { sentence, embedding });
      this._emit('narsgpt:grounded', { narsese, sentence });
    } catch (e) {
      // Ignore grounding failures
    }
  }

  /**
   * Check if input matches a grounded sentence.
   */
  async checkGrounding(input) {
    this._metrics.groundingChecks++;

    if (!this.embeddingLayer || this.groundings.size === 0) {
      return { grounded: false, match: null, similarity: 0 };
    }

    try {
      const inputEmbedding = await this.embeddingLayer.getEmbedding(input);
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const [narsese, { sentence, embedding }] of this.groundings) {
        const similarity = this.embeddingLayer.calculateSimilarity(inputEmbedding, embedding);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = { narsese, sentence };
        }
      }

      return {
        grounded: bestSimilarity > 0.8,
        match: bestMatch?.narsese ?? null,
        similarity: bestSimilarity
      };
    } catch (e) {
      return { grounded: false, match: null, similarity: 0 };
    }
  }

  /**
   * Eternalize temporal beliefs older than eternalizationDistance.
   */
  eternalize(memory, currentTime) {
    const concepts = memory.concepts ?? memory._concepts;
    if (!concepts) return;

    let eternalized = 0;
    for (const [, concept] of concepts) {
      const beliefs = concept.beliefs ?? [];
      for (const task of beliefs) {
        const occurrenceTime = task.stamp?.occurrenceTime;
        if (occurrenceTime !== undefined && occurrenceTime !== 'eternal') {
          const age = currentTime - occurrenceTime;
          if (age >= this.eternalizationDistance) {
            if (task.stamp) {
              task.stamp.occurrenceTime = 'eternal';
              eternalized++;
            }
          }
        }
      }
    }

    if (eternalized > 0) {
      this._emit('narsgpt:eternalized', { count: eternalized });
    }
  }

  /**
   * Swap perspective pronouns (I <-> You, My <-> Your).
   */
  perspectiveSwap(text) {
    if (!this.perspectiveSwapEnabled || !text) return text;

    this._metrics.perspectiveSwaps++;

    let result = ` ${text} `;

    const swaps = [
      [/\byou are\b/gi, '___I_AM___'],
      [/\bi am\b/gi, '___YOU_ARE___'],
      [/\byou\b/gi, '___I___'],
      [/\bi\b/g, '___you___'],
      [/\byour\b/gi, '___MY___'],
      [/\bmy\b/gi, '___YOUR___'],
    ];

    for (const [pattern, placeholder] of swaps) {
      result = result.replace(pattern, placeholder);
    }

    return result
      .replace(/___I_AM___/g, 'I am')
      .replace(/___YOU_ARE___/g, 'you are')
      .replace(/___I___/g, 'I')
      .replace(/___you___/g, 'you')
      .replace(/___MY___/g, 'my')
      .replace(/___YOUR___/g, 'your')
      .trim();
  }

  /**
   * Format attention buffer as context string for prompts.
   */
  formatContext(buffer) {
    if (!buffer || buffer.length === 0) {
      return '(No relevant memory items)';
    }

    return buffer.map((item, i) => {
      const termStr = item.task.term?.toString?.() ?? String(item.task.term);
      const truth = item.task.truth;
      const f = truth?.f ?? truth?.frequency ?? 0;
      const c = truth?.c ?? truth?.confidence ?? 0;
      const truthStr = truth ? ` {${f.toFixed(2)} ${c.toFixed(2)}}` : '';
      return `${i + 1}. ${termStr}${truthStr}`;
    }).join('\n');
  }

  /**
   * SeNARS enhancement: Apply NAL truth revision to LM-generated beliefs.
   * Adjusts truth values based on existing knowledge.
   */
  reviseWithMemory(newTruth, memory, termString) {
    const concepts = memory?.concepts ?? memory?._concepts;
    if (!concepts) return newTruth;

    // Find existing belief for this term
    for (const [, concept] of concepts) {
      for (const belief of concept.beliefs ?? []) {
        if (belief.term?.toString?.() === termString && belief.truth) {
          // NAL revision formula
          const f1 = newTruth.f ?? newTruth.frequency ?? 0.9;
          const c1 = newTruth.c ?? newTruth.confidence ?? 0.8;
          const f2 = belief.truth.f ?? belief.truth.frequency ?? 0.9;
          const c2 = belief.truth.c ?? belief.truth.confidence ?? 0.8;

          const w1 = c1 / (1 - c1);
          const w2 = c2 / (1 - c2);
          const w = w1 + w2;
          const f = (w1 * f1 + w2 * f2) / w;
          const c = w / (w + 1);

          return { frequency: f, confidence: c };
        }
      }
    }

    return newTruth;
  }

  /**
   * Emit event via EventBus if available.
   */
  _emit(event, data) {
    if (this.eventBus?.emit) {
      this.eventBus.emit(event, data);
    }
  }

  /**
   * Reset strategy state.
   */
  reset() {
    this.groundings.clear();
    this.atoms.clear();
    this._metrics = {
      attentionBufferBuilds: 0,
      atomizations: 0,
      groundingChecks: 0,
      perspectiveSwaps: 0
    };
    this.resetStats();
  }

  getStatus() {
    return {
      ...super.getStatus(),
      name: this._name,
      config: {
        relevantViewSize: this.relevantViewSize,
        recentViewSize: this.recentViewSize,
        atomCreationThreshold: this.atomCreationThreshold,
        eternalizationDistance: this.eternalizationDistance,
        weights: this.weights
      },
      groundingsCount: this.groundings.size,
      atomsCount: this.atoms.size,
      metrics: this._metrics
    };
  }
}
