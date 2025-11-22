import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';
import {isExcludedPath} from './FileUtils.js';

export const findCoverageFile = () => {
    const possiblePaths = [
        './coverage/coverage-summary.json',
        './coverage/coverage-final.json',
        './.nyc_output/coverage-summary.json',
        './.nyc_output/coverage-final.json'
    ];

    for (const coveragePath of possiblePaths) {
        if (fs.existsSync(coveragePath)) return coveragePath;
    }
    return null;
};

export const generateCoverage = async () => {
    console.log('📦 Generating coverage data...');
    const methods = [
        () => spawnSync('npm', ['test', '--', '--coverage', '--coverageReporters=json-summary', '--coverageReporters=text'], {
            cwd: process.cwd(), timeout: 120000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
        }),
        () => spawnSync('npx', ['jest', '--coverage', '--coverageReporters=json-summary', '--coverageReporters=text'], {
            cwd: process.cwd(), timeout: 120000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
        })
    ];

    for (const method of methods) {
        try {
            const result = method();
            if ((result.status === 0 || result.status === 1) && findCoverageFile()) {
                console.log('✅ Coverage generated successfully');
                return true;
            }
        } catch (error) {
            console.log(`⚠️ Coverage generation method failed: ${error.message}`);
        }
    }

    console.log('❌ Failed to generate coverage data');
    return false;
};

export const analyzeCoverage = (verbose = false) => {
    const TOP_N = 20;
    try {
        const coverageDetailPath = './coverage/coverage-final.json';
        if (!fs.existsSync(coverageDetailPath)) return [];

        let coverageDetail;
        try {
            const fileContent = fs.readFileSync(coverageDetailPath, 'utf8');
            if (!fileContent.trim()) {
                if (verbose) console.log('❌ Coverage file is empty');
                return [];
            }
            coverageDetail = JSON.parse(fileContent);
        } catch (parseError) {
            if (verbose) console.log('❌ Error parsing coverage-final.json:', parseError.message);
            return [];
        }

        const files = [];
        for (const [filePath, coverage] of Object.entries(coverageDetail)) {
            try {
                if (!filePath || typeof filePath !== 'string') continue;

                let resolvedPath = filePath.startsWith('./') ? path.resolve(filePath) : filePath;
                const relativePath = path.relative(process.cwd(), resolvedPath);

                if (isExcludedPath(relativePath)) continue;

                if (!coverage || typeof coverage !== 'object' || !coverage.s) {
                    if (verbose) console.log(`⚠️ Invalid coverage structure for file: ${filePath}`);
                    continue;
                }

                const summary = coverage.s;
                const statementKeys = Object.keys(summary);
                const coveredStatements = statementKeys.filter(key => summary[key] > 0).length;
                const statementCount = statementKeys.length;
                const lineCoverage = statementCount > 0 ? (coveredStatements / statementCount) * 100 : 100;

                let fileSize = 0;
                try {
                    if (fs.existsSync(resolvedPath)) fileSize = fs.statSync(resolvedPath).size;
                } catch (e) {}

                files.push({
                    filePath: relativePath,
                    lineCoverage: parseFloat(lineCoverage.toFixed(2)),
                    statements: statementCount,
                    covered: coveredStatements,
                    uncovered: statementCount - coveredStatements,
                    size: fileSize
                });
            } catch (fileError) {
                if (verbose) console.log(`⚠️ Error processing coverage for ${filePath}:`, fileError.message);
                continue;
            }
        }

        return files.sort((a, b) =>
            (a.lineCoverage !== b.lineCoverage) ? a.lineCoverage - b.lineCoverage :
            (a.size !== b.size) ? b.size - a.size :
            b.statements - a.statements
        ).slice(0, TOP_N);

    } catch (error) {
        if (verbose) console.log('❌ Error in analyzeCoverage:', error.message);
        return [];
    }
};
