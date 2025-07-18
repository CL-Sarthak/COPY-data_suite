import { execSync } from 'child_process';

export interface BuildInfo {
  environment: string;
  branch: string;
  buildDate: string;
}

let cachedBuildInfo: BuildInfo | null = null;

export function getBuildInfo(): BuildInfo {
  // Return cached info if available (but re-check branch in development)
  if (cachedBuildInfo && process.env.NODE_ENV !== 'development') {
    return cachedBuildInfo;
  }

  // Get environment
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';
  
  // Get branch name
  let branch = process.env.NEXT_PUBLIC_GIT_BRANCH || 'unknown';
  
  // In development, try to get the actual git branch
  if (process.env.NODE_ENV === 'development' && branch === 'unknown') {
    try {
      // First try to get the current branch name
      let gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      
      // If we're in detached HEAD state, try to get the branch name from git status
      if (gitBranch === 'HEAD') {
        try {
          // Try to get branch from git status
          const statusOutput = execSync('git status --porcelain=v1 --branch --ahead-behind', { encoding: 'utf8' });
          const branchMatch = statusOutput.match(/## ([^\.\.\.]+)/);
          if (branchMatch) {
            gitBranch = branchMatch[1];
          } else {
            // Try using git symbolic-ref
            gitBranch = execSync('git symbolic-ref --short HEAD', { encoding: 'utf8' }).trim();
          }
        } catch {
          // If all else fails, try to get from git branch -a
          try {
            const branchOutput = execSync('git branch -a --contains HEAD', { encoding: 'utf8' });
            const lines = branchOutput.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('* ') && !trimmed.includes('detached')) {
                gitBranch = trimmed.substring(2);
                break;
              }
            }
          } catch {
            gitBranch = 'detached-head';
          }
        }
      }
      
      branch = gitBranch;
    } catch (error) {
      console.warn('Could not determine git branch:', error);
      branch = 'unknown';
    }
  }
  
  // Get build date
  let buildDate = process.env.NEXT_PUBLIC_BUILD_DATE || '';
  
  // In development, use current date
  if (process.env.NODE_ENV === 'development' && !buildDate) {
    buildDate = new Date().toISOString();
  }
  
  cachedBuildInfo = {
    environment,
    branch,
    buildDate
  };
  
  return cachedBuildInfo;
}