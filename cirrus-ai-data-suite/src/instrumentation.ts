/**
 * Next.js instrumentation file
 * This runs before any other code in the application
 */
import '@/lib/init-typeorm';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('TypeORM initialization complete in instrumentation');
  }
}