import fs from 'fs';
import path from 'path';

const findFiles = (dir, ext) => {
    let results = [];
    const list = fs.readdirSync(dir);

    for (const file of list) {
        const filePath = path.resolve(dir, file);
        const stat = fs.statSync(filePath);
        if (stat?.isDirectory()) {
            results = results.concat(findFiles(filePath, ext));
        } else if (filePath.endsWith(ext)) {
            results.push(filePath);
        }
    }

    return results;
};

export function analyzeCoverageGaps(srcDir, testDir) {
    const srcFiles = findFiles(srcDir, '.js');
    const testFiles = findFiles(testDir, '.test.js');

    return srcFiles
        .map(srcFile => ({
            file: path.relative(srcDir, srcFile),
            testName: path.basename(srcFile, '.js') + '.test.js',
            hasTest: testFiles.some(tf => path.basename(tf) === path.basename(srcFile, '.js') + '.test.js')
        }))
        .filter(({hasTest}) => !hasTest)
        .map(({file}) => ({
            file,
            reason: 'No corresponding test file found',
            priority: 'High'
        }));
}

export function generateCoverageReport() {
    const rootDir = process.cwd();
    const coreSrc = path.join(rootDir, 'core/src');
    const agentSrc = path.join(rootDir, 'agent/src');
    const testsDir = path.join(rootDir, 'tests');

    const allGaps = [
        ...analyzeCoverageGaps(coreSrc, testsDir),
        ...analyzeCoverageGaps(agentSrc, testsDir)
    ];

    return allGaps;
}
