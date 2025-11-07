/**
 * Self-Analysis Knowledge Unit Tests
 * Tests for self-analysis specific knowledge implementations
 */
import {
    DependencyGraphKnowledge,
    DirectoryStructureKnowledge,
    FileAnalysisKnowledge,
    TestResultKnowledge
} from '../../../src/know/SoftwareKnowledge.js';
import {SoftwareKnowledgeFactory} from '../../../src/know/SoftwareKnowledgeFactory.js';

describe('Self-Analysis Knowledge', () => {
    describe('FileAnalysisKnowledge', () => {
        test('should process file analysis data', async () => {
            const mockData = {
                fileDetails: [
                    {
                        path: 'test.js',
                        directory: 'src',
                        lines: 100,
                        size: 1000,
                        complexity: {cyclomatic: 5}
                    }
                ]
            };

            const knowledge = new FileAnalysisKnowledge(mockData);
            const items = await knowledge.getItems();
            expect(items.length).toBe(1);

            const tasks = await knowledge.toTasks();
            expect(Array.isArray(tasks)).toBe(true);
        });
    });

    describe('TestResultKnowledge', () => {
        test('should process test result data', async () => {
            const mockData = {
                individualTestResults: [
                    {
                        name: 'test1',
                        status: 'passed',
                        duration: 100,
                        suite: 'suite1'
                    }
                ]
            };

            const knowledge = new TestResultKnowledge(mockData);
            const items = await knowledge.getItems();
            expect(items.length).toBe(1);

            const tasks = await knowledge.toTasks();
            expect(Array.isArray(tasks)).toBe(true);
        });
    });

    describe('DirectoryStructureKnowledge', () => {
        test('should process directory structure data', async () => {
            const mockData = {
                directoryStats: {
                    'src/test': {
                        path: 'src/test',
                        files: 5,
                        lines: 1000
                    }
                }
            };

            const knowledge = new DirectoryStructureKnowledge(mockData);
            const items = await knowledge.getItems();
            expect(items.length).toBe(1);

            const tasks = await knowledge.toTasks();
            expect(Array.isArray(tasks)).toBe(true);
        });
    });

    describe('DependencyGraphKnowledge', () => {
        test('should process dependency graph data', async () => {
            const mockData = {
                dependencyGraph: {
                    'file1.js': ['dependency1.js']
                }
            };

            const knowledge = new DependencyGraphKnowledge(mockData);
            const items = await knowledge.getItems();
            expect(items.length).toBe(1);

            const tasks = await knowledge.toTasks();
            expect(Array.isArray(tasks)).toBe(true);
        });
    });

    describe('SelfAnalysisKnowledgeFactory', () => {
        test('should auto-detect self-analysis knowledge', () => {
            const knowledge = SoftwareKnowledgeFactory.autoDetectSelfAnalysisKnowledge({
                fileDetails: [{path: 'test.js', lines: 100}]
            });

            expect(knowledge).toBeDefined();
            expect(knowledge.constructor.name).toBe('FileAnalysisKnowledge');
        });
    });
});