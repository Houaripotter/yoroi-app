// ============================================
// PLANNING PAGE 4 - CLUBS
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { getTrainings, getClubs, deleteClub, type Training, type Club } from '@/lib/database';
import { getGoalBySport } from '@/lib/trainingGoalsService';
import { getSportName, getSportColor, getSportIcon } from '@/lib/sports';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Edit3, Trash2, Plus } from 'lucide-react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { AddClubModal } from '@/components/planning/AddClubModal';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { logger } from '@/lib/security/logger';

const CARD_PADDING = 16;

interface ClubWithStats extends Club {
  monthCount: number;
  weeklyGoal: number;
}

export const PlanningPage4Clubs: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [workouts, setWorkouts] = useState<Training[]>([]);
  const [clubs, setClubs] = useState<ClubWithStats[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  const loadData = useCallback(async () => {
    try {
      const trainingsData = await getTrainings();
      const clubsData = await getClubs();
      setWorkouts(trainingsData);

      // Charger les objectifs hebdomadaires pour chaque club
      const clubsWithStats: ClubWithStats[] = await Promise.all(
        clubsData.map(async (club) => {
          const now = new Date();
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          const monthWorkouts = trainingsData.filter(w => {
            const d = new Date(w.date);
            return w.club_id === club.id && isWithinInterval(d, { start: monthStart, end: monthEnd });
          });

          // Récupérer l'objectif hebdomadaire
          let weeklyGoal = 0;
          try {
            const goal = await getGoalBySport(club.sport);
            weeklyGoal = goal?.weekly_target || 0;
          } catch { /* ignore */ }

          // Séances cette semaine
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi
          weekStart.setHours(0, 0, 0, 0);
          const weekWorkouts = trainingsData.filter(w => {
            const d = new Date(w.date);
            return w.club_id === club.id && d >= weekStart;
          });

          return {
            ...club,
            monthCount: monthWorkouts.length,
            weeklyGoal,
            weekCount: weekWorkouts.length,
          };
        })
      );

      setClubs(clubsWithStats);
    } catch (error) {
      logger.error('Erreur chargement clubs:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (club: Club) => {
    setEditingClub(club);
    setShowAddModal(true);
  };

  const handleDelete = (club: Club) => {
    showPopup(
      t('screens.clubs.deleteClub'),
      t('screens.clubs.deleteConfirm', { name: club.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClub(club.id!);
              notificationAsync(NotificationFeedbackType.Success);
              await loadData();
            } catch (error) {
              logger.error('Erreur suppression club:', error);
            }
          },
        },
      ]
    );
  };

  const handleAddNew = () => {
    setEditingClub(null);
    setShowAddModal(true);
  };

  const totalSessions = workouts.length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {t('planning.myClubs')}
      </Text>

      {/* Liste des clubs */}
      {clubs.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.backgroundCard }]}>
          <MaterialCommunityIcons name="office-building-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t('screens.clubs.noClubs')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('screens.clubs.addFirstClub')}
          </Text>
        </View>
      ) : (
        <View style={styles.clubsGrid}>
          {clubs.map((club) => (
            <View
              key={club.id}
              style={[styles.clubCard, { backgroundColor: colors.backgroundCard }]}
            >
              {/* Ligne principale */}
              <View style={styles.clubRow}>
                {/* Logo */}
                <View style={styles.clubLogoContainer}>
                  {club.logo_uri ? (
                    <Image source={{ uri: club.logo_uri }} style={styles.clubLogo} />
                  ) : (
                    <View style={[styles.clubLogoFallback, { backgroundColor: club.color || getSportColor(club.sport) }]}>
                      <MaterialCommunityIcons
                        name={getSportIcon(club.sport) as any}
                        size={28}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.clubInfo}>
                  <Text style={[styles.clubName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {club.name}
                  </Text>
                  <Text style={[styles.clubDiscipline, { color: colors.textMuted }]}>
                    {getSportName(club.sport)}
                  </Text>
                  {club.weeklyGoal > 0 && (
                    <Text style={[styles.clubGoal, { color: colors.accent }]}>
                      {(club as any).weekCount || 0}/{club.weeklyGoal} /sem
                    </Text>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.clubActions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(club)}
                    style={[styles.actionBtn, { backgroundColor: isDark ? colors.backgroundElevated : '#F3F4F6' }]}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={16} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(club)}
                    style={[styles.actionBtn, { backgroundColor: isDark ? '#2D1515' : '#FEE2E2' }]}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Stats globales */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {totalSessions}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {t('planning.totalSessions')}
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {clubs.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {t('planning.clubs')}
          </Text>
        </View>
      </View>

      {/* Bouton ajouter */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.accent }]}
        activeOpacity={0.8}
        onPress={handleAddNew}
      >
        <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.addButtonText}>{t('planning.addClub')}</Text>
      </TouchableOpacity>

      <View style={{ height: 120 }} />

      {/* Modal ajout/édition */}
      <AddClubModal
        visible={showAddModal}
        editingClub={editingClub}
        onClose={() => {
          setShowAddModal(false);
          setEditingClub(null);
        }}
        onSave={() => {
          setShowAddModal(false);
          setEditingClub(null);
          loadData();
        }}
      />
      <PopupComponent />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 250,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Empty state
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Clubs
  clubsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  clubCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  clubLogoContainer: {
    width: 56,
    height: 56,
  },
  clubLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  clubLogoFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  clubDiscipline: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  clubGoal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  clubActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -2,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Add button
  addButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});
