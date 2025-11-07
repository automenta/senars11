import fs from 'fs';
import path from 'path';
import {FileUtils} from '../../../util/FileUtils.js';
import {BaseAnalyzer} from './BaseAnalyzer.js';

export class StaticAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Static Analysis...');

        return await this.safeAnalyze(async () => {
            const directoriesToAnalyze = ['./src', './ui', './tests', './scripts'];

            const stats = {
                jsFiles: 0,
                totalLines: 0,
                directories: 0,
                filesByType: {},
                fileDetails: [],
                directoryStats: {},
                largestFiles: [],
                complexityMetrics: {},
                dependencyInfo: {},
                riskMetrics: {}
            };

            // Analyze multiple directories with timeout protection
            const analysisTimeout = 30000; // 30 seconds timeout
            const startTime = Date.now();

            for (const dirPath of directoriesToAnalyze) {
                if (Date.now() - startTime > analysisTimeout) {
                    this.log('Static analysis timeout reached, stopping...', 'warn');
                    break;
                }

                if (fs.existsSync(dirPath)) {
                    this.log(`Analyzing directory: ${dirPath}`);
                    this._traverseDirectory(dirPath, stats, 0, 8); // Start at depth 0, max 8 levels
                } else {
                    this.log(`Directory ${dirPath} not found, skipping...`, 'warn');
                }
            }

            // Process file details if we have any data
            if (stats.fileDetails.length > 0) {
                // Sort file details by lines for largest files
                stats.fileDetails.sort((a, b) => b.lines - a.lines);
                stats.largestFiles = stats.fileDetails.slice(0, 20); // Using 20 instead of TOP_N since it's not imported here

                this._calculateSummaryStats(stats);
                this._calculateRiskMetrics(stats);
            }

            return stats;
        }, 'Static analysis failed');
    }

    _calculateRiskMetrics(stats) {
        // Calculate risk metrics based on complexity, size, and other factors
        stats.riskMetrics = {
            highRiskFiles: [],
            mediumRiskFiles: [],
            complexityRisk: 0,
            sizeRisk: 0,
            changeRisk: 0,
            overallRiskScore: 0
        };

        for (const file of stats.fileDetails) {
            let fileRisk = 0;
            const complexity = file.complexity.cyclomatic;
            const lines = file.lines;

            // Complexity risk: high cyclomatic complexity indicates decision-heavy code
            if (complexity > 10) {
                fileRisk += complexity * 0.5; // Weight complexity heavily
                stats.riskMetrics.complexityRisk += complexity * 0.5;
            }

            // Size risk: very large files are harder to maintain
            if (lines > 200) {
                fileRisk += Math.max(0, lines - 200) * 0.1;
                stats.riskMetrics.sizeRisk += Math.max(0, lines - 200) * 0.1;
            }

            // Function count risk: too many functions in one file
            if (file.complexity.functionCount > 10) {
                fileRisk += (file.complexity.functionCount - 10) * 0.5;
            }

            // Class count risk: too many classes in one file
            if (file.complexity.classCount > 3) {
                fileRisk += (file.complexity.classCount - 3) * 2;
            }

            file.riskScore = fileRisk;
            stats.riskMetrics.overallRiskScore += fileRisk;

            // Categorize files by risk level
            if (fileRisk > 20) {
                stats.riskMetrics.highRiskFiles.push(file);
            } else if (fileRisk > 10) {
                stats.riskMetrics.mediumRiskFiles.push(file);
            }
        }

        // Sort high and medium risk files by risk score
        stats.riskMetrics.highRiskFiles.sort((a, b) => b.riskScore - a.riskScore);
        stats.riskMetrics.mediumRiskFiles.sort((a, b) => b.riskScore - a.riskScore);

        // Calculate average risk
        if (stats.fileDetails.length > 0) {
            stats.riskMetrics.avgRiskScore = stats.riskMetrics.overallRiskScore / stats.fileDetails.length;
        }

        // Identify change risk: files with high complexity and many functions may be risky to modify
        stats.riskMetrics.changeRisk = stats.riskMetrics.complexityRisk * 0.6 + stats.riskMetrics.sizeRisk * 0.4;
    }

    _traverseDirectory(dir, stats, currentDepth = 0, maxDepth = 8) {
        if (!fs.existsSync(dir)) {
            this.log(`Directory does not exist: ${dir}`, 'error');
            return;
        }

        // Prevent excessive recursion
        if (currentDepth > maxDepth) {
            this.log(`Maximum depth (${maxDepth}) reached, skipping: ${dir}`, 'warn');
            return;
        }

        let items;
        try {
            items = fs.readdirSync(dir, {withFileTypes: true});
        } catch (readError) {
            this.log(`Cannot read directory: ${dir}`, 'error', {error: readError.message});
            return;
        }

        // Initialize directory stats for this directory
        const relativeDir = path.relative('.', dir);
        if (!stats.directoryStats[relativeDir]) {
            stats.directoryStats[relativeDir] = {
                path: relativeDir,
                files: 0,
                lines: 0,
                size: 0,
                jsFiles: 0,
                complexity: 0,
                parentDirectory: path.dirname(relativeDir) !== '.' ? path.dirname(relativeDir) : null, // Store parent directory
                subdirectories: [], // List of subdirectories
                depth: Math.min(relativeDir.split(path.sep).length || 1, maxDepth) // Depth of directory
            };
        }

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                // Skip node_modules, .git, build directories to avoid performance issues
                if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' ||
                    item.name === 'build' || item.name === '.next' || item.name === 'coverage' ||
                    item.name.startsWith('.')) {
                    continue;
                }

                stats.directories++;
                const subDirPath = path.relative('.', fullPath);
                // Add subdirectory to parent's subdirectory list
                stats.directoryStats[relativeDir].subdirectories.push(subDirPath);
                this._traverseDirectory(fullPath, stats, currentDepth + 1, maxDepth);
            } else if (item.isFile()) {
                this._processFile(item, fullPath, stats, relativeDir);
            }
        }
    }

    _processFile(item, fullPath, stats, parentDir) {
        const ext = path.extname(item.name).substring(1) || 'no_ext';
        stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1;

        const relativePath = path.relative('.', fullPath);

        // Skip excluded files using global exclusion
        if (FileUtils.isExcludedPath(relativePath)) {
            this.log(`Excluding file from analysis: ${relativePath}`, 'warn');
            return;
        }

        if (item.name.endsWith('.js')) {
            stats.jsFiles++;
            const content = this._readFileContent(fullPath);
            if (content) {
                const lines = content.split('\n').length;
                stats.totalLines += lines;

                const imports = this.extractImports(content);
                const complexity = this.calculateComplexityMetrics(content);

                stats.fileDetails.push({
                    path: path.relative('.', fullPath),
                    directory: parentDir,
                    lines,
                    size: content.length,
                    imports,
                    complexity
                });

                // Update directory stats
                if (!stats.directoryStats[parentDir]) {
                    stats.directoryStats[parentDir] = {
                        path: parentDir,
                        files: 0,
                        lines: 0,
                        size: 0,
                        jsFiles: 0,
                        complexity: 0,
                        depth: parentDir.split(path.sep).length
                    };
                }

                stats.directoryStats[parentDir].files++;
                stats.directoryStats[parentDir].lines += lines;
                stats.directoryStats[parentDir].size += content.length;
                stats.directoryStats[parentDir].jsFiles++;
                stats.directoryStats[parentDir].complexity += complexity.cyclomatic;
            }
        } else {
            // Handle non-js files too
            const content = this._readFileContent(fullPath);
            if (content) {
                // Update directory stats for any file type
                if (!stats.directoryStats[parentDir]) {
                    stats.directoryStats[parentDir] = {
                        path: parentDir,
                        files: 0,
                        lines: 0,
                        size: 0,
                        jsFiles: 0,
                        complexity: 0,
                        depth: parentDir.split(path.sep).length
                    };
                }

                stats.directoryStats[parentDir].files++;
                stats.directoryStats[parentDir].size += content.length;
                // Count lines for any file type
                stats.directoryStats[parentDir].lines += content.split('\n').length;
            }
        }
    }

    extractImports(content) {
        const imports = [];
        const importRegex = /(import\s+|from\s+|require\(\s*)["'](.*?\.(js|ts))["']/gi;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            const imp = match[2];
            if (imp && !imp.startsWith('.') && !imp.startsWith('/')) {
                imports.push(imp);
            }
        }

        const relativeImportRegex = /(import\s+|from\s+|require\(\s*)["'](\.{1,2}\/.*?\.(js|ts))["']/gi;
        while ((match = relativeImportRegex.exec(content)) !== null) {
            imports.push(match[2]);
        }

        return [...new Set(imports)];
    }

    calculateComplexityMetrics(content) {
        const lines = content.split('\n');

        let functionCount = 0;
        let classCount = 0;
        let conditionalCount = 0;
        let cyclomatic = 1;

        for (const line of lines) {
            const trimmed = line.trim();

            const hasFunction = trimmed.startsWith('function ') ||
                trimmed.includes('function(') ||
                trimmed.includes('=>') ||
                trimmed.includes('function*');
            if (hasFunction) functionCount++;

            if (trimmed.includes('class ')) classCount++;

            const conditions = ['if (', 'else if', 'for (', 'while (', 'do {', 'switch (', 'try ', 'catch ('];
            for (const condition of conditions) {
                if (trimmed.includes(condition)) {
                    conditionalCount++;
                    cyclomatic++;
                }
            }

            if (trimmed.includes(' && ') || trimmed.includes(' || ')) cyclomatic++;
        }

        return {
            lines: lines.length,
            functionCount,
            classCount,
            conditionalCount,
            cyclomatic
        };
    }

    _readFileContent(fullPath) {
        try {
            return fs.readFileSync(fullPath, 'utf8');
        } catch (readError) {
            this.log(`Cannot read file: ${fullPath}`, 'warn', {error: readError.message});
            return null;
        }
    }

    _calculateSummaryStats(stats) {
        // Calculate statistical metrics
        stats.avgLinesPerFile = stats.fileDetails.length > 0
            ? Math.round(stats.totalLines / stats.fileDetails.length)
            : 0;

        const lineCounts = stats.fileDetails.map(f => f.lines);
        if (lineCounts.length > 0) {
            // Calculate median manually
            const sortedLines = [...lineCounts].sort((a, b) => a - b);
            const mid = Math.floor(sortedLines.length / 2);
            stats.medianLinesPerFile = sortedLines.length % 2 !== 0
                ? sortedLines[mid]
                : (sortedLines[mid - 1] + sortedLines[mid]) / 2;

            // Find largest and smallest files
            const maxLinesIdx = lineCounts.indexOf(Math.max(...lineCounts));
            const minLinesIdx = lineCounts.indexOf(Math.min(...lineCounts));
            stats.largestFile = stats.fileDetails[maxLinesIdx];
            stats.smallestFile = stats.fileDetails[minLinesIdx];

            // Calculate average complexity
            const complexityValues = stats.fileDetails.map(f => f.complexity.cyclomatic);
            if (complexityValues.length > 0) {
                stats.avgComplexity = complexityValues.reduce((sum, val) => sum + val, 0) / complexityValues.length;
            }
        }

        // Calculate directory averages and detailed stats
        const directoryEntries = Object.entries(stats.directoryStats);
        if (directoryEntries.length > 0) {
            // Calculate directory metrics
            const dirLines = directoryEntries.map(([, dirStats]) => dirStats.lines);
            const dirFiles = directoryEntries.map(([, dirStats]) => dirStats.files);

            stats.directoryAvgLines = dirLines.reduce((sum, val) => sum + val, 0) / dirLines.length;
            stats.directoryAvgFiles = dirFiles.reduce((sum, val) => sum + val, 0) / dirFiles.length;

            // Find largest directory by lines
            const maxLinesDirIdx = dirLines.indexOf(Math.max(...dirLines));
            stats.largestDirectory = directoryEntries[maxLinesDirIdx][1];

            // Find directory with most files
            const maxFilesDirIdx = dirFiles.indexOf(Math.max(...dirFiles));
            stats.mostFilesDirectory = directoryEntries[maxFilesDirIdx][1];

            // Create arrays for detailed directory analysis
            stats.largestDirectories = Object.values(stats.directoryStats)
                .sort((a, b) => (b.lines || 0) - (a.lines || 0))
                .slice(0, 20); // Using 20 instead of TOP_N

            stats.largestFileCountDirectories = Object.values(stats.directoryStats)
                .sort((a, b) => (b.files || 0) - (a.files || 0))
                .slice(0, 20);

            stats.complexityByDirectory = Object.values(stats.directoryStats)
                .sort((a, b) => (b.complexity || 0) - (a.complexity || 0))
                .slice(0, 20);

            stats.largestSizeDirectories = Object.values(stats.directoryStats)
                .sort((a, b) => (b.size || 0) - (a.size || 0))
                .slice(0, 20);

            // Calculate subdirectories statistics separately
            const allSubdirectories = [];
            for (const [, dirStats] of directoryEntries) {
                for (const subDir of dirStats.subdirectories) {
                    if (stats.directoryStats[subDir]) {
                        allSubdirectories.push(stats.directoryStats[subDir]);
                    }
                }
            }

            stats.largestSubdirectories = allSubdirectories
                .sort((a, b) => (b.lines || 0) - (a.lines || 0))
                .slice(0, 20);

            stats.subdirectoriesWithMostFiles = allSubdirectories
                .sort((a, b) => (b.files || 0) - (a.files || 0))
                .slice(0, 20);

            // Calculate directory averages by depth
            stats.directoryStatsByDepth = {};
            directoryEntries.forEach(([, dirStats]) => {
                const depth = dirStats.depth;
                if (!stats.directoryStatsByDepth[depth]) {
                    stats.directoryStatsByDepth[depth] = [];
                }
                stats.directoryStatsByDepth[depth].push(dirStats);
            });

            // Calculate avg metrics by depth
            for (const [depth, dirs] of Object.entries(stats.directoryStatsByDepth)) {
                if (dirs.length > 0) {
                    stats.directoryStatsByDepth[depth] = {
                        count: dirs.length,
                        avgLines: dirs.reduce((sum, d) => sum + (d.lines || 0), 0) / dirs.length,
                        avgFiles: dirs.reduce((sum, d) => sum + (d.files || 0), 0) / dirs.length,
                        avgComplexity: dirs.reduce((sum, d) => sum + (d.complexity || 0), 0) / dirs.length,
                        totalLines: dirs.reduce((sum, d) => sum + (d.lines || 0), 0),
                        totalFiles: dirs.reduce((sum, d) => sum + (d.files || 0), 0)
                    };
                }
            }
        }
    }
}