/**
 * Centralized logging utility that respects environment settings
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugMode = process.env.DEBUG === 'true' || process.env.DB_LOGGING === 'true';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment || isDebugMode) {
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    // Always show warnings
    console.warn(...args);
  },
  
  error: (...args: unknown[]) => {
    // Always show errors
    console.error(...args);
  },
  
  debug: (...args: unknown[]) => {
    if (isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment || isDebugMode) {
      console.info(...args);
    }
  }
};

// For API routes, we want to be more selective with logging
export const apiLogger = {
  log: (...args: unknown[]) => {
    if (isDebugMode) {
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  
  debug: (...args: unknown[]) => {
    if (isDebugMode) {
      console.log('[API DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDebugMode) {
      console.info(...args);
    }
  }
};