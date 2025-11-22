import * as DisplayUtils from '../../../util/DisplayUtils.js';
import { formatNumber, formatPercentage, formatFileSize, truncateText } from '../../../util/Format.js';
import path from 'path';

export class ResultDisplay {
    constructor(options) {
        this.options = options;
    }

    display(results) {
        if (this.options.summaryOnly) {
            this.printSummary(results);
        } else if (this.options.verbose) {
            this.printDetailed(results);
        } else {
            this.printConcise(results);
            // Always show actionable insights by default (not just in summary mode)
            this._printActionableInsights(results);
        }
    }

    printSummary(results) {
        console.log('📋 PROJECT SUMMARY:');

        if (results.project && !results.project.error) {
            console.log(`  📦 ${results.project.name} v${results.project.version}`);
            console.log(`     Dependencies: ${formatNumber(results.project.dependencies)} regular, ${formatNumber(results.project.devDependencies)} dev`);
        }

        if (results.tests && !results.tests.error) {
            const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
            const statusEmoji = passRate >= 95 ? '✅' : passRate >= 80 ? '⚠️' : '❌';
            console.log(`  🧪 Tests: ${formatNumber(results.tests.passedTests)}/${formatNumber(results.tests.totalTests)} (${formatPercentage(passRate / 100)}) ${statusEmoji}`);

            if (results.tests.failedTests > 0) {
                console.log(`     ⚠️  ${formatNumber(results.tests.failedTests)} failed tests need attention`);
            }
            if (results.tests.failedTests === 0 && results.tests.passedTests > 0) {
                console.log(`     ✅ All tests passing - good stability`);
            }
        }

        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            const coverageStatus = results.coverage.lines >= 80 ? '✅' : results.coverage.lines >= 50 ? '⚠️' : '❌';
            console.log(`  📊 Coverage: ${formatPercentage(results.coverage.lines / 100)} lines ${coverageStatus}`);

            if (results.coverage.lines < 80) {
                console.log(`     ⚠️  Consider adding more tests for better coverage`);
            } else {
                console.log(`     ✅ Good test coverage - code reliability likely high`);
            }
        }

        if (results.static && !results.static.error) {
            console.log(`  📁 Code: ${formatNumber(results.static.jsFiles)} files, ~${formatNumber(results.static.totalLines)} lines`);
            console.log(`     Avg: ${results.static.avgLinesPerFile}/file, ${formatNumber(results.static.directories)} dirs`);

            // Add insights about code health
            if (results.static.avgLinesPerFile > 300) {
                console.log(`     ⚠️  High avg lines per file - consider refactoring large files`);
            } else {
                console.log(`     ✅ Reasonable file sizes - good maintainability`);
            }

            // Identify potentially risky areas
            if (results.static.largestFile && results.static.largestFile.lines > 1000) {
                console.log(`     ⚠️  Largest file: ${results.static.largestFile.path} (${formatNumber(results.static.largestFile.lines)} lines) - potential refactoring target`);
            }

            if (results.static.largestDirectories && results.static.largestDirectories.length > 0) {
                const largestDir = results.static.largestDirectories[0];
                console.log(`     🏗️  Largest directory: ${largestDir.path} (${formatNumber(largestDir.lines)} lines) - major code area`);
            }

            if (results.static.avgComplexity && results.static.avgComplexity > 20) {
                console.log(`     ⚠️  High avg complexity (${results.static.avgComplexity.toFixed(2)}) - consider simplification`);
            } else if (results.static.avgComplexity) {
                console.log(`     ✅ Reasonable complexity (${results.static.avgComplexity.toFixed(2)}) - good maintainability`);
            }
        }

        if (results.requirements && !results.requirements.error) {
            const complianceStatus = results.requirements.complianceScore >= 90 ? '✅' : results.requirements.complianceScore >= 70 ? '⚠️' : '❌';
            console.log(`  📋 README: ${formatPercentage(results.requirements.complianceScore / 100)} compliance ${complianceStatus}`);

            if (results.requirements.complianceScore < 80) {
                console.log(`     ⚠️  Consider improving documentation coverage`);
            } else {
                console.log(`     ✅ Good documentation coverage - project well-documented`);
            }
        }

        // Add actionable insights summary
        this._printActionableInsights(results);
    }

    _printActionableInsights(results) {
        console.log('\n💡 ACTIONABLE INSIGHTS:');

        const insights = [];
        const risks = [];
        const recommendations = [];
        const planningIndicators = [];

        // Test insights
        if (results.tests && !results.tests.error) {
            if (results.tests.failedTests > 0) {
                insights.push(`Fix ${formatNumber(results.tests.failedTests)} failing tests to ensure stability`);
                risks.push(`${formatNumber(results.tests.failedTests)} failing tests indicate potential instability`);
            }
            if (results.coverage && results.coverage.lines < 80) {
                insights.push(`Improve test coverage (${formatPercentage(results.coverage.lines / 100)} < 80%) to catch potential issues`);
                risks.push(`Low test coverage (${formatPercentage(results.coverage.lines / 100)}) increases bug risk`);
            }
        }

        // Code structure insights
        if (results.static && !results.static.error) {
            if (results.static.avgLinesPerFile > 300) {
                insights.push(`Refactor large files (avg > 300 lines) to improve maintainability`);
                risks.push(`High avg file size (${formatNumber(results.static.avgLinesPerFile)}) may complicate maintenance`);
            }
            if (results.static.avgComplexity > 20) {
                insights.push(`Simplify complex code (avg complexity > 20) to reduce bugs`);
                risks.push(`High avg complexity (${results.static.avgComplexity.toFixed(2)}) increases bug risk`);
            }
            if (results.static.largestFile && results.static.largestFile.lines > 1000) {
                insights.push(`Split ${results.static.largestFile.path} (${formatNumber(results.static.largestFile.lines)} lines) into smaller modules`);
                risks.push(`Very large file (${results.static.largestFile.path}) is a maintenance risk`);
            }

            // Risk metrics insights
            if (results.static.riskMetrics) {
                if (results.static.riskMetrics.highRiskFiles.length > 0) {
                    risks.push(`${formatNumber(results.static.riskMetrics.highRiskFiles.length)} high-risk files need attention`);
                    recommendations.push(`Focus on refactoring high-risk files: ${results.static.riskMetrics.highRiskFiles.slice(0, 3).map(f => path.basename(f.path)).join(', ')}`);
                }

                if (results.static.riskMetrics.overallRiskScore > 200) {
                    risks.push(`High overall risk score (${results.static.riskMetrics.overallRiskScore.toFixed(1)}) indicates technical debt`);
                }
            }
        }

        // Add directory-specific insights
        if (results.static && results.static.largestDirectories && results.static.largestDirectories.length > 0) {
            const largestDir = results.static.largestDirectories[0];
            if (largestDir.lines > 5000) {
                insights.push(`Consider splitting ${largestDir.path} (${formatNumber(largestDir.lines)} lines) for better organization`);
                risks.push(`Large directory (${largestDir.path}) may benefit from modularization`);
            }
        }

        // Coverage insights
        if (results.coverage && results.coverage.detailedAnalysis && results.coverage.detailedAnalysis.lowCoverageFiles) {
            const lowCoverageCount = results.coverage.detailedAnalysis.lowCoverageFiles.filter(f => f.coverage < 30).length;
            if (lowCoverageCount > 0) {
                insights.push(`Focus on testing ${formatNumber(lowCoverageCount)} critically low-coverage files (<30%)`);
                risks.push(`${formatNumber(lowCoverageCount)} low-coverage files pose quality risks`);
            }
        }

        // Technical debt insights
        if (results.technicaldebt && !results.technicaldebt.error && results.technicaldebt.highRiskFiles) {
            if (results.technicaldebt.highRiskFiles.length > 0) {
                insights.push(`Address technical debt in ${formatNumber(results.technicaldebt.highRiskFiles.length)} high-debt files`);
                risks.push(`High technical debt (${results.technicaldebt.totalDebtScore.toFixed(1)} score) slows development`);
                recommendations.push(`Target top debt files: ${results.technicaldebt.highRiskFiles.slice(0, 3).map(f => path.basename(f.path)).join(', ')}`);
            }
        }

        // Architecture insights
        if (results.architecture && !results.architecture.error) {
            if (results.architecture.cyclicDependencies.length > 0) {
                risks.push(`${formatNumber(results.architecture.cyclicDependencies.length)} cyclic dependencies detected`);
                recommendations.push(`Resolve cyclic dependencies to improve modularity`);
            }

            if (results.architecture.apiEntryPoints.length > 0) {
                planningIndicators.push(`Identified ${formatNumber(results.architecture.apiEntryPoints.length)} main entry points`);
            }
        }

        // Planning insights
        if (results.planning && !results.planning.error) {
            if (results.planning.developmentVelocity.developmentPace) {
                planningIndicators.push(`Development pace: ${results.planning.developmentVelocity.developmentPace}`);
            }
        }

        // Test coverage analysis insights
        if (results.testcoverage && !results.testcoverage.error) {
            const tc = results.testcoverage;

            // Add insights about test coverage relationships
            if (tc.passingTestSupports?.topSupports?.length > 0) {
                const topFile = tc.passingTestSupports.topSupports[0];
                insights.push(`Key well-tested file: ${path.basename(topFile.sourceFile)} (${topFile.passingTestCount} tests)`);
            }

            if (tc.passingTestSupports?.bottomSupports?.length > 0) {
                const bottomFiles = tc.passingTestSupports.bottomSupports.slice(0, 3);
                const bottomFileNames = bottomFiles.map(f => path.basename(f.sourceFile)).join(', ');
                recommendations.push(`Improve testing of least-tested files: ${bottomFileNames} (${bottomFiles[0].passingTestCount} tests each)`);
            }

            if (tc.causalAnalysis) {
                const {highCausalFiles, lowCausalFiles} = tc.causalAnalysis;
                if (highCausalFiles?.length > 0) {
                    const topCausalFile = highCausalFiles[0];
                    insights.push(`Most tested file: ${path.basename(topCausalFile.sourceFile)} (${topCausalFile.testCount} tests)`);
                }

                if (lowCausalFiles?.length > 0) {
                    const lowCausalFilesSample = lowCausalFiles.slice(0, 3);
                    const lowCausalNames = lowCausalFilesSample.map(f => path.basename(f.sourceFile)).join(', ');
                    recommendations.push(`Focus on testing low-coverage files: ${lowCausalNames} (${lowCausalFilesSample[0].testCount} tests each)`);
                }
            }
        }

        if (insights.length === 0) {
            insights.push('Codebase appears healthy based on current metrics');
        }

        console.log(`  Primary focus areas: ${insights.length > 0 ? insights[0] : 'None identified'}`);

        if (risks.length > 0) {
            console.log(`  Key risks: ${risks[0]}`);
            if (risks.length > 1) {
                console.log(`  Additional risks: ${risks.slice(1, 2).join('; ')}`);
            }
        }

        if (recommendations.length > 0) {
            console.log(`  Specific recommendations: ${recommendations[0]}`);
            if (recommendations.length > 1) {
                console.log(`  More recommendations: ${recommendations.slice(1, 2).join('; ')}`);
            }
        }

        if (planningIndicators.length > 0) {
            console.log(`  Planning indicators: ${planningIndicators[0]}`);
            if (planningIndicators.length > 1) {
                console.log(`  Additional: ${planningIndicators.slice(1, 2).join('; ')}`);
            }
        }
    }

    printConcise(results) {
        console.log('\n📊 PROJECT OVERVIEW:');

        if (results.project && !results.project.error) {
            console.log(`  Project: ${results.project.name} v${results.project.version}`);
            console.log(`  Dependencies: ${results.project.dependencies} regular, ${results.project.devDependencies} dev`);
            console.log(`  Scripts: ${results.project.scripts} defined`);
        }

        if (results.tests && !results.tests.error) {
            const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
            console.log(`  Tests: ${results.tests.passedTests}/${results.tests.totalTests} passed (${passRate}%)`);
            const status = passRate >= 95 ? '✅ Excellent' : passRate >= 80 ? '⚠️ Good' : '❌ Needs attention';
            console.log(`  Status: ${status}`);
            console.log(`  Failed: ${results.tests.failedTests}, Todo: ${results.tests.todoTests}, Skipped: ${results.tests.skippedTests}`);
            console.log(`  Suites: ${results.tests.testSuites}, Files: ${results.tests.testFiles.length}`);
        }

        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            console.log(`  Coverage: Lines: ${results.coverage.lines}%, Functions: ${results.coverage.functions}%, Branches: ${results.coverage.branches}%`);
            console.log(`  Status: ${results.coverage.lines >= 80 ? '✅ Good' : results.coverage.lines >= 50 ? '⚠️ Moderate' : '❌ Low'}`);
        }

        if (results.static && !results.static.error) {
            console.log(`  Code: ${results.static.jsFiles} JS files, ~${results.static.totalLines} lines`);
            console.log(`  Avg: ${results.static.avgLinesPerFile}/file, Median: ${results.static.medianLinesPerFile}/file`);
            console.log(`  Directories: ${results.static.directories}, Types: ${Object.keys(results.static.filesByType).length}`);
        }

        if (results.requirements && !results.requirements.error) {
            console.log(`  Documentation: ${results.requirements.complianceScore}% compliance (${results.requirements.satisfiedRequirements}/${results.requirements.totalRequirements})`);
            const complianceStatus = results.requirements.complianceScore >= 90 ? '✅ Excellent' : results.requirements.complianceScore >= 70 ? '⚠️ Good' : '❌ Needs work';
            console.log(`  Status: ${complianceStatus}`);
        }

        // Show test coverage analysis summary if available
        if (results.tests && results.tests.coverageAnalysis) {
            const coverage = results.tests.coverageAnalysis;
            console.log(`  Test Coverage Analysis:`);

            if (coverage.topFailingTestContributors && coverage.topFailingTestContributors.length > 0) {
                const topFailing = coverage.topFailingTestContributors[0];
                console.log(`    Top culprit: ${topFailing.file} (${topFailing.count} failing tests)`);
            }

            if (coverage.topPassingTestSupporters && coverage.topPassingTestSupporters.length > 0) {
                const topSupporter = coverage.topPassingTestSupporters[0];
                console.log(`    Top supporter: ${topSupporter.file} (${topSupporter.count} passing tests)`);
            }
        }

        // Show test coverage analysis from new tool if available
        if (results.testcoverage && !results.testcoverage.error) {
            const coverage = results.testcoverage;
            console.log(`  Test Coverage Analysis:`);

            if (coverage.failingTestCulprits && coverage.failingTestCulprits.length > 0) {
                const topCulprit = coverage.failingTestCulprits[0];
                console.log(`    Top culprit: ${topCulprit.sourceFile} (${topCulprit.failingTestCount} failing tests)`);
            } else {
                console.log(`    No failing tests to analyze for culprits`);
            }

            if (coverage.passingTestSupports && coverage.passingTestSupports.topSupports && coverage.passingTestSupports.topSupports.length > 0) {
                const topSupporter = coverage.passingTestSupports.topSupports[0];
                console.log(`    Top supporter: ${topSupporter.sourceFile} (${topSupporter.passingTestCount} passing tests)`);
            }
        }
    }

    printDetailed(results) {
        console.log('\n📊 PROJECT METRICS:');
        if (results.project && !results.project.error) {
            console.log(DisplayUtils.formatKeyValuePairs(results.project, '  ', true));
        } else {
            console.log('  ❌ Project info unavailable');
        }

        console.log('\n🧪 TESTING METRICS:');
        if (results.tests && !results.tests.error) {
            const testMetrics = {
                totalTests: results.tests.totalTests,
                passed: results.tests.passedTests,
                failed: results.tests.failedTests,
                skipped: results.tests.skippedTests || 0,
                todo: results.tests.todoTests || 0,
                suites: results.tests.testSuites,
                passRate: `${Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100)}%`
            };
            console.log(DisplayUtils.formatKeyValuePairs(testMetrics));

            const passRate = Math.round((results.tests.passedTests / Math.max(results.tests.totalTests, 1)) * 100);
            const status = passRate >= 95 ? '✅ Excellent' : passRate >= 80 ? '⚠️ Good but needs improvement' : '❌ Needs attention';
            console.log(`  Status: ${status}`);

            if (results.tests.testFiles) console.log(`  Test Files: ${results.tests.testFiles.length} found`);

            // Show failure analysis if there were failures
            if (results.tests.failureAnalysis && results.tests.failureAnalysis.totalFailed > 0) {
                console.log(`  Failure Analysis:`);
                console.log(`    Total Failed: ${results.tests.failureAnalysis.totalFailed}`);

                if (results.tests.failureAnalysis.failurePatterns.length > 0) {
                    console.log(`    Failure Patterns:`);
                    results.tests.failureAnalysis.failurePatterns.forEach(pattern => {
                        console.log(`      - ${pattern.type}: ${pattern.count} occurrences (${pattern.percentage}%)`);
                    });
                }

                if (results.tests.failureAnalysis.likelyCauses.length > 0) {
                    console.log(`    Likely Causes:`);
                    results.tests.failureAnalysis.likelyCauses.forEach(cause => {
                        console.log(`      - ${cause.description} [${cause.severity}]`);
                    });
                }
            }

            // Show slowest tests by directory if available
            if (results.tests.slowestTests && typeof results.tests.slowestTests === 'object' && results.tests.slowestTests.byDirectory) {
                console.log(`  Slowest Tests by Directory:`);
                const slowestByDir = results.tests.slowestTests.byDirectory;
                const topDirs = Object.entries(slowestByDir)
                    .filter(([, tests]) => tests.length > 0)
                    .slice(0, 5);

                for (const [dir, tests] of topDirs) {
                    console.log(`    ${dir}:`);
                    tests.slice(0, 3).forEach(test => {
                        console.log(`      - ${test.name} (${test.duration}ms)`);
                    });
                }
            }

            // Show coverage analysis if available
            if (results.tests.coverageAnalysis) {
                const coverage = results.tests.coverageAnalysis;

                if (coverage.topFailingTestContributors && coverage.topFailingTestContributors.length > 0) {
                    console.log(`  Top Failing Test Contributors:`);
                    coverage.topFailingTestContributors.slice(0, 5).forEach(contributor => {
                        console.log(`    - ${contributor.file}: ${contributor.count} failing tests`);
                        if (contributor.details && contributor.details.failureTypes) {
                            const failureTypes = Object.entries(contributor.details.failureTypes)
                                .map(([type, count]) => `${type}: ${count}`)
                                .join(', ');
                            if (failureTypes) {
                                console.log(`      Failure types: ${failureTypes}`);
                            }
                        }
                    });
                }

                if (coverage.topPassingTestSupporters && coverage.topPassingTestSupporters.length > 0) {
                    console.log(`  Top Passing Test Supporters:`);
                    coverage.topPassingTestSupporters.slice(0, 5).forEach(supporter => {
                        console.log(`    - ${supporter.file}: ${supporter.count} passing tests`);
                        if (supporter.details && supporter.details.avgDuration) {
                            console.log(`      Avg duration: ${supporter.details.avgDuration.toFixed(2)}ms`);
                        }
                    });
                }

                if (coverage.bottomPassingTestSupporters && coverage.bottomPassingTestSupporters.length > 0) {
                    console.log(`  Bottom Passing Test Supporters:`);
                    coverage.bottomPassingTestSupporters.slice(0, 5).forEach(supporter => {
                        console.log(`    - ${supporter.file}: ${supporter.count} passing tests`);
                        if (supporter.details && supporter.details.avgDuration) {
                            console.log(`      Avg duration: ${supporter.details.avgDuration.toFixed(2)}ms`);
                        }
                    });
                }

                if (coverage.detailedFailingTestContributors && coverage.detailedFailingTestContributors.length > 0) {
                    console.log(`  Detailed Failing Test Analysis:`);
                    coverage.detailedFailingTestContributors.slice(0, 3).forEach(contributor => {
                        console.log(`    - ${contributor.file}: ${contributor.failureCount} failures`);
                        console.log(`      Avg duration: ${contributor.avgDuration.toFixed(2)}ms`);
                        const patterns = Object.entries(contributor.failurePatterns)
                            .map(([pattern, count]) => `${pattern}: ${count}`)
                            .join(', ');
                        if (patterns) {
                            console.log(`      Patterns: ${patterns}`);
                        }
                    });
                }

                if (coverage.detailedPassingTestSupporters && coverage.detailedPassingTestSupporters.length > 0) {
                    console.log(`  Detailed Passing Test Analysis:`);
                    coverage.detailedPassingTestSupporters.slice(0, 3).forEach(supporter => {
                        console.log(`    - ${supporter.file}: ${supporter.successCount} successes`);
                        console.log(`      Avg duration: ${supporter.avgDuration.toFixed(2)}ms`);
                        console.log(`      Duration range: ${supporter.minDuration.toFixed(2)}-${supporter.maxDuration.toFixed(2)}ms`);
                    });
                }
            }
        } else {
            console.log('  ❌ Test metrics unavailable');
        }

        // Add test coverage analysis from new tool format
        if (results.testcoverage && !results.testcoverage.error) {
            const testCoverage = results.testcoverage;

            if (testCoverage.failingTestCulprits && testCoverage.failingTestCulprits.length > 0) {
                console.log(`  Top Failing Test Culprits:`);
                testCoverage.failingTestCulprits.slice(0, 5).forEach(culprit => {
                    console.log(`    - ${culprit.sourceFile}: ${culprit.failingTestCount} failing tests`);
                });
            } else {
                // Even if no failing tests, still show the status
                console.log(`  No failing tests to analyze for culprits (all ${testCoverage.summary?.passedTests || 'N/A'} tests passing)`);
            }

            if (testCoverage.passingTestSupports && testCoverage.passingTestSupports.topSupports && testCoverage.passingTestSupports.topSupports.length > 0) {
                console.log(`  Top Passing Test Supports:`);
                testCoverage.passingTestSupports.topSupports.slice(0, 5).forEach(support => {
                    console.log(`    - ${support.sourceFile}: ${support.passingTestCount} passing tests`);
                });
            }

            if (testCoverage.passingTestSupports && testCoverage.passingTestSupports.bottomSupports && testCoverage.passingTestSupports.bottomSupports.length > 0) {
                console.log(`  Least Tested Files:`);
                testCoverage.passingTestSupports.bottomSupports.slice(0, 5).forEach(support => {
                    console.log(`    - ${support.sourceFile}: ${support.passingTestCount} passing tests`);
                });
            }

            // Causal analysis
            if (testCoverage.causalAnalysis) {
                const {highCausalFiles, lowCausalFiles} = testCoverage.causalAnalysis;

                if (highCausalFiles && highCausalFiles.length > 0) {
                    console.log(`  Most Tested Files:`);
                    highCausalFiles.slice(0, 5).forEach(file => {
                        console.log(`    - ${file.sourceFile}: ${file.testCount} tests`);
                    });
                }

                if (lowCausalFiles && lowCausalFiles.length > 0) {
                    console.log(`  Least Tested Files:`);
                    lowCausalFiles.slice(0, 5).forEach(file => {
                        console.log(`    - ${file.sourceFile}: ${file.testCount} tests`);
                    });
                }
            }
        }

        console.log('\n🔍 COVERAGE METRICS:');
        if (results.coverage && !results.coverage.error && results.coverage.available !== false) {
            const coverageMetrics = {
                lines: `${results.coverage.lines}%`,
                functions: `${results.coverage.functions}%`,
                branches: `${results.coverage.branches}%`,
                statements: `${results.coverage.statements}%`
            };
            console.log(DisplayUtils.formatKeyValuePairs(coverageMetrics));

            if (results.coverage.fileAnalysis && results.coverage.fileAnalysis.length > 0) {
                console.log(`  Lowest coverage files:`);
                results.coverage.fileAnalysis.slice(0, 5).forEach((file, idx) => {
                    console.log(`    ${idx + 1}. ${file.filePath} (${file.lineCoverage}%)`);
                });
            }

            // Show detailed coverage analysis if available
            if (results.coverage.detailedAnalysis) {
                const lowCoverageFiles = results.coverage.detailedAnalysis.lowCoverageFiles;
                if (lowCoverageFiles && lowCoverageFiles.length > 0) {
                    console.log(`  Critical low-coverage files (<50%):`);
                    lowCoverageFiles.slice(0, 5).forEach(file => {
                        console.log(`    - ${file.filePath} (${file.coverage}%)`);
                    });
                }

                const dirCoverage = results.coverage.detailedAnalysis.coverageByDirectory;
                if (dirCoverage) {
                    console.log(`  Coverage by directory:`);
                    const sortedDirs = Object.entries(dirCoverage)
                        .map(([dir, stats]) => ({directory: dir, ...stats}))
                        .sort((a, b) => a.coveragePercent - b.coveragePercent);

                    sortedDirs.slice(0, 5).forEach(dir => {
                        console.log(`    - ${dir.directory}: ${dir.coveragePercent.toFixed(2)}% (${dir.files} files)`);
                    });
                }
            }
        } else {
            console.log('  ❌ Coverage metrics unavailable');
        }

        console.log('\n📁 CODE STRUCTURE:');
        if (results.static && !results.static.error) {
            const structureMetrics = {
                jsFiles: results.static.jsFiles,
                totalLines: results.static.totalLines,
                directories: results.static.directories,
                avgLinesPerFile: results.static.avgLinesPerFile,
                medianLinesPerFile: results.static.medianLinesPerFile,
                avgComplexity: results.static.avgComplexity ? results.static.avgComplexity.toFixed(2) : undefined,
                avgFunctionsPerFile: results.static.avgFunctionCount ? results.static.avgFunctionCount.toFixed(2) : undefined
            };
            console.log(DisplayUtils.formatKeyValuePairs(structureMetrics));

            if (results.static.largestFile) console.log(`  Largest File: ${results.static.largestFile.path} (${results.static.largestFile.lines} lines)`);
            if (results.static.smallestFile) console.log(`  Smallest File: ${results.static.smallestFile.path} (${results.static.smallestFile.lines} lines)`);

            console.log(`  File types: ${Object.entries(results.static.filesByType).map(([ext, count]) => `${ext}:${count}`).join(', ')}`);

            // Show directory statistics if available
            if (results.static.directoryStats) {
                console.log(`  Directory Statistics:`);
                const dirs = Object.entries(results.static.directoryStats).map(([path, stats]) => ({path, ...stats}));

                // Show largest directories by lines
                if (results.static.largestDirectories && results.static.largestDirectories.length > 0) {
                    console.log(`    Largest directories by lines:`);
                    results.static.largestDirectories.slice(0, 5).forEach(dir => {
                        console.log(`      - ${dir.path}: ${dir.lines} lines (${dir.files} files)`);
                    });
                }

                // Show directories with most files
                if (results.static.largestFileCountDirectories && results.static.largestFileCountDirectories.length > 0) {
                    console.log(`    Most files by directory:`);
                    results.static.largestFileCountDirectories.slice(0, 5).forEach(dir => {
                        console.log(`      - ${dir.path}: ${dir.files} files (${dir.lines} files)`);
                    });
                }

                // Show most complex directories
                if (results.static.complexityByDirectory && results.static.complexityByDirectory.length > 0) {
                    console.log(`    Most complex directories:`);
                    results.static.complexityByDirectory.slice(0, 5).forEach(dir => {
                        console.log(`      - ${dir.path}: complexity ${dir.complexity} (${dir.jsFiles} JS files)`);
                    });
                }

                // Show largest directories by size
                if (results.static.largestSizeDirectories && results.static.largestSizeDirectories.length > 0) {
                    console.log(`    Largest directories by size:`);
                    results.static.largestSizeDirectories.slice(0, 5).forEach(dir => {
                        const size = formatFileSize(dir.size);
                        console.log(`      - ${dir.path}: ${size} (${dir.files} files)`);
                    });
                }

                // Show largest subdirectories separately
                if (results.static.largestSubdirectories && results.static.largestSubdirectories.length > 0) {
                    console.log(`    Largest subdirectories:`);
                    results.static.largestSubdirectories.slice(0, 5).forEach(dir => {
                        console.log(`      - ${dir.path}: ${dir.lines} lines (${dir.files} files)`);
                    });
                }

                // Show directories by depth
                if (results.static.directoryStatsByDepth) {
                    console.log(`    Directory statistics by depth:`);
                    for (const [depth, stats] of Object.entries(results.static.directoryStatsByDepth).slice(0, 5)) {
                        console.log(`      Depth ${depth}: ${stats.count} dirs, avg ${stats.avgLines.toFixed(1)} lines, ${stats.totalLines} total lines`);
                    }
                }

                if (results.static.directoryAvgLines !== undefined) {
                    console.log(`  Avg lines per directory: ${results.static.directoryAvgLines.toFixed(2)}`);
                    console.log(`  Avg files per directory: ${results.static.directoryAvgFiles.toFixed(2)}`);
                }
            }
        } else {
            console.log('  ❌ Structure metrics unavailable');
        }

        console.log('\n📋 README COMPLIANCE:');
        if (results.requirements && !results.requirements.error) {
            const complianceMetrics = {
                complianceScore: `${results.requirements.complianceScore}%`,
                satisfied: `${results.requirements.satisfiedRequirements}/${results.requirements.totalRequirements}`
            };
            console.log(DisplayUtils.formatKeyValuePairs(complianceMetrics));

            const status = results.requirements.complianceScore >= 90 ? '✅ Excellent compliance' : results.requirements.complianceScore >= 70 ? '⚠️ Good compliance but needs improvement' : '❌ Needs significant improvement';
            console.log(`  Status: ${status}`);

            const missing = [];
            if (!results.requirements.hasTermClassDocumentation) missing.push('Term Class');
            if (!results.requirements.hasTaskClassDocumentation) missing.push('Task Class');
            if (!results.requirements.hasTruthDocumentation) missing.push('Truth Values');
            if (!results.requirements.hasStampDocumentation) missing.push('Stamp System');
            if (!results.requirements.hasTestingStrategy) missing.push('Testing Strategy');
            if (!results.requirements.hasErrorHandling) missing.push('Error Handling');
            if (!results.requirements.hasSecurityImplementation) missing.push('Security');

            if (missing.length > 0) console.log(`  Missing key sections: ${missing.join(', ')}`);
        } else {
            console.log('  ❌ README compliance unavailable');
        }

        // Feature specifications analysis
        if (results.featurespecs && !results.featurespecs.error) {
            console.log('\n🎯 FEATURE SPECIFICATIONS:');
            const featureMetrics = {
                specificationsFound: results.featurespecs.specificationsFound,
                featureCompliance: `${results.featurespecs.overallFeatureCompliance}%`,
                implementedFeatures: `${Object.values(results.featurespecs.coverageByFeature).filter(f => f.implemented).length}/${results.featurespecs.features.length}`
            };
            console.log(DisplayUtils.formatKeyValuePairs(featureMetrics));

            if (results.featurespecs.testConnections && results.featurespecs.testConnections.length > 0) {
                console.log(`  Feature-to-Test Connections: ${results.featurespecs.testConnections.length}`);
            }

            if (results.featurespecs.implementationConnections && results.featurespecs.implementationConnections.length > 0) {
                console.log(`  Feature-to-Implementation Connections: ${results.featurespecs.implementationConnections.length}`);
            }
        } else {
            console.log('\n🎯 FEATURE SPECIFICATIONS: ❌ Not analyzed');
        }

        // Technical debt analysis
        if (results.technicaldebt && !results.technicaldebt.error) {
            console.log('\n💳 TECHNICAL DEBT:');
            const debtMetrics = {
                totalDebtScore: formatNumber(results.technicaldebt.totalDebtScore.toFixed(1)),
                avgDebtPerFile: results.technicaldebt.avgDebtScore ? results.technicaldebt.avgDebtScore.toFixed(2) : 'N/A',
                highRiskFiles: results.technicaldebt.highRiskFiles ? results.technicaldebt.highRiskFiles.length : 0,
                refactoringTargets: results.technicaldebt.refactoringTargets ? results.technicaldebt.refactoringTargets.length : 0
            };
            console.log(DisplayUtils.formatKeyValuePairs(debtMetrics));

            if (results.technicaldebt.highRiskFiles && results.technicaldebt.highRiskFiles.length > 0) {
                results.technicaldebt.highRiskFiles.slice(0, 3).forEach(file => {
                    console.log(`    - ${path.basename(file.path)}: ${formatNumber(file.debtScore.toFixed(1))} debt score`);
                });
            }
        } else {
            console.log('\n💳 TECHNICAL DEBT: ❌ Not analyzed');
        }

        // Architecture analysis
        if (results.architecture && !results.architecture.error) {
            console.log('\n🏗️  ARCHITECTURE ANALYSIS:');
            const archMetrics = {
                filesInDependencyGraph: Object.keys(results.architecture.dependencyGraph).length,
                cyclicDependencies: results.architecture.cyclicDependencies.length,
                architecturalLayers: Object.keys(results.architecture.architecturalLayers).length,
                apiEntryPoints: results.architecture.apiEntryPoints.length
            };
            console.log(DisplayUtils.formatKeyValuePairs(archMetrics));

            if (results.architecture.cyclicDependencies.length > 0) {
                console.log(`  Cycles found (require resolution):`);
                results.architecture.cyclicDependencies.slice(0, 3).forEach((cycle, idx) => {
                    console.log(`    ${idx + 1}. ${cycle.slice(0, 3).join(' -> ')}${cycle.length > 3 ? '...' : ''}`);
                });
            }
        } else {
            console.log('\n🏗️  ARCHITECTURE ANALYSIS: ❌ Not analyzed');
        }

        // Planning indicators
        if (results.planning && !results.planning.error) {
            console.log('\n📋 PLANNING INDICATORS:');
            const planningMetrics = {
                developmentPace: results.planning.developmentVelocity.developmentPace || 'Unknown',
                refactoringTimeEstimate: results.planning.futureEstimates.refactoringTime || 'Unknown',
                maintenanceEffort: results.planning.futureEstimates.maintenanceEffort || 'Unknown'
            };
            console.log(DisplayUtils.formatKeyValuePairs(planningMetrics));

            if (results.planning.priorityRecommendations && results.planning.priorityRecommendations.length > 0) {
                console.log(`  Priority Recommendations:`);
                results.planning.priorityRecommendations.slice(0, 3).forEach(rec => {
                    console.log(`    - ${rec}`);
                });
            }
        } else {
            console.log('\n📋 PLANNING INDICATORS: ❌ Not analyzed');
        }
    }

    printSlowestTests(results) {
        const tests = results.tests;
        if (tests && tests.slowestTests) {
            // Handle both old and new structure
            const slowestTests = Array.isArray(tests.slowestTests) ? tests.slowestTests : tests.slowestTests.all;

            if (slowestTests && slowestTests.length > 0) {
                console.log('\n🐢 SLOWEST TESTS:');

                const headers = ['No.', 'Test Name', 'Duration', 'Status', 'Suite'];
                const rows = slowestTests.slice(0, 20).map((test, idx) => [
                    String(idx + 1),
                    truncateText(test.name, 46),
                    `${test.duration}ms`,
                    test.status,
                    truncateText(test.suite, 37)
                ]);

                console.log(DisplayUtils.createTable(headers, rows));
            } else {
                console.log('\n🐢 No slow tests data available');
            }
        } else {
            console.log('\n🐢 No slow tests data available');
        }
    }

    printLargestFiles(results) {
        const staticData = results.static;
        if (staticData && staticData.largestFiles && staticData.largestFiles.length > 0) {
            console.log('\n📄 LARGEST FILES:');

            const headers = ['No.', 'File Path', 'Lines', 'Size'];
            const rows = staticData.largestFiles.slice(0, 20).map((file, idx) => [
                String(idx + 1),
                truncateText(file.path, 40),
                String(file.lines),
                formatFileSize(file.size)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n📄 No largest files data available');
        }
    }

    printLowestCoverageFiles(results) {
        const coverage = results.coverage;
        if (coverage && coverage.fileAnalysis && coverage.fileAnalysis.length > 0) {
            console.log('\n📉 LOWEST COVERAGE FILES:');

            const headers = ['No.', 'File Path', 'Lines', 'Covered', 'Uncover', 'Size', '%'];
            const rows = coverage.fileAnalysis.slice(0, 20).map((file, idx) => [
                String(idx + 1),
                truncateText(file.filePath, 32),
                String(file.statements),
                String(file.covered),
                String(file.uncovered),
                formatFileSize(file.size),
                formatPercentage(file.lineCoverage / 100, 1)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n📉 No lowest coverage files data available');
        }
    }

    printCoverageByDirectory(results) {
        const coverage = results.coverage;
        if (coverage && coverage.detailedAnalysis && coverage.detailedAnalysis.directoriesSorted) {
            console.log('\n📁 COVERAGE BY DIRECTORY:');

            const headers = ['No.', 'Directory', 'Files', 'Stmts', '%'];
            const rows = coverage.detailedAnalysis.directoriesSorted.slice(0, 20).map((dir, idx) => [
                String(idx + 1),
                truncateText(dir.directory, 32),
                String(dir.files),
                String(dir.statements),
                formatPercentage(dir.coveragePercent / 100, 1)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n📁 No directory coverage data available');
        }
    }

    printLargestDirectories(results) {
        const staticData = results.static;
        if (staticData && staticData.largestDirectories && staticData.largestDirectories.length > 0) {
            console.log('\n🏗️  LARGEST DIRECTORIES (by lines):');

            const headers = ['No.', 'Directory', 'Lines', 'Files', 'JS Files'];
            const rows = staticData.largestDirectories.slice(0, 20).map((dir, idx) => [
                String(idx + 1),
                truncateText(dir.path, 32),
                String(dir.lines),
                String(dir.files),
                String(dir.jsFiles)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n🏗️  No largest directories data available');
        }
    }

    printMostFilesDirectories(results) {
        const staticData = results.static;
        if (staticData && staticData.largestFileCountDirectories && staticData.largestFileCountDirectories.length > 0) {
            console.log('\n📂 DIRECTORIES WITH MOST FILES:');

            const headers = ['No.', 'Directory', 'Files', 'Lines', 'JS Files'];
            const rows = staticData.largestFileCountDirectories.slice(0, 20).map((dir, idx) => [
                String(idx + 1),
                truncateText(dir.path, 32),
                String(dir.files),
                String(dir.lines),
                String(dir.jsFiles)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n📂 No most files directories data available');
        }
    }

    printComplexityByDirectory(results) {
        const staticData = results.static;
        if (staticData && staticData.complexityByDirectory && staticData.complexityByDirectory.length > 0) {
            console.log('\n🧩 COMPLEXITY BY DIRECTORY:');

            const headers = ['No.', 'Directory', 'Complexity', 'Files', 'JS Files'];
            const rows = staticData.complexityByDirectory.slice(0, 20).map((dir, idx) => [
                String(idx + 1),
                truncateText(dir.path, 32),
                String(dir.complexity),
                String(dir.files),
                String(dir.jsFiles)
            ]);

            console.log(DisplayUtils.createTable(headers, rows));
        } else {
            console.log('\n🧩 No complexity by directory data available');
        }
    }
}