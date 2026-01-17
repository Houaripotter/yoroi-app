// ============================================
// YOROI - THEME SELECTOR
// 9 couleurs × 2 modes (Dark/Light/Auto)
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Palette, Sun, Moon, Smartphone, Check, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import { ThemeColor, ThemeMode, isPremiumTheme, themeColors } from '@/constants/themes';
import { useDevMode } from '@/lib/DevModeContext';

// ============================================
// COMPOSANT MODE TOGGLE (Dark/Light/Auto)
// ============================================

const ModeToggle: React.FC = () => {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();

  const modes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dark',
      label: 'Sombre',
      icon: <Moon size={18} color={themeMode === 'dark' ? colors.textOnAccent : colors.textMuted} />
    },
    {
      id: 'light',
      label: 'Clair',
      icon: <Sun size={18} color={themeMode === 'light' ? colors.textOnAccent : colors.textMuted} />
    },
    {
      id: 'auto',
      label: 'Auto',
      icon: <Smartphone size={18} color={themeMode === 'auto' ? colors.textOnAccent : colors.textMuted} />
    },
  ];

  return (
    <View style={[styles.modeContainer, { backgroundColor: colors.backgroundElevated }]}>
      {modes.map((mode) => {
        const isActive = themeMode === mode.id;
        return (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.modeButton,
              isActive && [
                styles.modeButtonActive,
                { backgroundColor: colors.accent },
              ],
            ]}
            onPress={() => setThemeMode(mode.id)}
            activeOpacity={0.7}
          >
            {mode.icon}
            <Text
              style={[
                styles.modeLabel,
                { color: isActive ? colors.textOnAccent : colors.textMuted },
              ]}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ============================================
// COMPOSANT COLOR ITEM
// ============================================

interface ColorItemProps {
  item: typeof themeColors[0];
  isSelected: boolean;
  onSelect: () => void;
  isPro: boolean;
  onPremiumAlert: () => void;
}

const ColorItem: React.FC<ColorItemProps> = ({ item, isSelected, onSelect, isPro, onPremiumAlert }) => {
  const { colors, isDark } = useTheme();
  const isPremium = isPremiumTheme(item.id);
  const isUnlocked = isPro || !isPremium;

  const handlePress = () => {
    if (!isUnlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onPremiumAlert();
      return;
    }
    onSelect();
  };

  return (
    <TouchableOpacity
      style={[
        styles.colorItem,
        {
          backgroundColor: colors.backgroundElevated,
          borderColor: isSelected ? item.color : colors.border,
          borderWidth: isSelected ? 2 : 1,
          opacity: isUnlocked ? 1 : 0.6,
        },
        isSelected && {
          shadowColor: item.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Color Circle */}
      <View
        style={[
          styles.colorCircle,
          {
            backgroundColor: item.color,
            shadowColor: item.color,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          },
        ]}
      >
        {isSelected && (
          <Check
            size={20}
            color={item.id === 'volt' || item.id === 'matrix' || item.id === 'blaze' || item.id === 'ocean' || item.id === 'ghost' && !isDark ? '#000' : '#FFF'}
            strokeWidth={3}
          />
        )}
      </View>

      {/* Kanji */}
      <Text style={[styles.colorKanji, { color: item.color }]}>
        {item.kanji}
      </Text>

      {/* Name */}
      <Text style={[styles.colorName, { color: colors.textPrimary }]}>
        {item.name}
      </Text>

      {/* Premium Badge */}
      {isPremium && (
        <View style={[styles.premiumBadge, { backgroundColor: item.color }]}>
          <Crown size={9} color="#FFF" strokeWidth={3} />
          <Text style={styles.premiumText}>PRO</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// COMPOSANT PRINCIPAL - THEME SELECTOR
// ============================================

export const ThemeSelector: React.FC = () => {
  const { colors, themeColor, setThemeColor, theme, isDark, actualMode } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { isPro } = useDevMode();

  const handlePremiumAlert = () => {
    showPopup(
      'Theme Premium',
      'Ce theme necessite la version Premium.\n\nMode Createur : Tapez 5 fois sur "Version 1.0.0" dans les Reglages pour debloquer.',
      [{ text: 'OK', style: 'primary' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.accent}20` }]}>
          <Palette size={20} color={colors.accentText} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Apparence
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {theme.name} {actualMode === 'dark' ? 'Sombre' : 'Clair'}
          </Text>
        </View>
      </View>

      {/* Mode Toggle */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        MODE
      </Text>
      <ModeToggle />

      {/* Color Grid */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 20 }]}>
        COULEUR
      </Text>
      <View style={styles.colorGrid}>
        {themeColors.map((item) => (
          <ColorItem
            key={item.id}
            item={item}
            isSelected={themeColor === item.id}
            onSelect={() => setThemeColor(item.id as ThemeColor)}
            isPro={isPro}
            onPremiumAlert={handlePremiumAlert}
          />
        ))}
      </View>

      {/* Current Theme Preview */}
      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: colors.backgroundElevated,
            borderColor: colors.accent,
          }
        ]}
      >
        <View style={[styles.previewDot, { backgroundColor: colors.accent }]} />
        <View style={styles.previewInfo}>
          <Text style={[styles.previewName, { color: colors.textPrimary }]}>
            {theme.icon} {theme.name} {actualMode === 'dark' ? 'Dark' : 'Light'}
          </Text>
          <Text style={[styles.previewHex, { color: colors.textMuted }]}>
            {colors.accent}
          </Text>
        </View>
        <Text style={[styles.previewKanji, { color: colors.accent }]}>
          {theme.kanji}
        </Text>
      </View>
      <PopupComponent />
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Section Label
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  // Mode Toggle
  modeContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modeButtonActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Color Grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  colorItem: {
    width: '31%',
    aspectRatio: 0.9,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  colorKanji: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  colorName: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  // Preview Card
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewHex: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  previewKanji: {
    fontSize: 28,
    fontWeight: '800',
  },
});

export default ThemeSelector;
