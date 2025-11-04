import { BaseIndex } from './BaseIndex.js';

export class RelationshipIndex extends BaseIndex {
    constructor(config = {}) {
        super(config);
        this._inheritanceIndex = new Map(); // Maps inheritance relationships
        this._implicationIndex = new Map(); // Maps implication relationships  
        this._similarityIndex = new Map(); // Maps similarity relationships
    }

    add(concept) {
        const { term } = concept;
        if (!term.isAtomic) {
            switch (term.operator) {
                case '-->': // Inheritance
                    this._indexInheritance(term, concept);
                    break;
                case '==>': // Implication
                    this._indexImplication(term, concept);
                    break;
                case '<->': // Similarity
                    this._indexSimilarity(term, concept);
                    break;
            }
        }
    }

    _indexInheritance(term, concept) {
        // Index concept where this term is subject or predicate
        // For (A-->B), A is subject, B is predicate
        if (term.components && term.components.length >= 2) {
            const subject = term.components[0];
            const predicate = term.components[1];
            
            let subjectConcepts = this._inheritanceIndex.get(`subject:${subject.toString()}`);
            if (!subjectConcepts) {
                subjectConcepts = new Set();
                this._inheritanceIndex.set(`subject:${subject.toString()}`, subjectConcepts);
            }
            subjectConcepts.add(concept);
            
            let predicateConcepts = this._inheritanceIndex.get(`predicate:${predicate.toString()}`);
            if (!predicateConcepts) {
                predicateConcepts = new Set();
                this._inheritanceIndex.set(`predicate:${predicate.toString()}`, predicateConcepts);
            }
            predicateConcepts.add(concept);
        }
    }

    _indexImplication(term, concept) {
        if (term.components && term.components.length >= 2) {
            const premise = term.components[0];
            const conclusion = term.components[1];
            
            let premiseConcepts = this._implicationIndex.get(`premise:${premise.toString()}`);
            if (!premiseConcepts) {
                premiseConcepts = new Set();
                this._implicationIndex.set(`premise:${premise.toString()}`, premiseConcepts);
            }
            premiseConcepts.add(concept);
            
            let conclusionConcepts = this._implicationIndex.get(`conclusion:${conclusion.toString()}`);
            if (!conclusionConcepts) {
                conclusionConcepts = new Set();
                this._implicationIndex.set(`conclusion:${conclusion.toString()}`, conclusionConcepts);
            }
            conclusionConcepts.add(concept);
        }
    }

    _indexSimilarity(term, concept) {
        if (term.components && term.components.length >= 2) {
            const first = term.components[0];
            const second = term.components[1];
            
            let firstConcepts = this._similarityIndex.get(`similar:${first.toString()}`);
            if (!firstConcepts) {
                firstConcepts = new Set();
                this._similarityIndex.set(`similar:${first.toString()}`, firstConcepts);
            }
            firstConcepts.add(concept);
            
            let secondConcepts = this._similarityIndex.get(`similar:${second.toString()}`);
            if (!secondConcepts) {
                secondConcepts = new Set();
                this._similarityIndex.set(`similar:${second.toString()}`, secondConcepts);
            }
            secondConcepts.add(concept);
        }
    }

    remove(concept) {
        const { term } = concept;
        if (!term.isAtomic) {
            switch (term.operator) {
                case '-->': // Inheritance
                    this._removeInheritance(term, concept);
                    break;
                case '==>': // Implication
                    this._removeImplication(term, concept);
                    break;
                case '<->': // Similarity
                    this._removeSimilarity(term, concept);
                    break;
            }
        }
    }

    _removeInheritance(term, concept) {
        if (term.components && term.components.length >= 2) {
            const subject = term.components[0];
            const predicate = term.components[1];
            
            if (this._inheritanceIndex.has(`subject:${subject.toString()}`)) {
                const concepts = this._inheritanceIndex.get(`subject:${subject.toString()}`);
                concepts.delete(concept);
                if (concepts.size === 0) {
                    this._inheritanceIndex.delete(`subject:${subject.toString()}`);
                }
            }
            
            if (this._inheritanceIndex.has(`predicate:${predicate.toString()}`)) {
                const concepts = this._inheritanceIndex.get(`predicate:${predicate.toString()}`);
                concepts.delete(concept);
                if (concepts.size === 0) {
                    this._inheritanceIndex.delete(`predicate:${predicate.toString()}`);
                }
            }
        }
    }

    _removeImplication(term, concept) {
        if (term.components && term.components.length >= 2) {
            const premise = term.components[0];
            const conclusion = term.components[1];
            
            if (this._implicationIndex.has(`premise:${premise.toString()}`)) {
                const concepts = this._implicationIndex.get(`premise:${premise.toString()}`);
                concepts.delete(concept);
                if (concepts.size === 0) {
                    this._implicationIndex.delete(`premise:${premise.toString()}`);
                }
            }
            
            if (this._implicationIndex.has(`conclusion:${conclusion.toString()}`)) {
                const concepts = this._implicationIndex.get(`conclusion:${conclusion.toString()}`);
                concepts.delete(concept);
                if (concepts.size === 0) {
                    this._implicationIndex.delete(`conclusion:${conclusion.toString()}`);
                }
            }
        }
    }

    _removeSimilarity(term, concept) {
        if (term.components && term.components.length >= 2) {
            const first = term.components[0];
            const second = term.components[1];
            
            if (this._similarityIndex.has(`similar:${first.toString()}`)) {
                const concepts = this._similarityIndex.get(`similar:${first.toString()}`);
                concepts.delete(concept);
                if (concepts.size === 0) {
                    this._similarityIndex.delete(`similar:${first.toString()}`);
                }
            }
            
            if (this._similarityIndex.has(`similar:${second.toString()}`)) {
                const concepts = this._similarityIndex.get(`similar:${second.toString()}`);
                concepts.delete(concept);
                if (concepts.size === 0) {
                    this._similarityIndex.delete(`similar:${second.toString()}`);
                }
            }
        }
    }

    find(filters = {}) {
        const { relationshipType, subject, predicate, premise, conclusion } = filters;

        let result = [];
        if (relationshipType) {
            switch (relationshipType) {
                case 'inheritance':
                    if (subject) {
                        const concepts = this._inheritanceIndex.get(`subject:${subject.toString()}`);
                        if (concepts) result.push(...Array.from(concepts));
                    }
                    if (predicate) {
                        const concepts = this._inheritanceIndex.get(`predicate:${predicate.toString()}`);
                        if (concepts) result.push(...Array.from(concepts));
                    }
                    break;
                case 'implication':
                    if (premise) {
                        const concepts = this._implicationIndex.get(`premise:${premise.toString()}`);
                        if (concepts) result.push(...Array.from(concepts));
                    }
                    if (conclusion) {
                        const concepts = this._implicationIndex.get(`conclusion:${conclusion.toString()}`);
                        if (concepts) result.push(...Array.from(concepts));
                    }
                    break;
                case 'similarity':
                    // Add logic for similarity relationships
                    break;
            }
        }

        return result.length > 0 ? result : this.getAll();
    }

    clear() {
        this._inheritanceIndex.clear();
        this._implicationIndex.clear();
        this._similarityIndex.clear();
    }

    getAll() {
        const allConcepts = new Set();
        
        // Add inheritance concepts
        for (const concepts of this._inheritanceIndex.values()) {
            for (const concept of concepts) {
                allConcepts.add(concept);
            }
        }
        
        // Add implication concepts
        for (const concepts of this._implicationIndex.values()) {
            for (const concept of concepts) {
                allConcepts.add(concept);
            }
        }
        
        // Add similarity concepts
        for (const concepts of this._similarityIndex.values()) {
            for (const concept of concepts) {
                allConcepts.add(concept);
            }
        }
        
        return Array.from(allConcepts);
    }
}