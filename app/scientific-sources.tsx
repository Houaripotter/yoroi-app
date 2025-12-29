// ============================================
// YOROI - SOURCES SCIENTIFIQUES
// ============================================
// Page dédiée aux références et études scientifiques

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink, BookOpen, GraduationCap } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { RADAR_REFERENCES } from '@/lib/radarService';

export default function ScientificSourcesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Liste des sources
  const sources = [
    {
      category: 'Sommeil',
      color: '#8B5CF6',
      items: [
        {
          title: 'National Sleep Foundation',
          description: '7-9h de sommeil recommandées pour un adulte',
          url: 'https://www.sleepfoundation.org/how-sleep-works/how-much-sleep-do-we-really-need',
        },
        {
          title: 'Walker, M. (2017). Why We Sleep',
          description: 'Recherche sur l\'impact du sommeil sur la performance physique',
          url: 'https://www.amazon.fr/Why-We-Sleep-Science-Dreams/dp/0141983760',
        },
      ],
    },
    {
      category: 'Hydratation',
      color: '#3B82F6',
      items: [
        {
          title: 'European Hydration Institute',
          description: '2L d\'eau par jour minimum recommandés',
          url: 'https://www.europeanhydrationinstitute.org',
        },
        {
          title: 'Sawka et al. (2007) ACSM',
          description: 'Impact de l\'hydratation sur la performance sportive',
          url: 'https://journals.lww.com/acsm-msse/fulltext/2007/02000/exercise_and_fluid_replacement.22.aspx',
        },
      ],
    },
    {
      category: 'Charge d\'entraînement',
      color: '#EF4444',
      items: [
        {
          title: 'ACSM 2022',
          description: '+25-30% de force en 12 semaines avec 2-3 séances/sem',
          url: 'https://www.acsm.org/education-resources/trending-topics-resources/resource-library/resource_detail?id=d5e0c0f3-7b0f-4e4a-8b0a-5f8e0c0f3b0f',
        },
        {
          title: 'Bompa & Haff (2009)',
          description: 'Periodization: Theory and Methodology of Training',
          url: 'https://www.amazon.fr/Periodization-Theory-Methodology-Training-Bompa/dp/0736085472',
        },
      ],
    },
    {
      category: 'Régularité',
      color: '#F59E0B',
      items: [
        {
          title: 'Lally et al. (2010)',
          description: 'Moyenne de 66 jours pour ancrer une habitude',
          url: 'https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674',
        },
        {
          title: 'Clear, J. (2018). Atomic Habits',
          description: 'L\'importance de la constance dans la performance',
          url: 'https://www.amazon.fr/Atomic-Habits-Proven-Build-Break/dp/0735211299',
        },
      ],
    },
    {
      category: 'Poids et composition corporelle',
      color: '#10B981',
      items: [
        {
          title: 'WHO - Healthy BMI',
          description: 'Lignes directrices sur l\'IMC sain',
          url: 'https://www.who.int/europe/news-room/fact-sheets/item/a-healthy-lifestyle---who-recommendations',
        },
        {
          title: 'Hall & Kahan (2018)',
          description: 'Déficit de 500 kcal/j ≈ -0.5 kg/sem',
          url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5764193/',
        },
      ],
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Revues Scientifiques
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: colors.accent + '15' }]}>
          <View style={[styles.introIcon, { backgroundColor: colors.accent + '25' }]}>
            <GraduationCap size={28} color={colors.accent} />
          </View>
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
            Fondé sur la science
          </Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Toutes les recommandations et calculs de Yoroi sont basés sur des études scientifiques
            et des organisations de santé reconnues internationalement.
          </Text>
        </View>

        {/* Sources par catégorie */}
        {sources.map((source, index) => (
          <View key={index} style={styles.categorySection}>
            {/* Header catégorie */}
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryDot, { backgroundColor: source.color }]} />
              <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>
                {source.category}
              </Text>
            </View>

            {/* Liste des sources */}
            {source.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[styles.sourceCard, { backgroundColor: colors.backgroundCard }]}
                onPress={() => Linking.openURL(item.url)}
                activeOpacity={0.7}
              >
                <View style={styles.sourceContent}>
                  <View style={styles.sourceHeader}>
                    <BookOpen size={16} color={source.color} />
                    <Text
                      style={[styles.sourceTitle, { color: colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <Text style={[styles.sourceDescription, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
                <ExternalLink size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={[styles.footerCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Les liens mènent vers des sources externes. Yoroi n'est pas affilié à ces organisations.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  introCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
  sourceContent: {
    flex: 1,
    gap: 6,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  sourceDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  footerCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
