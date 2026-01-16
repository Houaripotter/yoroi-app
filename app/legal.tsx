import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { getUserSettings } from '@/lib/storage';
import logger from '@/lib/security/logger';

const LEGAL_ACCEPTED_KEY = '@yoroi_legal_accepted';

export default function LegalScreen() {
  const { colors, mode } = useTheme();
  const isDarkMode = mode === 'dark';
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    if (isAccepting) return;

    setIsAccepting(true);
    try {
      const previouslyAccepted = await AsyncStorage.getItem(LEGAL_ACCEPTED_KEY);
      await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true');

      if (previouslyAccepted) {
        router.back();
        return;
      }

      const settings = await getUserSettings();
      if (!settings.username || !settings.gender) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      logger.error('Erreur acceptation disclaimer:', error);
      router.back();
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Bienvenue</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Friendly Icon */}
        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1E3A5F' : '#E8F4FD' }]}>
          <Ionicons
            name="shield-checkmark"
            size={60}
            color={isDarkMode ? '#60A5FA' : '#3B82F6'}
          />
        </View>

        {/* Welcoming Title */}
        <Text style={[styles.title, { color: colors.accent }]}>
          Avant de commencer
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Quelques informations importantes
        </Text>

        {/* Main Content - Friendly Version */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.introText, { color: colors.textPrimary }]}>
            YOROI est ton compagnon de suivi fitness et bien-être. Voici ce que tu dois savoir :
          </Text>

          {/* Positive Points */}
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="fitness" size={20} color="#10B981" />
              </View>
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                Suis ta progression et tes performances
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="analytics" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                Analyse tes données d'entraînement
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="trophy" size={20} color="#8B5CF6" />
              </View>
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                Atteins tes objectifs avec motivation
              </Text>
            </View>
          </View>

          {/* Gentle Reminder */}
          <View style={[styles.reminderBox, {
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
            borderColor: isDarkMode ? '#3B82F6' : '#93C5FD'
          }]}>
            <View style={styles.reminderHeader}>
              <Ionicons
                name="information-circle"
                size={22}
                color="#3B82F6"
              />
              <Text style={[styles.reminderTitle, { color: '#3B82F6' }]}>
                Bon à savoir
              </Text>
            </View>

            <Text style={[styles.reminderText, { color: colors.textPrimary }]}>
              YOROI est un outil de suivi personnel. Pour tout objectif de santé spécifique, n'hésite pas à consulter un professionnel qui pourra t'accompagner.
            </Text>
          </View>

          {/* Health Tip - Friendly */}
          <View style={[styles.tipBox, {
            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
          }]}>
            <Ionicons name="heart" size={18} color="#10B981" />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Écoute ton corps ! Si quelque chose ne va pas pendant l'effort, fais une pause.
            </Text>
          </View>
        </View>

        {/* Accept Button - Friendly */}
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: colors.accent, opacity: isAccepting ? 0.6 : 1 }]}
          onPress={handleAccept}
          disabled={isAccepting}
        >
          <Ionicons name="rocket" size={20} color={colors.textOnAccent} style={{ marginRight: 8 }} />
          <Text style={[styles.acceptButtonText, { color: colors.textOnAccent }]}>
            {isAccepting ? 'Chargement...' : 'C\'est parti !'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          En continuant, tu acceptes nos conditions d'utilisation
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  featureList: {
    marginBottom: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  reminderBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  reminderText: {
    fontSize: 14,
    lineHeight: 21,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  acceptButton: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
