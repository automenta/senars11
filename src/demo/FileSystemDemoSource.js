import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXAMPLES_PATH = path.resolve(__dirname, '../../examples');

export class FileSystemDemoSource {
    constructor(basePath = EXAMPLES_PATH) {
        this.basePath = basePath;
    }

    async getDemos() {
        try {
            // Check if directory exists
            try {
                await fs.promises.access(this.basePath);
            } catch {
                console.warn(`Examples directory not found at ${this.basePath}`);
                return [];
            }

            const files = await fs.promises.readdir(this.basePath);
            const demos = [];
            for (const file of files) {
                if (file.endsWith('.nars')) {
                    const content = await fs.promises.readFile(path.join(this.basePath, file), 'utf8');
                    const info = this._parseInfo(content);
                    demos.push({
                        id: file.replace('.nars', ''),
                        name: info.title || file.replace('.nars', ''),
                        description: info.description || 'No description',
                        path: path.join(this.basePath, file)
                    });
                }
            }
            return demos;
        } catch (e) {
            console.error('Error loading demos:', e);
            return [];
        }
    }

    _parseInfo(content) {
        // Look for metadata comments
        const titleMatch = content.match(/^\/\/\s*title:\s*(.*)$/m);
        const descriptionMatch = content.match(/^\/\/\s*description:\s*(.*)$/m);
        return {
            title: titleMatch ? titleMatch[1].trim() : null,
            description: descriptionMatch ? descriptionMatch[1].trim() : null
        };
    }

    async loadDemoSteps(filePath) {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const steps = [];
        let currentComment = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('//')) {
                const comment = trimmed.replace(/^\/\/\s*/, '');
                if (!comment.startsWith('title:') && !comment.startsWith('description:')) {
                    currentComment = comment;
                }
            } else if (trimmed.startsWith('\'')) {
                // Comment in Narsese is sometimes '
                const comment = trimmed.substring(1).trim();
                currentComment = comment;
            } else if (!trimmed.startsWith('*')) {
                 // It's an input line (or command starting with /)
                 steps.push({
                     description: currentComment || 'Execute input',
                     input: trimmed
                 });
                 currentComment = '';
            }
        }
        return steps;
    }
}
