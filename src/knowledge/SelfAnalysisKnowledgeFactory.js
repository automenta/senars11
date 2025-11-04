import { KnowledgeFactory } from './KnowledgeFactory.js';
import { FileAnalysisKnowledge, TestResultKnowledge, DirectoryStructureKnowledge, DependencyGraphKnowledge, FlexibleDataTableKnowledge } from './SelfAnalysisKnowledge.js';

const TYPE_MAPPING = Object.freeze({
  fileAnalysis: FileAnalysisKnowledge,
  testResult: TestResultKnowledge,
  directoryStructure: DirectoryStructureKnowledge,
  dependencyGraph: DependencyGraphKnowledge,
  flexibleDataTable: FlexibleDataTableKnowledge
});

export class SelfAnalysisKnowledgeFactory {
  static initialize() {
    Object.entries(TYPE_MAPPING).forEach(([type, klass]) => {
      KnowledgeFactory.registerKnowledgeType(type, klass);
    });
  }

  static createSelfAnalysisKnowledge(type, data, options = {}) {
    return KnowledgeFactory.createKnowledge(type, data, options);
  }

  static autoDetectSelfAnalysisKnowledge(data, name = '', options = {}) {
    if (!data) return null;

    if (data.fileDetails || (data.fileAnalysis && Array.isArray(data.fileAnalysis))) {
      return new FileAnalysisKnowledge(data, options);
    } else if (data.individualTestResults) {
      return new TestResultKnowledge(data, options);
    } else if (data.directoryStats) {
      return new DirectoryStructureKnowledge(data, options);
    } else if (data.dependencyGraph) {
      return new DependencyGraphKnowledge(data, options);
    } else {
      return KnowledgeFactory.autoDetectKnowledge(data, name, options);
    }
  }
}

SelfAnalysisKnowledgeFactory.initialize();