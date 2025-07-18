/**
 * Next.js Instrumentation Hook
 * This runs before any other code when the Next.js server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import reflect-metadata at the earliest possible point
    await import('reflect-metadata');
    
    console.log('[Instrumentation] Initializing TypeORM...');
    
    // Pre-load entities to ensure decorators are processed
    await import('@/lib/init-typeorm');
    
    console.log('[Instrumentation] TypeORM initialization complete');
  }
}