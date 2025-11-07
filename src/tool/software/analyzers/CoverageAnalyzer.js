import fs from 'fs';
import path from 'path';
import * as dfd from 'danfojs';
import {CoverageUtils} from '../../../util/CoverageUtils.js';
import {FileAnalyzer} from '../../../util/FileAnalyzer.js';
import {FileUtils} from '../../../util/FileUtils.js';
import {BaseAnalyzer} from './BaseAnalyzer.js';

const TOP_N = 20;

export class CoverageAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Coverage Data...');

        // First, try to find existing coverage data
        let coverageFile = CoverageUtils.findCoverageFile();

        if (!coverageFile) {
            this.log('No existing coverage data found, generating...');
            const generated = await CoverageUtils.generateCoverage();
            if (!generated) {
                this.log('❌ Failed to generate coverage data', 'error');
                return {available: false, error: 'Could not generate coverage data'};
            }

            coverageFile = CoverageUtils.findCoverageFile();
            if (!coverageFile) {
                this.log('❌ Coverage file not found after generation', 'error');
                return {available: false, error: 'Coverage file not found after generation'};
            }
        }

        // Load coverage summary
        const summaryPath = './coverage/coverage-summary.json';
        if (!fs.existsSync(summaryPath)) {
            this.log('❌ Coverage summary file not found', 'error');
            return {available: false, error: 'Coverage summary file not found'};
        }

        const coverageSummary = FileUtils.readJSONFile(summaryPath);
        if (!coverageSummary || !coverageSummary.total) {
            this.log('❌ Invalid coverage summary format', 'error');
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

        coverageStats.fileAnalysis = FileUtils.analyzeCoverageByFile(this.verbose);

        // Additional detailed analysis
        coverageStats.detailedAnalysis = this._analyzeDetailedCoverage();

        return coverageStats;
    }

    _analyzeDetailedCoverage() {
        const finalCoveragePath = './coverage/coverage-final.json';
        if (!fs.existsSync(finalCoveragePath)) {
            return {
                lowCoverageFiles: [],
                coverageByDirectory: {},
                uncoveredBlocks: []
            };
        }

        const coverageData = FileUtils.readJSONFile(finalCoveragePath);
        if (!coverageData) {
            return {
                lowCoverageFiles: [],
                coverageByDirectory: {},
                uncoveredBlocks: []
            };
        }

        const detailedAnalysis = {
            lowCoverageFiles: [],
            coverageByDirectory: {},
            uncoveredBlocks: []
        };

        // Collect file-level data for DataFrame processing
        const fileCoverageData = [];

        // Analyze each file in detail
        for (const [filePath, fileCoverage] of Object.entries(coverageData)) {
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

            // Calculate file coverage
            if (fileCoverage && fileCoverage.s) {
                const statements = fileCoverage.s;
                const covered = Object.values(statements).filter(count => count > 0).length;
                const total = Object.keys(statements).length;
                const fileCoveragePercent = total > 0 ? (covered / total) * 100 : 100;

                // Add to low coverage files if below threshold
                if (fileCoveragePercent < 50) {
                    detailedAnalysis.lowCoverageFiles.push({
                        filePath: relativePath,
                        coverage: parseFloat(fileCoveragePercent.toFixed(2)),
                        statements: total,
                        covered: covered
                    });
                }

                // Store for DataFrame processing
                fileCoverageData.push({
                    filePath: relativePath,
                    directory: directory,
                    coverage: fileCoveragePercent,
                    statements: total,
                    covered: covered,
                    uncovered: total - covered
                });

                // Update directory stats
                detailedAnalysis.coverageByDirectory[directory].files++;
                detailedAnalysis.coverageByDirectory[directory].statements += total;
                detailedAnalysis.coverageByDirectory[directory].covered += covered;
            }
        }

        // Calculate directory coverage percentages
        for (const [dir, stats] of Object.entries(detailedAnalysis.coverageByDirectory)) {
            stats.coveragePercent = stats.statements > 0 ? (stats.covered / stats.statements) * 100 : 100;
        }

        // Use danfojs for advanced analysis
        try {
            if (fileCoverageData.length > 0) {
                const coverageDf = new dfd.DataFrame(fileCoverageData);

                // Filter low coverage files using danfojs
                const coverageSeries = coverageDf['coverage'];
                const lowCoverageIndices = [];
                for (let i = 0; i < coverageSeries.values.length; i++) {
                    if (coverageSeries.values[i] < 50) {
                        lowCoverageIndices.push(i);
                    }
                }

                if (lowCoverageIndices.length > 0) {
                    const lowCoverageDf = coverageDf.iloc({rows: lowCoverageIndices});

                    // danfojs may not support sort_values directly, use JavaScript sort for compatibility
                    // Extract the rows and sort them manually
                    const filteredData = lowCoverageDf.values.map((row, idx) => ({
                        filePath: lowCoverageDf.columns.includes('filePath') ? row[lowCoverageDf.columns.indexOf('filePath')] : fileCoverageData[lowCoverageIndices[idx]].filePath,
                        coverage: lowCoverageDf.columns.includes('coverage') ? row[lowCoverageDf.columns.indexOf('coverage')] : fileCoverageData[lowCoverageIndices[idx]].coverage,
                        statements: lowCoverageDf.columns.includes('statements') ? row[lowCoverageDf.columns.indexOf('statements')] : fileCoverageData[lowCoverageIndices[idx]].statements,
                        covered: lowCoverageDf.columns.includes('covered') ? row[lowCoverageDf.columns.indexOf('covered')] : fileCoverageData[lowCoverageIndices[idx]].covered
                    })).sort((a, b) => a.coverage - b.coverage);

                    detailedAnalysis.lowCoverageFiles = filteredData.map(item => ({
                        filePath: item.filePath,
                        coverage: parseFloat(item.coverage.toFixed(2)),
                        statements: item.statements,
                        covered: item.covered
                    }));
                }
            }
        } catch (error) {
            this.log(`⚠️ Error processing coverage with danfojs: ${error.message}`, 'warn');
            // Fallback to original sorting
            detailedAnalysis.lowCoverageFiles.sort((a, b) => a.coverage - b.coverage);
        }

        // Use danfojs for directory analysis as well
        try {
            const dirData = Object.entries(detailedAnalysis.coverageByDirectory)
                .map(([dir, stats]) => ({directory: dir, ...stats}));

            if (dirData.length > 0) {
                // danfojs may not support sort_values directly, use JavaScript sort for compatibility
                detailedAnalysis.directoriesSorted = dirData.sort((a, b) => a.coveragePercent - b.coveragePercent);
            }
        } catch (error) {
            this.log(`⚠️ Error processing directory data with danfojs: ${error.message}`, 'warn');
            // Fallback to original sorting
            detailedAnalysis.directoriesSorted = Object.entries(detailedAnalysis.coverageByDirectory)
                .map(([dir, stats]) => ({directory: dir, ...stats}))
                .sort((a, b) => a.coveragePercent - b.coveragePercent);
        }

        return detailedAnalysis;
    }
}