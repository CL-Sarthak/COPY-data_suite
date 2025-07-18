export function getQueryTimeout(): number {
  // Default to 30 seconds, can be configured via environment variable
  const timeout = process.env.DATABASE_QUERY_TIMEOUT || '30000';
  return parseInt(timeout, 10);
}