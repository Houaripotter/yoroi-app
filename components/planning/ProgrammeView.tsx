import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  Plus,
  Moon,
  Sun,
  Sunset,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useWeekSchedule, SessionDetail } from '@/hooks/useWeekSchedule';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';

const DAYS = [
  { id: 'lun', label: 'LUNDI', short: 'LUN' },
  { id: 'mar', label: 'MARDI', short: 'MAR' },
  { id: 'mer', label: 'MERCREDI', short: 'MER' },
  { id: 'jeu', label: 'JEUDI', short: 'JEU' },
  { id: 'ven', label: 'VENDREDI', short: 'VEN' },
  { id: 'sam', label: 'SAMEDI', short: 'SAM' },
  { id: 'dim', label: 'DIMANCHE', short: 'DIM' },
];

interface ProgrammeViewProps {
  onAddSession: (dayId: string) => void;
  onSessionPress: (dayId: string, sessionIndex: number) => void;
  onToggleRest: (dayId: string) => void;
}

// Déterminer le moment de la journée
const getTimeOfDay = (hour: number) => {
  if (hour < 12) return { label: 'MATIN', icon: Sun, color: '#F59E0B' };
  if (hour < 17) return { label: 'MIDI', icon: Sun, color: '#F97316' };
  return { label: 'SOIR', icon: Sunset, color: '#8B5CF6' };
};

// Formater la durée
const formatDuration = (startTime: string, duration: number) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${startTime} - ${endHours.toString().padStart(2, '0')}:${endMins
    .toString()
    .padStart(2, '0')}`;
};

export const ProgrammeView: React.FC<ProgrammeViewProps> = ({
  onAddSession,
  onSessionPress,
  onToggleRest,
}) => {
  const { colors } = useTheme();
  const { weekSchedule, loading } = useWeekSchedule();

  // Calculer les totaux
  const totalSessions = weekSchedule.reduce(
    (acc, day) => acc + day.sessions.length,
    0
  );
  const totalMinutes = weekSchedule.reduce((acc, day) => {
    return acc + day.sessions.reduce((sum, s) => sum + s.duration, 0);
  }, 0);
  const totalHours = Math.round(totalMinutes / 60);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          MA SEMAINE
        </Text>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: colors.accent + '20' },
          ]}
          onPress={() => onAddSession('lun')}
        >
          <Plus size={18} color={colors.accentText} />
          <Text style={[styles.addButtonText, { color: colors.accent }]}>
            Ajouter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des jours */}
      {DAYS.map((day, dayIndex) => {
        const dayData = weekSchedule.find((d) => d.id === day.id);
        const sessions = dayData?.sessions || [];
        const isRest = dayData?.isRest || false;

        return (
          <Animated.View
            key={day.id}
            entering={FadeInDown.delay(dayIndex * 50)}
            style={styles.dayContainer}
          >
            {/* Header du jour */}
            <View style={styles.dayHeader}>
              <Text style={[styles.dayLabel, { color: colors.textPrimary }]}>
                {day.label}
              </Text>

              {/* Bouton Repos rapide */}
              <TouchableOpacity
                style={[
                  styles.restButton,
                  isRest && { backgroundColor: '#8B5CF6' + '30' },
                ]}
                onPress={() => onToggleRest(day.id)}
              >
                <Moon
                  size={16}
                  color={isRest ? '#8B5CF6' : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Sessions du jour */}
            {isRest ? (
              // Affichage Repos
              <View
                style={[
                  styles.restCard,
                  { backgroundColor: colors.backgroundCard },
                ]}
              >
                <View
                  style={[styles.restIndicator, { backgroundColor: '#8B5CF6' }]}
                />
                <View style={styles.restContent}>
                  <Moon size={20} color="#8B5CF6" />
                  <View style={styles.restTextContainer}>
                    <Text style={[styles.restTitle, { color: colors.textPrimary }]}>
                      REPOS
                    </Text>
                    <Text
                      style={[
                        styles.restSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Récupération
                    </Text>
                  </View>
                </View>
              </View>
            ) : sessions.length > 0 ? (
              // Affichage des sessions
              sessions.map((session, sessionIndex) => {
                const timeOfDay = getTimeOfDay(
                  parseInt(session.startTime.split(':')[0])
                );
                const TimeIcon = timeOfDay.icon;

                return (
                  <TouchableOpacity
                    key={sessionIndex}
                    style={[
                      styles.sessionCard,
                      { backgroundColor: colors.backgroundCard },
                    ]}
                    onPress={() => onSessionPress(day.id, sessionIndex)}
                    activeOpacity={0.7}
                  >
                    {/* Barre de couleur du club */}
                    <View
                      style={[
                        styles.clubColorBar,
                        { backgroundColor: session.clubColor },
                      ]}
                    />

                    <View style={styles.sessionContent}>
                      {/* Ligne 1 : Heure + Badge moment */}
                      <View style={styles.sessionTopRow}>
                        <View style={styles.timeContainer}>
                          <Clock size={14} color={colors.textSecondary} />
                          <Text
                            style={[
                              styles.sessionTime,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {formatDuration(session.startTime, session.duration)}
                          </Text>
                        </View>

                        {/* Badge Matin/Midi/Soir */}
                        <View
                          style={[
                            styles.timeOfDayBadge,
                            { backgroundColor: timeOfDay.color + '20' },
                          ]}
                        >
                          <TimeIcon size={12} color={timeOfDay.color} />
                          <Text
                            style={[
                              styles.timeOfDayText,
                              { color: timeOfDay.color },
                            ]}
                          >
                            {timeOfDay.label}
                          </Text>
                        </View>
                      </View>

                      {/* Ligne 2 : Club */}
                      <View style={styles.clubRow}>
                        {session.clubLogo ? (
                          <Image
                            source={{ uri: session.clubLogo }}
                            style={styles.clubLogo}
                          />
                        ) : (
                          <View
                            style={[
                              styles.clubDot,
                              { backgroundColor: session.clubColor },
                            ]}
                          />
                        )}
                        <Text
                          style={[
                            styles.clubName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {session.clubName}
                        </Text>
                      </View>

                      {/* Ligne 3 : Détails (type + muscles/thème) */}
                      <View style={styles.detailsRow}>
                        {/* Tags des types de séance */}
                        {session.sessionTypes.map((type, i) => (
                          <View
                            key={i}
                            style={[
                              styles.typeTag,
                              { backgroundColor: session.clubColor + '20' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.typeTagText,
                                { color: session.clubColor },
                              ]}
                            >
                              {type}
                            </Text>
                          </View>
                        ))}

                        {/* Thème technique ou muscles */}
                        {session.details && (
                          <Text
                            style={[
                              styles.sessionDetails,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {session.details}
                          </Text>
                        )}
                      </View>

                      {/* Note personnalisée (si présente) */}
                      {session.note && (
                        <Text
                          style={[
                            styles.sessionNote,
                            { color: colors.textSecondary },
                          ]}
                        >
                          "{session.note}"
                        </Text>
                      )}
                    </View>

                    {/* Chevron */}
                    <ChevronRight size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })
            ) : (
              // Jour vide - Bouton ajouter
              <TouchableOpacity
                style={[
                  styles.emptyDayCard,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onAddSession(day.id)}
              >
                <Plus size={20} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.emptyDayText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Ajouter une séance
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        );
      })}

      {/* Résumé de la semaine */}
      <Animated.View
        entering={FadeInDown.delay(400)}
        style={[styles.summaryCard, { backgroundColor: colors.backgroundCard }]}
      >
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.accent }]}>
            {totalSessions}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            séances/semaine
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.accent }]}>
            ~{totalHours}h
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            prévues
          </Text>
        </View>
      </Animated.View>

      {/* Espace en bas */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: SPACING.md,
    paddingBottom: 120,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: FONT.size.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
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

  // Jour
  dayContainer: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  restButton: {
    padding: 8,
    borderRadius: 8,
  },

  // Session Card
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    marginBottom: 8,
    overflow: 'hidden',
  },
  clubColorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  sessionContent: {
    flex: 1,
    padding: 12,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeOfDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timeOfDayText: {
    fontSize: 10,
    fontWeight: '600',
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  clubLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  clubDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  clubName: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionDetails: {
    fontSize: 13,
  },
  sessionNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },

  // Rest Card
  restCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  restIndicator: {
    width: 4,
    alignSelf: 'stretch',
  },
  restContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  restTextContainer: {
    flex: 1,
  },
  restTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  restSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // Empty Day
  emptyDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyDayText: {
    fontSize: 14,
  },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginTop: 8,
    borderRadius: RADIUS.xl,
    padding: 16,
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
});
