import { logger, apiLogger } from '../logger';

describe('logger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
  };

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
    };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    
    // Clear module cache to ensure env changes take effect
    jest.resetModules();
  });

  describe('logger', () => {
    describe('in development mode', () => {
      beforeEach(() => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'development',
          configurable: true
        });
        process.env.DEBUG = 'false';
        process.env.DB_LOGGING = 'false';
        jest.resetModules();
        const loggerModule = jest.requireActual('../logger');
        const { logger: devLogger } = loggerModule;
        Object.assign(logger, devLogger);
      });

      it('should log messages in development', () => {
        logger.log('test message');
        expect(consoleSpy.log).toHaveBeenCalledWith('test message');
      });

      it('should log info messages in development', () => {
        logger.info('info message');
        expect(consoleSpy.info).toHaveBeenCalledWith('info message');
      });

      it('should not log debug messages without debug mode', () => {
        logger.debug('debug message');
        expect(consoleSpy.log).not.toHaveBeenCalled();
      });
    });

    describe('in production mode', () => {
      beforeEach(() => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          configurable: true
        });
        process.env.DEBUG = 'false';
        process.env.DB_LOGGING = 'false';
        jest.resetModules();
        const loggerModule = jest.requireActual('../logger');
        const { logger: prodLogger } = loggerModule;
        Object.assign(logger, prodLogger);
      });

      it('should not log regular messages in production', () => {
        logger.log('test message');
        expect(consoleSpy.log).not.toHaveBeenCalled();
      });

      it('should not log info messages in production', () => {
        logger.info('info message');
        expect(consoleSpy.info).not.toHaveBeenCalled();
      });

      it('should always log warnings', () => {
        logger.warn('warning message');
        expect(consoleSpy.warn).toHaveBeenCalledWith('warning message');
      });

      it('should always log errors', () => {
        logger.error('error message');
        expect(consoleSpy.error).toHaveBeenCalledWith('error message');
      });
    });

    describe('in debug mode', () => {
      beforeEach(() => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          configurable: true
        });
        process.env.DEBUG = 'true';
        jest.resetModules();
        const loggerModule = jest.requireActual('../logger');
        const { logger: debugLogger } = loggerModule;
        Object.assign(logger, debugLogger);
      });

      it('should log messages when DEBUG is true', () => {
        logger.log('test message');
        expect(consoleSpy.log).toHaveBeenCalledWith('test message');
      });

      it('should log debug messages with prefix', () => {
        logger.debug('debug message');
        expect(consoleSpy.log).toHaveBeenCalledWith('[DEBUG]', 'debug message');
      });

      it('should log info messages in debug mode', () => {
        logger.info('info message');
        expect(consoleSpy.info).toHaveBeenCalledWith('info message');
      });
    });

    describe('with DB_LOGGING enabled', () => {
      beforeEach(() => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          configurable: true
        });
        process.env.DEBUG = 'false';
        process.env.DB_LOGGING = 'true';
        jest.resetModules();
        const loggerModule = jest.requireActual('../logger');
        const { logger: dbLogger } = loggerModule;
        Object.assign(logger, dbLogger);
      });

      it('should log when DB_LOGGING is true', () => {
        logger.log('db log message');
        expect(consoleSpy.log).toHaveBeenCalledWith('db log message');
      });
    });

    describe('with multiple arguments', () => {
      it('should pass all arguments to console methods', () => {
        logger.error('Error:', { code: 500 }, 'Server error');
        expect(consoleSpy.error).toHaveBeenCalledWith('Error:', { code: 500 }, 'Server error');
      });
    });
  });

  describe('apiLogger', () => {
    describe('in production without debug', () => {
      beforeEach(() => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          configurable: true
        });
        process.env.DEBUG = 'false';
        jest.resetModules();
        const loggerModule = jest.requireActual('../logger');
        const { apiLogger: prodApiLogger } = loggerModule;
        Object.assign(apiLogger, prodApiLogger);
      });

      it('should not log regular messages', () => {
        apiLogger.log('api message');
        expect(consoleSpy.log).not.toHaveBeenCalled();
      });

      it('should not log info messages', () => {
        apiLogger.info('api info');
        expect(consoleSpy.info).not.toHaveBeenCalled();
      });

      it('should always log warnings', () => {
        apiLogger.warn('api warning');
        expect(consoleSpy.warn).toHaveBeenCalledWith('api warning');
      });

      it('should always log errors', () => {
        apiLogger.error('api error');
        expect(consoleSpy.error).toHaveBeenCalledWith('api error');
      });
    });

    describe('in debug mode', () => {
      beforeEach(() => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          configurable: true
        });
        process.env.DEBUG = 'true';
        jest.resetModules();
        const loggerModule = jest.requireActual('../logger');
        const { apiLogger: debugApiLogger } = loggerModule;
        Object.assign(apiLogger, debugApiLogger);
      });

      it('should log messages in debug mode', () => {
        apiLogger.log('api debug message');
        expect(consoleSpy.log).toHaveBeenCalledWith('api debug message');
      });

      it('should log debug messages with API prefix', () => {
        apiLogger.debug('api debug');
        expect(consoleSpy.log).toHaveBeenCalledWith('[API DEBUG]', 'api debug');
      });

      it('should log info messages in debug mode', () => {
        apiLogger.info('api info');
        expect(consoleSpy.info).toHaveBeenCalledWith('api info');
      });
    });

    describe('edge cases', () => {
      it('should handle undefined arguments', () => {
        apiLogger.error(undefined);
        expect(consoleSpy.error).toHaveBeenCalledWith(undefined);
      });

      it('should handle null arguments', () => {
        apiLogger.warn(null);
        expect(consoleSpy.warn).toHaveBeenCalledWith(null);
      });

      it('should handle empty arguments', () => {
        apiLogger.log();
        expect(consoleSpy.log).toHaveBeenCalledWith();
      });
    });
  });
});