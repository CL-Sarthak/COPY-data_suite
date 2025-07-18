import { getQueryTimeout } from '../getQueryTimeout';

describe('getQueryTimeout', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should return default timeout of 30000ms when no env var is set', () => {
    delete process.env.DATABASE_QUERY_TIMEOUT;
    expect(getQueryTimeout()).toBe(30000);
  });

  test('should return custom timeout from env var', () => {
    process.env.DATABASE_QUERY_TIMEOUT = '60000';
    expect(getQueryTimeout()).toBe(60000);
  });

  test('should handle invalid timeout values', () => {
    process.env.DATABASE_QUERY_TIMEOUT = 'invalid';
    expect(getQueryTimeout()).toBe(NaN);
  });

  test('should handle zero timeout', () => {
    process.env.DATABASE_QUERY_TIMEOUT = '0';
    expect(getQueryTimeout()).toBe(0);
  });

  test('should handle negative timeout', () => {
    process.env.DATABASE_QUERY_TIMEOUT = '-1000';
    expect(getQueryTimeout()).toBe(-1000);
  });
});