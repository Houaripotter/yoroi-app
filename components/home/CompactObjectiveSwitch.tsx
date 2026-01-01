import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getCompetitions } from '@/lib/database';
import { differenceInDays, parseISO } from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';
import logger from '@/lib/security/logger';

interface CompactObjectiveSwitchProps {
  onToggle: (isOn: boolean) => void;
}

const CompactObjectiveSwitch: React.FC<CompactObjectiveSwitchProps> = ({ onToggle }) => {
  const { colors } = useTheme();
  const [isOn, setIsOn] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [eventType, setEventType] = useState<string>('');

  useEffect(() => {
    loadNextEvent();
  }, []);

  const loadNextEvent = async () => {
    try {
      const events = await getCompetitions();
      if (events && events.length > 0) {
        const now = new Date();
        const upcoming = events
          .map(e => ({
            ...e,
            daysLeft: differenceInDays(parseISO(e.date), now)
          }))
          .filter(e => e.daysLeft >= 0)
          .sort((a, b) => a.daysLeft - b.daysLeft)[0];

        if (upcoming) {
          setDaysLeft(upcoming.daysLeft);
          // Utiliser le type_evenement s'il existe, sinon "Objectif"
          setEventType(upcoming.type_evenement || 'Objectif');
        }
      }
    } catch (error) {
      logger.error('Erreur chargement événement:', error);
    }
  };

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    onToggle(newState);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleToggle}
      activeOpacity={0.7}
    >
      {/* Contenu principal - change selon l'état */}
      {isOn && daysLeft !== null ? (
        // État ON - Affiche J-XX en GRAND + type d'événement
        <>
          <View style={styles.daysLeftContainer}>
            <Text style={[styles.daysLeftLarge, { color: colors.gold }]}>J-{daysLeft}</Text>
          </View>
          <Text style={[styles.eventName, { color: colors.textPrimary, marginTop: 4 }]} numberOfLines={2}>
            {eventType} à venir
          </Text>
        </>
      ) : (
        // État OFF - Affiche le texte seulement
        <>
          <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
            Prochain
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            Objectif
          </Text>
        </>
      )}

      {/* Toggle switch */}
      <View style={[styles.toggleTrack, { backgroundColor: isOn ? colors.gold : '#E5E7EB' }]}>
        <View
          style={[
            styles.toggleThumb,
            {
              backgroundColor: '#FFFFFF',
              transform: [{ translateX: isOn ? 18 : 2 }],
            }
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  iconContainer: {
    marginBottom: 4,
  },
  daysLeftContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  daysLeftLarge: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  eventName: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  toggleTrack: {
    width: 40,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 8,
    position: 'relative',
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
  },
});

export default CompactObjectiveSwitch;
