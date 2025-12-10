import fs from 'fs';
import {FileUtils} from '../../../util/FileUtils.js';
import {BaseAnalyzer} from './BaseAnalyzer.js';

export class ProjectAnalyzer extends BaseAnalyzer {
    async analyze() {
        this.log('Collecting Project Information...');

        return await this.safeAnalyze(async () => {
            if (!fs.existsSync('./package.json')) {
                this.log('package.json not found', 'error');
                return {error: 'package.json not found'};
            }

            const packageJson = FileUtils.readJSONFile('./package.json');
            if (!packageJson) {
                return {error: 'Could not parse package.json'};
            }

            return {
                name: packageJson.name,
                version: packageJson.version,
                description: packageJson.description,
                dependencies: Object.keys(packageJson.dependencies || {}).length,
                devDependencies: Object.keys(packageJson.devDependencies || {}).length,
                scripts: Object.keys(packageJson.scripts || {}).length
            };
        }, 'Project info collection failed');
    }
}