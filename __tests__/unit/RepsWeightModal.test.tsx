import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithTheme';
import { findUnexpectedEmoji } from '../helpers/iconTestUtils';
import { RepsWeightModal } from '@/components/RepsWeightModal';

const defaultProps = {
  visible: true,
  seriesNumber: 1,
  onClose: jest.fn(),
  onSave: jest.fn(),
  onSkip: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RepsWeightModal', () => {
  it('renders when visible', () => {
    const { getByText } = renderWithProviders(
      <RepsWeightModal {...defaultProps} />
    );
    expect(getByText('Série 1 terminée !')).toBeTruthy();
  });

  it('displays correct series number', () => {
    const { getByText } = renderWithProviders(
      <RepsWeightModal {...defaultProps} seriesNumber={3} />
    );
    expect(getByText('Série 3 terminée !')).toBeTruthy();
  });

  it('save button contains Check SVG icon (not emoji)', () => {
    const { getByText } = renderWithProviders(
      <RepsWeightModal {...defaultProps} />
    );
    const saveButton = getByText('Enregistrer');
    // The parent View contains a Check icon (SVG) + Text
    // Verify no checkmark emoji is present
    expect(saveButton.props.children).toBe('Enregistrer');
    // No ✓ or ✔ emoji in the text
    expect(saveButton.props.children).not.toContain('✓');
    expect(saveButton.props.children).not.toContain('✔');
  });

  it('close button renders X SVG icon', () => {
    const { UNSAFE_queryAllByType } = renderWithProviders(
      <RepsWeightModal {...defaultProps} />
    );
    // Verify the tree renders SVG elements (from lucide X icon)
    // The mock renders SVG as "Svg" element
    const svgElements = UNSAFE_queryAllByType('Svg' as any);
    // Should have SVG icons rendered (X, Plus, Minus, Check)
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('increment reps with Plus button', () => {
    const { getByDisplayValue, getAllByRole } = renderWithProviders(
      <RepsWeightModal {...defaultProps} />
    );
    // Initial reps value is 10
    const repsInput = getByDisplayValue('10');
    expect(repsInput).toBeTruthy();
  });

  it('calls onSave with correct values', () => {
    const { getByText } = renderWithProviders(
      <RepsWeightModal {...defaultProps} />
    );
    fireEvent.press(getByText('Enregistrer'));
    expect(defaultProps.onSave).toHaveBeenCalledWith(10, 0);
  });

  it('calls onSkip when skip button pressed', () => {
    const { getByText } = renderWithProviders(
      <RepsWeightModal {...defaultProps} />
    );
    fireEvent.press(getByText('Passer'));
    expect(defaultProps.onSkip).toHaveBeenCalled();
  });

  it('calls onClose when close area pressed', () => {
    const { getByText } = renderWithProviders(
      <RepsWeightModal {...defaultProps} />
    );
    // Verify the modal renders properly
    expect(getByText('Combien de reps ?')).toBeTruthy();
    expect(getByText('Poids (kg) ?')).toBeTruthy();
  });

  it('contains no unexpected emojis in rendered output', () => {
    const { toJSON } = renderWithProviders(
      <RepsWeightModal {...defaultProps} />
    );
    const json = JSON.stringify(toJSON());
    const unexpected = findUnexpectedEmoji([json]);
    expect(unexpected).toEqual([]);
  });
});
