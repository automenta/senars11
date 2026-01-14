#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());

const testPath = path.join(__dirname, '../../../../core/src/metta/stdlib/search.metta');
console.log('Constructed path:', testPath);
console.log('File exists:', fs.existsSync(testPath));

// Try the correct path
const correctPath = path.join(__dirname, '../../../core/src/metta/stdlib/search.metta');
console.log('Corrected path:', correctPath);
console.log('File exists at corrected path:', fs.existsSync(correctPath));