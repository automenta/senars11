/**
 * AnalogicalStrategy.js
 * 
 * NAL-6 Analogical reasoning strategy for cross-domain knowledge transfer.
 * Uses Unifier for structure mapping to find analogical relationships.
 * 
 * Analogy Rule: (S ↔ M), (M → P) ⊢ (S → P)
 * Where ↔ represents similarity/analogy operator
 */

import { PremiseFormationStrategy } from './PremiseFormationStrategy.js';
import { Unifier } from '../../term/Unifier.js';

export class AnalogicalStrategy extends PremiseFormationStrategy {
    constructor(config = {}) {
        super(config);
        this.name = 'AnalogicalStrategy';

        if (!config.termFactory) {
            throw new Error('AnalogicalStrategy requires termFactory in config');
        }

        this.termFactory = config.termFactory;
        this.unifier = new Unifier(this.termFactory);

        // Configuration
        this.config = {
            minSimilarityThreshold: config.minSimilarityThreshold || 0.5,
            maxCandidates: config.maxCandidates || 10,
            searchDepth: config.searchDepth || 2,
            ...config
        };
    }

    /**
     * Find analogical mappings between two domains
     * Returns candidate premise pairs that exhibit analogical relationships
     */
    async* generateCandidates(task, memory, context) {
        if (!task.term || !memory) {
            return;
        }

        // Find similarity relationships in memory
        const similarityRelations = this._findSimilarityRelations(memory);

        // Find implications that can be mapped
        const implications = this._findImplications(memory);

        // Generate analogical inferences
        for (const similarity of similarityRelations) {
            for (const implication of implications) {
                const analogy = this._tryAnalogicalMapping(similarity, implication);

                if (analogy) {
                    yield {
                        premise1: similarity,
                        premise2: implication,
                        priority: this._calculateAnalogicalPriority(similarity, implication),
                        source: this.name,
                        metadata: {
                            type: 'analogical',
                            mapping: analogy.mapping
                        }
                    };
                }
            }
        }
    }

    /**
     * Find similarity relationships in memory
     * Looks for tasks with similarity operator (↔, <->, or custom similarity)
     */
    _findSimilarityRelations(memory) {
        const similarityTasks = [];

        const concepts = memory.getAllConcepts ? memory.getAllConcepts() : [];

        for (const concept of concepts) {
            const tasks = concept.getTasks ? concept.getTasks() : [];

            for (const task of tasks) {
                if (this._isSimilarityRelation(task)) {
                    similarityTasks.push(task);
                }
            }
        }

        return similarityTasks;
    }

    /**
     * Check if a task represents a similarity relation
     */
    _isSimilarityRelation(task) {
        if (!task.term || !task.isBelief()) {
            return false;
        }

        const operator = task.term.operator;

        // Check for similarity operators
        return operator === '<->' ||
            operator === '↔' ||
            operator === 'similarity';
    }

    /**
     * Find implication relationships in memory
     */
    _findImplications(memory) {
        const implications = [];

        const concepts = memory.getAllConcepts ? memory.getAllConcepts() : [];

        for (const concept of concepts) {
            const tasks = concept.getTasks ? concept.getTasks() : [];

            for (const task of tasks) {
                if (this._isImplication(task)) {
                    implications.push(task);
                }
            }
        }

        return implications;
    }

    /**
     * Check if a task is an implication
     */
    _isImplication(task) {
        if (!task.term || !task.isBelief()) {
            return false;
        }

        const operator = task.term.operator;
        return operator === '-->' || operator === '==>' || operator === 'inheritance';
    }

    /**
     * Try to create an analogical mapping between a similarity and an implication
     * 
     * Pattern: (S ↔ M), (M → P) ⊢ (S → P)
     */
    _tryAnalogicalMapping(similarity, implication) {
        const simSubject = similarity.term.components[0];
        const simPredicate = similarity.term.components[1];

        const implSubject = implication.term.components[0];
        const implPredicate = implication.term.components[1];

        // Try matching simPredicate with implSubject (M)
        const match1 = this.unifier.unify(simPredicate, implSubject);

        if (match1.success) {
            return {
                mapping: match1.substitution,
                source: simSubject,
                target: implPredicate,
                middleTerm: simPredicate
            };
        }

        // Try reverse: simSubject with implSubject
        const match2 = this.unifier.unify(simSubject, implSubject);

        if (match2.success) {
            return {
                mapping: match2.substitution,
                source: simPredicate,
                target: implPredicate,
                middleTerm: simSubject
            };
        }

        return null;
    }

    /**
     * Calculate priority for analogical inference
     * Based on similarity strength and confidence
     */
    _calculateAnalogicalPriority(similarity, implication) {
        const simConfidence = similarity.truth?.confidence || 0.5;
        const implConfidence = implication.truth?.confidence || 0.5;

        // Combined confidence, weighted towards the weaker link
        const basePriority = Math.min(simConfidence, implConfidence);

        // Boost if both are high confidence
        const boost = simConfidence * implConfidence * 0.2;

        return Math.min(1.0, basePriority + boost);
    }

    /**
     * Map knowledge from source domain to target domain
     * 
     * @param {Term} sourcePattern - Pattern in source domain
     * @param {Term} targetPattern - Pattern in target domain
     * @param {Task} knowledge - Knowledge to transfer
     * @returns {Task|null} - Transferred knowledge or null
     */
    mapKnowledge(sourcePattern, targetPattern, knowledge) {
        // Find structural mapping between source and target
        const mapping = this.unifier.unify(sourcePattern, knowledge.term);

        if (!mapping.success) {
            return null;
        }

        // Apply the mapping to transfer to target domain
        const transferredTerm = this._applyStructuralMapping(
            knowledge.term,
            sourcePattern,
            targetPattern,
            mapping.substitution
        );

        if (!transferredTerm) {
            return null;
        }

        // Create new task with transferred knowledge
        // Reduce confidence due to analogical transfer
        const originalConfidence = knowledge.truth?.confidence || 0.9;
        const transferredConfidence = originalConfidence * 0.7; // Analogical penalty

        return knowledge.clone({
            term: transferredTerm,
            truth: knowledge.truth ? {
                frequency: knowledge.truth.frequency,
                confidence: transferredConfidence
            } : null
        });
    }

    /**
     * Apply structural mapping from source to target
     * @private
     */
    _applyStructuralMapping(term, sourcePattern, targetPattern, substitution) {
        // This is a simplified version
        // A full implementation would do deep structural mapping

        const sourceSub = this.unifier.applySubstitution(sourcePattern, substitution);
        const targetSub = this.unifier.applySubstitution(targetPattern, substitution);

        // If the term matches the source, replace with target
        if (this.unifier.unify(term, sourceSub).success) {
            return targetSub;
        }

        return null;
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            ...super.getStatus(),
            type: 'AnalogicalStrategy',
            config: this.config
        };
    }
}
