#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get current git branch with better detection
let gitBranch = 'unknown';
try {
  // First try to get the current branch name
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  
  // If we're in detached HEAD or get master instead of expected branch
  if (gitBranch === 'HEAD' || gitBranch === 'master') {
    try {
      // Try to get from environment variables (CI/CD often sets this)
      if (process.env.GITHUB_REF_NAME) {
        gitBranch = process.env.GITHUB_REF_NAME;
      } else if (process.env.VERCEL_GIT_COMMIT_REF) {
        gitBranch = process.env.VERCEL_GIT_COMMIT_REF;
      } else if (process.env.CI_COMMIT_REF_NAME) {
        gitBranch = process.env.CI_COMMIT_REF_NAME;
      } else {
        // Try git status approach
        const statusOutput = execSync('git status --porcelain=v1 --branch --ahead-behind', { encoding: 'utf8' });
        const branchMatch = statusOutput.match(/## ([^\.\.\.]+)/);
        if (branchMatch && branchMatch[1] !== 'HEAD') {
          gitBranch = branchMatch[1];
        } else {
          // Try to get from git branch command
          const branchOutput = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
          if (branchOutput && branchOutput !== '') {
            gitBranch = branchOutput;
          }
        }
      }
    } catch (fallbackError) {
      console.warn('Fallback branch detection failed:', fallbackError.message);
    }
  }
} catch (error) {
  console.warn('Could not determine git branch:', error.message);
}

// Get build date
const buildDate = new Date().toISOString();

// Create or update .env.production.local with build info
const envPath = path.join(process.cwd(), '.env.production.local');
let envContent = '';

// Read existing content if file exists
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Update or add build info
const updateEnvVar = (content, key, value) => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content + (content.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
  }
};

envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_GIT_BRANCH', gitBranch);
envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_BUILD_DATE', buildDate);

// Write back to file
fs.writeFileSync(envPath, envContent);

console.log('Build info set:');
console.log(`  Branch: ${gitBranch}`);
console.log(`  Date: ${buildDate}`);