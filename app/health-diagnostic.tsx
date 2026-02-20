// ============================================
// PAGE DE DIAGNOSTIC APPLE HEALTH & WATCH
// ============================================
// Permet de debugger les problèmes de synchronisation
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { healthConnect } from '@/lib/healthConnect';
import { WatchConnectivity, isWatchModuleAvailable } from '@/lib/watchConnectivity.ios';
import { logger } from '@/lib/security/logger';

interface DiagnosticResult {
  healthKit: {
    available: boolean;
    connected: boolean;
    sleepDays: number;
    weightCount: number;
    stepsToday: number;
    heartRate: number;
    errors: string[];
    recommendations: string[];
  } | null;
  watch: {
    moduleAvailable: boolean;
    isAvailable: boolean;
    isReachable: boolean;
    errors: string[];
    recommendations: string[];
  } | null;
}

export default function HealthDiagnosticPage() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = useCallback(async () => {
    setIsRunning(true);
    setResults(null);

    try {
      // 1. Diagnostic HealthKit
      logger.info('[Diagnostic Page] Démarrage diagnostic HealthKit...');
      const healthKitResult = await healthConnect.runDiagnostic();

      // 2. Diagnostic Watch
      logger.info('[Diagnostic Page] Démarrage diagnostic Watch...');
      const watchResult = await WatchConnectivity.runDiagnostic();

      setResults({
        healthKit: {
          available: healthKitResult.healthKitAvailable,
          connected: healthKitResult.isConnected,
          sleepDays: healthKitResult.recentData.sleep,
          weightCount: healthKitResult.recentData.weight,
          stepsToday: healthKitResult.recentData.steps,
          heartRate: healthKitResult.recentData.heartRate,
          errors: healthKitResult.errors,
          recommendations: healthKitResult.recommendations,
        },
        watch: {
          moduleAvailable: watchResult.moduleAvailable,
          isAvailable: watchResult.isAvailable,
          isReachable: watchResult.isReachable,
          errors: watchResult.errors,
          recommendations: watchResult.recommendations,
        },
      });
    } catch (error) {
      logger.error('[Diagnostic Page] Erreur:', error);
      setResults({
        healthKit: null,
        watch: null,
      });
    } finally {
      setIsRunning(false);
    }
  }, []);

  const StatusIcon = ({ status }: { status: 'ok' | 'warning' | 'error' }) => {
    if (status === 'ok') return <CheckCircle size={20} color="#10B981" />;
    if (status === 'warning') return <AlertTriangle size={20} color="#F59E0B" />;
    return <XCircle size={20} color="#EF4444" />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Diagnostic Sante
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Info Platform */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Plateforme</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            OS: {Platform.OS} | Version: {Platform.Version}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Module Watch: {isWatchModuleAvailable ? '✅ Chargé' : '❌ Non chargé'}
          </Text>
        </View>

        {/* Bouton Diagnostic */}
        <TouchableOpacity
          style={[styles.runButton, { backgroundColor: colors.gold }]}
          onPress={runDiagnostic}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <RefreshCw size={20} color="#000" />
              <Text style={styles.runButtonText}>Lancer le Diagnostic</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Résultats */}
        {results && (
          <>
            {/* HealthKit Results */}
            <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  App Santé (HealthKit)
                </Text>
                <StatusIcon
                  status={
                    results.healthKit?.connected && results.healthKit?.sleepDays > 0
                      ? 'ok'
                      : results.healthKit?.connected
                      ? 'warning'
                      : 'error'
                  }
                />
              </View>

              {results.healthKit && (
                <>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Disponible</Text>
                    <Text style={[styles.value, { color: results.healthKit.available ? '#10B981' : '#EF4444' }]}>
                      {results.healthKit.available ? 'Oui' : 'Non'}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Connecte</Text>
                    <Text style={[styles.value, { color: results.healthKit.connected ? '#10B981' : '#EF4444' }]}>
                      {results.healthKit.connected ? 'Oui' : 'Non'}
                    </Text>
                  </View>
                  <View style={styles.separator} />
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Sommeil (30j)</Text>
                    <Text style={[styles.value, { color: colors.textPrimary }]}>
                      {results.healthKit.sleepDays} jours
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Poids (90j)</Text>
                    <Text style={[styles.value, { color: colors.textPrimary }]}>
                      {results.healthKit.weightCount} mesures
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Pas aujourd'hui</Text>
                    <Text style={[styles.value, { color: colors.textPrimary }]}>
                      {results.healthKit.stepsToday}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>FC moyenne</Text>
                    <Text style={[styles.value, { color: colors.textPrimary }]}>
                      {results.healthKit.heartRate || '-'} BPM
                    </Text>
                  </View>

                  {/* Erreurs */}
                  {results.healthKit.errors.length > 0 && (
                    <View style={styles.errorsSection}>
                      <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Erreurs</Text>
                      {results.healthKit.errors.map((error, i) => (
                        <Text key={i} style={[styles.errorText, { color: '#EF4444' }]}>
                          • {error}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Recommandations */}
                  {results.healthKit.recommendations.length > 0 && (
                    <View style={styles.recommendationsSection}>
                      <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>Recommandations</Text>
                      {results.healthKit.recommendations.map((rec, i) => (
                        <Text key={i} style={[styles.recText, { color: colors.textSecondary }]}>
                          • {rec}
                        </Text>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Watch Results */}
            <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Apple Watch
                </Text>
                <StatusIcon
                  status={
                    results.watch?.isReachable
                      ? 'ok'
                      : results.watch?.isAvailable
                      ? 'warning'
                      : 'error'
                  }
                />
              </View>

              {results.watch && (
                <>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Module natif</Text>
                    <Text style={[styles.value, { color: results.watch.moduleAvailable ? '#10B981' : '#EF4444' }]}>
                      {results.watch.moduleAvailable ? 'Charge' : 'Non charge'}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Watch disponible</Text>
                    <Text style={[styles.value, { color: results.watch.isAvailable ? '#10B981' : '#EF4444' }]}>
                      {results.watch.isAvailable ? 'Oui' : 'Non'}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Watch reachable</Text>
                    <Text style={[styles.value, { color: results.watch.isReachable ? '#10B981' : '#F59E0B' }]}>
                      {results.watch.isReachable ? 'Oui' : 'Non'}
                    </Text>
                  </View>

                  {/* Erreurs */}
                  {results.watch.errors.length > 0 && (
                    <View style={styles.errorsSection}>
                      <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Erreurs</Text>
                      {results.watch.errors.map((error, i) => (
                        <Text key={i} style={[styles.errorText, { color: '#EF4444' }]}>
                          • {error}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Recommandations */}
                  {results.watch.recommendations.length > 0 && (
                    <View style={styles.recommendationsSection}>
                      <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>Recommandations</Text>
                      {results.watch.recommendations.map((rec, i) => (
                        <Text key={i} style={[styles.recText, { color: colors.textSecondary }]}>
                          • {rec}
                        </Text>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Instructions */}
            <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Comment corriger les problemes
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                1. Allez dans Reglages {'>'} Confidentialite {'>'} Sante {'>'} Yoroi
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                2. Activez TOUTES les permissions (lecture et ecriture)
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                3. Sur votre Apple Watch, ouvrez l'app Yoroi au moins une fois
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                4. Activez le Suivi du sommeil dans l'app Watch sur iPhone
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                5. Portez votre Watch la nuit pour enregistrer le sommeil
              </Text>
            </View>
          </>
        )}
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
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 14,
    marginTop: 4,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  errorsSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  recommendationsSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 4,
  },
  recText: {
    fontSize: 13,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
});
