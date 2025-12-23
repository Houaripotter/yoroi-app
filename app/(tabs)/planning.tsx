import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Clock,
  Calendar,
  List,
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  Moon,
  TrendingUp,
} from 'lucide-react-native';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek, addDays, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { getTrainings, getClubs, addTraining, deleteTraining, Club, Training } from '@/lib/database';
import { DayDetailModal, AddSessionModal } from '@/components/calendar';
import { getClubLogoSource } from '@/lib/sports';

// ============================================
// PLANNING SCREEN - CALENDRIER INTERACTIF
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAYS_FR = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'calendar' | 'week' | 'programme'>('calendar');
  const [workouts, setWorkouts] = useState<Training[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modals state
  const [showDayModal, setShowDayModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showProgrammeEditModal, setShowProgrammeEditModal] = useState(false);

  // Fonction pour obtenir la prochaine date d'un jour de la semaine (0=Lundi, 6=Dimanche)
  const getNextDateForDayOfWeek = (dayIndex: number): Date => {
    const today = new Date();
    const todayDayOfWeek = getDay(today); // 0=Dimanche, 1=Lundi, etc.
    // Convertir: notre index 0=Lundi, mais getDay 0=Dimanche
    const targetDay = dayIndex === 6 ? 0 : dayIndex + 1; // 0=Lun->1, 6=Dim->0
    let daysToAdd = targetDay - todayDayOfWeek;
    if (daysToAdd <= 0) daysToAdd += 7; // Si le jour est deja passe cette semaine
    return addDays(today, daysToAdd);
  };

  // Programme hebdomadaire: grouper les séances par jour de la semaine
  const weeklyProgram = useMemo(() => {
    // Créer un objet avec un tableau pour chaque jour (0=Lundi, 6=Dimanche)
    const program: { [key: number]: { clubId: number | undefined; count: number }[] } = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    // Grouper les séances par jour de la semaine
    workouts.forEach(workout => {
      const date = new Date(workout.date);
      let dayOfWeek = getDay(date); // 0=Dimanche, 1=Lundi, etc.
      // Convertir: 0=Dimanche->6, 1=Lundi->0, etc.
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const existing = program[dayOfWeek].find(p => p.clubId === workout.club_id);
      if (existing) {
        existing.count++;
      } else {
        program[dayOfWeek].push({ clubId: workout.club_id, count: 1 });
      }
    });

    // Trier par nombre d'occurrences (clubs les plus fréquents en premier)
    Object.keys(program).forEach(day => {
      program[parseInt(day)].sort((a, b) => b.count - a.count);
    });

    return program;
  }, [workouts]);

  const loadData = useCallback(async () => {
    try {
      const [trainingsData, clubsData] = await Promise.all([
        getTrainings(),
        getClubs(),
      ]);
      setWorkouts(trainingsData);
      setClubs(clubsData);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getWorkoutsForDate = useCallback((date: Date): Training[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return workouts.filter(w => w.date === dateStr);
  }, [workouts]);

  const selectedDateWorkouts = useMemo(() => {
    return selectedDate ? getWorkoutsForDate(selectedDate) : [];
  }, [selectedDate, getWorkoutsForDate]);

  // Monthly stats by club
  const monthlyClubStats = useMemo(() => {
    const stats: Record<number, { count: number; club: Club }> = {};

    workouts.forEach(w => {
      if (isSameMonth(new Date(w.date), currentMonth) && w.club_id) {
        const club = clubs.find(c => c.id === w.club_id);
        if (club) {
          if (!stats[w.club_id]) {
            stats[w.club_id] = { count: 0, club };
          }
          stats[w.club_id].count++;
        }
      }
    });

    return Object.values(stats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [workouts, currentMonth, clubs]);

  // Handler: clic sur un jour du calendrier
  const handleDayPress = (day: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(day);
    setShowDayModal(true);
  };

  // Handler: ouvrir le modal d'ajout
  const handleOpenAddModal = () => {
    setShowDayModal(false);
    setTimeout(() => {
      setShowAddModal(true);
    }, 300);
  };

  // Handler: sauvegarder une nouvelle seance
  const handleSaveSession = async (session: Omit<Training, 'id' | 'created_at'>) => {
    try {
      await addTraining(session);
      await loadData();
    } catch (error) {
      console.error('Erreur ajout seance:', error);
      Alert.alert('Erreur', "Impossible d'ajouter la seance");
      throw error;
    }
  };

  // Handler: supprimer une seance
  const handleDeleteSession = async (id: number) => {
    try {
      await deleteTraining(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (error) {
      console.error('Erreur suppression seance:', error);
      Alert.alert('Erreur', 'Impossible de supprimer la seance');
    }
  };

  // Obtenir le logo du club ou une couleur par defaut
  const getClubDisplay = (club: Club) => {
    if (club.logo_uri) {
      const logoSource = getClubLogoSource(club.logo_uri);
      if (logoSource) {
        return { type: 'image' as const, source: logoSource };
      }
    }
    return { type: 'color' as const, color: club.color || colors.accent };
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Planning</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Clique sur un jour pour voir/ajouter</Text>
        </View>

        {/* VIEW MODE TOGGLE - 3 ONGLETS */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('calendar')}
          >
            <Calendar size={16} color={viewMode === 'calendar' ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.toggleText, { color: colors.textMuted }, viewMode === 'calendar' && styles.toggleTextActive]}>
              Calendrier
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'programme' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('programme')}
          >
            <List size={16} color={viewMode === 'programme' ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.toggleText, { color: colors.textMuted }, viewMode === 'programme' && styles.toggleTextActive]}>
              Programme
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'week' && { backgroundColor: colors.accent }]}
            onPress={() => setViewMode('week')}
          >
            <Dumbbell size={16} color={viewMode === 'week' ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.toggleText, { color: colors.textMuted }, viewMode === 'week' && styles.toggleTextActive]}>
              Clubs
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'calendar' ? (
          <>
            {/* CALENDAR HEADER */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
                style={[styles.calendarNavButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              >
                <ChevronLeft size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.calendarTitle, { color: colors.textPrimary }]}>
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
                style={[styles.calendarNavButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              >
                <ChevronRight size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* MONTHLY STATS BY CLUB - COMPACT */}
            {monthlyClubStats.length > 0 && (
              <View style={[styles.monthlyStatsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={styles.monthlyStatsHeader}>
                  <TrendingUp size={16} color={colors.accent} />
                  <Text style={[styles.monthlyStatsTitle, { color: colors.textPrimary }]}>Ce mois</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthlyStatsScroll}>
                  {monthlyClubStats.map(({ count, club }) => {
                    const display = getClubDisplay(club);
                    return (
                      <View key={club.id} style={styles.monthlyStatItem}>
                        <View style={[styles.monthlyStatIcon, { backgroundColor: display.type === 'color' ? `${display.color}20` : colors.backgroundElevated }]}>
                          {display.type === 'image' ? (
                            <Image source={display.source} style={styles.clubLogoSmall} />
                          ) : (
                            <View style={[styles.clubColorDot, { backgroundColor: display.color }]} />
                          )}
                        </View>
                        <Text style={[styles.monthlyStatCount, { color: club.color || colors.accent }]}>{count}</Text>
                        <Text style={[styles.monthlyStatName, { color: colors.textSecondary }]} numberOfLines={1}>{club.name}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* CALENDAR GRID */}
            <View style={[styles.calendarCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              {/* Day names */}
              <View style={styles.weekDaysRow}>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                  <Text key={day} style={[styles.weekDayText, { color: colors.textMuted }]}>{day}</Text>
                ))}
              </View>

              {/* Calendar days */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                  const dayWorkouts = getWorkoutsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isDayToday = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const hasWorkouts = dayWorkouts.length > 0;

                  // Get unique clubs for this day (max 3)
                  const uniqueClubIds = [...new Set(dayWorkouts.filter(w => w.club_id).map(w => w.club_id))].slice(0, 3);
                  const uniqueClubs = uniqueClubIds.map(id => clubs.find(c => c.id === id)).filter(Boolean) as Club[];

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !isCurrentMonth && styles.calendarDayOther,
                        isDayToday && { backgroundColor: `${colors.accent}20` },
                        isSelected && { backgroundColor: colors.accent },
                        hasWorkouts && !isSelected && !isDayToday && { backgroundColor: `${colors.backgroundElevated}` },
                      ]}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          { color: colors.textPrimary },
                          !isCurrentMonth && { color: colors.textMuted, opacity: 0.5 },
                          isDayToday && { color: colors.accent, fontWeight: '700' as const },
                          isSelected && styles.calendarDayTextSelected,
                        ]}
                      >
                        {format(day, 'd')}
                      </Text>

                      {/* Club logos/colors instead of emojis */}
                      {uniqueClubs.length > 0 && (
                        <View style={styles.clubLogosRow}>
                          {uniqueClubs.map((club) => {
                            const display = getClubDisplay(club);
                            return (
                              <View key={club.id} style={styles.clubLogoMini}>
                                {display.type === 'image' ? (
                                  <Image source={display.source} style={styles.clubLogoMiniImage} />
                                ) : (
                                  <View style={[styles.clubColorMini, { backgroundColor: display.color }]} />
                                )}
                              </View>
                            );
                          })}
                          {dayWorkouts.length > 3 && (
                            <Text style={[styles.moreWorkouts, { color: colors.textMuted }]}>+{dayWorkouts.length - 3}</Text>
                          )}
                        </View>
                      )}

                      {/* Indicateur vide pour les jours sans seance */}
                      {!hasWorkouts && isCurrentMonth && (
                        <View style={styles.emptyIndicator}>
                          <Plus size={10} color={colors.textMuted} strokeWidth={1.5} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : viewMode === 'programme' ? (
          <>
            {/* MON PROGRAMME - SEMAINE TYPE */}
            <View style={styles.programmeHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Ma Semaine</Text>
              <TouchableOpacity
                style={[styles.editProgrammeBtn, { backgroundColor: `${colors.accent}15` }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Ouvrir le modal d'ajout avec la date d'aujourd'hui
                  setSelectedDate(new Date());
                  setShowAddModal(true);
                }}
              >
                <Text style={[styles.editProgrammeBtnText, { color: colors.accent }]}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>

            {/* Weekly Schedule */}
            {DAYS_FR.map((day, index) => {
              // Récupérer les clubs pour ce jour depuis le programme réel
              const dayProgramData = weeklyProgram[index] || [];
              const daySchedule = dayProgramData
                .map(({ clubId }) => clubs.find(c => c.id === clubId))
                .filter((c): c is Club => c !== undefined);

              const isRestDay = index === 6;

              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.programmeDay, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Ouvrir le modal d'ajout avec la prochaine date de ce jour
                    const nextDate = getNextDateForDayOfWeek(index);
                    setSelectedDate(nextDate);
                    setShowAddModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.programmeDayLeft}>
                    <Text style={[styles.programmeDayName, { color: colors.textPrimary }, isRestDay && { color: colors.textMuted }]}>{day}</Text>
                  </View>

                  <View style={styles.programmeDayCenter}>
                    {isRestDay ? (
                      <View style={[styles.restBadge, { backgroundColor: colors.backgroundElevated }]}>
                        <Moon size={14} color={colors.textMuted} />
                        <Text style={[styles.restText, { color: colors.textMuted }]}>Repos</Text>
                      </View>
                    ) : daySchedule.length > 0 ? (
                      <View style={styles.programmeClubs}>
                        {daySchedule.map((club) => {
                          const display = getClubDisplay(club);
                          return (
                            <View
                              key={club.id}
                              style={[styles.programmeClubBadge, { backgroundColor: `${club.color || colors.accent}15` }]}
                            >
                              {display.type === 'image' ? (
                                <Image source={display.source} style={styles.programmeClubLogo} />
                              ) : (
                                <View style={[styles.programmeClubDot, { backgroundColor: display.color }]} />
                              )}
                              <Text style={[styles.programmeClubName, { color: club.color || colors.textPrimary }]} numberOfLines={1}>
                                {club.name}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={[styles.noSessionText, { color: colors.textMuted }]}>-</Text>
                    )}
                  </View>

                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}

            {/* Stats Semaine */}
            <View style={[styles.weeklyStatsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.weeklyStatItem}>
                <Text style={[styles.weeklyStatValue, { color: colors.accent }]}>
                  {clubs.length > 0 ? Math.min(6, clubs.length * 2) : 0}
                </Text>
                <Text style={[styles.weeklyStatLabel, { color: colors.textMuted }]}>seances/semaine</Text>
              </View>
              <View style={[styles.weeklyStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.weeklyStatItem}>
                <Text style={[styles.weeklyStatValue, { color: colors.accent }]}>
                  {clubs.length > 0 ? `~${clubs.length * 3}h` : '0h'}
                </Text>
                <Text style={[styles.weeklyStatLabel, { color: colors.textMuted }]}>prevues</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* CLUBS & COACH VIEW */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Clubs & Coach</Text>

            {clubs.length === 0 ? (
              <View style={[styles.emptyClubsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Dumbbell size={48} color={colors.textMuted} />
                <Text style={[styles.emptyClubsTitle, { color: colors.textPrimary }]}>Aucun club</Text>
                <Text style={[styles.emptyClubsText, { color: colors.textMuted }]}>Ajoute tes clubs pour planifier tes entrainements</Text>
                <TouchableOpacity
                  style={[styles.addClubButton, { backgroundColor: colors.accent }]}
                  onPress={() => router.push('/clubs')}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.addClubButtonText}>Ajouter un club</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.clubsGrid}>
                {clubs.map((club) => {
                  const display = getClubDisplay(club);
                  const clubWorkouts = workouts.filter(w => w.club_id === club.id);
                  const thisMonthWorkouts = clubWorkouts.filter(w => isSameMonth(new Date(w.date), new Date())).length;

                  return (
                    <TouchableOpacity
                      key={club.id}
                      style={[styles.clubCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedDate(new Date());
                        setShowAddModal(true);
                      }}
                    >
                      <View style={[styles.clubLogoBg, { backgroundColor: display.type === 'color' ? `${display.color}20` : colors.backgroundElevated }]}>
                        {display.type === 'image' ? (
                          <Image source={display.source} style={styles.clubLogoLarge} />
                        ) : (
                          <View style={[styles.clubColorLarge, { backgroundColor: display.color }]} />
                        )}
                      </View>
                      <Text style={[styles.clubName, { color: colors.textPrimary }]} numberOfLines={1}>{club.name}</Text>
                      <Text style={[styles.clubSport, { color: colors.textSecondary }]}>{club.sport}</Text>
                      <View style={styles.clubStats}>
                        <Text style={[styles.clubStatsValue, { color: club.color || colors.accent }]}>{thisMonthWorkouts}</Text>
                        <Text style={[styles.clubStatsLabel, { color: colors.textMuted }]}>ce mois</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Total Stats */}
            {clubs.length > 0 && (
              <>
                <View style={[styles.totalStatsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <View style={styles.totalStatItem}>
                    <Text style={[styles.totalStatValue, { color: colors.textPrimary }]}>{workouts.length}</Text>
                    <Text style={[styles.totalStatLabel, { color: colors.textMuted }]}>total seances</Text>
                  </View>
                  <View style={[styles.totalStatDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.totalStatItem}>
                    <Text style={[styles.totalStatValue, { color: colors.textPrimary }]}>{clubs.length}</Text>
                    <Text style={[styles.totalStatLabel, { color: colors.textMuted }]}>clubs</Text>
                  </View>
                </View>

                {/* Add Club Button - TOUJOURS VISIBLE */}
                <TouchableOpacity
                  style={[styles.addClubButtonFixed, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/clubs');
                  }}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.addClubButtonFixedText}>Ajouter un club</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* MODALS */}
      <DayDetailModal
        visible={showDayModal}
        date={selectedDate}
        sessions={selectedDateWorkouts}
        clubs={clubs}
        onClose={() => setShowDayModal(false)}
        onAddPress={handleOpenAddModal}
        onDeleteSession={handleDeleteSession}
      />

      <AddSessionModal
        visible={showAddModal}
        date={selectedDate}
        clubs={clubs}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveSession}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },

  // HEADER
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT.size.xxxl,
    fontWeight: FONT.weight.bold,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: FONT.size.md,
    color: '#888888',
    marginTop: SPACING.xs,
  },

  // TOGGLE
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    padding: SPACING.xs,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    // backgroundColor et borderColor définis dynamiquement
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textMuted,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },

  // CALENDAR HEADER
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  calendarTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },

  // MONTHLY STATS - COMPACT
  monthlyStatsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  monthlyStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  monthlyStatsTitle: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: COLORS.text,
  },
  monthlyStatsScroll: {
    gap: SPACING.lg,
    paddingRight: SPACING.lg,
  },
  monthlyStatItem: {
    alignItems: 'center',
  },
  monthlyStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  clubLogoSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  clubColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  monthlyStatCount: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
  },
  monthlyStatName: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: 70,
    textAlign: 'center',
  },

  // CALENDAR CARD - Utilise le thème, pas de fond noir
  calendarCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    // backgroundColor et borderColor définis dynamiquement dans le JSX
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 0.75,  // Ratio ajusté pour moins d'espace
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    padding: 2,
  },
  calendarDayOther: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,  // Réduit pour laisser encore plus de place aux logos
    fontWeight: FONT.weight.bold,  // Plus bold
    color: COLORS.text,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: FONT.weight.bold,
  },

  // Club logos in calendar
  clubLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  clubLogoMini: {
    width: 18,  // Encore plus grand
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
  },
  clubLogoMiniImage: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  clubColorMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  moreWorkouts: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  emptyIndicator: {
    marginTop: 2,
    opacity: 0.3,
  },

  // LEGEND
  legendCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginBottom: SPACING.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendDotMulti: {
    flexDirection: 'row',
    gap: 2,
  },
  legendDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.medium,
  },

  // SECTION TITLE
  sectionTitle: {
    fontSize: 11,
    fontWeight: FONT.weight.bold,
    color: '#555555',
    marginBottom: SPACING.lg,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },

  // CLUBS GRID
  clubsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  clubCard: {
    width: (SCREEN_WIDTH - SPACING.xl * 2 - SPACING.md) / 2,
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  clubLogoBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  clubLogoLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  clubColorLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  clubName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  clubSport: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  clubStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  clubStatsValue: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
  },
  clubStatsLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
  },

  // EMPTY CLUBS
  emptyClubsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  emptyClubsTitle: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyClubsText: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  addClubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  addClubButtonText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    color: '#FFFFFF',
  },
  addClubButtonFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xxl,
    marginTop: SPACING.lg,
  },
  addClubButtonFixedText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: '#FFFFFF',
  },

  // TOTAL STATS
  totalStatsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  totalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalStatValue: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
  },
  totalStatLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  totalStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },

  // PROGRAMME VIEW STYLES
  programmeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  editProgrammeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  editProgrammeBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
  programmeDay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  programmeDayLeft: {
    width: 50,
    marginRight: SPACING.md,
  },
  programmeDayName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
  },
  programmeDayCenter: {
    flex: 1,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  restText: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
  },
  programmeClubs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  programmeClubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  programmeClubLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  programmeClubDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  programmeClubName: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },
  noSessionText: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
  },
  weeklyStatsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  weeklyStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyStatValue: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
  },
  weeklyStatLabel: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  weeklyStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
});
