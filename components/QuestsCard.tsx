import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  getDailyQuestsProgress,
  getWeeklyQuestsProgress,
  getMonthlyQuestsProgress,
  checkAndUpdateQuests,
  addHydration,
  getDailyHydration,
  Quest,
  QuestProgress,
} from '@/lib/quests';
import * as Haptics from 'expo-haptics';
import logger from '@/lib/security/logger';

// ============================================
// QUESTS CARD - COMPOSANT QUETES JOURNALIERES
// ============================================

interface QuestsCardProps {
  onXPGained?: (xp: number) => void;
  onRefresh?: () => void;
}

type QuestWithProgress = Quest & QuestProgress;

interface QuestsSummary {
  quests: QuestWithProgress[];
  completed: number;
  total: number;
  xpEarned: number;
}

type TabType = 'daily' | 'weekly' | 'monthly';

export const QuestsCard: React.FC<QuestsCardProps> = ({
  onXPGained,
  onRefresh,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [dailyQuests, setDailyQuests] = useState<QuestsSummary | null>(null);
  const [weeklyQuests, setWeeklyQuests] = useState<QuestsSummary | null>(null);
  const [monthlyQuests, setMonthlyQuests] = useState<QuestsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hydration, setHydration] = useState(0);

  // Animation pour le compteur XP
  const xpAnim = useState(new Animated.Value(0))[0];

  // Charger toutes les quetes
  const loadQuests = useCallback(async () => {
    try {
      setIsLoading(true);

      // Verifier et mettre a jour les quetes automatiquement
      const completedQuests = await checkAndUpdateQuests();

      // Callback si des quetes ont ete completees
      if (completedQuests.length > 0 && onXPGained) {
        // On ne peut pas facilement calculer l'XP ici sans plus de logique
        // Le callback sera appele depuis le parent
      }

      // Charger les progressions
      const [daily, weekly, monthly, currentHydration] = await Promise.all([
        getDailyQuestsProgress(),
        getWeeklyQuestsProgress(),
        getMonthlyQuestsProgress(),
        getDailyHydration(),
      ]);

      setDailyQuests(daily);
      setWeeklyQuests(weekly);
      setMonthlyQuests(monthly);
      setHydration(currentHydration);
    } catch (error) {
      logger.error('Erreur chargement quetes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onXPGained]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Ajouter de l'hydratation
  const handleAddHydration = async (amount: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newAmount = await addHydration(amount);
      setHydration(newAmount);

      // Recharger les quetes pour mettre a jour la progression
      await loadQuests();

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      logger.error('Erreur ajout hydratation:', error);
    }
  };

  // Obtenir les quetes actives selon l'onglet
  const getActiveQuests = (): QuestsSummary | null => {
    switch (activeTab) {
      case 'daily':
        return dailyQuests;
      case 'weekly':
        return weeklyQuests;
      case 'monthly':
        return monthlyQuests;
    }
  };

  const activeQuests = getActiveQuests();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={[styles.loadingBar, { backgroundColor: colors.cardHover }]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* En-tete */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerIcon}></Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Quetes
          </Text>
        </View>
        {activeQuests && (
          <View style={[styles.counterBadge, { backgroundColor: colors.cardHover }]}>
            <Text style={[styles.counterText, { color: colors.gold }]}>
              {activeQuests.completed}/{activeQuests.total} ✓
            </Text>
          </View>
        )}
      </View>

      {/* Onglets */}
      <View style={[styles.tabs, { backgroundColor: colors.cardHover }]}>
        {(['daily', 'weekly', 'monthly'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.card },
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.gold : colors.textSecondary },
              ]}
            >
              {tab === 'daily' ? 'Jour' : tab === 'weekly' ? 'Semaine' : 'Mois'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste des quetes */}
      <View style={styles.questsList}>
        {activeQuests?.quests.map((quest, index) => (
          <QuestItem
            key={quest.id}
            quest={quest}
            colors={colors}
            hydration={hydration}
            onAddHydration={quest.id === 'daily_hydration' ? handleAddHydration : undefined}
          />
        ))}
      </View>

      {/* XP total gagne */}
      {activeQuests && activeQuests.xpEarned > 0 && (
        <View style={[styles.xpTotal, { borderTopColor: colors.border }]}>
          <Text style={[styles.xpTotalLabel, { color: colors.textSecondary }]}>
            XP gagnes
          </Text>
          <Text style={[styles.xpTotalValue, { color: colors.gold }]}>
            +{activeQuests.xpEarned} XP
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================
// QUEST ITEM - ELEMENT DE QUETE INDIVIDUEL
// ============================================

interface QuestItemProps {
  quest: QuestWithProgress;
  colors: any;
  hydration: number;
  onAddHydration?: (amount: number) => void;
}

const QuestItem: React.FC<QuestItemProps> = ({
  quest,
  colors,
  hydration,
  onAddHydration,
}) => {
  const progressPercent = Math.min(100, (quest.current / quest.target) * 100);
  const isHydrationQuest = quest.id === 'daily_hydration';

  return (
    <View style={styles.questItem}>
      {/* Icone et statut */}
      <View style={styles.questLeft}>
        {quest.completed ? (
          <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        ) : (
          <View style={[styles.iconCircle, { backgroundColor: colors.cardHover }]}>
            <Text style={styles.questIcon}>{quest.icon}</Text>
          </View>
        )}
      </View>

      {/* Contenu */}
      <View style={styles.questContent}>
        <View style={styles.questTitleRow}>
          <Text
            style={[
              styles.questTitle,
              { color: quest.completed ? colors.textSecondary : colors.textPrimary },
              quest.completed && styles.questTitleCompleted,
            ]}
          >
            {quest.title}
          </Text>
          <Text style={[styles.questXp, { color: colors.gold }]}>
            +{quest.xp} XP
          </Text>
        </View>

        {/* Barre de progression pour les quetes avec target > 1 */}
        {quest.target > 1 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.cardHover }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: quest.completed ? colors.success : colors.gold,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {quest.current}/{quest.target}
              {quest.unit ? ` ${quest.unit}` : ''}
            </Text>
          </View>
        )}

        {/* Boutons hydratation */}
        {isHydrationQuest && !quest.completed && onAddHydration && (
          <View style={styles.hydrationButtons}>
            <TouchableOpacity
              style={[styles.hydrationBtn, { backgroundColor: colors.cardHover }]}
              onPress={() => onAddHydration(0.25)}
              activeOpacity={0.7}
            >
              <Text style={[styles.hydrationBtnText, { color: colors.textPrimary }]}>
                +0.25L
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hydrationBtn, { backgroundColor: colors.cardHover }]}
              onPress={() => onAddHydration(0.5)}
              activeOpacity={0.7}
            >
              <Text style={[styles.hydrationBtnText, { color: colors.textPrimary }]}>
                +0.5L
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hydrationBtn, { backgroundColor: colors.gold }]}
              onPress={() => onAddHydration(1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.hydrationBtnText, { color: '#000' }]}>
                +1L
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  loadingBar: {
    height: 200,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  counterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  questsList: {
    gap: 12,
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  questLeft: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questIcon: {
    fontSize: 18,
  },
  questContent: {
    flex: 1,
  },
  questTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  questXp: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 45,
  },
  hydrationButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  hydrationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hydrationBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  xpTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  xpTotalLabel: {
    fontSize: 13,
  },
  xpTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default QuestsCard;
