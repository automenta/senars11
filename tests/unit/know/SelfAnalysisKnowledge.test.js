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
            const knowledge = new FileAnalysisKnowledge({
                fileDetails: [{
                    path: 'test.js',
                    directory: 'src',
                    lines: 100,
                    size: 1000,
                    complexity: {cyclomatic: 5}
                }]
            });
            expect(await knowledge.getItems()).toHaveLength(1);
            expect(await knowledge.toTasks()).toBeInstanceOf(Array);
        });
    });

    describe('TestResultKnowledge', () => {
        test('should process test result data', async () => {
            const knowledge = new TestResultKnowledge({
                individualTestResults: [{
                    name: 'test1',
                    status: 'passed',
                    duration: 100,
                    suite: 'suite1'
                }]
            });
            expect(await knowledge.getItems()).toHaveLength(1);
            expect(await knowledge.toTasks()).toBeInstanceOf(Array);
        });
    });

    describe('DirectoryStructureKnowledge', () => {
        test('should process directory structure data', async () => {
            const knowledge = new DirectoryStructureKnowledge({
                directoryStats: {
                    'src/test': {path: 'src/test', files: 5, lines: 1000}
                }
            });
            expect(await knowledge.getItems()).toHaveLength(1);
            expect(await knowledge.toTasks()).toBeInstanceOf(Array);
        });
    });

    describe('DependencyGraphKnowledge', () => {
        test('should process dependency graph data', async () => {
            const knowledge = new DependencyGraphKnowledge({
                dependencyGraph: {'file1.js': ['dependency1.js']}
            });
            expect(await knowledge.getItems()).toHaveLength(1);
            expect(await knowledge.toTasks()).toBeInstanceOf(Array);
        });
    });

    describe('SelfAnalysisKnowledgeFactory', () => {
        test('should auto-detect self-analysis knowledge', () => {
            const knowledge = SoftwareKnowledgeFactory.autoDetectSelfAnalysisKnowledge({
                fileDetails: [{path: 'test.js', lines: 100}]
            });
            expect(knowledge.constructor.name).toBe('FileAnalysisKnowledge');
        });
    });
});
