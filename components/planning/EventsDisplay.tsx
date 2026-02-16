import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import EventTicket from './EventTicket';
import { Competition } from '@/lib/database';

interface EventsDisplayProps {
  groupedByCategory: {
    combat: { [key: string]: Competition[] };
    match: { [key: string]: Competition[] };
    course: { [key: string]: Competition[] };
    competition: { [key: string]: Competition[] };
  };
}

const EventsDisplay: React.FC<EventsDisplayProps> = ({ groupedByCategory }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [expandedOrganizers, setExpandedOrganizers] = useState<{ [key: string]: boolean }>({});

  const getOrganizer = (competitionName: string): string => {
    if (competitionName.includes('IBJJF')) return 'IBJJF';
    if (competitionName.includes('CFJJB')) return 'CFJJB';
    if (competitionName.includes('UFC')) return 'UFC';
    if (competitionName.includes('Marathon')) return 'Marathon';
    return 'Autres';
  };

  const toggleOrganizer = (key: string) => {
    setExpandedOrganizers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    impactAsync(ImpactFeedbackStyle.Light);
  };

  const renderCategory = (
    categoryName: string,
    categoryData: { [key: string]: Competition[] },
    emoji: string,
    color: string
  ) => {
    if (Object.keys(categoryData).length === 0) return null;

    // Grouper toutes les compétitions par organisateur
    const byOrganizer: { [key: string]: Competition[] } = {};

    Object.values(categoryData).flat().forEach(comp => {
      const org = getOrganizer(comp.nom);
      if (!byOrganizer[org]) {
        byOrganizer[org] = [];
      }
      byOrganizer[org].push(comp);
    });

    const totalEvents = Object.values(byOrganizer).flat().length;

    return (
      <View style={styles.categorySection}>
        {/* Header catégorie */}
        <View style={[styles.categoryHeader, { backgroundColor: color + '20', borderLeftColor: color }]}>
          <View style={styles.categoryLeft}>
            <View>
              <Text style={[styles.categoryTitle, { color }]}>{categoryName.toUpperCase()}</Text>
              <Text style={[styles.categorySubtitle, { color: colors.textMuted }]}>
                {totalEvents} événement{totalEvents > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Groupement par organisateur avec dropdown */}
        {Object.entries(byOrganizer).map(([organizer, events]) => {
          const key = `${categoryName}-${organizer}`;
          const isExpanded = expandedOrganizers[key];
          const displayedEvents = isExpanded ? events : []; // Afficher 0 par défaut - tout est caché
          const hasMore = events.length > 0;

          // Couleur par organisateur
          const getOrganizerColor = () => {
            switch (organizer) {
              case 'IBJJF': return '#E53935';
              case 'CFJJB': return '#1E88E5';
              case 'UFC': return '#F59E0B';
              case 'Marathon': return '#10B981';
              default: return '#6B7280';
            }
          };

          const orgColor = getOrganizerColor();

          return (
            <View key={key} style={styles.organizerSection}>
              {/* Header organisateur cliquable */}
              <TouchableOpacity
                style={[styles.organizerHeader, { backgroundColor: orgColor + '10' }]}
                onPress={() => toggleOrganizer(key)}
                activeOpacity={0.7}
              >
                <View style={styles.organizerLeft}>
                  <View style={[styles.organizerDot, { backgroundColor: orgColor }]} />
                  <Text style={[styles.organizerName, { color: orgColor }]}>{organizer}</Text>
                  <View style={[styles.organizerBadge, { backgroundColor: orgColor + '20' }]}>
                    <Text style={[styles.organizerCount, { color: orgColor }]}>
                      {events.length}
                    </Text>
                  </View>
                </View>
                {isExpanded ? (
                  <ChevronUp size={18} color={orgColor} strokeWidth={2.5} />
                ) : (
                  <ChevronDown size={18} color={orgColor} strokeWidth={2.5} />
                )}
              </TouchableOpacity>

              {/* Événements */}
              <View style={styles.eventsContainer}>
                {displayedEvents.map((competition) => {
                  const eventDate = new Date(competition.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  eventDate.setHours(0, 0, 0, 0);
                  const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  // Mapper les noms de sport
                  const sportDisplayName = (competition.sport || 'jjb').toUpperCase().replace('_', ' ');

                  return (
                    <EventTicket
                      key={competition.id}
                      event={{
                        id: String(competition.id),
                        name: competition.nom,
                        date: format(eventDate, 'd MMMM yyyy', { locale: fr }),
                        location: competition.lieu || 'Non spécifié',
                        sport: sportDisplayName as any,
                        federation: organizer,
                        category: competition.categorie_poids,
                        daysLeft: daysLeft,
                      }}
                      onPress={() => router.push('/competitions')}
                      onReminderPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        showPopup('Rappels', 'Les rappels J-30, J-7, J-1 et H-2 sont actives !', [{ text: 'OK', style: 'primary' }]);
                      }}
                    />
                  );
                })}

                {/* Bouton "Voir événements" si replié */}
                {!isExpanded && hasMore && (
                  <TouchableOpacity
                    style={[styles.seeMoreButton, { backgroundColor: orgColor + '10', borderColor: orgColor }]}
                    onPress={() => toggleOrganizer(key)}
                  >
                    <Text style={[styles.seeMoreText, { color: orgColor }]}>
                      Voir {events.length} événement{events.length > 1 ? 's' : ''}
                    </Text>
                    <ChevronDown size={16} color={orgColor} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* COMBAT */}
      {renderCategory('COMBAT', groupedByCategory.combat, '', '#EF4444')}

      {/* MATCH */}
      {renderCategory('MATCH', groupedByCategory.match, '', '#3B82F6')}

      {/* COURSE */}
      {renderCategory('COURSE', groupedByCategory.course, '', '#10B981')}

      {/* COMPETITION */}
      {renderCategory('COMPETITION', groupedByCategory.competition, '', '#6B7280')}

      <PopupComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categorySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Organisateur
  organizerSection: {
    marginBottom: 16,
  },
  organizerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  organizerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  organizerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  organizerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  organizerCount: {
    fontSize: 11,
    fontWeight: '700',
  },

  eventsContainer: {
    gap: 0,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  seeMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default EventsDisplay;
