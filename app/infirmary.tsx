// ============================================
// YOROI MEDIC - SUIVI BLESSURES
// ============================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { ArrowLeft, Plus, Activity, TrendingDown, Shield } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
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
import logger from '@/lib/security/logger';
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
  const [isCreatorMode, setIsCreatorMode] = useState(false);

  // Zone selection modal state
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [overlappingZones, setOverlappingZones] = useState<Zone[]>([]);
  const [currentView, setCurrentView] = useState<'front' | 'back'>('front');

  // Son Pokemon recovery
  const recoverySoundRef = useRef<Audio.Sound | null>(null);

  // Charger et jouer le son Pokemon recovery à l'entrée
  useEffect(() => {
    const loadAndPlaySound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/pokemon-recovery-made-with-Voicemod.mp3')
        );
        recoverySoundRef.current = sound;
        await sound.playAsync();
      } catch (error) {
        logger.info('[Infirmary] Son recovery non disponible:', error);
      }
    };

    loadAndPlaySound();

    return () => {
      recoverySoundRef.current?.unloadAsync();
    };
  }, []);

  // Charger les données et vérifier le mode créateur
  const loadData = async () => {
    try {
      const activeInjuries = await getActiveInjuries();
      const injuriesWithNames = await getInjuriesWithZoneNames('active');
      setInjuries(injuriesWithNames);

      const fitForDuty = await getFitForDutyInfo();
      setFitForDutyStatus(fitForDuty);

      const injuryStats = await getInjuryStats();
      setStats(injuryStats);

      // Vérifier le mode créateur
      const creatorMode = await AsyncStorage.getItem('@yoroi_creator_mode');
      setIsCreatorMode(creatorMode === 'true');
    } catch (error) {
      logger.error('[Infirmary] Erreur chargement:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Détecter les zones rectangulaires qui se chevauchent ET sont proches
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

      if (!overlaps) return false;

      // Calculer la distance entre les centres des deux zones
      const dx = zone.x - z.x;
      const dy = zone.y - z.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Ne garder que les zones très proches (distance < 50 pixels)
      // Cela élimine les zones qui se chevauchent mais sont éloignées
      return distance < 50;
    });
  };

  // Ouvrir le modal pour ajouter/modifier une blessure
  const handleZonePress = (zone: BodyMapZone, view: 'front' | 'back') => {
    impactAsync(ImpactFeedbackStyle.Medium);

    // Détecter toutes les zones qui se chevauchent avec la zone cliquée
    const overlapping = getOverlappingZones(zone, view);

    logger.info(`Zone cliquée: ${zone.label} x: ${zone.x} y: ${zone.y} w: ${zone.w} h: ${zone.h}`);
    logger.info(`🔍 Zones qui se chevauchent: ${overlapping.length}`, overlapping.map(z => z.label));

    if (overlapping.length > 1) {
      // Plusieurs zones se chevauchent: afficher le sélecteur pour choisir la zone exacte
      const formattedZones = overlapping.map(z => ({
        id: z.id,
        name: z.label,
      }));

      logger.info('AFFICHAGE MODAL avec zones:', formattedZones);
      setOverlappingZones(formattedZones);
      setCurrentView(view);
      setShowZoneModal(true);
    } else {
      // Une seule zone: navigation directe
      const targetZone = overlapping.length > 0 ? overlapping[0] : zone;
      logger.info('Une seule zone, navigation directe vers:', targetZone.label);
      navigateToEvaluation(targetZone.id, view, targetZone.label);
    }
  };

  // Naviguer vers l'évaluation d'une zone
  const navigateToEvaluation = (zoneId: string, view: 'front' | 'back', zoneName: string) => {
    // Vérifier s'il y a déjà une blessure active pour cette zone
    const existingInjury = injuries.find(
      injury => injury.zone_id === zoneId && injury.zone_view === view
    );

    if (existingInjury) {
      // Blessure existante, aller directement à l'écran de détail pour la modifier
      router.push(`/injury-detail?id=${existingInjury.id}`);
    } else {
      // Nouvelle blessure, aller à l'écran d'évaluation
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
              impactAsync(ImpactFeedbackStyle.Light);
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
                Journal des Blessures
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Carnet de suivi personnel
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
                  impactAsync(ImpactFeedbackStyle.Light);
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
                      EVA {injury.eva_score}
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
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.success + '20' }]}>
              <Shield size={32} color={colors.success} strokeWidth={2} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Aucune blessure
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Touchez une zone du corps pour signaler une blessure
            </Text>
          </View>
        )}

        {/* Disclaimer médical */}
        <View style={[styles.disclaimerContainer, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            Ce journal est un outil de suivi personnel et ne remplace pas un avis médical.
          </Text>
        </View>
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
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Disclaimer
  disclaimerContainer: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
