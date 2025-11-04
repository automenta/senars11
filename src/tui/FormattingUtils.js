/**
 * Shared formatting utilities for TUI components
 */
export class FormattingUtils {
    static formatTask(task) {
        const priority = FormattingUtils.formatPriority(task.budget?.priority);
        const term = task.term?.toString?.() || task.term || 'Unknown';
        const punctuation = FormattingUtils.getTypePunctuation(task.type || 'TASK');
        const truthStr = FormattingUtils.formatTruth(task.truth);
        const occurrence = FormattingUtils.formatOccurrence(task);

        return `${priority}${term}${punctuation}${truthStr}${occurrence}`;
    }

    static formatPriority(priority) {
        return priority !== undefined ? `$${priority.toFixed(3)} ` : '';
    }

    static formatTruth(truth) {
        if (!truth) return ' %1.000,0.900%'; // Default truth values
        
        const freq = truth.frequency !== undefined ? truth.frequency.toFixed(3) : '1.000';
        const conf = truth.confidence !== undefined ? truth.confidence.toFixed(3) : '0.900';
        return ` %${freq},${conf}%`;
    }

    static formatOccurrence(task) {
        if (task.occurrenceTime === undefined && !task.stamp) return '';
        
        const timeStr = task.occurrenceTime || '';
        const stampStr = task.stamp ? FormattingUtils.encodeShortId(task.stamp.id || task.stamp) : '';
        
        return stampStr ? ` ${timeStr}@${stampStr}`.trim() : timeStr;
    }

    static getTypePunctuation(type) {
        switch (type?.toUpperCase()) {
            case 'BELIEF':
                return '.';
            case 'GOAL':
                return '!';
            case 'QUESTION':
                return '?';
            default:
                return '.';
        }
    }

    static encodeShortId(input) {
        if (!input) return 'N/A';

        // Convert input to string if it isn't already
        const inputStr = String(input);

        // Use a large set of visible unicode characters for high radix encoding
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzαβγδεζηθικλμνξοπρστυφχψωАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя∀∂∃∅∇∈∉∋∌∏∑∙√∝∞∟∠∡∢∣∤∥∦∧∨∩∪∫∬∭∮∯∰∱∲∳∴∵∶∷∸∹∺∻∼∽∾∿≀≁≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≠≡≢≣≤≥≦≧≨≩≪≫≬≭≮≯≰≱≲≳≴≵≶≷≸≹≺≻≼≽≾≿⊀⊁⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋⊌⊍⊎⊏⊐⊑⊒⊓⊔⊕⊖⊗⊘⊙⊚⊛⊜⊝⊞⊟⊠⊡⊢⊣⊤⊥⊦⊧⊨⊩⊪⊫⊬⊭⊮⊯⊰⊱⊲⊳⊴⊵⊶⊷⊸⊹⊺⊻⊼⊽⊾⊿⋀⋁⋂⋃⋄⋅⋆⋇⋈⋉⋊⋋⋌⋍⋎⋏⋐⋑⋒⋓⋔⋕⋖⋗⋘⋙⋚⋛⋜⋝⋞⋟⋠⋡⋢⋣⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱⋲⋳⋴⋵⋶⋷⋸⋹⋺⋻⋼⋽⋾⋿';

        // Convert the input to a large number (we'll use the character codes)
        let hash = 0;
        for (let i = 0; i < inputStr.length; i++) {
            const charCode = inputStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + charCode;
            hash |= 0; // Convert to 32bit integer
        }

        // Make sure it's positive
        hash = Math.abs(hash);

        // Encode using the custom charset
        if (hash === 0) return chars[0];

        let result = '';
        const base = chars.length;
        let num = hash;

        while (num > 0) {
            result = chars[num % base] + result;
            num = Math.floor(num / base);
        }

        // Limit length to 8 characters max for readability
        return result.length > 8 ? result.substring(0, 8) : result;
    }

    static safeGet(obj, ...paths) {
        const defaultValue = paths.pop(); // Last argument is the default value
        
        for (const path of paths) {
            let current = obj;
            let found = true;
            
            for (const prop of path) {
                if (current == null || typeof current !== 'object' || !(prop in current)) {
                    found = false;
                    break;
                }
                current = current[prop];
            }
            
            if (found) {
                return current;
            }
        }
        
        return defaultValue;
    }

    static formatTaskDetails(task) {
        const details = [
            FormattingUtils.formatType(task.type),
            FormattingUtils.formatTruthStr(task.truth),
            FormattingUtils.formatPriorityStr(task.priority),
            FormattingUtils.formatStamp(task.stamp),
            FormattingUtils.formatOccurrenceTime(task.occurrenceTime)
        ].filter(detail => detail !== null);

        return details.join(' | ');
    }
    
    static formatType(type) {
        return type ? `Type: ${type}` : 'Type: Task';
    }
    
    static formatTruthStr(truth) {
        return truth ? `Truth: ${truth.toString()}` : 'Truth: N/A';
    }
    
    static formatPriorityStr(priority) {
        return priority !== undefined ? `Priority: ${priority.toFixed(3)}` : 'Priority: N/A';
    }
    
    static formatStamp(stamp) {
        return stamp ? `Stamp: ${stamp}` : 'Stamp: N/A';
    }
    
    static formatOccurrenceTime(occurrenceTime) {
        return occurrenceTime !== undefined ? `OccTime: ${occurrenceTime}` : null; // null means don't include
    }

    static formatBeliefDetails(task) {
        const details = [
            FormattingUtils.formatBeliefTruth(task.truth),
            FormattingUtils.formatBeliefPriority(task.priority),
            FormattingUtils.formatBeliefOccurrence(task.stamp)
        ].filter(detail => detail !== null);

        return details.join('');
    }
    
    static formatBeliefTruth(truth) {
        return truth ? `{magenta}${truth.toString()}{/magenta}` : null;
    }
    
    static formatBeliefPriority(priority) {
        return priority !== undefined ? `{yellow} | P:${priority.toFixed(3)}{/yellow}` : null;
    }
    
    static formatBeliefOccurrence(stamp) {
        return stamp ? `{blue} | Occ:${stamp}{/blue}` : null;
    }
}