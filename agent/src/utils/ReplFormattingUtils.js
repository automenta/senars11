/**
 * Formatting utilities for enhanced REPL output
 */

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    fg: {
        black: '\x1b[30m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
        blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
        brightBlack: '\x1b[90m', brightRed: '\x1b[91m', brightGreen: '\x1b[92m', brightYellow: '\x1b[93m',
        brightBlue: '\x1b[94m', brightMagenta: '\x1b[95m', brightCyan: '\x1b[96m', brightWhite: '\x1b[97m',
    },
    bg: {
        black: '\x1b[40m', red: '\x1b[41m', green: '\x1b[42m', yellow: '\x1b[43m',
        blue: '\x1b[44m', magenta: '\x1b[45m', cyan: '\x1b[46m', white: '\x1b[47m',
        brightBlack: '\x1b[100m', brightRed: '\x1b[101m', brightGreen: '\x1b[102m', brightYellow: '\x1b[103m',
        brightBlue: '\x1b[104m', brightMagenta: '\x1b[105m', brightCyan: '\x1b[106m', brightWhite: '\x1b[107m',
    }
};

export class ReplFormattingUtils {
    static colorize(text, color) {
        if (process.env.NODE_DISABLE_COLORS === '1') return text;
        const [cat, key] = color.split('.');
        const code = key ? COLORS[cat]?.[key] : COLORS[color] || COLORS.fg[color];
        return `${code || ''}${text}${COLORS.reset}`;
    }

    static formatTable(data, headers) {
        if (!data?.length) return 'No data to display';

        const columnWidths = (headers || []).map(h => h.length);
        data.forEach(row => {
            row.forEach((cell, i) => {
                const len = String(cell || '').length;
                columnWidths[i] = Math.max(columnWidths[i] || 6, len);
            });
        });

        const pad = (str, width) => String(str || '').padEnd(width);
        const rows = [];

        if (headers) {
            rows.push(this.colorize(headers.map((h, i) => pad(h, columnWidths[i])).join('  '), 'bright'));
            rows.push(columnWidths.map(w => '-'.repeat(w)).join('  '));
        }

        data.forEach(row => {
            rows.push(row.map((c, i) => pad(c, columnWidths[i])).join('  '));
        });

        return rows.join('\n');
    }

    static formatBanner(text, {width, bgColor} = {}) {
        width = width || Math.max(text.length + 4, 50);
        const line = '═'.repeat(width);
        const padding = ' '.repeat(Math.floor((width - text.length) / 2));
        const center = padding + text;

        const middle = bgColor ? this.colorize(center, `bg.${bgColor}`) : center;
        return `${this.colorize(line, 'bright')}\n${middle}\n${this.colorize(line, 'bright')}`;
    }

    static _formatList(items, limit, headers, mapper) {
        if (!items?.length) return 'No data to display';
        const data = items.slice(0, limit).map(mapper);
        let result = this.formatTable(data, headers);
        if (items.length > limit) result += `\n  ... and ${items.length - limit} more`;
        return result;
    }

    static formatBeliefs(beliefs) {
        return this._formatList(beliefs, 20, ['Term', 'Freq', 'Conf'], b => [
            b.term?.toString?.() ?? b.term ?? 'Unknown',
            b.truth?.frequency?.toFixed(3) ?? '1.000',
            b.truth?.confidence?.toFixed(3) ?? '0.900'
        ]);
    }

    static formatGoals(goals) {
        return this._formatList(goals, 20, ['Term', 'Freq', 'Conf'], g => [
            g.term?.toString?.() ?? g.term ?? 'Unknown',
            g.truth?.frequency?.toFixed(3) ?? '1.000',
            g.truth?.confidence?.toFixed(3) ?? '0.900'
        ]);
    }

    static formatConcepts(concepts, term = null) {
        const filtered = term
            ? concepts.filter(c => c.term?.toString?.().toLowerCase().includes(term.toLowerCase()))
            : concepts;

        if (!filtered.length) return term ? `No concepts found containing: ${term}` : 'No concepts to display';

        return this._formatList(filtered, 20, ['Term', 'Beliefs', 'Goals', 'Questions', 'Activation'], c => [
            c.term?.toString?.() ?? c.term ?? 'Unknown',
            c.getBeliefs ? c.getBeliefs().length : 0,
            c.getGoals ? c.getGoals().length : 0,
            c.getQuestions ? c.getQuestions().length : 0,
            c.activation?.toFixed(3) ?? '0.000'
        ]);
    }

    static stylizeOutput(output, type = 'info') {
        const styles = {
            answer: 'fg.brightCyan',
            event: 'fg.brightCyan',
            derivation: 'fg.green',
            error: 'fg.red'
        };
        if (type === 'banner') return this.colorize(output, 'bg.blue') + this.colorize(' ', 'reset') + output;
        return styles[type] ? this.colorize(output, styles[type]) : output;
    }
}
