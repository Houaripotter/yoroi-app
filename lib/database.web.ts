import { logger } from './logger';

// ============================================
// YOROI DATABASE - WEB VERSION
// ============================================
// SQLite not available on web - uses AsyncStorage instead
// (See storage.ts for web data persistence)

export const openDatabase = async (): Promise<null> => {
  logger.info('SQLite not available on web platform, using AsyncStorage instead');
  return null;
};

export const initDatabase = async () => {
  logger.info('Skipping SQLite initialization on web platform - using AsyncStorage');
  // No-op on web, data is handled by AsyncStorage in storage.ts
};

export const getDatabase = () => null;
