import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

// ThemeContext is mocked globally in setup.ts with static dark theme colors.
// Components call useTheme() which returns the mocked values.
// No wrapper needed since the mock returns values directly.

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, options);
}
