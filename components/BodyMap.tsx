// ============================================
// 🩺 YOROI MEDIC - BODY MAP INTERACTIF
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import {
  BodyZone,
  BODY_ZONES_FRONT,
  BODY_ZONES_BACK,
} from '@/constants/bodyZones';
import { SPACING, RADIUS } from '@/constants/appTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BODY_MAP_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const BODY_MAP_HEIGHT = BODY_MAP_WIDTH * 1.8; // Ratio 1:1.8 pour une silhouette

interface BodyMapProps {
  onZonePress: (zone: BodyZone, view: 'front' | 'back') => void;
  injuredZones?: Array<{ zone_id: string; zone_view: 'front' | 'back'; eva_score: number }>;
}

export const BodyMap: React.FC<BodyMapProps> = ({ onZonePress, injuredZones = [] }) => {
  const { colors } = useTheme();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null);

  const zones = view === 'front' ? BODY_ZONES_FRONT : BODY_ZONES_BACK;

  const handleZonePress = (zone: BodyZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedZone(zone.id);
    setSelectedZoneName(zone.name);
    setTimeout(() => {
      setSelectedZone(null);
      setSelectedZoneName(null);
    }, 2000); // 2 secondes pour bien voir la zone
    onZonePress(zone, view);
  };

  const toggleView = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedZone(null);
    setSelectedZoneName(null);
    setView(view === 'front' ? 'back' : 'front');
  };

  const getZoneColor = (zoneId: string): string => {
    const injury = injuredZones.find(
      inj => inj.zone_id === zoneId && inj.zone_view === view
    );
    if (!injury) return 'transparent';

    // Couleur basée sur l'EVA
    if (injury.eva_score >= 7) return 'rgba(244, 67, 54, 0.6)'; // Rouge
    if (injury.eva_score >= 4) return 'rgba(255, 152, 0, 0.6)'; // Orange
    return 'rgba(139, 195, 74, 0.6)'; // Vert
  };

  return (
    <View style={styles.container}>
      {/* Bouton Face/Dos */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            { backgroundColor: colors.backgroundCard },
            view === 'front' && { backgroundColor: colors.accent },
          ]}
          onPress={() => {
            if (view !== 'front') toggleView();
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.viewToggleText,
              { color: view === 'front' ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            Face
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewToggleButton,
            { backgroundColor: colors.backgroundCard },
            view === 'back' && { backgroundColor: colors.accent },
          ]}
          onPress={() => {
            if (view !== 'back') toggleView();
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.viewToggleText,
              { color: view === 'back' ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            Dos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body Map */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wrapper qui contient l'image ET les zones - CRUCIAL pour le positionnement */}
        <View
          style={[
            styles.bodyMapContainer,
            { backgroundColor: colors.backgroundElevated },
          ]}
        >
          <View style={styles.imageWrapper}>
            {/* Image du corps */}
            <Image
              source={
                view === 'front'
                  ? require('@/assets/infirmerie/body_front.png')
                  : require('@/assets/infirmerie/body_back.png')
              }
              style={styles.bodyImage}
              resizeMode="contain"
            />

            {/* Overlay zone sélectionnée */}
            {selectedZoneName && (
              <View style={[styles.selectedZoneOverlay, { backgroundColor: colors.accent }]}>
                <Text style={styles.selectedZoneText}>📍 {selectedZoneName}</Text>
              </View>
            )}

            {/* Zones cliquables - MAINTENANT RELATIVES À L'IMAGE */}
            {zones.map((zone) => {
              const isSelected = selectedZone === zone.id;
              const zoneColor = getZoneColor(zone.id);

              return (
                <TouchableOpacity
                  key={zone.id}
                  style={[
                    styles.zone,
                    {
                      left: `${zone.x}%`,
                      top: `${zone.y}%`,
                      width: zone.radius * 10, // Multiplier pour avoir une taille raisonnable
                      height: zone.radius * 10,
                      borderRadius: zone.radius * 5,
                      marginLeft: -(zone.radius * 5), // Centrer le cercle sur les coordonnées
                      marginTop: -(zone.radius * 5),
                      backgroundColor: zoneColor,
                      borderWidth: isSelected ? 4 : zoneColor !== 'transparent' ? 2 : 1,
                      borderColor: isSelected
                        ? '#FFFFFF'
                        : zoneColor !== 'transparent'
                        ? '#FFFFFF'
                        : 'rgba(255, 255, 255, 0.15)',
                      transform: isSelected ? [{ scale: 1.2 }] : [{ scale: 1 }],
                    },
                  ]}
                  onPress={() => handleZonePress(zone)}
                  activeOpacity={0.7}
                />
              );
            })}
          </View>
        </View>

        {/* Légende */}
        <View style={[styles.legend, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(244, 67, 54, 0.6)' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Sévère (EVA 7-10)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 152, 0, 0.6)' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Modéré (EVA 4-6)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(139, 195, 74, 0.6)' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              Léger (EVA 1-3)
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            💡 Touchez une zone pour signaler une blessure
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  viewToggleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  bodyMapContainer: {
    width: BODY_MAP_WIDTH,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  // WRAPPER CRITIQUE : contient l'image ET les zones
  imageWrapper: {
    position: 'relative', // IMPORTANT : les zones seront relatives à ce wrapper
    width: '100%',
    aspectRatio: 0.55, // Ratio de l'image du corps (ajuster si nécessaire)
  },
  bodyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  zone: {
    position: 'absolute',
  },
  selectedZoneOverlay: {
    position: 'absolute',
    top: 20,
    left: '10%',
    right: '10%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  selectedZoneText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  instructions: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
  },
  instructionsText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default BodyMap;
