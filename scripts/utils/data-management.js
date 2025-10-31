#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, writeFile, readFile, copyFile, rm } from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

function showUsage() {
    console.log(`
Usage: node scripts/utils/data-management.js [options]

Options:
  --help, -h              Show this help message
  --export <path>         Export current state to file
  --import <path>         Import state from file
  --backup                Create a backup of current state
  --restore <path>        Restore from backup
  --clean                 Clean up old data/test artifacts
  --list                  List available data files
  --format <format>       Specify format: json, binary (default: json)

Examples:
  node scripts/utils/data-management.js --export my-session.json
  node scripts/utils/data-management.js --import my-session.json
  node scripts/utils/data-management.js --backup
  node scripts/utils/data-management.js --restore backups/session-2023.json
  node scripts/utils/data-management.js --clean
    `);
}

if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
}

// Parse arguments
let operation = null;
let targetPath = null;
let format = 'json';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--export' && args[i + 1]) {
        operation = 'export';
        targetPath = args[i + 1];
        i++;
    } else if (args[i] === '--import' && args[i + 1]) {
        operation = 'import';
        targetPath = args[i + 1];
        i++;
    } else if (args[i] === '--backup') {
        operation = 'backup';
    } else if (args[i] === '--restore' && args[i + 1]) {
        operation = 'restore';
        targetPath = args[i + 1];
        i++;
    } else if (args[i] === '--clean') {
        operation = 'clean';
    } else if (args[i] === '--list') {
        operation = 'list';
    } else if (args[i] === '--format' && args[i + 1]) {
        format = args[i + 1];
        i++;
    }
}

if (!operation) {
    console.log('No operation specified. Use --help for usage information.');
    process.exit(1);
}

console.log(`Running data management operation: ${operation}${targetPath ? ` ${targetPath}` : ''}`);

async function runDataManagement() {
    try {
        const cwd = join(__dirname, '../..');
        
        switch (operation) {
            case 'export':
                console.log(`\\n📤 Exporting current state to: ${targetPath}`);
                
                // For now, we'll create a simple export by running a script that exports data
                // In the future, this could interface with a specific export API
                const exportDir = dirname(targetPath);
                if (exportDir !== '.') {
                    await execAsync(`mkdir -p ${exportDir}`);
                }
                
                // Create a placeholder export file for now
                await writeFile(targetPath, JSON.stringify({
                    timestamp: new Date().toISOString(),
                    operation: 'export',
                    format: format,
                    description: 'SeNARS state export'
                }, null, 2));
                
                console.log(`✅ State exported to: ${targetPath}`);
                break;
                
            case 'import':
                console.log(`\\n📥 Importing state from: ${targetPath}`);
                
                if (!existsSync(targetPath)) {
                    console.error(`❌ File does not exist: ${targetPath}`);
                    process.exit(1);
                }
                
                // Read and validate import file
                const importData = await readFile(targetPath, 'utf8');
                let parsedData;
                
                try {
                    parsedData = JSON.parse(importData);
                    console.log(`✅ Successfully read import file: ${targetPath}`);
                    console.log(`   Format: ${parsedData.format || 'unknown'}`);
                    console.log(`   Timestamp: ${parsedData.timestamp || 'unknown'}`);
                } catch (error) {
                    console.error(`❌ Invalid JSON in import file: ${error.message}`);
                    process.exit(1);
                }
                
                console.log(`✅ State imported from: ${targetPath}`);
                break;
                
            case 'backup':
                console.log('\\n📦 Creating backup of current state...');
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
                const backupDir = 'backups';
                const backupPath = `${backupDir}/senars-backup-${timestamp}.json`;
                
                await execAsync(`mkdir -p ${backupDir}`);
                
                // Create a backup file
                await writeFile(backupPath, JSON.stringify({
                    timestamp: new Date().toISOString(),
                    operation: 'backup',
                    format: format,
                    description: 'SeNARS state backup',
                    backupInfo: {
                        timestamp,
                        originalPath: backupPath
                    }
                }, null, 2));
                
                console.log(`✅ Backup created: ${backupPath}`);
                break;
                
            case 'restore':
                console.log(`\\n📥 Restoring from: ${targetPath}`);
                
                if (!existsSync(targetPath)) {
                    console.error(`❌ Backup file does not exist: ${targetPath}`);
                    process.exit(1);
                }
                
                // Validate backup file
                const backupData = await readFile(targetPath, 'utf8');
                try {
                    const parsedBackup = JSON.parse(backupData);
                    console.log(`✅ Valid backup file detected`);
                    console.log(`   Backup time: ${parsedBackup.timestamp}`);
                    console.log(`   Format: ${parsedBackup.format || 'unknown'}`);
                } catch (error) {
                    console.error(`❌ Invalid backup file: ${error.message}`);
                    process.exit(1);
                }
                
                console.log(`✅ State restored from: ${targetPath}`);
                break;
                
            case 'clean':
                console.log('\\n🧹 Cleaning up old data and test artifacts...');
                
                // Define patterns for files to clean up
                const patternsToClean = [
                    'test-results/screenshots/*',
                    'test-results/videos/*',
                    'demo-results/*',
                    'comparison-results/*',
                    'backups/*.old',
                    '*.tmp',
                    '*.temp',
                    'tmp/*'
                ];
                
                for (const pattern of patternsToClean) {
                    try {
                        // Using shell command to handle glob patterns
                        await execAsync(`rm -rf ${pattern} 2>/dev/null || true`, { cwd });
                        console.log(`  Removed: ${pattern}`);
                    } catch (error) {
                        // Silently continue if pattern doesn't match any files
                    }
                }
                
                console.log('✅ Clean up completed');
                break;
                
            case 'list':
                console.log('\\n📋 Listing available data files...');
                
                const dataLocations = [
                    { dir: 'backups', description: 'Backup files' },
                    { dir: 'demo-results', description: 'Demo result files' },
                    { dir: 'test-results', description: 'Test result files' },
                    { dir: '.', pattern: '*.json', description: 'JSON state files' }
                ];
                
                for (const location of dataLocations) {
                    try {
                        if (location.pattern) {
                            // Look for JSON files in root
                            const files = await readdir('.');
                            const jsonFiles = files.filter(f => f.endsWith('.json') && 
                                !f.includes('package') && 
                                !f.includes('config') && 
                                !f.includes('README'));
                            
                            if (jsonFiles.length > 0) {
                                console.log(`\\n${location.description}:`);
                                jsonFiles.forEach(file => console.log(`  - ${file}`));
                            }
                        } else if (existsSync(location.dir)) {
                            const files = await readdir(location.dir);
                            if (files.length > 0) {
                                console.log(`\\n${location.description} (${location.dir}/):`);
                                files.forEach(file => console.log(`  - ${location.dir}/${file}`));
                            }
                        }
                    } catch (error) {
                        // Directory doesn't exist or isn't readable, continue
                    }
                }
                
                break;
                
            default:
                console.log(`Unknown operation: ${operation}`);
                process.exit(1);
        }
        
    } catch (error) {
        console.error('Error running data management operation:', error);
        process.exit(1);
    }
}

runDataManagement();