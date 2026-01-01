import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Trophy,
  Scale,
  Flame,
  Ruler,
  Dumbbell,
  Calendar,
  TrendingDown,
  Zap,
  Share2,
  RefreshCw,
  Award,
  Star,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import {
  PersonalRecords,
  NewRecordEvent,
  calculateAllRecords,
  formatRecordDate,
  getSportName,
  generateRecordShareText,
  RecordType,
} from '@/lib/records';
import { successHaptic } from '@/lib/haptics';
import { playSuccessSound } from '@/lib/soundManager';
import logger from '@/lib/security/logger';

// ============================================
// PAGE MES RECORDS PERSONNELS
// ============================================

export default function RecordsScreen() {
  const { colors } = useTheme();

  const [records, setRecords] = useState<PersonalRecords | null>(null);
  const [newRecords, setNewRecords] = useState<NewRecordEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Charger les records
  const loadRecords = useCallback(async (showCelebration = false) => {
    try {
      const result = await calculateAllRecords();
      setRecords(result.records);
      setNewRecords(result.newRecords);

      // Celebrer les nouveaux records
      if (showCelebration && result.newRecords.length > 0) {
        successHaptic();
        playSuccessSound();
      }
    } catch (error) {
      logger.error('Erreur chargement records:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords(true);
    }, [loadRecords])
  );

  // Rafraichir manuellement
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRecords(true);
  };

  // Partager un record
  const handleShare = async (type: RecordType, value: number) => {
    try {
      const text = generateRecordShareText(type, value);
      await Share.share({
        message: text,
      });
    } catch (error) {
      logger.error('Erreur partage:', error);
    }
  };

  // Composant carte de record
  const RecordCard = ({
    icon: Icon,
    iconColor,
    iconBg,
    title,
    children,
  }: {
    icon: any;
    iconColor: string;
    iconBg: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <Card style={styles.recordCard}>
      <View style={styles.recordCardHeader}>
        <View style={[styles.recordCardIcon, { backgroundColor: iconBg }]}>
          <Icon size={20} color={iconColor} strokeWidth={2} />
        </View>
        <Text style={[styles.recordCardTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
      </View>
      <View style={styles.recordCardContent}>{children}</View>
    </Card>
  );

  // Composant ligne de record
  const RecordRow = ({
    emoji,
    label,
    value,
    date,
    isRecord = false,
    shareType,
    shareValue,
  }: {
    emoji: string;
    label: string;
    value: string;
    date?: string;
    isRecord?: boolean;
    shareType?: RecordType;
    shareValue?: number;
  }) => (
    <View style={[styles.recordRow, { borderBottomColor: colors.border }]}>
      <View style={styles.recordRowLeft}>
        <Text style={styles.recordEmoji}>{emoji}</Text>
        <View style={styles.recordRowInfo}>
          <View style={styles.recordRowLabelContainer}>
            <Text style={[styles.recordLabel, { color: colors.textSecondary }]}>
              {label}
            </Text>
            {isRecord && (
              <View style={[styles.recordBadge, { backgroundColor: colors.goldMuted }]}>
                <Trophy size={10} color={colors.gold} strokeWidth={2} />
                <Text style={[styles.recordBadgeText, { color: colors.gold }]}>
                  Record
                </Text>
              </View>
            )}
          </View>
          {date && (
            <Text style={[styles.recordDate, { color: colors.textMuted }]}>
              {date}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.recordRowRight}>
        <Text style={[styles.recordValue, { color: colors.textPrimary }]}>
          {value}
        </Text>
        {shareType && shareValue && (
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.cardHover }]}
            onPress={() => handleShare(shareType, shareValue)}
          >
            <Share2 size={14} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenWrapper noPadding>
        <Header title="Mes Records" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Calcul des records...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noPadding>
      <Header title="Mes Records" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={[styles.trophyContainer, { backgroundColor: colors.goldMuted }]}>
            <Trophy size={40} color={colors.gold} strokeWidth={2} />
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tes accomplissements personnels
          </Text>

          {/* Bouton refresh */}
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.card }]}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.gold} />
            ) : (
              <RefreshCw size={18} color={colors.textSecondary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>

        {/* NOUVEAUX RECORDS */}
        {newRecords.length > 0 && (
          <View style={[styles.newRecordsCard, { backgroundColor: colors.goldMuted, borderColor: colors.gold }]}>
            <View style={styles.newRecordsHeader}>
              <Star size={20} color={colors.gold} strokeWidth={2} />
              <Text style={[styles.newRecordsTitle, { color: colors.gold }]}>
                Nouveaux records !
              </Text>
            </View>
            {newRecords.map((nr, i) => (
              <View key={i} style={styles.newRecordItem}>
                <Text style={styles.newRecordEmoji}>{nr.emoji}</Text>
                <Text style={[styles.newRecordText, { color: colors.textPrimary }]}>
                  {nr.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* SECTION POIDS */}
        <RecordCard
          icon={Scale}
          iconColor={colors.gold}
          iconBg={colors.goldMuted}
          title="POIDS"
        >
          {records?.lowestWeight && (
            <RecordRow
              emoji="📉"
              label="Plus bas atteint"
              value={`${records.lowestWeight.value.toFixed(1)} kg`}
              date={formatRecordDate(records.lowestWeight.date)}
              isRecord
              shareType="lowestWeight"
              shareValue={records.lowestWeight.value}
            />
          )}
          {records?.startingWeight && (
            <RecordRow
              emoji="📈"
              label="Poids de depart"
              value={`${records.startingWeight.value.toFixed(1)} kg`}
              date={formatRecordDate(records.startingWeight.date)}
            />
          )}
          {records?.maxWeeklyLoss && records.maxWeeklyLoss.value > 0 && (
            <RecordRow
              emoji="⚖️"
              label="Perte max en 1 semaine"
              value={`-${records.maxWeeklyLoss.value.toFixed(1)} kg`}
              date={formatRecordDate(records.maxWeeklyLoss.date)}
              isRecord
              shareType="maxWeeklyLoss"
              shareValue={records.maxWeeklyLoss.value}
            />
          )}
          {records?.maxMonthlyLoss && records.maxMonthlyLoss.value > 0 && (
            <RecordRow
              emoji="📅"
              label="Perte max en 1 mois"
              value={`-${records.maxMonthlyLoss.value.toFixed(1)} kg`}
              date={records.maxMonthlyLoss.label}
              isRecord
              shareType="maxMonthlyLoss"
              shareValue={records.maxMonthlyLoss.value}
            />
          )}
          {records && records.totalWeightLoss > 0 && (
            <RecordRow
              emoji="🎯"
              label="Perte totale"
              value={`-${records.totalWeightLoss.toFixed(1)} kg`}
            />
          )}
        </RecordCard>

        {/* SECTION STREAK */}
        <RecordCard
          icon={Flame}
          iconColor="#F59E0B"
          iconBg="#FEF3C7"
          title="STREAK"
        >
          {records?.longestStreak && (
            <RecordRow
              emoji="🔥"
              label="Record de streak"
              value={`${records.longestStreak.value} jours`}
              date={formatRecordDate(records.longestStreak.date)}
              isRecord
              shareType="longestStreak"
              shareValue={records.longestStreak.value}
            />
          )}
          <RecordRow
            emoji="📆"
            label="Streak actuel"
            value={`${records?.currentStreak || 0} jours`}
          />
        </RecordCard>

        {/* SECTION MENSURATIONS */}
        {(records?.lowestWaist || records?.totalWaistLoss) && (
          <RecordCard
            icon={Ruler}
            iconColor="#A855F7"
            iconBg="#F3E8FF"
            title="MENSURATIONS"
          >
            {records?.lowestWaist && (
              <RecordRow
                emoji="📏"
                label="Tour de taille min"
                value={`${records.lowestWaist.value} cm`}
                date={formatRecordDate(records.lowestWaist.date)}
                isRecord
                shareType="lowestWaist"
                shareValue={records.lowestWaist.value}
              />
            )}
            {records && records.totalWaistLoss > 0 && (
              <RecordRow
                emoji="📐"
                label="Perte taille totale"
                value={`-${records.totalWaistLoss.toFixed(0)} cm`}
              />
            )}
          </RecordCard>
        )}

        {/* SECTION ENTRAINEMENT */}
        {records && records.totalWorkouts && records.totalWorkouts > 0 && (
          <RecordCard
            icon={Dumbbell}
            iconColor="#22C55E"
            iconBg="#DCFCE7"
            title="ENTRAINEMENT"
          >
            {records?.maxWeeklyWorkouts && (
              <RecordRow
                emoji="💪"
                label="Max en 1 semaine"
                value={`${records.maxWeeklyWorkouts.value} sessions`}
                date={formatRecordDate(records.maxWeeklyWorkouts.date)}
                isRecord
                shareType="maxWeeklyWorkouts"
                shareValue={records.maxWeeklyWorkouts.value}
              />
            )}
            <RecordRow
              emoji="🏋️"
              label="Total sessions"
              value={`${records.totalWorkouts}`}
            />
            {records?.favoriteSport && (
              <RecordRow
                emoji="⭐"
                label="Sport prefere"
                value={`${getSportName(records.favoriteSport.type)} (${records.favoriteSport.count})`}
              />
            )}
          </RecordCard>
        )}

        {/* SECTION REGULARITE */}
        <RecordCard
          icon={Calendar}
          iconColor="#3B82F6"
          iconBg="#DBEAFE"
          title="REGULARITE"
        >
          {records?.bestMonthRegularity && (
            <RecordRow
              emoji="📅"
              label="Meilleur mois"
              value={`${records.bestMonthRegularity.value}%`}
              date={records.bestMonthRegularity.label}
              isRecord
              shareType="bestMonthRegularity"
              shareValue={records.bestMonthRegularity.value}
            />
          )}
          <RecordRow
            emoji="⚖️"
            label="Pesees totales"
            value={`${records?.totalMeasurements || 0}`}
          />
        </RecordCard>

        {/* SECTION ENERGIE */}
        {records?.bestEnergyStreak && (
          <RecordCard
            icon={Zap}
            iconColor="#F59E0B"
            iconBg="#FEF3C7"
            title="ENERGIE"
          >
            <RecordRow
              emoji="🔥"
              label="Plus longue serie haute energie"
              value={`${records.bestEnergyStreak.value} jours`}
              date={formatRecordDate(records.bestEnergyStreak.date)}
              isRecord
              shareType="bestEnergyStreak"
              shareValue={records.bestEnergyStreak.value}
            />
          </RecordCard>
        )}

        {/* MESSAGE MOTIVATION */}
        <View style={[styles.motivationCard, { backgroundColor: colors.card }]}>
          <Award size={24} color={colors.gold} strokeWidth={2} />
          <Text style={[styles.motivationText, { color: colors.textSecondary }]}>
            Chaque record battu est une victoire.{'\n'}
            Continue a repousser tes limites !
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  trophyContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  refreshButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // New records
  newRecordsCard: {
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
  },
  newRecordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  newRecordsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  newRecordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  newRecordEmoji: {
    fontSize: 16,
  },
  newRecordText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Record card
  recordCard: {
    marginBottom: 16,
  },
  recordCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  recordCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  recordCardContent: {},

  // Record row
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  recordRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  recordEmoji: {
    fontSize: 18,
    width: 28,
  },
  recordRowInfo: {
    flex: 1,
  },
  recordRowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recordBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  recordDate: {
    fontSize: 11,
    marginTop: 2,
  },
  recordRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  shareButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Motivation
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginTop: 8,
  },
  motivationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
});
