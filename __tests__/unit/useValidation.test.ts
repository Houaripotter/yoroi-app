import { renderHook, act } from '@testing-library/react-native';
import { useValidation } from '@/lib/validation';

describe('useValidation hook', () => {
  // ============================================
  // validateField
  // ============================================
  describe('validateField', () => {
    it('returns true for valid field', () => {
      const { result } = renderHook(() => useValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateField('weight', 75);
      });
      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it('returns false and sets error for invalid field', () => {
      const { result } = renderHook(() => useValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateField('weight', 500);
      });
      expect(isValid!).toBe(false);
      expect(result.current.errors).toHaveProperty('weight');
    });

    it('clears error when field becomes valid', () => {
      const { result } = renderHook(() => useValidation());

      act(() => {
        result.current.validateField('weight', 500); // Invalid
      });
      expect(result.current.errors).toHaveProperty('weight');

      act(() => {
        result.current.validateField('weight', 75); // Valid
      });
      expect(result.current.errors).not.toHaveProperty('weight');
    });

    it('accumulates errors for multiple fields', () => {
      const { result } = renderHook(() => useValidation());

      act(() => {
        result.current.validateField('weight', 500);
        result.current.validateField('age', 5);
      });
      expect(result.current.errors).toHaveProperty('weight');
      expect(result.current.errors).toHaveProperty('age');
    });
  });

  // ============================================
  // validateAll
  // ============================================
  describe('validateAll', () => {
    it('returns true for all valid fields', () => {
      const { result } = renderHook(() => useValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll({ weight: 75, age: 25 });
      });
      expect(isValid!).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it('returns false and sets all errors', () => {
      const { result } = renderHook(() => useValidation());

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateAll({ weight: 500, age: 5 });
      });
      expect(isValid!).toBe(false);
      expect(result.current.errors).toHaveProperty('weight');
      expect(result.current.errors).toHaveProperty('age');
    });
  });

  // ============================================
  // clearErrors
  // ============================================
  describe('clearErrors', () => {
    it('clears all errors', () => {
      const { result } = renderHook(() => useValidation());

      act(() => {
        result.current.validateField('weight', 500);
        result.current.validateField('age', 5);
      });
      expect(Object.keys(result.current.errors).length).toBe(2);

      act(() => {
        result.current.clearErrors();
      });
      expect(result.current.errors).toEqual({});
    });
  });

  // ============================================
  // clearError
  // ============================================
  describe('clearError', () => {
    it('clears a specific error', () => {
      const { result } = renderHook(() => useValidation());

      act(() => {
        result.current.validateField('weight', 500);
        result.current.validateField('age', 5);
      });

      act(() => {
        result.current.clearError('weight');
      });
      expect(result.current.errors).not.toHaveProperty('weight');
      expect(result.current.errors).toHaveProperty('age');
    });

    it('does nothing for non-existent error', () => {
      const { result } = renderHook(() => useValidation());

      act(() => {
        result.current.validateField('weight', 500);
      });

      act(() => {
        result.current.clearError('nonexistent');
      });
      expect(result.current.errors).toHaveProperty('weight');
    });
  });
});
