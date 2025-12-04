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

        const formatters = {
            [ActivityTypes.REASONING.DERIVATION]: p => ({
                title: 'Reasoning Step',
                subtitle: p?.term || 'Derivation',
                details: this._formatTruth(p?.truth) + (p?.rule ? ` [${p.rule}]` : ''),
                color: 'cyan',
                icon: '⚡'
            }),
            [ActivityTypes.REASONING.GOAL]: p => ({
                title: 'New Goal',
                subtitle: p?.term || 'Goal',
                color: 'yellow',
                icon: '🎯'
            }),
            [ActivityTypes.REASONING.FOCUS]: p => ({
                title: 'Attention',
                subtitle: p?.term || 'Focus',
                details: JSON.stringify(p?.task || {}),
                color: 'magenta',
                icon: '👀'
            }),
            [ActivityTypes.LLM.PROMPT]: p => ({
                title: 'LLM Prompt',
                subtitle: this._truncate(p?.text, 50),
                details: p?.text,
                color: 'blue',
                icon: '📤'
            }),
            [ActivityTypes.LLM.RESPONSE]: p => ({
                title: 'LLM Response',
                subtitle: this._truncate(p?.text, 50),
                details: p?.text,
                color: 'green',
                icon: '🤖'
            }),
            [ActivityTypes.IO.USER_INPUT]: p => ({
                title: 'User Input',
                subtitle: p?.text,
                color: 'white',
                icon: '👤'
            }),
            [ActivityTypes.IO.SYSTEM_OUTPUT]: p => ({
                title: 'System Output',
                subtitle: p?.text,
                color: 'white',
                icon: '🖥️'
            }),
            [ActivityTypes.AGENT.ACTION]: p => ({
                title: 'Agent Action',
                subtitle: p?.action || 'Action',
                details: p?.details,
                color: 'cyan',
                icon: '🦾'
            }),
            [ActivityTypes.AGENT.DECISION]: p => ({
                title: 'Decision',
                subtitle: p?.decision || 'Decision',
                details: p?.reason,
                color: 'cyan',
                icon: '🧠'
            }),
            [ActivityTypes.SYSTEM.ERROR]: p => ({
                title: 'Error',
                subtitle: p?.error || 'System Error',
                details: p?.context,
                color: 'red',
                icon: '❌'
            })
        };

        const formatter = formatters[activity.type];
        const formatted = formatter ? formatter(activity.payload) : {
            title: 'Activity',
            subtitle: JSON.stringify(activity.payload),
            color: 'gray',
            icon: '•'
        };

        return { ...base, ...formatted };
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
