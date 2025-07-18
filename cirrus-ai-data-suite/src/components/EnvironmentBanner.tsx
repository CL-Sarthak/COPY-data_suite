'use client';

import { useState, useEffect } from 'react';

interface EnvironmentInfo {
  environment: string;
  branch: string;
  buildDate: string;
}

export default function EnvironmentBanner() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);
  
  useEffect(() => {
    // First try to get from environment variables (for production builds)
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';
    const branch = process.env.NEXT_PUBLIC_GIT_BRANCH;
    const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE;
    
    // If we have all the info from env vars, use it
    if (branch && buildDate) {
      setEnvInfo({
        environment,
        branch,
        buildDate
      });
    } else {
      // Otherwise, fetch from API (for development)
      fetch('/api/build-info')
        .then(res => res.json())
        .then(data => setEnvInfo(data))
        .catch(error => {
          console.error('Error fetching build info:', error);
          setEnvInfo({
            environment,
            branch: 'unknown',
            buildDate: new Date().toISOString()
          });
        });
    }
  }, []);
  
  if (!envInfo) {
    return null;
  }
  
  // Format the build date for display
  const formatBuildDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch {
      return dateString;
    }
  };
  
  // Determine environment label based on branch
  const getEnvironmentLabel = () => {
    const branch = envInfo.branch.toLowerCase();
    
    // Production branch
    if (branch === 'production' || branch === 'prod') {
      return 'Production';
    }
    
    // Main/master branch is staging
    if (branch === 'main' || branch === 'master') {
      return 'Staging';
    }
    
    // Feature branches
    if (branch.startsWith('feature/') || branch.startsWith('feat/')) {
      return 'Feature Preview';
    }
    
    // Fix branches
    if (branch.startsWith('fix/') || branch.startsWith('bugfix/')) {
      return 'Fix Preview';
    }
    
    // Hotfix branches
    if (branch.startsWith('hotfix/')) {
      return 'Hotfix Preview';
    }
    
    // Development branch
    if (branch === 'develop' || branch === 'dev') {
      return 'Development';
    }
    
    // Default for any other branch
    return 'Preview';
  };
  
  // Determine background color based on branch/environment
  const getEnvironmentColor = () => {
    const branch = envInfo.branch.toLowerCase();
    
    // Production
    if (branch === 'production' || branch === 'prod') {
      return 'bg-gray-900'; // Match navigation bar color
    }
    
    // Staging (main branch)
    if (branch === 'main' || branch === 'master') {
      return 'bg-yellow-600';
    }
    
    // Feature branches
    if (branch.startsWith('feature/') || branch.startsWith('feat/')) {
      return 'bg-blue-600';
    }
    
    // Fix/bugfix branches
    if (branch.startsWith('fix/') || branch.startsWith('bugfix/')) {
      return 'bg-orange-600';
    }
    
    // Hotfix branches
    if (branch.startsWith('hotfix/')) {
      return 'bg-red-700';
    }
    
    // Development branch
    if (branch === 'develop' || branch === 'dev') {
      return 'bg-purple-600';
    }
    
    // Local development (when branch is unknown)
    if (branch === 'unknown' || !branch) {
      return 'bg-red-600';
    }
    
    // Default for other branches
    return 'bg-gray-600';
  };
  
  // Only show branch name if it adds information (not redundant with label)
  const shouldShowBranch = () => {
    const label = getEnvironmentLabel().toLowerCase();
    const branch = envInfo.branch.toLowerCase();
    
    // Don't show branch if it's obvious from the label
    if (label === 'production' && (branch === 'production' || branch === 'prod')) return false;
    if (label === 'staging' && (branch === 'main' || branch === 'master')) return false;
    if (label === 'development' && (branch === 'develop' || branch === 'dev')) return false;
    
    return true;
  };
  
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${getEnvironmentColor()} text-white text-xs py-1 px-4 flex items-center justify-center space-x-4 shadow-lg`}>
      <span className="font-bold uppercase tracking-wider">{getEnvironmentLabel()}</span>
      {shouldShowBranch() && (
        <>
          <span className="text-gray-300 opacity-75">|</span>
          <span className="opacity-90">Branch: {envInfo.branch}</span>
        </>
      )}
      <span className="text-gray-300 opacity-75">|</span>
      <span className="opacity-90">Built: {formatBuildDate(envInfo.buildDate)}</span>
    </div>
  );
}