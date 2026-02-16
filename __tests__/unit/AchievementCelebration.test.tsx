import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '../helpers/renderWithTheme';
import { findUnexpectedEmoji, ALLOWED_EMOJIS } from '../helpers/iconTestUtils';
import { AchievementCelebration } from '@/components/AchievementCelebration';

const defaultProps = {
  visible: true,
  achievementName: 'Premier Combat',
  achievementNameJp: '初めての戦い',
  icon: <Text>🥋</Text>,
  color: '#FFD700',
  reward: '+100 XP',
  type: 'badge' as const,
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AchievementCelebration', () => {
  it('does not render content when visible=false', () => {
    const { queryByText } = renderWithProviders(
      <AchievementCelebration {...defaultProps} visible={false} />
    );
    // Our Modal mock returns null when visible=false
    expect(queryByText('Premier Combat')).toBeNull();
  });

  it('displays achievement name and reward', () => {
    const { getByText } = renderWithProviders(
      <AchievementCelebration {...defaultProps} />
    );
    expect(getByText('Premier Combat')).toBeTruthy();
    expect(getByText('初めての戦い')).toBeTruthy();
  });

  it('displays reward text with allowed 🎁 emoji', () => {
    const { getByText } = renderWithProviders(
      <AchievementCelebration {...defaultProps} />
    );
    // The reward text includes 🎁 which is an allowed emoji
    expect(getByText('🎁 +100 XP')).toBeTruthy();
  });

  it('sparklesRow contains SVG icons (not ⭐ emoji)', () => {
    const { toJSON } = renderWithProviders(
      <AchievementCelebration {...defaultProps} />
    );
    const json = JSON.stringify(toJSON());
    // Should contain SVG elements from Sparkles and Star icons
    expect(json).toContain('Svg');
    // Should NOT contain star emoji
    expect(json).not.toContain('⭐');
  });

  it('displays correct type label for badge', () => {
    const { getByText } = renderWithProviders(
      <AchievementCelebration {...defaultProps} type="badge" />
    );
    expect(getByText('BADGE DÉBLOQUÉ')).toBeTruthy();
  });

  it('displays correct type label for rank', () => {
    const { getByText } = renderWithProviders(
      <AchievementCelebration {...defaultProps} type="rank" />
    );
    expect(getByText('NOUVEAU RANG')).toBeTruthy();
  });

  it('displays correct type label for level', () => {
    const { getByText } = renderWithProviders(
      <AchievementCelebration {...defaultProps} type="level" />
    );
    expect(getByText('NIVEAU SUPÉRIEUR')).toBeTruthy();
  });

  it('calls onClose after 4 seconds', () => {
    renderWithProviders(
      <AchievementCelebration {...defaultProps} />
    );
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    jest.advanceTimersByTime(4000);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('contains only allowed emojis (🎁 for reward)', () => {
    const { toJSON } = renderWithProviders(
      <AchievementCelebration {...defaultProps} />
    );
    const json = JSON.stringify(toJSON());
    const unexpected = findUnexpectedEmoji([json]);
    // 🥋 from the icon prop is part of the test data, not the component
    // Filter it out for a fair test
    const filteredUnexpected = unexpected.filter(e => e !== '🥋');
    expect(filteredUnexpected).toEqual([]);
  });
});
