import fs from 'fs';
import path from 'path';
import {FileUtils} from '../../../util/FileUtils.js';
import {BaseAnalyzer} from './BaseAnalyzer.js';

export class TechnicalDebtAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Technical Debt Indicators...');

        return await this.safeAnalyze(async () => {
            const srcPath = './src';
            if (!fs.existsSync(srcPath)) {
                this.log('Source directory not found', 'error');
                return {error: 'src directory not found'};
            }

            const debtIndicators = {
                files: [],
                totalDebtScore: 0,
                highRiskFiles: [],
                refactoringTargets: [],
                debtByCategory: {
                    complexity: 0,
                    size: 0,
                    duplication: 0,
                    testCoverage: 0
                }
            };

            this._analyzeDirectory(srcPath, debtIndicators);

            // Calculate overall debt metrics
            debtIndicators.avgDebtScore = debtIndicators.files.length > 0
                ? debtIndicators.totalDebtScore / debtIndicators.files.length
                : 0;

            // Identify high-risk items
            debtIndicators.highRiskFiles = debtIndicators.files
                .filter(file => file.debtScore > 50)
                .sort((a, b) => b.debtScore - a.debtScore);

            debtIndicators.refactoringTargets = debtIndicators.files
                .filter(file => file.debtScore > 30)
                .sort((a, b) => b.debtScore - a.debtScore)
                .slice(0, 10);

            return debtIndicators;
        }, 'Technical debt analysis failed');
    }

    _analyzeDirectory(dir, debtIndicators) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                this._analyzeDirectory(fullPath, debtIndicators);
            } else if (item.isFile() && item.name.endsWith('.js')) {
                this._analyzeFile(fullPath, debtIndicators);
            }
        }
    }

    _analyzeFile(filePath, debtIndicators) {
        const relativePath = path.relative('.', filePath);

        // Skip excluded files using global exclusion
        if (FileUtils.isExcludedPath(relativePath)) {
            this.log(`Excluding file from debt analysis: ${relativePath}`, 'warn');
            return;
        }

        const content = this._readFileContent(filePath);
        if (!content) return;

        const lines = content.split('\n');
        const complexityMetrics = this.calculateComplexityMetrics(content);

        // Calculate debt score based on multiple factors
        let debtScore = 0;
        const indicators = [];

        // Complexity-based debt (higher weight for high cyclomatic complexity)
        if (complexityMetrics.cyclomatic > 10) {
            debtScore += (complexityMetrics.cyclomatic - 10) * 2;
            indicators.push(`high complexity (${complexityMetrics.cyclomatic})`);
            debtIndicators.debtByCategory.complexity += (complexityMetrics.cyclomatic - 10) * 2;
        }

        // Size-based debt (too many lines)
        if (lines.length > 200) {
            debtScore += Math.floor((lines.length - 200) / 50);
            indicators.push(`${lines.length} lines`);
            debtIndicators.debtByCategory.size += Math.floor((lines.length - 200) / 50);
        }

        // Deep nesting debt
        let nestingLevel = 0;
        let maxNesting = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('if') || trimmed.includes('if (') ||
                trimmed.startsWith('for') || trimmed.includes('for (') ||
                trimmed.startsWith('while') || trimmed.includes('while (') ||
                trimmed.startsWith('function') || trimmed.includes('function(')) {
                nestingLevel++;
                maxNesting = Math.max(maxNesting, nestingLevel);
            } else if (trimmed === '}' || trimmed.endsWith('}')) {
                nestingLevel = Math.max(0, nestingLevel - 1);
            }
        }
        if (maxNesting > 4) {
            debtScore += (maxNesting - 4) * 3;
            indicators.push(`deep nesting (${maxNesting} levels)`);
            debtIndicators.debtByCategory.complexity += (maxNesting - 4) * 3;
        }

        // Comment-to-code ratio (too low indicates missing documentation)
        const commentLines = lines.filter(line =>
            line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')
        ).length;
        const commentRatio = lines.length > 0 ? commentLines / lines.length : 0;
        if (commentRatio < 0.05) { // Less than 5% comments
            debtScore += 10;
            indicators.push(`low documentation (${Math.round(commentRatio * 100)}% comments)`);
        }

        // Large functions (more than 50 lines)
        const largeFunctions = this._countLargeFunctions(content);
        if (largeFunctions > 0) {
            debtScore += largeFunctions * 5;
            indicators.push(`${largeFunctions} large functions`);
        }

        // Duplicate code indicators (simplified detection)
        const duplicateIndicators = this._findDuplicatePatterns(content);
        if (duplicateIndicators > 0) {
            debtScore += duplicateIndicators * 3;
            indicators.push(`${duplicateIndicators} potential duplication patterns`);
            debtIndicators.debtByCategory.duplication += duplicateIndicators * 3;
        }

        const fileDebt = {
            path: relativePath,
            debtScore,
            lines: lines.length,
            complexity: complexityMetrics.cyclomatic,
            indicators,
            size: content.length
        };

        debtIndicators.files.push(fileDebt);
        debtIndicators.totalDebtScore += debtScore;
    }

    _readFileContent(filePath) {
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (readError) {
            this.log(`Cannot read file: ${filePath}`, 'warn', {error: readError.message});
            return null;
        }
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

    _countLargeFunctions(content) {
        const lines = content.split('\n');
        let largeFunctionCount = 0;
        let currentFunctionLines = 0;
        let inFunction = false;

        for (const line of lines) {
            if (line.trim().startsWith('function') ||
                line.trim().includes('=>') ||
                line.trim().startsWith('const') && line.includes('=>') ||
                line.trim().startsWith('var') && line.includes('=>') ||
                line.trim().startsWith('let') && line.includes('=>')) {
                if (inFunction && currentFunctionLines > 50) {
                    largeFunctionCount++;
                }
                inFunction = true;
                currentFunctionLines = 1;
            } else if (inFunction) {
                currentFunctionLines++;
                if (line.trim() === '}' && currentFunctionLines > 50) {
                    largeFunctionCount++;
                    inFunction = false;
                    currentFunctionLines = 0;
                } else if (line.trim() === '}') {
                    inFunction = false;
                    currentFunctionLines = 0;
                }
            }
        }

        // Check the last function if it wasn't closed properly
        if (inFunction && currentFunctionLines > 50) {
            largeFunctionCount++;
        }

        return largeFunctionCount;
    }

    _findDuplicatePatterns(content) {
        const lines = content.split('\n');
        const lineCounts = {};
        let duplicateCount = 0;

        // Count occurrences of each non-empty line
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
                lineCounts[trimmed] = (lineCounts[trimmed] || 0) + 1;
            }
        }

        // Count lines that appear more than 3 times as potential duplicates
        for (const [line, count] of Object.entries(lineCounts)) {
            if (count > 3) {
                duplicateCount++;
            }
        }

        return duplicateCount;
    }
}