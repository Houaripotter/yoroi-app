import React from 'react';
import { renderWithProviders } from '../helpers/renderWithTheme';
import { findUnexpectedEmoji } from '../helpers/iconTestUtils';
import { EmptyState } from '@/components/planning/EmptyState';

describe('EmptyState', () => {
  const types = ['calendar', 'programme', 'journal', 'clubs', 'competitions'] as const;

  const expectedTitles: Record<string, string> = {
    calendar: 'Commence ton aventure',
    programme: 'Planifie ta semaine',
    journal: 'Documente ta progression',
    clubs: 'Ajoute ton club',
    competitions: 'Trouve ta prochaine compétition',
  };

  types.forEach((type) => {
    it(`renders correct title for type="${type}"`, () => {
      const { getByText } = renderWithProviders(<EmptyState type={type} />);
      expect(getByText(expectedTitles[type])).toBeTruthy();
    });
  });

  it('renders action button when onAction is provided', () => {
    const onAction = jest.fn();
    const { getByText } = renderWithProviders(
      <EmptyState type="calendar" onAction={onAction} />
    );
    expect(getByText('Ajouter une séance')).toBeTruthy();
  });

  it('does not render action button when onAction is not provided', () => {
    const { queryByText } = renderWithProviders(
      <EmptyState type="calendar" />
    );
    expect(queryByText('Ajouter une séance')).toBeNull();
  });

  it('renders motivation badge with Flame icon', () => {
    const { getByText } = renderWithProviders(
      <EmptyState type="calendar" />
    );
    expect(getByText('Chaque champion a commencé ici')).toBeTruthy();
  });

  it('contains no unexpected emojis (old decorative emojis removed)', () => {
    // Render each type and check for unexpected emojis
    types.forEach((type) => {
      const { toJSON } = renderWithProviders(
        <EmptyState type={type} onAction={() => {}} />
      );
      const json = JSON.stringify(toJSON());
      const unexpected = findUnexpectedEmoji([json]);
      expect(unexpected).toEqual([]);
    });
  });

  it('does not contain old emoji characters 🗓️📋📖', () => {
    types.forEach((type) => {
      const { toJSON } = renderWithProviders(<EmptyState type={type} />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('🗓');
      expect(json).not.toContain('📋');
      expect(json).not.toContain('📖');
    });
  });

  it('renders SVG icons (from lucide-react-native)', () => {
    const { toJSON } = renderWithProviders(
      <EmptyState type="calendar" onAction={() => {}} />
    );
    const json = JSON.stringify(toJSON());
    // SVG mock renders elements with type "Svg" - verify they're present
    expect(json).toContain('Svg');
  });
});
