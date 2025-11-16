import { useState, useEffect } from 'react';
import { getSharedDoc } from '../utils/sync';
import * as Y from 'yjs';

export function useSync() {
    const [syncedState, setSyncedState] = useState({ concepts: [] });

    useEffect(() => {
        const ydoc = getSharedDoc();
        const concepts = ydoc.getMap('concepts');

        const observer = (event) => {
            const newConcepts = [];
            for (const [key, yConcept] of concepts.entries()) {
                const conceptData = {
                    term: yConcept.get('term'),
                    tasks: yConcept.get('tasks').toArray().map(task => task[0])
                };
                newConcepts.push(conceptData);
            }
            setSyncedState({ concepts: newConcepts });
        };

        concepts.observe(observer);

        // Initial state load
        observer();

        return () => {
            concepts.unobserve(observer);
        };
    }, []);

    return syncedState;
}
