import { KnowledgeFactory } from './KnowledgeFactory.js';
import { FileAnalysisKnowledge, TestResultKnowledge, DirectoryStructureKnowledge, DependencyGraphKnowledge, FlexibleDataTableKnowledge } from './SelfAnalysisKnowledge.js';

export class SelfAnalysisKnowledgeFactory {
  static initialize() {
    KnowledgeFactory.registerKnowledgeType('fileAnalysis', FileAnalysisKnowledge);
    KnowledgeFactory.registerKnowledgeType('testResult', TestResultKnowledge);
    KnowledgeFactory.registerKnowledgeType('directoryStructure', DirectoryStructureKnowledge);
    KnowledgeFactory.registerKnowledgeType('dependencyGraph', DependencyGraphKnowledge);
    KnowledgeFactory.registerKnowledgeType('flexibleDataTable', FlexibleDataTableKnowledge);
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