import fs from 'fs';
import path from 'path';

const readonlyExclusions = new Set([
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

export const isExcludedPath = (filePath) => {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    return Array.from(readonlyExclusions).some(exclusion => {
        if (exclusion.startsWith('**/')) {
            return normalizedPath.includes(exclusion.substring(3));
        } else if (exclusion.endsWith('/*')) {
            const prefix = exclusion.slice(0, -2);
            return normalizedPath.startsWith(prefix) || normalizedPath.includes('/' + prefix);
        } else {
            return normalizedPath.includes(exclusion);
        }
    });
};

export const readJSONFile = (filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.trim()) return null;
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
};

export const collectFiles = (searchPaths = ['.'], filterFn = () => true) => {
    const files = [];
    for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
            _collectFilesRecursively(searchPath, files, filterFn);
        }
    }
    return files;
};

const _collectFilesRecursively = (dir, files, filterFn) => {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, {withFileTypes: true});

    for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            if (!isExcludedPath(path.relative('.', fullPath))) {
                 _collectFilesRecursively(fullPath, files, filterFn);
            }
        } else if (item.isFile() && filterFn(item.name, fullPath)) {
            const relPath = path.relative('.', fullPath);
            if (!isExcludedPath(relPath)) {
                files.push(relPath);
            }
        }
    }
};

export const collectTestFiles = () => {
     const searchPaths = ['./tests', './test', './src'];

    const isTestFile = (fileName) => {
        return fileName.endsWith('.test.js') ||
            fileName.endsWith('.spec.js') ||
            fileName.includes('_test.js') ||
            fileName.includes('_spec.js');
    };

    return collectFiles(searchPaths, isTestFile);
};
