// Must mock expo-secure-store before importing secureStorage
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
}));

// Unmock secureStorage so we test the real implementation
jest.unmock('@/lib/security/logger');

import { secureStorage } from '@/lib/security/secureStorage';
import * as SecureStore from 'expo-secure-store';

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // setItem
  // ============================================
  describe('setItem', () => {
    it('saves a string value', async () => {
      const result = await secureStorage.setItem('test_key', 'test_value');
      expect(result).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'test_key',
        'test_value',
        expect.any(Object)
      );
    });

    it('serializes objects to JSON', async () => {
      const obj = { name: 'test', value: 42 };
      await secureStorage.setItem('obj_key', obj);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'obj_key',
        JSON.stringify(obj),
        expect.any(Object)
      );
    });

    it('serializes arrays to JSON', async () => {
      const arr = [1, 2, 3];
      await secureStorage.setItem('arr_key', arr);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'arr_key',
        JSON.stringify(arr),
        expect.any(Object)
      );
    });

    it('returns false on error', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));
      const result = await secureStorage.setItem('key', 'value');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // getItem
  // ============================================
  describe('getItem', () => {
    it('returns null when key does not exist', async () => {
      const result = await secureStorage.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('returns parsed JSON for stored objects', async () => {
      const obj = { name: 'test', value: 42 };
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(obj));
      const result = await secureStorage.getItem('obj_key');
      expect(result).toEqual(obj);
    });

    it('returns raw string if not valid JSON', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('plain string');
      const result = await secureStorage.getItem('str_key');
      expect(result).toBe('plain string');
    });

    it('returns parsed arrays', async () => {
      const arr = [1, 2, 3];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(arr));
      const result = await secureStorage.getItem('arr_key');
      expect(result).toEqual(arr);
    });

    it('returns null on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Read error'));
      const result = await secureStorage.getItem('key');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // removeItem
  // ============================================
  describe('removeItem', () => {
    it('deletes a key', async () => {
      const result = await secureStorage.removeItem('test_key');
      expect(result).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('test_key');
    });

    it('returns false on error', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Delete error'));
      const result = await secureStorage.removeItem('key');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // Key sanitization
  // ============================================
  describe('key sanitization', () => {
    it('sanitizes keys with special characters', async () => {
      await secureStorage.setItem('@yoroi_measurements', 'test');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        '_yoroi_measurements',
        'test',
        expect.any(Object)
      );
    });

    it('preserves alphanumeric, dot, dash, underscore', async () => {
      await secureStorage.setItem('valid.key-name_123', 'test');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'valid.key-name_123',
        'test',
        expect.any(Object)
      );
    });

    it('replaces spaces with underscores', async () => {
      await secureStorage.setItem('key with spaces', 'test');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'key_with_spaces',
        'test',
        expect.any(Object)
      );
    });
  });
});
