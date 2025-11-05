import { TruthValueUtils } from './NarseseTemplate.js';
import * as dfd from 'danfojs';
import { DataTableKnowledge } from './DataTableKnowledge.js';

export class FileAnalysisKnowledge extends DataTableKnowledge {
  constructor(data = null, options = {}) {
    super(data, 'file_analysis', options);
  }

  async processData() {
    if (!this.df) {
      if (this.data?.fileDetails) {
        const flatData = this.data.fileDetails.map(file => ({
          path: file.path,
          directory: file.directory,
          lines: file.lines,
          size: file.size,
          complexity_cyclomatic: file.complexity?.cyclomatic || 0,
          complexity_functionCount: file.complexity?.functionCount || 0,
          complexity_classCount: file.complexity?.classCount || 0,
          complexity_conditionalCount: file.complexity?.conditionalCount || 0
        }));
        this.df = new dfd.DataFrame(flatData);
      } else if (this.data?.fileAnalysis) {
        const flatData = this.data.fileAnalysis.map(file => ({
          file_path: file.filePath,
          line_coverage: file.lineCoverage,
          statements: file.statements,
          covered: file.covered,
          uncovered: file.uncovered,
          size: file.size
        }));
        this.df = new dfd.DataFrame(flatData);
      } else {
        await super.initDataTable(this.data);
      }
    }
    return await super.processData();
  }

  async rowToTask(row, index) {
    try {
      const fileName = row.path || row.file_path || `file_${index}`;
      const filePath = fileName.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      
      // Define metrics to process
      const metrics = [
        { key: 'line_coverage', metric: 'coverage', min: 0, max: 100, confidence: 0.9 },
        { key: 'size', metric: 'size', min: 0, max: 10000, confidence: 0.8 },
        { key: 'complexity_cyclomatic', metric: 'complexity', min: 0, max: 50, confidence: 0.85 },
        { key: 'lines', metric: 'lines', min: 0, max: 1000, confidence: 0.8 }
      ];
      
      // Process each metric
      for (const { key, metric, min, max, confidence } of metrics) {
        if (row[key] !== undefined) {
          return await this.createTasksWithTemplate('file-analysis', {
            filePath,
            metric,
            value: row[key],
            min,
            max
          }, { confidence });
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error converting file row to task: ${error.message}`);
      return null;
    }
  }

  async createRelationships() {
    if (!this.df) await this.processData();
    
    const relationships = [], rows = this.df?.values || [], cols = this.df?.columns || [];
    
    for (let i = 0; i < (rows.length || 0); i++) {
      const row = {};
      (cols || []).forEach((col, idx) => row[col] = (rows[i] || [])[idx]);
      
      const fileName = row.path || row.file_path || `file_${i}`;
      const filePath = fileName.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      
      if (row.directory) {
        const dirPath = row.directory.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
        const rel = await this.createTasksWithTemplate('containment', {
          container: dirPath,
          contained: filePath,
          relationship: 'in_directory',
          truth: { frequency: 1.0, confidence: 0.9 }
        });
        relationships.push(rel);
      }
    }
    return relationships;
  }
}

export class TestResultKnowledge extends DataTableKnowledge {
  constructor(data = null, options = {}) {
    super(data, 'test_results', options);
  }

  async processData() {
    if (!this.df) {
      if (this.data && Array.isArray(this.data.individualTestResults)) {
        const flatData = this.data.individualTestResults.map(test => ({
          name: test.name,
          status: test.status,
          duration: test.duration,
          suite: test.suite,
          directory: test.directory,
          fullName: test.fullName,
          numPassingAsserts: test.numPassingAsserts,
          failureMessages: test.failureMessages ? test.failureMessages.join('; ') : ''
        }));
        this.df = new dfd.DataFrame(flatData);
      } else {
        await super.initDataTable(this.data);
      }
    }
    return await super.processData();
  }

  async rowToTask(row, index) {
    try {
      const testName = (row.name || `test_${index}`).replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      
      // Handle test status
      if (row.status) {
        const isPass = row.status === 'passed' ? 1 : 0;
        return await this.createTasksWithTemplate('test-result', {
          testName,
          status: row.status,
          truth: { frequency: isPass, confidence: 0.95 }
        });
      }
      
      // Handle test duration
      if (row.duration !== undefined && row.duration > 0) {
        const durationNorm = TruthValueUtils.normalizeMetric(row.duration, 0, 5000);
        
        // Return slow/fast classification first
        return await this.createTasksWithTemplate('test-result', {
          testName,
          status: row.duration > 1000 ? 'slow' : 'fast',
          duration: row.duration,
          truth: { frequency: durationNorm, confidence: 0.8 }
        });
      }
      
      return null;
    } catch (error) {
      console.error(`Error converting test row to task: ${error.message}`);
      return null;
    }
  }

  async createRelationships() {
    if (!this.df) await this.processData();
    
    const relationships = [], rows = this.df?.values || [], cols = this.df?.columns || [];
    
    for (let i = 0; i < (rows.length || 0); i++) {
      const row = {};
      (cols || []).forEach((col, idx) => row[col] = (rows[i] || [])[idx]);
      
      const testName = (row.name || `test_${i}`).replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      
      const suiteRel = await this.createTasksWithTemplate('containment', {
        container: (row.suite || 'default_suite').replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_'),
        contained: testName,
        relationship: 'in_suite',
        truth: { frequency: 1.0, confidence: 0.9 }
      });
      relationships.push(suiteRel);
      
      if (row.directory) {
        const dirName = row.directory.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
        const dirRel = await this.createTasksWithTemplate('containment', {
          container: dirName,
          contained: testName,
          relationship: 'in_directory',
          truth: { frequency: 1.0, confidence: 0.9 }
        });
        relationships.push(dirRel);
      }
    }
    return relationships;
  }
}

export class DirectoryStructureKnowledge extends DataTableKnowledge {
  constructor(data = null, options = {}) {
    super(data, 'directory_structure', options);
  }

  async processData() {
    if (!this.df) {
      if (this.data && typeof this.data === 'object' && this.data.directoryStats) {
        const flatData = Object.entries(this.data.directoryStats).map(([dirPath, stats]) => ({
          path: dirPath,
          files: stats.files,
          lines: stats.lines,
          size: stats.size,
          jsFiles: stats.jsFiles,
          complexity: stats.complexity,
          depth: stats.depth,
          parentDirectory: stats.parentDirectory || null,
          subdirectories: Array.isArray(stats.subdirectories) ? stats.subdirectories.join(',') : ''
        }));
        this.df = new dfd.DataFrame(flatData);
      } else {
        await super.initDataTable(this.data);
      }
    }
    return await super.processData();
  }

  async rowToTask(row, index) {
    try {
      const dirName = (row.path || `directory_${index}`).replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      
      // Define metrics to process
      const metrics = [
        { key: 'files', metric: 'files', min: 0, max: 50, confidence: 0.8 },
        { key: 'lines', metric: 'lines', min: 0, max: 10000, confidence: 0.8 },
        { key: 'complexity', metric: 'complexity', min: 0, max: 100, confidence: 0.8 }
      ];
      
      // Process each metric
      for (const { key, metric, min, max, confidence } of metrics) {
        if (row[key] !== undefined) {
          return await this.createTasksWithTemplate('directory-analysis', {
            dirPath: dirName,
            metric,
            value: row[key],
            min,
            max
          }, { confidence });
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error converting directory row to task: ${error.message}`);
      return null;
    }
  }

  async createRelationships() {
    if (!this.df) await this.processData();
    
    const relationships = [], rows = this.df?.values || [], cols = this.df?.columns || [];
    
    for (let i = 0; i < (rows.length || 0); i++) {
      const row = {};
      (cols || []).forEach((col, idx) => row[col] = (rows[i] || [])[idx]);
      
      const dirName = (row.path || `directory_${i}`).replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      
      if (row.parentDirectory) {
        const parentDir = row.parentDirectory.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
        const childRel = await this.createTasksWithTemplate('relationship', {
          subject: `"${dirName}"`,
          relation: '-->',
          object: `child_of) --> "${parentDir}"`,
          truth: { frequency: 1.0, confidence: 0.85 }
        });
        relationships.push(childRel);
      }
      
      if (row.depth !== undefined) {
        const depthRel = await this.createTasksWithTemplate('statement', {
          subject: `"${dirName}"`,
          predicate: `depth_level) --> ${row.depth}`,
          truth: { frequency: 1.0, confidence: 0.9 }
        });
        relationships.push(depthRel);
      }
    }
    return relationships;
  }
}

export class DependencyGraphKnowledge extends DataTableKnowledge {
  constructor(data = null, options = {}) {
    super(data, 'dependency_graph', options);
  }

  async processData() {
    if (!this.df) {
      if (this.data && typeof this.data === 'object' && this.data.dependencyGraph) {
        const flatData = [];
        for (const [file, deps] of Object.entries(this.data.dependencyGraph)) {
          if (Array.isArray(deps)) {
            for (const dep of deps) {
              flatData.push({
                source: file,
                target: dep,
                type: 'dependency'
              });
            }
          }
        }
        this.df = new dfd.DataFrame(flatData);
      } else {
        await super.initDataTable(this.data);
      }
    }
    return await super.processData();
  }

  async rowToTask(row, index) {
    try {
      const source = (row.source || `module_${index}_source`).replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      const target = (row.target || `module_${index}_target`).replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
      return await this.createTasksWithTemplate('relationship', {
        subject: `"${source}"`,
        relation: '-/>',
        object: `"${target}") --> dependency`,
        truth: { frequency: 1.0, confidence: 0.9 }
      });
    } catch (error) {
      console.error(`Error converting dependency row to task: ${error.message}`);
      return null;
    }
  }

  async createRelationships() {
    if (!this.df) await this.processData();
    
    const relationships = [], rows = this.df?.values || [], cols = this.df?.columns || [];
    
    for (let i = 0; i < (rows.length || 0); i++) {
      const row = {};
      (cols || []).forEach((col, idx) => row[col] = (rows[i] || [])[idx]);
      
      if (row.source && row.target) {
        const source = row.source.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
        const target = row.target.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
        
        const dependsRel = await this.createTasksWithTemplate('relationship', {
          subject: `"${source}"`,
          relation: '-/>',
          object: `"${target}") --> depends_on`,
          truth: { frequency: 1.0, confidence: 0.9 }
        });
        relationships.push(dependsRel);
        
        const dependedRel = await this.createTasksWithTemplate('relationship', {
          subject: `"${target}"`,
          relation: '<-/',
          object: `"${source}") --> depended_by`,
          truth: { frequency: 1.0, confidence: 0.9 }
        });
        relationships.push(dependedRel);
      }
    }
    return relationships;
  }
}

export class FlexibleDataTableKnowledge extends DataTableKnowledge {
  constructor(data = null, tableName = 'flexible_data', options = {}) {
    super(data, tableName, options);
  }

  async rowToTask(row, index) {
    const cols = this.df?.columns || [];
    if (cols.length > 0) {
      const firstCol = cols[0];
      const value = row[firstCol];
      return await this.createTasksWithTemplate('statement', {
        subject: `"${firstCol}_${index}"`,
        predicate: `value) --> ${value}`,
        truth: { frequency: 0.5, confidence: 0.9 }
      });
    }
    return null;
  }
}