import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Calendar, MapPin, Bell } from 'lucide-react-native';

type SportType = 'JJB' | 'MMA' | 'Boxe' | 'MuayThai' | 'Foot' | 'Basket' | 'Hand' | 'Running' | 'Padel' | 'Kickboxing' | 'Judo' | 'Lutte';

interface EventTicketProps {
  event: {
    id: string;
    name: string;
    date: string;
    location: string;
    sport: SportType;
    federation?: string;
    category?: string;
    opponent?: string;
    myTeam?: string;
    distance?: string;
    daysLeft: number;
    logoUrl?: string;
  };
  onPress?: () => void;
  onReminderPress?: () => void;
}

const EventTicket: React.FC<EventTicketProps> = ({ event, onPress, onReminderPress }) => {

  // Couleurs selon le sport
  const getSportColor = () => {
    switch (event.sport) {
      case 'JJB': return { primary: '#10B981', light: '#D1FAE5', dark: '#065F46' };
      case 'MMA': return { primary: '#EF4444', light: '#FEE2E2', dark: '#991B1B' };
      case 'Boxe': return { primary: '#F59E0B', light: '#FEF3C7', dark: '#92400E' };
      case 'MuayThai': return { primary: '#EC4899', light: '#FCE7F3', dark: '#9D174D' };
      case 'Foot': return { primary: '#3B82F6', light: '#DBEAFE', dark: '#1E40AF' };
      case 'Basket': return { primary: '#F97316', light: '#FFEDD5', dark: '#9A3412' };
      case 'Hand': return { primary: '#8B5CF6', light: '#EDE9FE', dark: '#5B21B6' };
      case 'Running': return { primary: '#06B6D4', light: '#CFFAFE', dark: '#0E7490' };
      case 'Padel': return { primary: '#84CC16', light: '#ECFCCB', dark: '#3F6212' };
      case 'Kickboxing': return { primary: '#F59E0B', light: '#FEF3C7', dark: '#92400E' };
      case 'Judo': return { primary: '#3B82F6', light: '#DBEAFE', dark: '#1E40AF' };
      case 'Lutte': return { primary: '#EF4444', light: '#FEE2E2', dark: '#991B1B' };
      default: return { primary: '#6B7280', light: '#F3F4F6', dark: '#374151' };
    }
  };

  const colors = getSportColor();

  // Icône selon le sport
  const getSportIcon = () => {
    switch (event.sport) {
      case 'JJB': return '🥋';
      case 'MMA': return '🥊';
      case 'Boxe': return '🥊';
      case 'MuayThai': return '🦵';
      case 'Foot': return '⚽';
      case 'Basket': return '🏀';
      case 'Hand': return '🤾';
      case 'Running': return '🏃';
      case 'Padel': return '🎾';
      case 'Kickboxing': return '🥋';
      case 'Judo': return '🥋';
      case 'Lutte': return '🤼';
      default: return '🏆';
    }
  };

  // Affichage conditionnel selon le type de sport
  const renderEventContent = () => {
    // Sports d'équipe (Foot, Basket, Hand)
    if (['Foot', 'Basket', 'Hand'].includes(event.sport) && event.myTeam && event.opponent) {
      return (
        <View style={styles.vsContainer}>
          <Text style={[styles.teamName, { color: colors.dark }]} numberOfLines={1}>{event.myTeam}</Text>
          <View style={[styles.vsBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <Text style={[styles.teamName, { color: colors.dark }]} numberOfLines={1}>{event.opponent}</Text>
        </View>
      );
    }

    // Running (Course)
    if (event.sport === 'Running' && event.distance) {
      return (
        <View style={styles.runningContainer}>
          <Text style={[styles.eventName, { color: colors.dark }]} numberOfLines={1}>
            {event.name}
          </Text>
          <View style={[styles.distanceBadge, { backgroundColor: colors.light }]}>
            <Text style={[styles.distanceText, { color: colors.primary }]}>
              {event.distance}
            </Text>
          </View>
        </View>
      );
    }

    // Sports de combat (JJB, MMA, Boxe, MuayThai)
    return (
      <View style={styles.combatContainer}>
        <Text style={[styles.eventName, { color: colors.dark }]} numberOfLines={1}>
          {event.name}
        </Text>
        {event.category && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.light }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {event.category}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Urgence selon les jours restants
  const getUrgencyStyle = () => {
    if (event.daysLeft <= 7) return { color: '#EF4444', bg: '#FEE2E2' }; // Rouge
    if (event.daysLeft <= 21) return { color: '#F59E0B', bg: '#FEF3C7' }; // Orange
    if (event.daysLeft <= 60) return { color: '#3B82F6', bg: '#DBEAFE' }; // Bleu
    return { color: '#10B981', bg: '#D1FAE5' }; // Vert
  };

  const urgency = getUrgencyStyle();

  return (
    <TouchableOpacity
      style={styles.ticketContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Partie gauche - Bande colorée avec sport */}
      <View style={[styles.ticketLeft, { backgroundColor: colors.primary }]}>
        <Text style={styles.sportIcon}>{getSportIcon()}</Text>
        <Text style={styles.sportLabel}>{event.sport}</Text>
      </View>

      {/* Séparation dentelée */}
      <View style={styles.ticketSeparator}>
        <View style={[styles.semicircle, styles.semicircleTop, { backgroundColor: '#F9FAFB' }]} />
        <View style={styles.dashedLine} />
        <View style={[styles.semicircle, styles.semicircleBottom, { backgroundColor: '#F9FAFB' }]} />
      </View>

      {/* Partie droite - Contenu */}
      <View style={styles.ticketRight}>
        {/* Header avec fédération */}
        {event.federation && (
          <View style={styles.federationRow}>
            {event.logoUrl && (
              <Image source={{ uri: event.logoUrl }} style={styles.federationLogo} />
            )}
            <Text style={styles.federationName}>{event.federation}</Text>
          </View>
        )}

        {/* Contenu principal (conditionnel) */}
        {renderEventContent()}

        {/* Date et lieu */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.detailText}>{event.date}</Text>
          </View>
          <View style={styles.detailItem}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.detailText} numberOfLines={1}>{event.location}</Text>
          </View>
        </View>

        {/* Footer avec J-XX et rappel */}
        <View style={styles.ticketFooter}>
          <TouchableOpacity
            style={[styles.reminderButton, { backgroundColor: colors.light }]}
            onPress={(e) => {
              e.stopPropagation();
              onReminderPress?.();
            }}
          >
            <Bell size={14} color={colors.primary} />
            <Text style={[styles.reminderText, { color: colors.primary }]}>Rappel</Text>
          </TouchableOpacity>

          <View style={[styles.daysLeftBadge, { backgroundColor: urgency.bg }]}>
            <Text style={[styles.daysLeftText, { color: urgency.color }]}>
              J-{event.daysLeft}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  ticketContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },

  // Partie gauche (bande colorée)
  ticketLeft: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  sportIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  sportLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Séparation dentelée
  ticketSeparator: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  semicircle: {
    width: 20,
    height: 10,
    borderRadius: 10,
  },
  semicircleTop: {
    marginTop: -10,
  },
  semicircleBottom: {
    marginBottom: -10,
  },
  dashedLine: {
    flex: 1,
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Partie droite (contenu)
  ticketRight: {
    flex: 1,
    padding: 12,
  },

  federationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  federationLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  federationName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sports de combat
  combatContainer: {
    marginBottom: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Sports d'équipe (VS)
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  vsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Running
  runningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Détails (date, lieu)
  detailsRow: {
    gap: 6,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },

  // Footer
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  reminderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  daysLeftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  daysLeftText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default EventTicket;
