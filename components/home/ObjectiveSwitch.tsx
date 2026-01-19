import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Target, Trophy, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getCompetitions, Competition } from '@/lib/database';
import { differenceInDays, parseISO } from 'date-fns';
import logger from '@/lib/security/logger';
import { useTheme } from '@/lib/ThemeContext';

interface NextEvent {
  id: number;
  name: string;
  date: string;
  daysLeft: number;
  sport: string;
}

const ObjectiveSwitch = () => {
  const { colors, isDark } = useTheme();
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [toggleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadNextEvent();
  }, []);

  useEffect(() => {
    // Animation du toggle
    Animated.spring(toggleAnim, {
      toValue: nextEvent ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [nextEvent]);

  const loadNextEvent = async () => {
    try {
      const events = await getCompetitions();
      if (events && events.length > 0) {
        // Trouver l'événement le plus proche dans le futur
        const now = new Date();
        const upcoming = events
          .map(e => ({
            ...e,
            daysLeft: differenceInDays(parseISO(e.date), now)
          }))
          .filter(e => e.daysLeft >= 0)
          .sort((a, b) => a.daysLeft - b.daysLeft)[0];

        if (upcoming) {
          setNextEvent({
            id: upcoming.id ?? 0,
            name: upcoming.nom,
            date: upcoming.date,
            daysLeft: upcoming.daysLeft,
            sport: upcoming.sport
          });
        } else {
          setNextEvent(null);
        }
      } else {
        setNextEvent(null);
      }
    } catch (error) {
      logger.error('Erreur chargement événement:', error);
      setNextEvent(null);
    }
  };

  // Couleur selon urgence
  const getUrgencyColor = (days: number) => {
    if (days <= 7) return { primary: '#EF4444', light: '#FEE2E2', bg: '#FEF2F2' };
    if (days <= 21) return { primary: '#F59E0B', light: '#FEF3C7', bg: '#FFFBEB' };
    if (days <= 60) return { primary: '#3B82F6', light: '#DBEAFE', bg: '#EFF6FF' };
    return { primary: '#10B981', light: '#D1FAE5', bg: '#ECFDF5' };
  };

  // ÉTAT OFF - Pas d'événement
  if (!nextEvent) {
    return (
      <TouchableOpacity
        style={[styles.containerOff, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          router.push('/planning?tab=events');
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainerOff, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
          <Target size={22} color={colors.textMuted} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.labelOff, { color: colors.textMuted }]}>Objectif</Text>
          <Text style={[styles.subtitleOff, { color: colors.textSecondary }]}>Définir un objectif ?</Text>
        </View>

        {/* Toggle switch visuel OFF */}
        <View style={[styles.toggleTrackOff, { backgroundColor: isDark ? colors.background : '#E5E7EB' }]}>
          <Animated.View
            style={[
              styles.toggleThumb,
              {
                backgroundColor: colors.textMuted,
                transform: [{
                  translateX: toggleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 20]
                  })
                }],
              }
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  }

  // ÉTAT ON - Événement programmé
  const urgencyColors = getUrgencyColor(nextEvent.daysLeft);

  return (
    <TouchableOpacity
      style={[
        styles.containerOn, 
        { 
          borderColor: isDark ? urgencyColors.primary : urgencyColors.light, 
          backgroundColor: isDark ? colors.backgroundCard : urgencyColors.bg 
        }
      ]}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        router.push('/planning?tab=events');
      }}
      activeOpacity={0.7}
    >
      <Animated.View
        style={{
          transform: [{
            scale: toggleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.05]
            })
          }],
        }}
      >
        <View style={[styles.iconContainerOn, { backgroundColor: isDark ? `${urgencyColors.primary}30` : urgencyColors.light }]}>
          <Trophy size={22} color={urgencyColors.primary} />
        </View>
      </Animated.View>

      <View style={styles.content}>
        <Text style={[styles.labelOn, { color: colors.textPrimary }]} numberOfLines={1}>{nextEvent.name}</Text>
        <Text style={[styles.subtitleOn, { color: colors.textSecondary }]}>{nextEvent.sport}</Text>
      </View>

      {/* Toggle switch visuel ON */}
      <View style={[styles.toggleTrackOn, { backgroundColor: urgencyColors.primary }]}>
        <Animated.View
          style={[
            styles.toggleThumb,
            {
              backgroundColor: '#FFFFFF',
              transform: [{
                translateX: toggleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 20]
                })
              }],
            }
          ]}
        />
      </View>

      <View style={[styles.daysLeftBadge, { backgroundColor: urgencyColors.primary }]}>
        <Text style={[styles.daysLeftText, { color: '#FFFFFF' }]}>
          J-{nextEvent.daysLeft}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // État OFF
  containerOff: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    minHeight: 72,
  },
  iconContainerOff: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelOff: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  subtitleOff: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // État ON
  containerOn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    minHeight: 72,
  },
  iconContainerOn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelOn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitleOn: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Commun
  content: {
    flex: 1,
    marginLeft: 12,
  },

  // Toggle switches
  toggleTrackOff: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: 8,
  },
  toggleTrackOn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: 8,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  // Badge J-XX
  daysLeftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  daysLeftText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default ObjectiveSwitch;
