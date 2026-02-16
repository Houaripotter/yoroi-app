// Unmock the logger so we test the real implementation
jest.unmock('@/lib/security/logger');

describe('logger', () => {
  let logger: typeof import('@/lib/security/logger').logger;

  beforeEach(() => {
    jest.resetModules();
    // __DEV__ is true in test environment by default
    (global as any).__DEV__ = true;
    logger = require('@/lib/security/logger').logger;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================
  // sanitize - sensitive keys
  // ============================================
  describe('sanitization', () => {
    it('redacts weight field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { weight: 75 });
      expect(spy).toHaveBeenCalled();
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.weight).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('redacts email field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { email: 'user@test.com' });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.email).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('redacts password field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { password: 'secret123' });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.password).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('redacts injury field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { injury: 'knee sprain' });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.injury).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('redacts pain field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { pain: 7 });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.pain).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('redacts medication field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { medication: 'ibuprofen' });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.medication).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('redacts notes field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { notes: 'personal note' });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.notes).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('redacts body_fat field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { body_fat: 15.5 });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.body_fat).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('redacts muscle_mass field', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { muscle_mass: 40 });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.muscle_mass).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('preserves non-sensitive fields', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', { action: 'login', count: 5 });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.action).toBe('login');
      expect(loggedData.count).toBe(5);
      spy.mockRestore();
    });

    it('sanitizes nested objects recursively', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test', {
        user: {
          email: 'nested@test.com',
          profile: {
            weight: 80,
          },
        },
      });
      const loggedData = spy.mock.calls[0][1];
      expect(loggedData.user.email).toBe('[REDACTED]');
      expect(loggedData.user.profile.weight).toBe('[REDACTED]');
      spy.mockRestore();
    });

    it('handles null data gracefully', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      expect(() => logger.info('test', null)).not.toThrow();
      spy.mockRestore();
    });

    it('handles undefined data gracefully', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      expect(() => logger.info('test')).not.toThrow();
      spy.mockRestore();
    });
  });

  // ============================================
  // Logger methods
  // ============================================
  describe('log methods', () => {
    it('info logs with [INFO] prefix', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      logger.info('test message');
      expect(spy).toHaveBeenCalledWith('[INFO] test message', '');
      spy.mockRestore();
    });

    it('warn logs with [WARN] prefix', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      logger.warn('warning message');
      expect(spy).toHaveBeenCalledWith('[WARN] warning message', '');
      spy.mockRestore();
    });

    it('error logs with [ERROR] prefix in dev', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      logger.error('error message', new Error('test'));
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toBe('[ERROR] error message');
      spy.mockRestore();
    });
  });

  // ============================================
  // Production mode
  // ============================================
  describe('production mode', () => {
    it('does not log info in production', () => {
      (global as any).__DEV__ = false;
      jest.resetModules();
      const prodLogger = require('@/lib/security/logger').logger;
      const spy = jest.spyOn(console, 'log').mockImplementation();
      prodLogger.info('should not appear');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
      (global as any).__DEV__ = true;
    });

    it('does not log warn in production', () => {
      (global as any).__DEV__ = false;
      jest.resetModules();
      const prodLogger = require('@/lib/security/logger').logger;
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      prodLogger.warn('should not appear');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
      (global as any).__DEV__ = true;
    });

    it('does not log error details in production', () => {
      (global as any).__DEV__ = false;
      jest.resetModules();
      const prodLogger = require('@/lib/security/logger').logger;
      const spy = jest.spyOn(console, 'error').mockImplementation();
      prodLogger.error('prod error', { sensitive: 'data' });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
      (global as any).__DEV__ = true;
    });
  });
});
