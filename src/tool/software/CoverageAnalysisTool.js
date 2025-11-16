/**
 * @file src/tools/analysis/CoverageAnalysisTool.js
 * @description Tool for analyzing code coverage metrics
 */

import {SoftwareAnalysisTool} from './SoftwareAnalysisTool.js';
import fs from 'fs';
import path from 'path';
import {FileUtils} from '../../util/FileUtils.js';

/**
 * Tool for analyzing code coverage metrics
 */
export class CoverageAnalysisTool extends SoftwareAnalysisTool {
    constructor(config = {}) {
        super(config);
        this.name = 'CoverageAnalysisTool';
    }

    /**
     * Get tool description for discovery and documentation
     * @returns {string} - Tool description
     */
    getDescription() {
        return 'Analyzes code coverage metrics including lines, functions, and branch coverage';
    }

    /**
     * Get parameter schema for the tool
     * @returns {object} - Parameter schema
     */
    getParameterSchema() {
        return {
            type: 'object',
            properties: {
                verbose: {
                    type: 'boolean',
                    description: 'Enable verbose output',
                    default: false
                }
            },
            required: []
        };
    }

    /**
     * Perform the coverage analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    /**
     * Perform the coverage analysis
     * @param {object} params - Tool parameters
     * @param {object} context - Execution context
     * @returns {Promise<any>} - Analysis result
     */
    async performAnalysis(params, context) {
        const {verbose = false} = params;

        if (verbose) console.log('ℹ️ [CoverageAnalysisTool] Collecting Coverage Data...');

        // Load coverage summary
        const summaryPath = './coverage/coverage-summary.json';
        if (!fs.existsSync(summaryPath)) {
            if (verbose) console.log('❌ Coverage summary file not found');
            return {available: false, error: 'Coverage summary file not found'};
        }

        const coverageSummary = FileUtils.readJSONFile(summaryPath);
        if (!coverageSummary || !coverageSummary.total) {
            if (verbose) console.log('❌ Invalid coverage summary format');
            return {available: false, error: 'Invalid coverage summary format'};
        }

        const summary = coverageSummary.total;
        const coverageStats = {
            statements: summary.statements.pct,
            branches: summary.branches.pct,
            functions: summary.functions.pct,
            lines: summary.lines.pct,
            total: {
                statements: summary.statements.total,
                branches: summary.branches.total,
                functions: summary.functions.total,
                lines: summary.lines.total
            },
            covered: {
                statements: summary.statements.covered,
                branches: summary.branches.covered,
                functions: summary.functions.covered,
                lines: summary.lines.covered
            }
        };

        // Get detailed file analysis
        coverageStats.fileAnalysis = this._analyzeCoverageByFileFromSummary(coverageSummary, verbose);

        // Additional detailed analysis using coverage summary
        coverageStats.detailedAnalysis = this._analyzeDetailedCoverageFromSummary(coverageSummary);

        if (verbose) {
            console.log(`📊 Coverage: Lines: ${coverageStats.lines}%, Functions: ${coverageStats.functions}%, Branches: ${coverageStats.branches}%`);
        }

        return coverageStats;
    }

    /**
     * Analyze coverage by file using coverage summary data
     * @private
     */
    _analyzeCoverageByFileFromSummary(coverageSummary, verbose = false) {
        const TOP_N = 20;
        const files = [];

        // Skip the 'total' summary entry
        for (const [filePath, coverage] of Object.entries(coverageSummary)) {
            if (filePath === 'total') continue; // Skip summary entry

            // Validate coverage structure before accessing properties
            if (!coverage || typeof coverage !== 'object' || !coverage.lines) {
                if (verbose) console.log(`⚠️ Invalid coverage structure for file: ${filePath}`);
                continue;
            }

            const relativePath = path.relative(process.cwd(), filePath);

            // Skip excluded files
            if (FileUtils.isExcludedPath && FileUtils.isExcludedPath(relativePath)) {
                continue;
            }

            const lineCoverage = coverage.lines.pct;
            const statementCoverage = coverage.statements.pct;
            const statements = coverage.statements.total;
            const covered = coverage.statements.covered;
            const lines = coverage.lines.total;
            const coveredLines = coverage.lines.covered;

            let fileSize = 0;
            try {
                if (fs.existsSync(filePath)) {
                    fileSize = fs.statSync(filePath).size;
                }
            } catch (e) {
                // If we can't get file size, continue with 0
            }

            files.push({
                filePath: relativePath,
                lineCoverage: parseFloat(lineCoverage.toFixed(2)),
                statements: statements,
                covered: covered,
                uncovered: statements - covered,
                size: fileSize
            });
        }

        files.sort((a, b) => {
            if (a.lineCoverage !== b.lineCoverage) {
                return a.lineCoverage - b.lineCoverage;
            }
            if (a.size !== b.size) {
                return b.size - a.size;
            }
            return b.statements - a.statements;
        });

        return files.slice(0, TOP_N);
    }

    /**
     * Analyze detailed coverage by file and directory using coverage summary
     * @private
     */
    _analyzeDetailedCoverageFromSummary(coverageSummary) {
        const detailedAnalysis = {
            lowCoverageFiles: [],
            coverageByDirectory: {},
            uncoveredBlocks: [],
            directoriesSorted: []
        };

        // Collect file-level data for processing
        const fileCoverageData = [];

        // Analyze each file in detail
        for (const [filePath, fileCoverage] of Object.entries(coverageSummary)) {
            if (filePath === 'total') continue; // Skip summary entry

            const relativePath = path.relative(process.cwd(), filePath);
            const directory = path.dirname(relativePath);

            // Initialize directory stats
            if (!detailedAnalysis.coverageByDirectory[directory]) {
                detailedAnalysis.coverageByDirectory[directory] = {
                    files: 0,
                    statements: 0,
                    covered: 0,
                    coveragePercent: 0
                };
            }

            // Calculate file coverage from summary format
            if (fileCoverage && fileCoverage.lines) {
                const fileCoveragePercent = fileCoverage.lines.pct;

                // Add to low coverage files if below threshold
                if (fileCoveragePercent < 50) {
                    detailedAnalysis.lowCoverageFiles.push({
                        filePath: relativePath,
                        coverage: parseFloat(fileCoveragePercent.toFixed(2)),
                        statements: fileCoverage.statements.total,
                        covered: fileCoverage.statements.covered
                    });
                }

                // Store for processing
                fileCoverageData.push({
                    filePath: relativePath,
                    directory: directory,
                    coverage: fileCoveragePercent,
                    statements: fileCoverage.statements.total,
                    covered: fileCoverage.statements.covered,
                    uncovered: fileCoverage.statements.total - fileCoverage.statements.covered
                });

                // Update directory stats
                detailedAnalysis.coverageByDirectory[directory].files++;
                detailedAnalysis.coverageByDirectory[directory].statements += fileCoverage.statements.total;
                detailedAnalysis.coverageByDirectory[directory].covered += fileCoverage.statements.covered;
            }
        }

        // Calculate directory coverage percentages
        for (const [dir, stats] of Object.entries(detailedAnalysis.coverageByDirectory)) {
            stats.coveragePercent = stats.statements > 0 ? (stats.covered / stats.statements) * 100 : 100;
        }

        // Sort low coverage files by coverage percentage (ascending)
        detailedAnalysis.lowCoverageFiles.sort((a, b) => a.coverage - b.coverage);

        // Sort directories by coverage percentage (ascending)
        detailedAnalysis.directoriesSorted = Object.entries(detailedAnalysis.coverageByDirectory)
            .map(([dir, stats]) => ({directory: dir, ...stats}))
            .sort((a, b) => a.coveragePercent - b.coveragePercent);

        return detailedAnalysis;
    }
}