/**
 * Formatting utilities for enhanced REPL output
 */
import {FormattingUtils as BasicFormattingUtils} from '../../util/FormattingUtils.js';

// Default color codes
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    
    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        brightBlack: '\x1b[90m',
        brightRed: '\x1b[91m',
        brightGreen: '\x1b[92m',
        brightYellow: '\x1b[93m',
        brightBlue: '\x1b[94m',
        brightMagenta: '\x1b[95m',
        brightCyan: '\x1b[96m',
        brightWhite: '\x1b[97m',
    },
    
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
        brightBlack: '\x1b[100m',
        brightRed: '\x1b[101m',
        brightGreen: '\x1b[102m',
        brightYellow: '\x1b[103m',
        brightBlue: '\x1b[104m',
        brightMagenta: '\x1b[105m',
        brightCyan: '\x1b[106m',
        brightWhite: '\x1b[107m',
    }
};

export class FormattingUtils extends BasicFormattingUtils {
    static colorize(text, color) {
        if (process.env.NODE_DISABLE_COLORS === '1') return text;
        return `${COLORS[color] || COLORS.fg[color] || ''}${text}${COLORS.reset}`;
    }
    
    static formatTable(data, headers) {
        if (!data || data.length === 0) return 'No data to display';
        
        // Calculate column widths
        const columnWidths = [];
        if (headers) {
            for (let i = 0; i < headers.length; i++) {
                columnWidths[i] = headers[i].length;
            }
        }
        
        // Calculate max width for each column
        data.forEach(row => {
            for (let i = 0; i < Math.max(headers ? headers.length : 0, row.length); i++) {
                const cell = String(row[i] || '');
                columnWidths[i] = Math.max(columnWidths[i] || 0, cell.length);
            }
        });
        
        // Ensure minimum width
        columnWidths.forEach((_, i) => {
            columnWidths[i] = Math.max(columnWidths[i], 6); // Minimum width of 6
        });
        
        // Create table
        let table = '';
        
        if (headers) {
            // Header row
            const headerRow = headers.map((header, i) => 
                header.padEnd(columnWidths[i])
            ).join('  ');
            table += this.colorize(headerRow, 'bright') + '\n';
            
            // Separator
            const separator = columnWidths.map(width => 
                '-'.repeat(width)
            ).join('  ');
            table += separator + '\n';
        }
        
        // Data rows
        data.forEach(row => {
            const dataRow = row.map((cell, i) => 
                String(cell || '').padEnd(columnWidths[i])
            ).join('  ');
            table += dataRow + '\n';
        });
        
        return table.trim();
    }
    
    static formatBanner(text, options = {}) {
        const width = options.width || Math.max(text.length + 4, 50);
        const topLine = '═'.repeat(width);
        const bottomLine = '═'.repeat(width);
        
        // Calculate padding to center text
        const padding = Math.floor((width - text.length) / 2);
        const centeredText = ' '.repeat(padding) + text;
        
        let banner = this.colorize(topLine, 'bright') + '\n';
        if (options.bgColor) {
            banner += this.colorize(centeredText, `bg.${options.bgColor}`) + '\n';
        } else {
            banner += centeredText + '\n';
        }
        banner += this.colorize(bottomLine, 'bright');
        
        return banner;
    }
    
    static formatBeliefs(beliefs) {
        if (!beliefs || beliefs.length === 0) return 'No beliefs to display';
        
        const tableData = beliefs.slice(0, 20).map(b => {
            const term = b.term?.toString?.() ?? b.term ?? 'Unknown';
            const freq = b.truth?.frequency?.toFixed(3) ?? '1.000';
            const conf = b.truth?.confidence?.toFixed(3) ?? '0.900';
            return [term, `${freq}`, `${conf}`];
        });
        
        const headers = ['Term', 'Freq', 'Conf'];
        let result = this.formatTable(tableData, headers);
        
        if (beliefs.length > 20) {
            result += `\n  ... and ${beliefs.length - 20} more`;
        }
        
        return result;
    }
    
    static formatGoals(goals) {
        if (!goals || goals.length === 0) return 'No goals to display';
        
        const tableData = goals.slice(0, 20).map(g => {
            const term = g.term?.toString?.() ?? g.term ?? 'Unknown';
            const freq = g.truth?.frequency?.toFixed(3) ?? '1.000';
            const conf = g.truth?.confidence?.toFixed(3) ?? '0.900';
            return [term, `${freq}`, `${conf}`];
        });
        
        const headers = ['Term', 'Freq', 'Conf'];
        let result = this.formatTable(tableData, headers);
        
        if (goals.length > 20) {
            result += `\n  ... and ${goals.length - 20} more`;
        }
        
        return result;
    }
    
    static formatConcepts(concepts, term = null) {
        if (!concepts || concepts.length === 0) return 'No concepts to display';
        
        const filteredConcepts = term 
            ? concepts.filter(c => c.term?.toString?.().toLowerCase().includes(term.toLowerCase()))
            : concepts;
        
        if (filteredConcepts.length === 0) return `No concepts found containing: ${term}`;
        
        const tableData = filteredConcepts.slice(0, 20).map(c => {
            const beliefs = c.getBeliefs ? c.getBeliefs().length : 0;
            const goals = c.getGoals ? c.getGoals().length : 0;
            const questions = c.getQuestions ? c.getQuestions().length : 0;
            
            return [
                c.term?.toString?.() ?? c.term ?? 'Unknown',
                beliefs,
                goals,
                questions,
                c.activation?.toFixed(3) ?? '0.000'
            ];
        });
        
        const headers = ['Term', 'Beliefs', 'Goals', 'Questions', 'Activation'];
        let result = this.formatTable(tableData, headers);
        
        if (filteredConcepts.length > 20) {
            result += `\n  ... and ${filteredConcepts.length - 20} more`;
        }
        
        return result;
    }
    
    static stylizeOutput(output, type = 'info') {
        switch (type) {
            case 'answer':
            case 'event':
                return this.colorize(output, 'fg.brightCyan');
            case 'derivation':
                return this.colorize(output, 'fg.green'); // Could add gradient by novelty
            case 'error':
                return this.colorize(output, 'fg.red');
            case 'banner':
                return this.colorize(output, 'bg.blue') + this.colorize(' ', 'reset') + output;
            default:
                return output;
        }
    }
}