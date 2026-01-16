import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useTheme } from '@/lib/ThemeContext';
import { Plus, Clock, Maximize2, X, Moon, ChevronRight, Calendar } from 'lucide-react-native';
import { useWeekSchedule } from '@/hooks/useWeekSchedule';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { getClubLogoSource } from '@/lib/sports';
import { format, addDays, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportMultipleTrainingsToCalendar } from '@/lib/calendarService';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DAYS_SHORT = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

interface TimetableViewProps {
  onAddSession: (dayId: string, timeSlot?: string) => void;
  onSessionPress: (dayId: string, sessionIndex: number) => void;
  refreshTrigger?: number;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  onAddSession,
  onSessionPress,
  refreshTrigger,
}) => {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { weekSchedule, loading, refresh } = useWeekSchedule();

  // Calculer les dates de la semaine courante
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lundi = 1
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Recharger les données quand refreshTrigger change
  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      logger.info('🔄 TimetableView: Refresh déclenché par trigger', refreshTrigger);
      // Petit délai pour s'assurer que la DB est à jour
      setTimeout(() => {
        refresh();
      }, 300);
    }
  }, [refreshTrigger, refresh]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{ day: string; session: any } | null>(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState<{ dayId: string; dayLabel: string; slotId: string } | null>(null);
  const [showAllSessions, setShowAllSessions] = useState<{ day: string; dayLabel: string; slotLabel: string; sessions: any[] } | null>(null);
  const [manualRestDays, setManualRestDays] = useState<string[]>([]); // Jours marqués manuellement en repos

  // NE PAS détecter automatiquement les jours de repos
  // Seulement utiliser les jours marqués manuellement par l'utilisateur
  const getRestDays = () => {
    // Retourner uniquement les jours marqués manuellement en repos
    return manualRestDays;
  };

  const restDays = getRestDays();

  // Calculer les dates de la semaine avec le numéro
  const getWeekDates = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Lundi
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Dimanche
    const weekNumber = getWeek(today, { weekStartsOn: 1, firstWeekContainsDate: 4 });

    const startDay = format(weekStart, 'd', { locale: fr });
    const endDay = format(weekEnd, 'd', { locale: fr });
    const startMonth = format(weekStart, 'MMMM', { locale: fr }); // Mois complet
    const endMonth = format(weekEnd, 'MMMM', { locale: fr });

    // Si même mois : "7 au 14 janvier (S2)"
    if (startMonth === endMonth) {
      return `${startDay} au ${endDay} ${startMonth} (S${weekNumber})`;
    } else {
      // Mois différents : "30 déc. au 5 janv. (S1)"
      const startMonthShort = format(weekStart, 'MMM', { locale: fr });
      const endMonthShort = format(weekEnd, 'MMM', { locale: fr });
      return `${startDay} ${startMonthShort}. au ${endDay} ${endMonthShort}. (S${weekNumber})`;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  // Créneaux horaires pour l'affichage (3-4 par jour max en démo)
  const timeSlots = [
    { id: 'morning', label: 'Matin', time: '07:00 - 12:00' },
    { id: 'afternoon', label: 'Après-midi', time: '12:00 - 17:00' },
    { id: 'evening', label: 'Soir', time: '17:00 - 21:00' },
  ];

  // Fonction pour déterminer le créneau d'une séance
  const getTimeSlot = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Grouper les séances par créneau pour chaque jour
  const getSessionsForSlot = (dayId: string, slotId: string) => {
    const day = weekSchedule.find(d => d.id === dayId);
    if (!day) return [];

    return day.sessions.filter(session => {
      const slot = getTimeSlot(session.startTime);
      return slot === slotId;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* INDICATEUR DE SEMAINE */}
      <View style={[styles.weekIndicator, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <Calendar size={16} color={colors.accent} />
        <Text style={[styles.weekIndicatorText, { color: colors.textPrimary }]}>
          {getWeekDates()}
        </Text>
      </View>

      {/* GRILLE EMPLOI DU TEMPS - GRANDE VERSION */}
      <View style={styles.mainTimetableContainer}>
        <View style={[styles.mainTimetableCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          {/* Bouton agrandir en haut à droite */}
          <TouchableOpacity
            onPress={() => setIsExpanded(true)}
            style={[styles.expandButtonTopRight, { backgroundColor: colors.accent }]}
          >
            <Maximize2 size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView
            style={styles.mainTimetableScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Header avec jours, dates et lunes repos */}
            <View style={styles.daysHeaderContainer}>
              {weekSchedule.map((day, dayIdx) => {
                const isRest = restDays.includes(day.id);
                return (
                  <View key={day.id} style={[
                    styles.dayHeaderColumn,
                    isRest && { backgroundColor: colors.accent + '20' }
                  ]}>
                    <Text style={[styles.dayHeaderDate, { color: colors.accent }]}>
                      {format(weekDates[dayIdx], 'd MMM', { locale: fr }).toUpperCase()}
                    </Text>
                    <Text style={[styles.dayHeaderDay, { color: colors.textPrimary }]}>
                      {DAYS_SHORT[dayIdx]}
                    </Text>
                    <TouchableOpacity
                      style={styles.restDayButton}
                      onPress={() => {
                        if (manualRestDays.includes(day.id)) {
                          // Retirer du repos manuel
                          setManualRestDays(prev => prev.filter(d => d !== day.id));
                          logger.info('🔆 Retirer repos manuel pour', day.label);
                        } else if (!isRest) {
                          // Marquer manuellement en repos (seulement si pas déjà en repos auto)
                          setManualRestDays(prev => [...prev, day.id]);
                          logger.info('🌙 Marquer TOUTE LA JOURNÉE en repos pour', day.label);
                          showPopup(
                            'Jour de repos',
                            `Toute la journée ${day.label} marquée en repos`,
                            [{ text: 'OK', style: 'primary' }]
                          );
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Moon
                        size={14}
                        color={isRest ? '#FFD700' : colors.textMuted}
                        fill={isRest ? '#FFD700' : 'none'}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* Grille des créneaux */}
            {timeSlots.map((slot, slotIdx) => (
              <View key={slot.id}>
                {/* Séparateur avec label du créneau */}
                <View style={[styles.slotDividerContainer, { backgroundColor: colors.backgroundCard }]}>
                  <Text style={[styles.slotDividerLabel, { color: colors.textPrimary }]}>
                    {slot.label}
                  </Text>
                  <Text style={[styles.slotDividerTime, { color: colors.textMuted }]}>
                    {slot.time}
                  </Text>
                </View>

                {/* Ligne des séances pour ce créneau */}
                <View style={styles.slotSessionsRow}>
                  {weekSchedule.map((day, dayIdx) => {
                    const sessions = getSessionsForSlot(day.id, slot.id);
                    const hasSession = sessions.length > 0;
                    const isRest = restDays.includes(day.id);

                    return (
                      <TouchableOpacity
                        key={day.id}
                        style={[
                          styles.sessionCell,
                          {
                            backgroundColor: isRest ? colors.border + '40' : colors.background,
                            borderColor: isRest ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => {
                          if (isRest) {
                            // Si jour en repos, afficher un message
                            showPopup(
                              'Jour de repos',
                              `${day.label} est marqué comme jour de repos. Cliquez sur la lune en haut pour retirer le repos.`,
                              [{ text: 'OK', style: 'primary' }]
                            );
                            return;
                          }
                          logger.info('🖱️ Clic sur', day.label, slot.label, '- Séances:', sessions.length);
                          if (sessions.length > 0) {
                            logger.info('✅ Ouverture liste de', sessions.length, 'séances');
                            setShowAllSessions({
                              day: day.id,
                              dayLabel: day.label,
                              slotLabel: slot.label,
                              sessions: sessions
                            });
                          } else {
                            logger.info('➕ Ouverture menu ajout');
                            setShowAddMenu({ dayId: day.id, dayLabel: day.label, slotId: slot.id });
                          }
                        }}
                        activeOpacity={0.7}
                      >

                        {/* Contenu de la cellule - JUSTE LES LOGOS */}
                        {isRest ? (
                          <View style={styles.sessionCellEmpty}>
                            <Moon size={24} color="#FFD700" fill="#FFD700" />
                            <Text style={[styles.restCellText, { color: colors.textMuted }]}>Repos</Text>
                          </View>
                        ) : hasSession ? (
                          <View style={styles.sessionLogosContainer}>
                            {sessions.slice(0, 4).map((session, idx) => {
                              const logoSource = session.clubLogo ? getClubLogoSource(session.clubLogo) : null;
                              return logoSource ? (
                                <Image
                                  key={idx}
                                  source={logoSource}
                                  style={[
                                    styles.sessionLogoOnly,
                                    idx > 0 && { marginTop: -12 }
                                  ]}
                                />
                              ) : (
                                <View
                                  key={idx}
                                  style={[
                                    styles.sessionDotOnly,
                                    { backgroundColor: session.clubColor },
                                    idx > 0 && { marginTop: -12 }
                                  ]}
                                />
                              );
                            })}
                            {sessions.length > 4 && (
                              <View style={[styles.sessionCountBadge, { backgroundColor: colors.accent }]}>
                                <Text style={styles.sessionCountText}>
                                  +{sessions.length - 4}
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View style={styles.sessionCellEmpty}>
                            <Plus size={18} color={colors.textMuted} opacity={0.3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>

      {/* MODAL PLEIN ÉCRAN - Vue agrandie */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header du modal */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalTitleContainer}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                EMPLOI DU TEMPS
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                {getWeekDates()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsExpanded(false)}
              style={[styles.closeButton, { backgroundColor: colors.backgroundCard }]}
            >
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Statistiques en haut */}
          <View
            style={[
              styles.modalStats,
              { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            ]}
          >
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.accent }]}>
                {weekSchedule.reduce((acc, day) => acc + day.sessions.length, 0)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                séances
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.accent }]}>
                ~
                {Math.round(
                  weekSchedule.reduce(
                    (acc, day) => acc + day.sessions.reduce((sum, s) => sum + s.duration, 0),
                    0
                  ) / 60
                )}
                h
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                cette semaine
              </Text>
            </View>
          </View>

          {/* Scroll vertical + horizontal */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.modalVerticalScroll}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalGrid}>
                {/* Header des jours */}
                <View style={styles.modalRow}>
                  <View style={styles.modalTimeCol} />
                  {DAYS_SHORT.map((day, idx) => (
                    <View key={day} style={styles.modalDayCol}>
                      <Text style={[styles.modalDayText, { color: colors.accent }]}>
                        {day}
                      </Text>
                      <Text style={[styles.modalDayDate, { color: colors.textMuted }]}>
                        {format(weekDates[idx], 'd MMM', { locale: fr }).toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Lignes de créneaux agrandis */}
                {timeSlots.map((slot) => (
                  <View key={slot.id} style={styles.modalRow}>
                    <View style={[styles.modalTimeCol, { backgroundColor: colors.backgroundCard }]}>
                      <Text style={[styles.modalTimeLabel, { color: colors.textPrimary }]}>
                        {slot.label}
                      </Text>
                      <Text style={[styles.modalTimeRange, { color: colors.textSecondary }]}>
                        {slot.time}
                      </Text>
                    </View>
                    {weekSchedule.map((day) => {
                      const sessions = getSessionsForSlot(day.id, slot.id);
                      return (
                        <TouchableOpacity
                          key={day.id}
                          style={[
                            styles.modalDayCol,
                            styles.modalCell,
                            { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                          ]}
                          onPress={() => {
                            // Toujours permettre d'ajouter une séance
                            setIsExpanded(false);
                            onAddSession(day.id, slot.id);
                          }}
                          onLongPress={() => {
                            // Appui long pour voir les détails si des séances existent
                            if (sessions.length > 0) {
                              setSelectedSession({ day: day.label, session: sessions[0] });
                              setShowSessionDetail(true);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          {sessions.length > 0 ? (
                            <View style={styles.modalSessionsContainer}>
                              {sessions.slice(0, 3).map((session, idx) => {
                                const logoSource = session.clubLogo ? getClubLogoSource(session.clubLogo) : null;
                                return (
                                  <View key={idx} style={styles.modalSessionCompact}>
                                    <View style={styles.modalSessionCompactHeader}>
                                      {logoSource ? (
                                        <Image
                                          source={logoSource}
                                          style={styles.modalClubLogoSmall}
                                        />
                                      ) : (
                                        <View
                                          style={[
                                            styles.modalClubDotSmall,
                                            { backgroundColor: session.clubColor },
                                          ]}
                                        />
                                      )}
                                      <Text
                                        style={[styles.modalSessionClubCompact, { color: colors.textPrimary }]}
                                        numberOfLines={1}
                                      >
                                        {session.clubName}
                                      </Text>
                                    </View>
                                    <Text style={[styles.modalSessionTypeCompact, { color: colors.textSecondary }]} numberOfLines={1}>
                                      {session.sessionTypes[0] || 'Séance'} • {session.duration}min
                                    </Text>
                                    {session.note && (
                                      <Text style={[styles.modalSessionNote, { color: colors.textMuted }]} numberOfLines={1}>
                                        {session.note}
                                      </Text>
                                    )}
                                  </View>
                                );
                              })}
                              {sessions.length > 3 && (
                                <Text style={[styles.modalMoreSessions, { color: colors.textMuted }]}>
                                  +{sessions.length - 3} autre{sessions.length - 3 > 1 ? 's' : ''}
                                </Text>
                              )}
                            </View>
                          ) : (
                            <View style={styles.modalEmptyCell}>
                              <TouchableOpacity
                                style={[styles.restButton, { backgroundColor: colors.accent + '15' }]}
                                onPress={() => {
                                  // TODO: Marquer comme jour de repos
                                  setIsExpanded(false);
                                  onAddSession(day.id, slot.id);
                                }}
                              >
                                <Moon size={16} color={colors.accent} />
                                <Text style={[styles.restButtonText, { color: colors.accent }]}>
                                  Repos
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL DÉTAILS DE SÉANCE */}
      <Modal
        visible={showSessionDetail}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSessionDetail(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: colors.backgroundCard }]}>
            {selectedSession && (
              <>
                {/* Close Button - Top Right */}
                <TouchableOpacity
                  onPress={() => setShowSessionDetail(false)}
                  style={[styles.detailCloseButtonTop, { backgroundColor: colors.background }]}
                >
                  <X size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                {/* Logo du club - Centered and Big */}
                {selectedSession.session.clubLogo && getClubLogoSource(selectedSession.session.clubLogo) && (
                  <View style={styles.detailLogoContainerBig}>
                    <Image
                      source={getClubLogoSource(selectedSession.session.clubLogo)!}
                      style={styles.detailClubLogoBig}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Header */}
                <View style={styles.detailHeaderCentered}>
                  <Text style={[styles.detailClubBig, { color: colors.textPrimary }]}>
                    {selectedSession.session.clubName}
                  </Text>
                  <Text style={[styles.detailDay, { color: colors.textMuted }]}>
                    {selectedSession.day}
                  </Text>
                </View>

                {/* Infos */}
                <View style={styles.detailInfoSection}>
                  <View style={styles.detailInfoRow}>
                    <Clock size={18} color={selectedSession.session.clubColor} />
                    <Text style={[styles.detailInfoText, { color: colors.textPrimary }]}>
                      {selectedSession.session.startTime}
                    </Text>
                    <Text style={[styles.detailDuration, { color: colors.textSecondary }]}>
                      ({selectedSession.session.duration} min)
                    </Text>
                  </View>

                  {selectedSession.session.sessionTypes.length > 0 && (
                    <View style={styles.detailTypesContainer}>
                      {selectedSession.session.sessionTypes.map((type: string, idx: number) => (
                        <View
                          key={idx}
                          style={[
                            styles.detailTypeChip,
                            { backgroundColor: selectedSession.session.clubColor + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.detailTypeText,
                              { color: selectedSession.session.clubColor },
                            ]}
                          >
                            {type}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedSession.session.details && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                        💪 Muscles travaillés
                      </Text>
                      <View style={styles.musclesContainer}>
                        {selectedSession.session.details.split(' • ').map((muscle: string, idx: number) => (
                          <View
                            key={idx}
                            style={[
                              styles.muscleChip,
                              { backgroundColor: selectedSession.session.clubColor + '20', borderColor: selectedSession.session.clubColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.muscleChipText,
                                { color: selectedSession.session.clubColor },
                              ]}
                            >
                              {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedSession.session.note && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                        🏋️ Programme
                      </Text>
                      <Text style={[styles.detailProgramText, { color: colors.textPrimary }]}>
                        {selectedSession.session.note}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bouton Fermer */}
                <TouchableOpacity
                  style={[styles.detailCloseBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setShowSessionDetail(false)}
                >
                  <Text style={styles.detailCloseBtnText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL MENU AJOUT */}
      <Modal
        visible={showAddMenu !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddMenu(null)}
      >
        <View style={styles.addMenuOverlay}>
          <View style={[styles.addMenuContent, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.addMenuTitle, { color: colors.textPrimary }]}>
              {showAddMenu?.dayLabel}
            </Text>
            <Text style={[styles.addMenuSubtitle, { color: colors.textMuted }]}>
              {showAddMenu && timeSlots.find(s => s.id === showAddMenu.slotId)?.label}
            </Text>

            <View style={styles.addMenuButtons}>
              <TouchableOpacity
                style={[styles.addMenuButton, { backgroundColor: colors.accent }]}
                onPress={() => {
                  if (showAddMenu) {
                    onAddSession(showAddMenu.dayId, showAddMenu.slotId);
                    setShowAddMenu(null);
                  }
                }}
              >
                <Plus size={24} color="#FFFFFF" />
                <Text style={styles.addMenuButtonText}>Ajouter entraînement</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addMenuButton, { backgroundColor: '#FFD700' }]}
                onPress={() => {
                  logger.info('🌙 Marquer repos pour', showAddMenu?.dayLabel, showAddMenu?.slotId);
                  // TODO: Implémenter la fonctionnalité repos dans la base de données
                  showPopup(
                    'Repos',
                    `Jour de repos marqué pour ${showAddMenu?.dayLabel} ${showAddMenu?.slotId}`,
                    [{ text: 'OK', style: 'primary' }]
                  );
                  setShowAddMenu(null);
                }}
              >
                <Moon size={24} color="#000000" fill="#000000" />
                <Text style={[styles.addMenuButtonText, { color: '#000000' }]}>Marquer repos</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.addMenuCancel, { borderColor: colors.border }]}
              onPress={() => setShowAddMenu(null)}
            >
              <Text style={[styles.addMenuCancelText, { color: colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL LISTE COMPLÈTE DES SÉANCES */}
      <Modal
        visible={showAllSessions !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAllSessions(null)}
      >
        <View style={styles.allSessionsOverlay}>
          <View style={[styles.allSessionsContent, { backgroundColor: colors.backgroundCard }]}>
            {showAllSessions && (
              <>
                <View style={styles.allSessionsHeader}>
                  <View>
                    <Text style={[styles.allSessionsTitle, { color: colors.textPrimary }]}>
                      {showAllSessions.dayLabel}
                    </Text>
                    <Text style={[styles.allSessionsSubtitle, { color: colors.textMuted }]}>
                      {showAllSessions.slotLabel} • {showAllSessions.sessions.length} séance{showAllSessions.sessions.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowAllSessions(null)}
                    style={[styles.allSessionsCloseButton, { backgroundColor: colors.background }]}
                  >
                    <X size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.allSessionsList} showsVerticalScrollIndicator={false}>
                  {showAllSessions.sessions.map((session, idx) => {
                    const logoSource = session.clubLogo ? getClubLogoSource(session.clubLogo) : null;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.sessionListItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => {
                          setSelectedSession({ day: showAllSessions.dayLabel, session });
                          setShowSessionDetail(true);
                        }}
                      >
                        <View style={styles.sessionListItemLeft}>
                          {logoSource ? (
                            <Image source={logoSource} style={styles.sessionListLogo} />
                          ) : (
                            <View style={[styles.sessionListDot, { backgroundColor: session.clubColor }]} />
                          )}
                          <View style={styles.sessionListInfo}>
                            <Text style={[styles.sessionListClub, { color: colors.textPrimary }]} numberOfLines={1}>
                              {session.clubName}
                            </Text>
                            <Text style={[styles.sessionListTime, { color: session.clubColor }]}>
                              {session.startTime} • {session.duration}min
                            </Text>
                            {session.sessionTypes && session.sessionTypes.length > 0 && (
                              <View style={styles.sessionTypesRow}>
                                {session.sessionTypes.map((type: string, i: number) => (
                                  <Text key={i} style={[styles.sessionTypeTag, { color: colors.accent }]}>
                                    {type}
                                  </Text>
                                ))}
                              </View>
                            )}
                            {session.details && (
                              <Text style={[styles.sessionListDetails, { color: colors.textMuted }]} numberOfLines={2}>
                                📋 {session.details}
                              </Text>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.addSessionButton, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    const dayId = showAllSessions.day;
                    const slotId = timeSlots.find(s => s.label === showAllSessions.slotLabel)?.id || 'morning';
                    setShowAllSessions(null);
                    setTimeout(() => {
                      setShowAddMenu({ dayId, dayLabel: showAllSessions.dayLabel, slotId });
                    }, 300);
                  }}
                >
                  <Plus size={20} color="#000000" />
                  <Text style={styles.addSessionButtonText}>Ajouter une séance</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      <PopupComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Pas de flex: 1 pour ne pas créer d'espace géant
  },
  content: {
    paddingTop: 0,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: FONT.size.md,
  },
  // Indicateur de semaine
  weekIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  weekIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },


  // Summary
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Vue Principale Emploi du Temps
  mainTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  expandButtonMain: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandButtonTopRight: {
    position: 'absolute',
    top: 80,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainTimetableContainer: {
    flex: 1,
    paddingHorizontal: 0, // Largeur maximale comme le calendrier
  },
  mainTimetableCard: {
    flex: 1,
    maxHeight: '96%', // Augmenter encore pour éviter de mordre sur SOIR
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  mainTimetableScroll: {
    flex: 1,
  },
  mainTimeSlotSection: {
    marginBottom: SPACING.sm,
  },
  mainSlotDivider: {
    height: 1,
    marginVertical: SPACING.md,
    marginHorizontal: SPACING.sm,
  },
  mainTimeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  mainTimeSlotLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  mainTimeSlotTime: {
    fontSize: 11,
  },
  mainDaysRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  mainDayCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm,
    minHeight: 100,
  },
  // Header dates
  datesHeaderRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    paddingHorizontal: 2,
  },
  dateHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  dateHeaderText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Footer repos
  restFooterRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingHorizontal: 2,
  },
  restFooterCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },

  // Nouveaux styles pour la refonte
  daysHeaderContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
    paddingHorizontal: 0, // Largeur maximale
  },
  dayHeaderColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  dayHeaderDate: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayHeaderDay: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  restDayButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  slotDividerContainer: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    marginHorizontal: 0, // Largeur maximale
  },
  slotDividerLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  slotDividerTime: {
    fontSize: 10,
    marginTop: 2,
  },
  slotSessionsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    paddingHorizontal: 0, // Largeur maximale
  },
  sessionCell: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm,
    minHeight: 90,
  },
  sessionCellContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  sessionCellEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sessionLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  sessionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTime: {
    fontSize: 13,
    fontWeight: '700',
  },
  sessionClub: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionDetails: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  sessionMoreText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  restCellText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  sessionLogosContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionLogoOnly: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sessionDotOnly: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sessionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  sessionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  mainDayLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  mainSessionContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  mainSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  mainClubLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  mainClubDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  mainSessionInfo: {
    flex: 1,
  },
  mainSessionTime: {
    fontSize: 13,
    fontWeight: '700',
  },
  mainSessionClub: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainSessionDetails: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  mainMoreText: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
  mainEmptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Plein Écran
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStats: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
  },
  modalVerticalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 100,
  },
  modalGrid: {
    gap: 8,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalTimeCol: {
    width: 100,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  modalTimeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalTimeRange: {
    fontSize: 11,
    marginTop: 4,
  },
  modalDayCol: {
    width: 220,
  },
  modalDayText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  modalDayDate: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -8,
    paddingBottom: SPACING.sm,
  },
  modalCell: {
    minHeight: 90,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm,
  },
  modalSessionsContainer: {
    gap: 6,
  },
  modalSessionCompact: {
    gap: 2,
  },
  modalSessionCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalClubLogoSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalClubDotSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalSessionClubCompact: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  modalSessionTypeCompact: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 26,
  },
  modalSessionNote: {
    fontSize: 9,
    fontStyle: 'italic',
    marginLeft: 26,
  },
  modalMoreSessions: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalEmptyCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  restButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal Détails Séance
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  detailModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  detailDay: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailClub: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLogoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  detailClubLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  // Nouveaux styles pour le modal amélioré
  detailCloseButtonTop: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailLogoContainerBig: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  detailClubLogoBig: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  detailHeaderCentered: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailClubBig: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  detailInfoSection: {
    gap: SPACING.md,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailInfoText: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailDuration: {
    fontSize: 14,
  },
  detailTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  detailTypeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  detailTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailCloseBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  detailCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal Menu Ajout
  addMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  addMenuContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
  },
  addMenuTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  addMenuSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  addMenuButtons: {
    gap: SPACING.md,
  },
  addMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  addMenuButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  addMenuCancel: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  addMenuCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Liste Complète des Séances
  allSessionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  allSessionsContent: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    maxHeight: '80%',
    minHeight: '50%',
  },
  allSessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  allSessionsTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  allSessionsSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  allSessionsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allSessionsList: {
    flex: 1,
    marginBottom: SPACING.lg,
  },
  sessionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  sessionListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  sessionListLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sessionListDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sessionListInfo: {
    flex: 1,
    gap: 4,
  },
  sessionListClub: {
    fontSize: 16,
    fontWeight: '700',
  },
  sessionListTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionListDetails: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  sessionTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  sessionTypeTag: {
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  // GROS BOUTON BUZZER EXPORT ICLOUD
  exportBuzzerButton: {
    backgroundColor: '#34C759',
    borderRadius: 24,
    marginBottom: SPACING.lg,
    marginHorizontal: SPACING.xs,
    shadowColor: '#34C759',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#2DB84C',
  },
  exportBuzzerInner: {
    paddingVertical: 24,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  exportBuzzerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  exportBuzzerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  addSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
  },
  addSessionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  // Styles pour les muscles
  musclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  muscleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  muscleChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailProgramText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 22,
  },
});
