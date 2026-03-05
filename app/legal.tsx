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
  const [isNavigating, setIsNavigating] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const handleAccept = async () => {
    if (isAccepting) return;

    setIsAccepting(true);
    try {
      const previouslyAccepted = await AsyncStorage.getItem(LEGAL_ACCEPTED_KEY);
      await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true');

      if (previouslyAccepted) {
        if (!isNavigating) { setIsNavigating(true); router.back(); }
        return;
      }

      const settings = await getUserSettings();
      if (!settings.username || !settings.gender) {
        router.push('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      logger.error('Erreur acceptation disclaimer:', error);
      if (!isNavigating) { setIsNavigating(true); router.back(); }
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          disabled={isNavigating}
          onPress={() => {
            if (!isNavigating) {
              setIsNavigating(true);
              setTimeout(() => setIsNavigating(false), 1000);
              router.back();
            }
          }}
          style={styles.backButton}
        >
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
        <Text style={[styles.title, { color: isDarkMode ? colors.accent : colors.textPrimary }]}>
          Bienvenue dans la Famille Yoroi
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pourquoi cette app existe
        </Text>

        {/* Personal Story */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.storyText, { color: colors.textPrimary }]}>
            J'ai cr\u00e9\u00e9 YOROI seul, par passion. Un jour, je ne me suis plus support\u00e9 devant le miroir. J'avais \u00e9norm\u00e9ment pris de poids. J'ai voulu trouver une app compl\u00e8te pour me reprendre en main, mais rien ne me convenait. Alors je l'ai construite moi-m\u00eame.
          </Text>

          <Text style={[styles.storyText, { color: colors.textPrimary }]}>
            Au fil du temps, des amis et des gens sur des forums m'ont sugg\u00e9r\u00e9 des fonctionnalit\u00e9s. Je les ai ajout\u00e9es. Aujourd'hui, c'est autant votre app que la mienne.
          </Text>

          <View style={[styles.storyDivider, { backgroundColor: isDarkMode ? colors.accent : '#D4AF37' }]} />

          <Text style={[styles.storyHighlight, { color: isDarkMode ? colors.accent : '#D4AF37' }]}>
            Une app entre vous et moi.
          </Text>

          <Text style={[styles.storyText, { color: colors.textPrimary, marginBottom: 4 }]}>
            Pas de soci\u00e9t\u00e9 derri\u00e8re, pas d'argent, pas de pub. Juste un passionn\u00e9 qui se bat pour se sentir mieux. Un peu comme vous, peut-\u00eatre. L'esprit du samoura\u00ef : on n'abandonne jamais.
          </Text>

          <Text style={[styles.storyItalic, { color: colors.textSecondary }]}>
            Vos retours et votre bienveillance comptent \u00e9norm\u00e9ment. Merci d'\u00eatre l\u00e0.
          </Text>
        </View>

        {/* Privacy & Info */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#10B98120' }]}>
                <Ionicons name="lock-closed" size={20} color="#10B981" />
              </View>
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                100% hors ligne, tes donn\u00e9es restent sur ton t\u00e9l\u00e9phone
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="eye-off" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                Aucun tracking, aucune pub, aucun compte requis
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="heart" size={20} color="#8B5CF6" />
              </View>
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                \u00c9coute ton corps, consulte un pro si besoin
              </Text>
            </View>
          </View>
        </View>

        {/* Age Confirmation */}
        <TouchableOpacity
          style={styles.ageCheckRow}
          onPress={() => setAgeConfirmed(!ageConfirmed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, {
            backgroundColor: ageConfirmed ? colors.accent : 'transparent',
            borderColor: ageConfirmed ? colors.accent : colors.textMuted,
          }]}>
            {ageConfirmed && <Ionicons name="checkmark" size={16} color={colors.textOnAccent} />}
          </View>
          <Text style={[styles.ageCheckText, { color: colors.textPrimary }]}>
            Je confirme avoir au moins 13 ans
          </Text>
        </TouchableOpacity>

        {/* Accept Button - Friendly */}
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: colors.accent, opacity: (isAccepting || !ageConfirmed) ? 0.4 : 1 }]}
          onPress={handleAccept}
          disabled={isAccepting || !ageConfirmed}
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
  ageCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageCheckText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  storyText: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 12,
  },
  storyHighlight: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  storyDivider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    alignSelf: 'center',
    marginVertical: 8,
  },
  storyItalic: {
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
