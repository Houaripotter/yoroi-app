// ============================================
// 🩺 YOROI MEDIC - INFIRMERIE
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Activity, TrendingDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { BodyMap, BodyZone as BodyMapZone, INITIAL_DATA } from '@/components/BodyMap';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ZoneSelectionModal, Zone } from '@/components/ZoneSelectionModal';
import {
  Injury,
  getActiveInjuries,
  getInjuryStats,
} from '@/lib/database';
import {
  getFitForDutyInfo,
  getInjuriesWithZoneNames,
  getDaysSinceInjury,
  getEVAColor,
  getEVAEmoji,
} from '@/lib/infirmaryService';
import {
  BodyZone,
  FIT_FOR_DUTY_STATUS,
  getZoneById,
} from '@/constants/bodyZones';

export default function InfirmaryScreen() {
  const { colors } = useTheme();

  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [fitForDutyStatus, setFitForDutyStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  // Zone selection modal state
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [overlappingZones, setOverlappingZones] = useState<Zone[]>([]);
  const [currentView, setCurrentView] = useState<'front' | 'back'>('front');

  // Charger les données
  const loadData = async () => {
    try {
      const activeInjuries = await getActiveInjuries();
      const injuriesWithNames = await getInjuriesWithZoneNames('active');
      setInjuries(injuriesWithNames);

      const fitForDuty = await getFitForDutyInfo();
      setFitForDutyStatus(fitForDuty);

      const injuryStats = await getInjuryStats();
      setStats(injuryStats);
    } catch (error) {
      console.error('[Infirmary] Erreur chargement:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Détecter les zones rectangulaires qui se chevauchent
  const getOverlappingZones = (zone: BodyMapZone, view: 'front' | 'back'): BodyMapZone[] => {
    const allZones = view === 'front' ? INITIAL_DATA.front : INITIAL_DATA.back;

    // Calculer les limites du rectangle de la zone cliquée
    const zone1Left = zone.x - zone.w / 2;
    const zone1Right = zone.x + zone.w / 2;
    const zone1Top = zone.y - zone.h / 2;
    const zone1Bottom = zone.y + zone.h / 2;

    return allZones.filter(z => {
      // Calculer les limites du rectangle de chaque zone
      const zone2Left = z.x - z.w / 2;
      const zone2Right = z.x + z.w / 2;
      const zone2Top = z.y - z.h / 2;
      const zone2Bottom = z.y + z.h / 2;

      // Vérifier si les rectangles se chevauchent
      const overlaps =
        zone1Left < zone2Right &&
        zone1Right > zone2Left &&
        zone1Top < zone2Bottom &&
        zone1Bottom > zone2Top;

      return overlaps;
    });
  };

  // Ouvrir le modal pour ajouter/modifier une blessure
  const handleZonePress = (zone: BodyMapZone, view: 'front' | 'back') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Détecter toutes les zones qui se chevauchent avec la zone cliquée
    const overlapping = getOverlappingZones(zone, view);

    console.log('🎯 Zone cliquée:', zone.label, 'x:', zone.x, 'y:', zone.y, 'w:', zone.w, 'h:', zone.h);
    console.log('🔍 Zones qui se chevauchent:', overlapping.length, overlapping.map(z => z.label));

    if (overlapping.length > 1) {
      // Plusieurs zones détectées, formater pour le modal
      const formattedZones = overlapping.map(z => ({
        id: z.id,
        name: z.label, // Utiliser 'label' au lieu de 'name'
      }));

      console.log('✅ AFFICHAGE MODAL avec zones:', formattedZones);
      setOverlappingZones(formattedZones);
      setCurrentView(view);
      setShowZoneModal(true);
    } else {
      // Une seule zone, aller directement à l'évaluation
      console.log('⚠️ Une seule zone, pas de modal');
      navigateToEvaluation(zone.id, view, zone.label);
    }
  };

  // Naviguer vers l'évaluation d'une zone
  const navigateToEvaluation = (zoneId: string, view: 'front' | 'back', zoneName: string) => {
    // Vérifier s'il y a déjà une blessure active pour cette zone
    const existingInjury = injuries.find(
      injury => injury.zone_id === zoneId && injury.zone_view === view
    );

    if (existingInjury) {
      // Blessure existante, permettre de la modifier
      router.push(
        `/injury-evaluation?zoneId=${zoneId}&zoneView=${view}&zoneName=${encodeURIComponent(zoneName)}&injuryId=${existingInjury.id}&existingEva=${existingInjury.eva_score}&existingDuration=${existingInjury.estimated_recovery_days}`
      );
    } else {
      // Nouvelle blessure
      router.push(
        `/injury-evaluation?zoneId=${zoneId}&zoneView=${view}&zoneName=${encodeURIComponent(zoneName)}`
      );
    }
  };

  // Callback quand une zone est sélectionnée dans le modal
  const handleZoneSelected = (zone: { id: string; name: string }) => {
    navigateToEvaluation(zone.id, currentView, zone.name);
  };

  // Préparer les zones blessées pour le BodyMap
  const injuredZones = injuries.map(injury => ({
    zone_id: injury.zone_id,
    zone_view: injury.zone_view,
    eva_score: injury.eva_score,
  }));

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: '#EF444420' }]}>
              {/* Croix rouge */}
              <View style={styles.redCross}>
                <View style={[styles.crossVertical, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.crossHorizontal, { backgroundColor: '#EF4444' }]} />
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Infirmerie
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Suivi des blessures
              </Text>
            </View>
          </View>
        </View>

        {/* Statut FIT FOR DUTY */}
        {fitForDutyStatus && (
          <View
            style={[
              styles.fitForDutyBanner,
              { backgroundColor: fitForDutyStatus.backgroundColor },
            ]}
          >
            <Text style={styles.fitForDutyIcon}>{fitForDutyStatus.icon}</Text>
            <View style={styles.fitForDutyInfo}>
              <Text style={[styles.fitForDutyTitle, { color: fitForDutyStatus.color }]}>
                {fitForDutyStatus.title}
              </Text>
              <Text style={[styles.fitForDutySubtitle, { color: fitForDutyStatus.color }]}>
                {fitForDutyStatus.subtitle}
              </Text>
              <Text style={[styles.fitForDutyAdvice, { color: fitForDutyStatus.color }]}>
                {fitForDutyStatus.advice}
              </Text>
            </View>
          </View>
        )}

        {/* Statistiques */}
        {stats && stats.totalInjuries > 0 && (
          <View style={[styles.statsCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {stats.activeInjuries}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Actives
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {stats.healedInjuries}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Guéries
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.averageRecoveryDays}j
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Récup. moy.
              </Text>
            </View>
          </View>
        )}

        {/* Body Map */}
        <BodyMap onZonePress={handleZonePress} injuredZones={injuredZones} />

        {/* Liste des blessures actives */}
        {injuries.length > 0 && (
          <View style={styles.injuriesList}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Blessures actives
            </Text>

            {injuries.map((injury) => (
              <TouchableOpacity
                key={injury.id}
                style={[styles.injuryCard, { backgroundColor: colors.backgroundCard }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/injury-detail?id=${injury.id}`);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.injuryCardHeader}>
                  <Text style={[styles.injuryZone, { color: colors.textPrimary }]}>
                    {injury.zone_name}
                  </Text>
                  <View
                    style={[
                      styles.evaBadge,
                      { backgroundColor: getEVAColor(injury.eva_score) },
                    ]}
                  >
                    <Text style={styles.evaBadgeText}>
                      {getEVAEmoji(injury.eva_score)} EVA {injury.eva_score}
                    </Text>
                  </View>
                </View>

                <View style={styles.injuryCardFooter}>
                  <Text style={[styles.injuryDays, { color: colors.textSecondary }]}>
                    Depuis {getDaysSinceInjury(injury.date)} jours
                  </Text>
                  <TrendingDown size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty state */}
        {injuries.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.backgroundCard }]}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Aucune blessure
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Touchez une zone du corps pour signaler une blessure
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de sélection de zone */}
      <ZoneSelectionModal
        visible={showZoneModal}
        zones={overlappingZones}
        onSelect={handleZoneSelected}
        onClose={() => setShowZoneModal(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  topSection: {
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  redCross: {
    width: 28,
    height: 28,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVertical: {
    position: 'absolute',
    width: 10,
    height: 28,
    borderRadius: 2,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 28,
    height: 10,
    borderRadius: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  // FIT FOR DUTY Banner
  fitForDutyBanner: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  fitForDutyIcon: {
    fontSize: 32,
  },
  fitForDutyInfo: {
    flex: 1,
  },
  fitForDutyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  fitForDutySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  fitForDutyAdvice: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Injuries List
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  injuriesList: {
    marginTop: SPACING.md,
  },
  injuryCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  injuryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  injuryZone: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  evaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  evaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  injuryCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  injuryDays: {
    fontSize: 12,
  },
  // Empty State
  emptyState: {
    padding: SPACING.xxl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
