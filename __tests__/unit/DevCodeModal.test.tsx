import React from 'react';
import { renderWithProviders } from '../helpers/renderWithTheme';
import { findUnexpectedEmoji, ALLOWED_EMOJIS } from '../helpers/iconTestUtils';
import DevCodeModal from '@/components/DevCodeModal';

describe('DevCodeModal', () => {
  it('renders the modal with title', () => {
    const { getByText } = renderWithProviders(<DevCodeModal />);
    // Title contains 🔐 which is an allowed emoji
    expect(getByText(/Mode Créateur/)).toBeTruthy();
  });

  it('renders Lock icon by default (SVG, not emoji)', () => {
    const { toJSON } = renderWithProviders(<DevCodeModal />);
    const json = JSON.stringify(toJSON());
    // Lock icon should be rendered as SVG
    expect(json).toContain('Svg');
    // Should not contain lock emoji
    expect(json).not.toContain('🔒');
  });

  it('renders X icon for close button (SVG, not emoji)', () => {
    const { toJSON } = renderWithProviders(<DevCodeModal />);
    const json = JSON.stringify(toJSON());
    // X icon from lucide is rendered as SVG
    expect(json).toContain('Svg');
    // No ❌ emoji
    expect(json).not.toContain('❌');
  });

  it('renders description text', () => {
    const { getByText } = renderWithProviders(<DevCodeModal />);
    expect(
      getByText(/Entrez le code secret pour débloquer/)
    ).toBeTruthy();
  });

  it('renders input field with placeholder', () => {
    const { getByPlaceholderText } = renderWithProviders(<DevCodeModal />);
    expect(getByPlaceholderText('Code secret...')).toBeTruthy();
  });

  it('verify button is present', () => {
    const { getByText } = renderWithProviders(<DevCodeModal />);
    expect(getByText('Vérifier')).toBeTruthy();
  });

  it('contains only allowed emojis (🔐 in title)', () => {
    const { toJSON } = renderWithProviders(<DevCodeModal />);
    const json = JSON.stringify(toJSON());
    const unexpected = findUnexpectedEmoji([json]);
    expect(unexpected).toEqual([]);
  });
});
