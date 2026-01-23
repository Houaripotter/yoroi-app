// ============================================
// HEALTHKIT CONNECT CARD - CTA pour connecter Apple Santé
// Belle card avec icône et bouton d'action
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Heart, ChevronRight } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

interface HealthKitConnectCardProps {
  onConnect: () => void;
  isConnecting: boolean;
}

export const HealthKitConnectCard: React.FC<HealthKitConnectCardProps> = ({
  onConnect,
  isConnecting,
}) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Medium);
    }
    onConnect();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Icône */}
      <View style={[styles.iconCircle, { backgroundColor: `${colors.accent}15` }]}>
        <Heart size={48} color={colors.accentText} strokeWidth={2.5} />
      </View>

      {/* Titre */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Connecte-toi à Apple Santé
      </Text>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Synchronise automatiquement tes données de santé : fréquence cardiaque, sommeil, SpO2, température et plus encore.
      </Text>

      {/* Bouton */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={handlePress}
        disabled={isConnecting}
        activeOpacity={0.8}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color={colors.textOnAccent} />
        ) : (
          <>
            <Text style={[styles.buttonText, { color: colors.textOnAccent }]}>Connecter Apple Santé</Text>
            <ChevronRight size={20} color={colors.textOnAccent} strokeWidth={2.5} />
          </>
        )}
      </TouchableOpacity>

      {/* Note */}
      <Text style={[styles.note, { color: colors.textMuted }]}>
        Tes données restent privées et stockées uniquement sur ton appareil
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 40,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
    minWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  note: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
