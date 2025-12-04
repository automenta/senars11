import {ActivityTypes} from './ActivityTypes.js';

/**
 * Transforms raw Activity events into render-ready View Models.
 * Pure logic, no dependencies.
 */
export class ActivityViewModel {
    static format(activity) {
        const base = {
            id: activity.id,
            timestamp: activity.timestamp,
            type: activity.type,
            raw: activity
        };

        switch (activity.type) {
            case ActivityTypes.REASONING.DERIVATION:
                return {
                    ...base,
                    title: 'Reasoning Step',
                    subtitle: activity.payload?.term || 'Derivation',
                    details: this._formatTruth(activity.payload?.truth),
                    color: 'cyan',
                    icon: '⚡'
                };

            case ActivityTypes.REASONING.GOAL:
                return {
                    ...base,
                    title: 'New Goal',
                    subtitle: activity.payload?.term || 'Goal',
                    color: 'yellow',
                    icon: '🎯'
                };

            case ActivityTypes.LLM.PROMPT:
                return {
                    ...base,
                    title: 'LLM Prompt',
                    subtitle: this._truncate(activity.payload?.text, 50),
                    details: activity.payload?.text,
                    color: 'blue',
                    icon: '📤'
                };

            case ActivityTypes.LLM.RESPONSE:
                return {
                    ...base,
                    title: 'LLM Response',
                    subtitle: this._truncate(activity.payload?.text, 50),
                    details: activity.payload?.text,
                    color: 'green',
                    icon: '🤖'
                };

             case ActivityTypes.IO.USER_INPUT:
                return {
                    ...base,
                    title: 'User Input',
                    subtitle: activity.payload?.text,
                    color: 'white',
                    icon: '👤'
                };

             case ActivityTypes.IO.SYSTEM_OUTPUT:
                return {
                    ...base,
                    title: 'System Output',
                    subtitle: activity.payload?.text,
                    color: 'white',
                    icon: '🖥️'
                };

            default:
                return {
                    ...base,
                    title: 'Activity',
                    subtitle: JSON.stringify(activity.payload),
                    color: 'gray',
                    icon: '•'
                };
        }
    }

    static _truncate(str, len) {
        if (!str) return '';
        if (str.length <= len) return str;
        return str.substring(0, len) + '...';
    }

    static _formatTruth(truth) {
        if (!truth) return '';
        const f = truth.frequency !== undefined ? Number(truth.frequency).toFixed(2) : '?';
        const c = truth.confidence !== undefined ? Number(truth.confidence).toFixed(2) : '?';
        return `{f:${f}, c:${c}}`;
    }
}
