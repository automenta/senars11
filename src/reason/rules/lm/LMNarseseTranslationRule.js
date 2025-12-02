import {LMRule} from '../../LMRule.js';
import {Punctuation} from '../../utils/TaskUtils.js';
import {Task} from '../../../task/Task.js';
import {Truth} from '../../../Truth.js';

/**
 * Creates a Narsese translation rule.
 * This rule identifies quoted natural language strings and uses an LM to translate them into Narsese.
 */
export const createNarseseTranslationRule = (dependencies) => {
    const {lm, termFactory, parser} = dependencies;

    return LMRule.create({
        id: 'narsese-translation',
        lm,
        name: 'Narsese Translation Rule',
        description: 'Translates natural language string concepts into formal Narsese.',
        priority: 0.9,
        singlePremise: true,

        condition: (primaryPremise, secondaryPremise, context) => {
            if (!primaryPremise || !primaryPremise.term) return false;

            const term = primaryPremise.term;
            // Check for Atomic Term
            const isAtomic = term.isAtomic || term.type === 'atom' || (term.components && term.components.length === 0);

            if (!isAtomic) return false;

            const name = term.name || term.toString();
            // Check if it is a quoted string - ensure name is a string before calling .startsWith()
            return typeof name === 'string' && name.startsWith('"') && name.endsWith('"');
        },

        prompt: (primaryPremise) => {
            const termStr = primaryPremise.term.name || primaryPremise.term.toString();
            const content = termStr.slice(1, -1); // Remove quotes

            // Try to extract subject and predicate to make the task clearer
            let subject, predicate;
            if (content.includes(' are ')) {
                const parts = content.split(' are ');
                subject = parts[0].trim();
                predicate = parts[1].trim();
            } else if (content.includes(' is ')) {
                const parts = content.split(' is ');
                subject = parts[0].trim();
                predicate = parts[1].trim();
            } else {
                // Generic handling
                subject = content.split(' ')[0];
                predicate = content.substring(content.indexOf(' ') + 1);
            }

            return `Translate to Narsese format. Output only the Narsese relation, nothing else.
Use <subject --> predicate> format for categorical statements.
Example: "Dogs are animals" -> <dog --> animal>
Input: "${content}"
Output (just the Narsese, no explanation): <${subject.toLowerCase()} --> ${predicate.toLowerCase()}>
Input: "${content}"
Output: `;
        },

        process: (lmResponse) => {
             return lmResponse?.trim() || '';
        },

        generate: (processedOutput, primaryPremise, secondaryPremise, context) => {
            if (!processedOutput) return [];
            if (!dependencies.parser) {
                console.warn('NarseseTranslationRule: Parser not available for translation result');
                return [];
            }

            try {
                // Parse the Narsese string returned by LM
                const parsed = dependencies.parser.parse(processedOutput);
                if (parsed) {
                     let term = parsed;
                     let punctuation = Punctuation.BELIEF;
                     let truth = null;

                     if (parsed.term) {
                         term = parsed.term;
                         punctuation = parsed.punctuation || Punctuation.BELIEF;
                         truth = parsed.truthValue;
                     }

                     const newTask = new Task({
                         term: term,
                         punctuation: punctuation,
                         truth: truth ? new Truth(truth.frequency, truth.confidence) : (punctuation === Punctuation.BELIEF ? new Truth(1.0, 0.9) : null),
                         budget: {priority: 0.8, durability: 0.8, quality: 0.5}
                     });

                     return [newTask];
                }
            } catch (e) {
                console.warn(`NarseseTranslationRule: Failed to parse translation "${processedOutput}":`, e);
            }
            return [];
        }
    });
};
