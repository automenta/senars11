/**
 * examples/demo-discovery.js
 * 
 * Auto-registration system for demos as described in PROTOTYPE_DEMOS.md
 * Automatically discovers and registers demos from various sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DemoDiscovery {
    constructor() {
        this.sources = [
            { path: path.join(__dirname, 'reasoning'), type: 'example', enabled: true },
            { path: path.join(__dirname, 'advanced'), type: 'example', enabled: true },
            { path: path.join(__dirname, 'tensor-logic'), type: 'example', enabled: true },
            { path: path.join(__dirname, 'narsgpt'), type: 'example', enabled: true },
            { path: path.join(__dirname, 'demos'), type: 'curated', enabled: true },
            { path: path.join(__dirname, '..', 'tests', 'integration'), type: 'test', enabled: true }
        ];
    }

    async discoverDemos() {
        const allDemos = [];
        
        for (const source of this.sources) {
            if (source.enabled) {
                try {
                    const demos = await this._discoverFromSource(source);
                    allDemos.push(...demos);
                } catch (error) {
                    console.warn(`⚠️  Could not discover demos from ${source.path}:`, error.message);
                }
            }
        }
        
        return allDemos;
    }

    async _discoverFromSource(source) {
        if (!fs.existsSync(source.path)) {
            return [];
        }

        const files = fs.readdirSync(source.path);
        const demos = [];

        for (const file of files) {
            const fullPath = path.join(source.path, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Recursively check subdirectories
                const subDemos = await this._discoverFromSource({
                    ...source,
                    path: fullPath
                });
                demos.push(...subDemos);
            } else if (this._isDemoFile(file)) {
                const demoInfo = await this._extractDemoInfo(fullPath, source.type);
                if (demoInfo) {
                    demos.push(demoInfo);
                }
            }
        }

        return demos;
    }

    _isDemoFile(filename) {
        return (
            (filename.endsWith('.js') || filename.endsWith('.mjs')) &&
            !filename.endsWith('.test.js') &&
            !filename.endsWith('.spec.js') &&
            !filename.startsWith('_')
        );
    }

    async _extractDemoInfo(filePath, type) {
        try {
            // Extract basic info from filename and path
            const relativePath = path.relative(path.join(__dirname, '..'), filePath);
            const fileName = path.basename(filePath, path.extname(filePath));
            const category = path.dirname(relativePath).split(path.sep).pop() || 'general';
            
            // Try to extract description from file content if possible
            let description = `Demo: ${fileName}`;
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Look for description in comments
                const descMatch = content.match(/\/\*\*[\s\S]*?\*\/\s*(?:export|const|let|var|function|class)\s+(\w+)/);
                if (descMatch) {
                    const commentBlock = content.substring(0, content.indexOf(descMatch[0]));
                    const descLine = commentBlock.match(/@description\s+(.+)/i);
                    if (descLine) {
                        description = descLine[1].trim();
                    }
                }
            } catch (e) {
                // If we can't read the file content, use default description
            }

            return {
                id: fileName,
                name: this._formatDemoName(fileName),
                category,
                description,
                path: relativePath,
                type,
                quick: this._isQuickDemo(fileName)
            };
        } catch (error) {
            console.warn(`⚠️  Could not extract info from ${filePath}:`, error.message);
            return null;
        }
    }

    _formatDemoName(name) {
        // Convert camelCase, snake_case, or kebab-case to proper title
        return name
            .replace(/[_\-]/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^\w/, c => c.toUpperCase())
            .trim();
    }

    _isQuickDemo(name) {
        // Demos that should be in the quick subset
        const quickPatterns = [
            'syllogism', 'stream', 'tensor', 'narsgpt', 'basic', 'simple', 'demo'
        ];
        
        return quickPatterns.some(pattern => 
            name.toLowerCase().includes(pattern)
        );
    }

    async getDemosByCategory() {
        const allDemos = await this.discoverDemos();
        const categorized = {};
        
        for (const demo of allDemos) {
            if (!categorized[demo.category]) {
                categorized[demo.category] = [];
            }
            categorized[demo.category].push(demo);
        }
        
        return categorized;
    }

    async getQuickDemos() {
        const allDemos = await this.discoverDemos();
        return allDemos.filter(demo => demo.quick);
    }
}

// Example usage and test
async function main() {
    console.log('🔍 Discovering SeNARS Demos...\n');
    
    const discovery = new DemoDiscovery();
    const demos = await discovery.discoverDemos();
    
    console.log(`Found ${demos.length} demos:\n`);
    
    const byCategory = await discovery.getDemosByCategory();
    
    for (const [category, categoryDemos] of Object.entries(byCategory)) {
        console.log(`📁 ${category.toUpperCase()}:`);
        for (const demo of categoryDemos) {
            const quickIndicator = demo.quick ? ' 🏃‍♂️' : '';
            console.log(`  • ${demo.name} (${demo.id})${quickIndicator}`);
        }
        console.log('');
    }
    
    const quickDemos = await discovery.getQuickDemos();
    console.log(`🏃‍♂️ Quick Demos (${quickDemos.length} total):`);
    for (const demo of quickDemos) {
        console.log(`  • ${demo.name}`);
    }
}

// Run discovery if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { DemoDiscovery };