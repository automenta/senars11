import { expect } from '@playwright/test';
import { NarPage } from './NarPage.js';
import { TaskMatch } from '../../../../src/testing/TaskMatch.js';
import { NarseseParser } from '../../../../src/parser/NarseseParser.js';
import { TermFactory } from '../../../../src/term/TermFactory.js';

export class TestNARPlaywright {
    constructor(page) {
        this.page = page;
        this.narPage = new NarPage(page);
        this.operations = [];
        this.termFactory = new TermFactory();
        this.parser = new NarseseParser(this.termFactory);
    }

    input(termStr, freq, conf) {
        this.operations.push({ type: 'input', termStr, freq, conf });
        return this;
    }

    run(cycles = 1) {
        this.operations.push({ type: 'run', cycles });
        return this;
    }

    step(count = 1) {
        this.operations.push({ type: 'step', count });
        return this;
    }

    expect(term) {
        const matcher = term instanceof TaskMatch ? term : new TaskMatch(term);
        this.operations.push({ type: 'expect', matcher, shouldExist: true });
        return this;
    }

    expectNot(term) {
        const matcher = term instanceof TaskMatch ? term : new TaskMatch(term);
        this.operations.push({ type: 'expect', matcher, shouldExist: false });
        return this;
    }

    expectGraph(nodeName) {
        this.operations.push({ type: 'expectGraph', nodeName, shouldExist: true });
        return this;
    }

    async execute() {
        for (const op of this.operations) {
            switch (op.type) {
                case 'input':
                    await this._handleInput(op);
                    break;
                case 'run':
                    await this.page.waitForTimeout(op.cycles * 50);
                    break;
                case 'step':
                    for (let i = 0; i < op.count; i++) {
                        await this.page.click('#btn-step');
                        await this.page.waitForTimeout(50);
                    }
                    break;
                case 'expect':
                    await this._checkExpectation(op);
                    break;
                case 'expectGraph':
                    await this._checkGraphExpectation(op);
                    break;
            }
        }
        this.operations = [];
    }

    async _handleInput(op) {
        let input = op.termStr;
        if (op.freq !== undefined && op.conf !== undefined) {
            const lastChar = input.trim().slice(-1);
            if (!['.', '!', '?', '@'].includes(lastChar)) {
                input += '.';
            }
            input += ` %${op.freq};${op.conf}%`;
        }
        await this.narPage.sendCommand(input);
        await this.page.waitForTimeout(100);
    }

    async _checkExpectation(op) {
        await expect(async () => {
            const logsText = await this.narPage.logsContainer.innerText();
            const found = await this._findInLogs(logsText, op.matcher);

            if (op.shouldExist && !found) {
                throw new Error(`Expected term not found: ${op.matcher.termFilter}`);
            }
            if (!op.shouldExist && found) {
                throw new Error(`Unexpected term found: ${op.matcher.termFilter}`);
            }
        }).toPass({ timeout: 10000, intervals: [500] });
    }

    async _findInLogs(logsText, matcher) {
        const lines = logsText.split('\n');
        for (const line of lines) {
            const match = line.match(/[<()].*[>).?!%]/);
            if (!match) continue;

            let narsese = match[0];

            if (narsese.startsWith('(') && narsese.includes(',')) {
                narsese = this._normalizeLegacyNarsese(narsese);
            }

            try {
                const parsed = this.parser.parse(narsese);
                const taskMock = {
                    term: parsed.term,
                    type: parsed.type || 'BELIEF',
                    truth: parsed.truth
                };

                if (await matcher.matches(taskMock)) return true;
            } catch (e) {
                if (narsese.includes(matcher.termFilter)) return true;
            }
        }
        return false;
    }

    _normalizeLegacyNarsese(narsese) {
        if (narsese.endsWith('"') || narsese.endsWith('}')) {
            narsese = narsese.replace(/["}]+$/, '');
        }

        const inner = narsese.substring(1, narsese.lastIndexOf(')'));
        const parts = inner.split(',');
        if (parts.length >= 2) {
            const operator = parts[0].trim();
            const args = parts.slice(1).map(arg => arg.trim());

            if (['-->', '==>', '<->', '<=>'].includes(operator) && args.length === 2) {
                let normalized = `<${args[0]} ${operator} ${args[1]}>`;
                if (!normalized.match(/[.?!]/)) normalized += '.';
                return normalized;
            }
        }
        return narsese;
    }

    async _checkGraphExpectation(op) {
        await this.narPage.sendCommand('/nodes');
        await this.narPage.expectLog(op.nodeName);
    }
}
