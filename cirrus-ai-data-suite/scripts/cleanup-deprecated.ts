#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { DEPRECATED_FILES } from '../src/config/cleanup';

const projectRoot = path.resolve(__dirname, '..');

console.log('🧹 Cleaning up deprecated files...\n');

let removedCount = 0;
let notFoundCount = 0;

for (const file of DEPRECATED_FILES) {
  const fullPath = path.join(projectRoot, file);
  
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`✅ Removed: ${file}`);
      removedCount++;
    } catch (error) {
      console.error(`❌ Failed to remove: ${file}`, error);
    }
  } else {
    console.log(`⏭️  Not found: ${file}`);
    notFoundCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   - Files removed: ${removedCount}`);
console.log(`   - Files not found: ${notFoundCount}`);
console.log(`   - Total deprecated files: ${DEPRECATED_FILES.length}`);

// Clean up empty directories
const dirsToCheck = [
  'src/app/api/test',
  'src/app/api/debug',
];

console.log('\n🗂️  Checking for empty directories...\n');

for (const dir of dirsToCheck) {
  const fullPath = path.join(projectRoot, dir);
  
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath);
    if (files.length === 0) {
      fs.rmdirSync(fullPath);
      console.log(`✅ Removed empty directory: ${dir}`);
    }
  }
}

console.log('\n✨ Cleanup complete!');