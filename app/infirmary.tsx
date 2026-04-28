// ============================================
// YOROI MEDIC - SUIVI BLESSURES
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  DeviceEventEmitter,
} from 'react-native';
import { router } from 'expo-router';

import { ArrowLeft, TrendingDown, Shield } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { BodyMap, BodyZone as BodyMapZone, INITIAL_DATA } from '@/components/BodyMap';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ZoneSelectionModal, Zone } from '@/components/ZoneSelectionModal';
import {
  Injury,
  getInjuryStats,
} from '@/lib/database';
import {
  getFitForDutyInfo,
  getInjuriesWithZoneNames,
  getDaysSinceInjury,
  getEVAColor,
  getZoneDisplayName,
} from '@/lib/infirmaryService';
import logger from '@/lib/security/logger';
import { useI18n } from '@/lib/I18nContext';
import { getTrainingLoads, getRiskLevel } from '@/lib/trainingLoadService';



export default function InfirmaryScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [fitForDutyStatus, setFitForDutyStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  // Charge hebdomadaire au moment de chaque blessure: injuryId -> { totalLoad, riskLevel }
  const [injuryLoadMap, setInjuryLoadMap] = useState<Record<number, { totalLoad: number; riskLevel: string }>>({});
  // Zone selection modal state
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [overlappingZones, setOverlappingZones] = useState<Zone[]>([]);
  const [currentView, setCurrentView] = useState<'front' | 'back'>('front');

  // Charger les données en parallèle pour un affichage plus rapide
  const loadData = async () => {
    try {
      // Lancer tous les appels DB en parallèle
      const [injuriesWithNames, fitForDuty, injuryStats] = await Promise.all([
        getInjuriesWithZoneNames('active'),
        getFitForDutyInfo(),
        getInjuryStats(),
      ]);

      // Mettre à jour l'UI dès que l'essentiel est prêt
      setInjuries(injuriesWithNames);
      setFitForDutyStatus(fitForDuty);
      setStats(injuryStats);

      // Charger la charge d'entraînement en tâche de fond (pas bloquant pour l'affichage)
      (async () => {
        try {
          const allLoads = await getTrainingLoads();
          const loadMap: Record<number, { totalLoad: number; riskLevel: string }> = {};
          for (const inj of injuriesWithNames) {
            if (!inj.id || !inj.date) continue;
            const injDate = new Date(inj.date);
            const weekStart = new Date(injDate);
            weekStart.setDate(injDate.getDate() - 7);
            const weekStartStr = weekStart.toISOString().split('T')[0];
            const injDateStr = injDate.toISOString().split('T')[0];
            const weekLoads = allLoads.filter(l => l.date >= weekStartStr && l.date <= injDateStr);
            const totalLoad = weekLoads.reduce((sum, l) => sum + l.load, 0);
            loadMap[inj.id] = { totalLoad: Math.round(totalLoad), riskLevel: getRiskLevel(totalLoad) };
          }
          setInjuryLoadMap(loadMap);
        } catch (_e) { /* pas critique */ }
      })();

    } catch (error) {
      logger.error('[Infirmary] Erreur chargement:', error);
    }
  };

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  // Écouter les changements de données (ex: ajout d'une blessure depuis injury-evaluation)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', loadData);
    return () => sub.remove();
  }, []);

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
      // {t('infirmary.newInjury')}, aller à l'écran d'évaluation
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
                {t('infirmary.title')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {t('infirmary.personalLog')}
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
              <Text style={[styles.statValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
                {stats.activeInjuries}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('infirmary.active')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {stats.healedInjuries}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('infirmary.healed')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.averageRecoveryDays}j
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('infirmary.avgRecovery')}
              </Text>
            </View>
          </View>
        )}

        {/* ── ZONE LA PLUS TOUCHÉE · insight contextuel ── */}
        {stats && stats.mostAffectedZone && stats.totalInjuries >= 2 && (() => {
          const zoneName = getZoneDisplayName(stats.mostAffectedZone, 'front');
          // Compte d'injuries sur cette zone
          const allWithThisZone = injuries.length; // approximation : toutes les blessures actives
          return (
            <View style={{
              marginHorizontal: 16, marginTop: 8, marginBottom: 12,
              borderRadius: 14, padding: 14,
              backgroundColor: colors.backgroundCard,
              borderLeftWidth: 4, borderLeftColor: '#F59E0B',
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: '#F59E0B25',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 22 }}>⚠️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#F59E0B', letterSpacing: 0.5 }}>
                  ZONE À SURVEILLER
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 2 }}>
                  {zoneName}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' }}>
                  Ta zone la plus blessée. Renforcement + mobilité ciblés recommandés.
                </Text>
              </View>
            </View>
          );
        })()}

        {/* ── BILAN MENSUEL · taux de récup ── */}
        {stats && stats.totalInjuries > 0 && (() => {
          const recoveryRate = stats.totalInjuries > 0
            ? Math.round((stats.healedInjuries / stats.totalInjuries) * 100)
            : 0;
          const status = recoveryRate >= 70 ? { color: '#22C55E', label: 'Excellent', icon: '✓' }
            : recoveryRate >= 40 ? { color: '#F59E0B', label: 'Correct', icon: '~' }
            : { color: '#EF4444', label: 'Préoccupant', icon: '!' };
          return (
            <View style={{
              marginHorizontal: 16, marginBottom: 12,
              borderRadius: 14, padding: 14,
              backgroundColor: colors.backgroundCard,
              borderLeftWidth: 4, borderLeftColor: status.color,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: status.color, letterSpacing: 0.5 }}>
                  TAUX DE RÉCUPÉRATION
                </Text>
                <View style={{ backgroundColor: status.color + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: status.color }}>{status.icon} {status.label}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <Text style={{ fontSize: 26, fontWeight: '900', color: status.color, letterSpacing: -0.5 }}>{recoveryRate}%</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                  ({stats.healedInjuries}/{stats.totalInjuries} guéries)
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: status.color + '20', overflow: 'hidden' }}>
                <View style={{ width: `${recoveryRate}%`, height: '100%', backgroundColor: status.color, borderRadius: 3 }} />
              </View>
            </View>
          );
        })()}

        {/* Body Map */}
        <BodyMap onZonePress={handleZonePress} injuredZones={injuredZones} />

        {/* Liste des blessures actives */}
        {injuries.length > 0 && (
          <View style={styles.injuriesList}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('infirmary.activeInjuries')}
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
                      { backgroundColor: getEVAColor(injury.eva_score ?? 0) },
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

                {/* Charge d'entraînement la semaine de la blessure */}
                {injury.id != null && injuryLoadMap[injury.id] && injuryLoadMap[injury.id].totalLoad > 0 && (() => {
                  const loadInfo = injuryLoadMap[injury.id!];
                  const riskColors: Record<string, string> = {
                    safe: '#22C55E',
                    moderate: '#F59E0B',
                    high: '#F97316',
                    danger: '#EF4444',
                  };
                  const riskLabels: Record<string, string> = {
                    safe: 'Charge ok',
                    moderate: 'Charge modérée',
                    high: 'Charge élevée',
                    danger: 'Surcharge',
                  };
                  const col = riskColors[loadInfo.riskLevel] ?? '#94A3B8';
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}>
                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: col }} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                        Semaine précédente : <Text style={{ fontWeight: '700', color: col }}>{riskLabels[loadInfo.riskLevel]}</Text>
                        {' '}({loadInfo.totalLoad} pts)
                      </Text>
                    </View>
                  );
                })()}
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
              {t('infirmary.noInjuries')}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('infirmary.touchBody')}
            </Text>
          </View>
        )}

        {/* Disclaimer médical */}
        <View style={[styles.disclaimerContainer, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            {t('infirmary.disclaimer')}
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
