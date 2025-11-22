import fs from 'fs';
import path from 'path';

export class FileUtils {
    static readonlyExclusions = new Set([
        'src/parser/peggy-parser.js',
        'peggy-parser.js',
        './peggy-parser.js',
        'peggy-parser.js',
        'node_modules/**/*',
        '.git/**/*',
        'dist/**/*',
        'build/**/*',
        '.next/**/*',
        'coverage/**/*',
        'node_modules/*',
        '.git/*',
        'dist/*',
        'build/*',
        '.next/*',
        'coverage/*'
    ]);

    static isExcludedPath(filePath) {
        const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
        return Array.from(this.readonlyExclusions).some(exclusion => {
            if (exclusion.startsWith('**/')) {
                return normalizedPath.includes(exclusion.substring(3));
            } else if (exclusion.endsWith('/*')) {
                const prefix = exclusion.slice(0, -2);
                return normalizedPath.startsWith(prefix) || normalizedPath.includes('/' + prefix);
            } else {
                return normalizedPath.includes(exclusion);
            }
        });
    }

    static readJSONFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (!content.trim()) {
                return null;
            }
            return JSON.parse(content);
        } catch (error) {
            return null;
        }
    }

    static collectFiles(searchPaths = ['.'], filterFn = () => true) {
        const files = [];
        for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
                this._collectFilesRecursively(searchPath, files, filterFn);
            }
        }
        return files;
    }

    static _collectFilesRecursively(dir, files, filterFn) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                if (!this.isExcludedPath(path.relative('.', fullPath))) {
                     this._collectFilesRecursively(fullPath, files, filterFn);
                }
            } else if (item.isFile() && filterFn(item.name, fullPath)) {
                const relPath = path.relative('.', fullPath);
                if (!this.isExcludedPath(relPath)) {
                    files.push(relPath);
                }
            }
        }
    }

    static analyzeCoverageByFile(verbose = false) {
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
                    if (!filePath || typeof filePath !== 'string') {
                        continue; // Skip invalid file paths
                    }

                    let resolvedPath = filePath;
                    if (filePath.startsWith('./')) {
                        resolvedPath = path.resolve(filePath);
                    }

                    // Skip excluded files
                    const relativePath = path.relative(process.cwd(), resolvedPath);
                    if (this.isExcludedPath(relativePath)) {
                        continue;
                    }

                    // Validate coverage structure before accessing properties
                    if (!coverage || typeof coverage !== 'object' || !coverage.s) {
                        if (verbose) console.log(`⚠️ Invalid coverage structure for file: ${filePath}`);
                        continue;
                    }

                    const summary = coverage.s;
                    if (typeof summary !== 'object') {
                        continue; // Skip if summary is not an object
                    }

                    const statementKeys = Object.keys(summary);
                    const coveredStatements = statementKeys.filter(key => {
                        const value = summary[key];
                        return typeof value === 'number' && value > 0;
                    }).length;
                    const statementCount = statementKeys.length;

                    const lineCoverage = statementCount > 0 ? (coveredStatements / statementCount) * 100 : 100;

                    let fileSize = 0;
                    try {
                        if (fs.existsSync(resolvedPath)) {
                            fileSize = fs.statSync(resolvedPath).size;
                        }
                    } catch (e) {
                        // If we can't get file size, continue with 0
                    }

                    files.push({
                        filePath: relativePath,
                        lineCoverage: parseFloat(lineCoverage.toFixed(2)),
                        statements: statementCount,
                        covered: coveredStatements,
                        uncovered: statementCount - coveredStatements,
                        size: fileSize
                    });
                } catch (fileError) {
                    // Skip this file if there's an error processing it
                    if (verbose) console.log(`⚠️ Error processing coverage for ${filePath}:`, fileError.message);
                    continue;
                }
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
        } catch (error) {
            if (verbose) console.log('❌ Error in analyzeCoverageByFile:', error.message);
            return [];
        }
    }
}
