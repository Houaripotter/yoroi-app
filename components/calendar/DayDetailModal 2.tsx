import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, Clock, Edit3, Calendar } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@/lib/ThemeContext';
import { Training, Club } from '@/lib/database';
import { getClubLogoSource } from '@/lib/sports';

interface DayDetailModalProps {
  visible: boolean;
  date: Date | null;
  sessions: Training[];
  clubs: Club[];
  onClose: () => void;
  onAddPress: () => void;
  onDeleteSession: (id: number) => void;
  onEditSession?: (session: Training) => void;
}

export function DayDetailModal({
  visible,
  date,
  sessions,
  clubs,
  onClose,
  onAddPress,
  onDeleteSession,
  onEditSession,
}: DayDetailModalProps) {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const insets = useSafeAreaInsets();

  const formatDateTitle = (d: Date) => {
    return format(d, "EEEE d MMMM yyyy", { locale: fr });
  };

  const getClub = (clubId?: number): Club | undefined => {
    if (!clubId) return undefined;
    return clubs.find(c => c.id === clubId);
  };

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '1h';
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  };

  const formatEndTime = (startTime?: string, durationMinutes?: number): string => {
    if (!startTime || !durationMinutes) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const handleDelete = (session: Training) => {
    const club = getClub(session.club_id);
    showPopup(
      'Supprimer la seance',
      `Supprimer ${club?.name || session.sport}${session.start_time ? ` a ${session.start_time}` : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            if (session.id) onDeleteSession(session.id);
          },
        },
      ]
    );
  };

  const getClubDisplay = (club?: Club) => {
    if (!club) return { type: 'color' as const, color: colors.accent };
    if (club.logo_uri) {
      const logoSource = getClubLogoSource(club.logo_uri);
      if (logoSource) {
        return { type: 'image' as const, source: logoSource };
      }
    }
    return { type: 'color' as const, color: club.color || colors.accent };
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ width: 40 }} />
            <Text style={[styles.dateTitle, { color: colors.textPrimary }]}>
              {date ? formatDateTitle(date) : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Bouton Ajouter */}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={onAddPress}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Ajouter une seance</Text>
          </TouchableOpacity>

          {/* Liste des seances */}
          <ScrollView
            style={styles.sessionsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sessions.length === 0 ? styles.emptyContainer : undefined}
          >
            {sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Calendar size={48} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Aucune seance ce jour
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Clique sur le bouton ci-dessus pour ajouter
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sessionsHeader}>
                  <View style={[styles.sessionsDivider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.sessionsLabel, { color: colors.textMuted }]}>
                    Seances du jour
                  </Text>
                  <View style={[styles.sessionsDivider, { backgroundColor: colors.border }]} />
                </View>

                {sessions.map((session) => {
                  const club = getClub(session.club_id);
                  const display = getClubDisplay(club);
                  const endTime = formatEndTime(session.start_time, session.duration_minutes);

                  return (
                    <View
                      key={session.id}
                      style={[styles.sessionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                    >
                      <View style={styles.sessionMain}>
                        {/* Logo/Couleur du club */}
                        <View style={[styles.sessionLogo, { backgroundColor: `${display.type === 'color' ? display.color : colors.backgroundElevated}20` }]}>
                          {display.type === 'image' ? (
                            <Image source={display.source} style={styles.sessionLogoImage} resizeMode="cover" />
                          ) : (
                            <View style={[styles.sessionColorDot, { backgroundColor: display.color }]} />
                          )}
                        </View>

                        {/* Info */}
                        <View style={styles.sessionInfo}>
                          <Text style={[styles.sessionClubName, { color: colors.textPrimary }]}>
                            {club?.name || session.sport}
                          </Text>
                          <View style={styles.sessionMeta}>
                            <Clock size={12} color={colors.textMuted} />
                            <Text style={[styles.sessionMetaText, { color: colors.textSecondary }]}>
                              {session.start_time || '—'}
                              {endTime ? ` - ${endTime}` : ''}
                              {' • '}
                              {formatDuration(session.duration_minutes)}
                              {session.session_type ? ` • ${session.session_type}` : ''}
                            </Text>
                          </View>
                          {session.notes && (
                            <Text style={[styles.sessionNote, { color: colors.textMuted }]} numberOfLines={2}>
                              "{session.notes}"
                            </Text>
                          )}
                        </View>

                        {/* Actions */}
                        <View style={styles.sessionActions}>
                          {onEditSession && (
                            <TouchableOpacity
                              onPress={() => onEditSession(session)}
                              style={[styles.actionButton, { backgroundColor: colors.backgroundElevated }]}
                            >
                              <Edit3 size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => handleDelete(session)}
                            style={[styles.actionButton, { backgroundColor: `${colors.error}15` }]}
                          >
                            <Trash2 size={16} color={colors.error || '#EF4444'} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>

          {/* Bouton Fermer */}
          <TouchableOpacity
            style={[styles.closeButtonBottom, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>Fermer</Text>
          </TouchableOpacity>
          <PopupComponent />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sessionsList: {
    maxHeight: 350,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
  sessionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sessionsDivider: {
    flex: 1,
    height: 1,
  },
  sessionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sessionCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  sessionMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionLogoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sessionColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionClubName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 12,
  },
  sessionNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonBottom: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DayDetailModal;
