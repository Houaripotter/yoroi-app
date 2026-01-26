import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ArrowLeft, TrendingUp, BookOpen, ExternalLink, Target, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================
// PAGE PRÉDICTION DE POIDS - Études Scientifiques
// ============================================

export default function WeightPredictionsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  // Données de prédiction (à calculer depuis les vraies données utilisateur)
  const currentWeight = 78.4;
  const targetWeight = 77;
  const weeklyLoss = 0.4; // kg par semaine
  const prediction7Days = currentWeight - (weeklyLoss / 7) * 7;
  const prediction30Days = currentWeight - (weeklyLoss / 7) * 30;
  const prediction90Days = currentWeight - (weeklyLoss / 7) * 90;

  const openStudy = (url: string) => {
    safeOpenURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('weightPredictions.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Introduction */}
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.introCard}
        >
          <TrendingUp size={32} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.introTitle}>{t('weightPredictions.scienceBasedPredictions')}</Text>
          <Text style={styles.introText}>
            {t('weightPredictions.introText')}
          </Text>
        </LinearGradient>

        {/* Prédictions */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('weightPredictions.yourPersonalizedPredictions')}
          </Text>

          <View style={styles.predictionsGrid}>
            <View style={[styles.predictionCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }]}>
              <Calendar size={20} color="#3B82F6" strokeWidth={2.5} />
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('weightPredictions.days7')}</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {prediction7Days.toFixed(1)} kg
              </Text>
              <Text style={[styles.predictionDiff, { color: '#3B82F6' }]}>
                -{(currentWeight - prediction7Days).toFixed(1)} kg
              </Text>
            </View>

            <View style={[styles.predictionCard, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }]}>
              <Calendar size={20} color="#8B5CF6" strokeWidth={2.5} />
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('weightPredictions.days30')}</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {prediction30Days.toFixed(1)} kg
              </Text>
              <Text style={[styles.predictionDiff, { color: '#8B5CF6' }]}>
                -{(currentWeight - prediction30Days).toFixed(1)} kg
              </Text>
            </View>

            <View style={[styles.predictionCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)' }]}>
              <Calendar size={20} color="#10B981" strokeWidth={2.5} />
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('weightPredictions.days90')}</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {prediction90Days.toFixed(1)} kg
              </Text>
              <Text style={[styles.predictionDiff, { color: '#10B981' }]}>
                -{(currentWeight - prediction90Days).toFixed(1)} kg
              </Text>
            </View>
          </View>

          <View style={[styles.targetBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' }]}>
            <Target size={20} color="#EF4444" strokeWidth={2.5} />
            <Text style={[styles.targetText, { color: colors.textSecondary }]}>
              {t('weightPredictions.targetMessage', {
                targetWeight: targetWeight,
                weeks: Math.ceil((currentWeight - targetWeight) / weeklyLoss)
              })}
            </Text>
          </View>
        </View>

        {/* Méthodologie */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color="#8B5CF6" strokeWidth={2.5} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('weightPredictions.scientificMethodology')}
            </Text>
          </View>

          <Text style={[styles.methodText, { color: colors.textSecondary }]}>
            {t('weightPredictions.methodologyDescription')}
          </Text>

          <View style={styles.bulletPoints}>
            <View style={styles.bulletPoint}>
              <View style={styles.bullet} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                {t('weightPredictions.bmr')}
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <View style={styles.bullet} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                {t('weightPredictions.tdee')}
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <View style={styles.bullet} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                {t('weightPredictions.caloricDeficit')}
              </Text>
            </View>
            <View style={styles.bulletPoint}>
              <View style={styles.bullet} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                {t('weightPredictions.metabolicAdaptation')}
              </Text>
            </View>
          </View>

          <View style={[styles.formulaBox, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }]}>
            <Text style={[styles.formulaTitle, { color: '#8B5CF6' }]}>{t('weightPredictions.basicFormula')}</Text>
            <Text style={[styles.formula, { color: colors.textPrimary }]}>
              {t('weightPredictions.formulaText')}
            </Text>
            <Text style={[styles.formulaNote, { color: colors.textMuted }]}>
              {t('weightPredictions.formulaNote')}
            </Text>
          </View>
        </View>

        {/* Études scientifiques */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('weightPredictions.scientificReferences')}
          </Text>

          <TouchableOpacity
            style={[styles.studyCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)' }]}
            onPress={() => openStudy('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3302369/')}
          >
            <View style={styles.studyHeader}>
              <Text style={[styles.studyTitle, { color: colors.textPrimary }]}>
                Quantification of Energy Expenditure
              </Text>
              <ExternalLink size={16} color="#3B82F6" strokeWidth={2.5} />
            </View>
            <Text style={[styles.studyAuthors, { color: colors.textMuted }]}>
              Hall K.D., Sacks G., Chandramohan D., et al.
            </Text>
            <Text style={[styles.studyJournal, { color: '#3B82F6' }]}>
              The Lancet, 2011
            </Text>
            <Text style={[styles.studyDescription, { color: colors.textSecondary }]}>
              {t('weightPredictions.study1Description')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.studyCard, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)' }]}
            onPress={() => openStudy('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2376744/')}
          >
            <View style={styles.studyHeader}>
              <Text style={[styles.studyTitle, { color: colors.textPrimary }]}>
                Energy Balance and Obesity
              </Text>
              <ExternalLink size={16} color="#8B5CF6" strokeWidth={2.5} />
            </View>
            <Text style={[styles.studyAuthors, { color: colors.textMuted }]}>
              Hill J.O., Wyatt H.R., Peters J.C.
            </Text>
            <Text style={[styles.studyJournal, { color: '#8B5CF6' }]}>
              Circulation, 2012
            </Text>
            <Text style={[styles.studyDescription, { color: colors.textSecondary }]}>
              {t('weightPredictions.study2Description')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.studyCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)' }]}
            onPress={() => openStudy('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4989512/')}
          >
            <View style={styles.studyHeader}>
              <Text style={[styles.studyTitle, { color: colors.textPrimary }]}>
                Metabolic Adaptation to Weight Loss
              </Text>
              <ExternalLink size={16} color="#10B981" strokeWidth={2.5} />
            </View>
            <Text style={[styles.studyAuthors, { color: colors.textMuted }]}>
              Trexler E.T., Smith-Ryan A.E., Norton L.E.
            </Text>
            <Text style={[styles.studyJournal, { color: '#10B981' }]}>
              Journal of the International Society of Sports Nutrition, 2014
            </Text>
            <Text style={[styles.studyDescription, { color: colors.textSecondary }]}>
              {t('weightPredictions.study3Description')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avertissement */}
        <View style={[styles.disclaimerBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)' }]}>
          <Text style={[styles.disclaimerTitle, { color: '#F59E0B' }]}>{t('weightPredictions.important')}</Text>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            {t('weightPredictions.disclaimerText1')}
          </Text>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary, marginTop: 8 }]}>
            {t('weightPredictions.disclaimerText2')}
          </Text>
        </View>

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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  introCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
  section: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  predictionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  predictionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  predictionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  predictionValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  predictionDiff: {
    fontSize: 12,
    fontWeight: '700',
  },
  targetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  targetText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 16,
  },
  bulletPoints: {
    gap: 12,
    marginBottom: 16,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  formulaBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  formulaTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formula: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  formulaNote: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  studyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  studyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  studyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginRight: 8,
  },
  studyAuthors: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  studyJournal: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  studyDescription: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  disclaimerBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
