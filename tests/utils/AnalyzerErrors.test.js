import { AnalyzerError, ConfigurationError, AnalysisError, ValidationError } from '../../src/util/AnalyzerErrors.js';

describe('AnalyzerErrors', () => {
    describe('AnalyzerError', () => {
        test('should create an error with correct properties', () => {
            const originalError = new Error('Original error');
            const error = new AnalyzerError('Test message', 'TEST_CODE', originalError);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AnalyzerError);
            expect(error.name).toBe('AnalyzerError');
            expect(error.message).toBe('Test message');
            expect(error.code).toBe('TEST_CODE');
            expect(error.originalError).toBe(originalError);
            expect(error.timestamp).toBeDefined();
        });

        test('should create an error without original error', () => {
            const error = new AnalyzerError('Test message');

            expect(error.name).toBe('AnalyzerError');
            expect(error.message).toBe('Test message');
            expect(error.code).toBe('ANALYZER_ERROR');
            expect(error.originalError).toBeNull();
        });
    });

    describe('ConfigurationError', () => {
        test('should create a configuration error with correct properties', () => {
            const originalError = new Error('Original error');
            const error = new ConfigurationError('Config error', originalError);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AnalyzerError);
            expect(error).toBeInstanceOf(ConfigurationError);
            expect(error.name).toBe('ConfigurationError');
            expect(error.message).toBe('Config error');
            expect(error.code).toBe('CONFIG_ERROR');
            expect(error.originalError).toBe(originalError);
        });
    });

    describe('AnalysisError', () => {
        test('should create an analysis error with correct properties', () => {
            const originalError = new Error('Original error');
            const error = new AnalysisError('Analysis error', 'tests', originalError);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AnalyzerError);
            expect(error).toBeInstanceOf(AnalysisError);
            expect(error.name).toBe('AnalysisError');
            expect(error.message).toBe('Analysis error');
            expect(error.code).toBe('ANALYSIS_ERROR_TESTS');
            expect(error.originalError).toBe(originalError);
            expect(error.analysisType).toBe('tests');
        });

        test('should handle unknown analysis type', () => {
            const error = new AnalysisError('Analysis error');

            expect(error.code).toBe('ANALYSIS_ERROR_UNKNOWN');
            expect(error.analysisType).toBe('unknown');
        });
    });

    describe('ValidationError', () => {
        test('should create a validation error with correct properties', () => {
            const originalError = new Error('Original error');
            const error = new ValidationError('Validation error', 'field1', originalError);

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AnalyzerError);
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe('Validation error');
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.originalError).toBe(originalError);
            expect(error.field).toBe('field1');
        });
    });
});