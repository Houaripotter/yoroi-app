/**
 * REGRESSION TEST SUITE - SourceBadge Component
 * Vérifie le rendu du composant SourceBadge pour toutes les sources.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  SourceBadge,
  getSourceDisplayName,
  getSourceColor,
} from '@/components/SourceBadge';

describe('REGRESSION: SourceBadge Component', () => {
  // ============================================
  // RENDER TESTS
  // ============================================
  describe('rendering', () => {
    it('renders null for null source', () => {
      const { toJSON } = render(<SourceBadge source={null} />);
      expect(toJSON()).toBeNull();
    });

    it('renders null for undefined source', () => {
      const { toJSON } = render(<SourceBadge source={undefined} />);
      expect(toJSON()).toBeNull();
    });

    it('renders null for "unknown" source', () => {
      const { toJSON } = render(<SourceBadge source="unknown" />);
      expect(toJSON()).toBeNull();
    });

    it('renders badge for known sources', () => {
      const sources = ['withings', 'garmin', 'polar', 'whoop', 'apple_watch',
                        'samsung', 'fitbit', 'xiaomi', 'renpho', 'eufy', 'omron',
                        'iphone', 'manual', 'apple_health'];
      for (const source of sources) {
        const { toJSON } = render(<SourceBadge source={source} />);
        expect(toJSON()).not.toBeNull();
      }
    });

    it('renders badge for unknown but valid source', () => {
      const { toJSON } = render(<SourceBadge source="someNewApp" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders in small size by default', () => {
      const { toJSON } = render(<SourceBadge source="withings" />);
      const tree = toJSON();
      expect(tree).not.toBeNull();
    });

    it('renders in medium size', () => {
      const { toJSON } = render(<SourceBadge source="garmin" size="medium" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders with label when showLabel is true', () => {
      const { getByText } = render(<SourceBadge source="withings" showLabel />);
      expect(getByText('Withings')).toBeTruthy();
    });

    it('renders label for garmin', () => {
      const { getByText } = render(<SourceBadge source="garmin" showLabel />);
      expect(getByText('Garmin')).toBeTruthy();
    });

    it('renders label for polar', () => {
      const { getByText } = render(<SourceBadge source="polar" showLabel />);
      expect(getByText('Polar')).toBeTruthy();
    });

    it('renders label for whoop', () => {
      const { getByText } = render(<SourceBadge source="whoop" showLabel />);
      expect(getByText('WHOOP')).toBeTruthy();
    });

    it('renders abbreviation text for badge mode', () => {
      const { getByText } = render(<SourceBadge source="withings" />);
      expect(getByText('W')).toBeTruthy();
    });
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  describe('getSourceDisplayName', () => {
    it('returns empty for null', () => {
      expect(getSourceDisplayName(null)).toBe('');
      expect(getSourceDisplayName(undefined)).toBe('');
    });

    it('returns correct display names', () => {
      expect(getSourceDisplayName('withings')).toBe('Withings');
      expect(getSourceDisplayName('garmin')).toBe('Garmin');
      expect(getSourceDisplayName('polar')).toBe('Polar');
      expect(getSourceDisplayName('whoop')).toBe('WHOOP');
      expect(getSourceDisplayName('apple_watch')).toBe('Apple Watch');
      expect(getSourceDisplayName('manual')).toBe('Manuel');
    });

    it('returns raw source for unknown', () => {
      expect(getSourceDisplayName('unknownApp')).toBe('unknownApp');
    });
  });

  describe('getSourceColor', () => {
    it('returns fallback color for null', () => {
      expect(getSourceColor(null)).toBe('#9CA3AF');
      expect(getSourceColor(undefined)).toBe('#9CA3AF');
    });

    it('returns brand colors', () => {
      expect(getSourceColor('withings')).toBe('#00B5AD');
      expect(getSourceColor('garmin')).toBe('#007DC5');
      expect(getSourceColor('polar')).toBe('#D5001C');
      expect(getSourceColor('whoop')).toBe('#00C48C');
    });

    it('returns fallback for unknown source', () => {
      expect(getSourceColor('unknownBrand')).toBe('#9CA3AF');
    });
  });
});
