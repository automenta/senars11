import {ArgParser} from '../../src/util/ArgParser.js';

describe('ArgParser', () => {
    describe('parse', () => {
        test('should parse --all flag correctly', () => {
            const result = ArgParser.parse(['--all']);
            expect(result.all).toBe(true);
        });

        test('should parse -a flag correctly', () => {
            const result = ArgParser.parse(['-a']);
            expect(result.all).toBe(true);
        });

        test('should parse multiple flags', () => {
            const result = ArgParser.parse(['--tests', '--verbose']);
            expect(result.tests).toBe(true);
            expect(result.verbose).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should handle unknown flag by setting help', () => {
            const result = ArgParser.parse(['--unknown']);
            expect(result.help).toBe(true);
        });

        test('should parse --help flag', () => {
            const result = ArgParser.parse(['--help']);
            expect(result.help).toBe(true);
        });

        test('should parse -h flag', () => {
            const result = ArgParser.parse(['-h']);
            expect(result.help).toBe(true);
        });

        test('should parse --coverage flag', () => {
            const result = ArgParser.parse(['--coverage']);
            expect(result.coverage).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --tests flag', () => {
            const result = ArgParser.parse(['--tests']);
            expect(result.tests).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --static flag', () => {
            const result = ArgParser.parse(['--static']);
            expect(result.static).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --project flag', () => {
            const result = ArgParser.parse(['--project']);
            expect(result.project).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --requirements flag', () => {
            const result = ArgParser.parse(['--requirements']);
            expect(result.requirements).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --features flag', () => {
            const result = ArgParser.parse(['--features']);
            expect(result.featurespecs).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --technicaldebt flag', () => {
            const result = ArgParser.parse(['--technicaldebt']);
            expect(result.technicaldebt).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --architecture flag', () => {
            const result = ArgParser.parse(['--architecture']);
            expect(result.architecture).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --planning flag', () => {
            const result = ArgParser.parse(['--planning']);
            expect(result.planning).toBe(true);
            expect(result.all).toBe(false);
        });

        test('should parse --slowest flag', () => {
            const result = ArgParser.parse(['--slowest']);
            expect(result.slowest).toBe(true);
        });

        test('should parse --verbose flag', () => {
            const result = ArgParser.parse(['--verbose']);
            expect(result.verbose).toBe(true);
        });

        test('should parse --summary-only flag', () => {
            const result = ArgParser.parse(['--summary-only']);
            expect(result.summaryOnly).toBe(true);
        });
    });

    describe('getDefaultOptions', () => {
        test('should return default options with all=true', () => {
            const defaults = ArgParser.getDefaultOptions();
            expect(defaults.all).toBe(true);
            expect(defaults.tests).toBe(false);
            expect(defaults.coverage).toBe(false);
            expect(defaults.help).toBe(false);
        });
    });

    describe('getHelpMessage', () => {
        test('should return help message string', () => {
            const helpMessage = ArgParser.getHelpMessage();
            expect(typeof helpMessage).toBe('string');
            expect(helpMessage).toContain('SeNARS Self-Analysis Script');
            expect(helpMessage).toContain('--all');
            expect(helpMessage).toContain('--tests');
        });
    });
});