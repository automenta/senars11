import { BaseIndex } from './BaseIndex.js';
import { TermCategorization } from '../TermCategorization.js';
import { getWithDefaultSet, addToMapSet } from '../MemoryUtils.js';

export class CompoundIndex extends BaseIndex {
    constructor(config = {}) {
        super(config);
        this._index = new Map(); // Maps operator to concepts
        this._complexityIndex = new Map(); // Maps complexity level to concepts
        this._categoryIndex = new Map(); // Maps category to concepts
        this._componentIndex = new Map(); // Maps components to concepts
    }

    add(concept) {
        const { term } = concept;
        if (!term.isAtomic) {
            // Index by operator
            addToMapSet(this._index, term.operator, concept);

            // Index by complexity
            const complexityLevel = this._getComplexityLevel(term);
            addToMapSet(this._complexityIndex, complexityLevel, concept);

            // Index by category
            const category = TermCategorization.getTermCategory(term);
            addToMapSet(this._categoryIndex, category, concept);

            // Index by components
            if (term.components) {
                for (const comp of term.components) {
                    addToMapSet(this._componentIndex, comp, concept);

                    // Also index nested components
                    if (comp.isCompound) {
                        this._indexCompoundRecursively(comp, concept);
                    }
                }
            }
        }
    }

    _indexCompoundRecursively(term, concept) {
        if (term.components) {
            for (const comp of term.components) {
                addToMapSet(this._componentIndex, comp, concept);

                if (comp.isCompound) {
                    this._indexCompoundRecursively(comp, concept);
                }
            }
        }
    }

    remove(concept) {
        const { term } = concept;
        if (!term.isAtomic) {
            // Remove from operator index
            this._removeFromIndex(this._index, term.operator, concept);

            // Remove from complexity index
            this._removeFromIndex(this._complexityIndex, this._getComplexityLevel(term), concept);

            // Remove from category index
            this._removeFromIndex(this._categoryIndex, TermCategorization.getTermCategory(term), concept);

            // Remove from component index
            if (term.components) {
                for (const comp of term.components) {
                    this._removeFromComponentIndex(comp, concept);
                }
            }
        }
    }

    _removeFromComponentIndex(comp, concept) {
        if (this._componentIndex.has(comp)) {
            const concepts = this._componentIndex.get(comp);
            concepts.delete(concept);
            if (concepts.size === 0) {
                this._componentIndex.delete(comp);
            }
        }
        // Also remove from nested components
        if (comp.isCompound && comp.components) {
            for (const nestedComp of comp.components) {
                this._removeFromComponentIndex(nestedComp, concept);
            }
        }
    }

    _getComplexityLevel(term) {
        const complexity = TermCategorization.getTermComplexity(term);
        // Simplified complexity level calculation - would need full config implementation
        return Math.floor(complexity / 10); // Using 10 as bucket size
    }

    _removeFromIndex(index, key, concept) {
        const concepts = index.get(key);
        if (concepts) {
            concepts.delete(concept);
            if (concepts.size === 0) {
                index.delete(key);
            }
        }
    }

    find(filters = {}) {
        const { operator, category, minComplexity, maxComplexity, component } = filters;

        let resultConcepts = new Set();

        if (operator) {
            const concepts = this._index.get(operator);
            if (concepts) concepts.forEach(c => resultConcepts.add(c));
        }

        if (category) {
            const concepts = this._categoryIndex.get(category);
            if (concepts) {
                if (resultConcepts.size > 0) {
                    // Intersect with existing results
                    resultConcepts = new Set([...resultConcepts].filter(c => concepts.has(c)));
                } else {
                    concepts.forEach(c => resultConcepts.add(c));
                }
            }
        }

        if (component !== undefined) {
            const concepts = this._componentIndex.get(component);
            if (concepts) {
                if (resultConcepts.size > 0) {
                    // Intersect with existing results
                    resultConcepts = new Set([...resultConcepts].filter(c => concepts.has(c)));
                } else {
                    concepts.forEach(c => resultConcepts.add(c));
                }
            }
        }

        // For complexity filtering, we'd need to apply additional filtering
        if (minComplexity !== undefined || maxComplexity !== undefined) {
            const complexityFiltered = this._getAllByComplexityRange(minComplexity, maxComplexity);
            if (resultConcepts.size > 0) {
                // Intersect with existing results
                resultConcepts = new Set([...resultConcepts].filter(c => complexityFiltered.includes(c)));
            } else {
                complexityFiltered.forEach(c => resultConcepts.add(c));
            }
        }

        if (resultConcepts.size === 0) {
            return this.getAll();
        }

        return Array.from(resultConcepts);
    }

    _getAllByComplexityRange(minComplexity, maxComplexity) {
        const result = [];
        for (const [level, concepts] of this._complexityIndex.entries()) {
            // Convert level back to complexity and check range
            if ((minComplexity === undefined || level >= minComplexity) &&
                (maxComplexity === undefined || level <= maxComplexity)) {
                result.push(...Array.from(concepts));
            }
        }
        return result;
    }

    clear() {
        this._index.clear();
        this._complexityIndex.clear();
        this._categoryIndex.clear();
        this._componentIndex.clear();
    }

    getAll() {
        const allConcepts = new Set();
        for (const concepts of this._index.values()) {
            for (const concept of concepts) {
                allConcepts.add(concept);
            }
        }
        for (const concepts of this._complexityIndex.values()) {
            for (const concept of concepts) {
                allConcepts.add(concept);
            }
        }
        for (const concepts of this._categoryIndex.values()) {
            for (const concept of concepts) {
                allConcepts.add(concept);
            }
        }
        for (const concepts of this._componentIndex.values()) {
            for (const concept of concepts) {
                allConcepts.add(concept);
            }
        }
        return Array.from(allConcepts);
    }
}