// ============================================
// 🔒 ERROR BOUNDARY GLOBAL - YOROI
// ============================================
// Capture toutes les erreurs React et affiche un écran d'erreur convivial

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { logger } from '@/lib/logger';
import { setStringAsync, getStringAsync } from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ERROR_STORAGE_KEY = '@yoroi_crash_reports';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logger l'erreur de manière sécurisée
    logger.error('💥 React Error Boundary caught error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({ error, errorInfo });

    // Sauvegarder le rapport d'erreur pour analyse ultérieure
    this.saveCrashReport(error, errorInfo);
  }

  private async saveCrashReport(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };

      // Récupérer les rapports existants
      const existingReportsStr = await AsyncStorage.getItem(ERROR_STORAGE_KEY);
      const existingReports = existingReportsStr ? JSON.parse(existingReportsStr) : [];

      // Ajouter le nouveau rapport (garder les 10 derniers)
      existingReports.unshift(report);
      const reportsToSave = existingReports.slice(0, 10);

      await AsyncStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(reportsToSave));
      logger.info('Crash report saved for later analysis');
    } catch (saveError) {
      logger.error('Failed to save crash report', saveError);
    }
  }

  handleReset = () => {
    logger.info('User reset error boundary');
    this.setState({ hasError: false, error: null, errorInfo: null });

    try {
      router.replace('/(tabs)');
    } catch (navError) {
      logger.error('Navigation failed during error recovery', navError);
      // Si la navigation échoue, juste reset l'état
    }
  };

  handleExportLogs = async () => {
    try {
      const logs = logger.exportLogs();

      // Construire le rapport complet
      const errorReport = this.state.error ? `
=== ERREUR ===
${this.state.error.toString()}

=== STACK TRACE ===
${this.state.error.stack || 'N/A'}

=== COMPONENT STACK ===
${this.state.errorInfo?.componentStack || 'N/A'}

` : '';

      const fullReport = `=== YOROI CRASH REPORT ===
Date: ${new Date().toISOString()}

${errorReport}=== LOGS ===
${logs}`;

      await setStringAsync(fullReport);
      Alert.alert(
        'Logs copiés',
        'Les logs ont été copiés dans le presse-papier. Tu peux les coller pour les envoyer au support.'
      );
      logger.info('Logs exported to clipboard', { logsLength: logs.length });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier les logs');
      logger.error('Failed to export logs', error);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          {/* Emoji et titre */}
          <Text style={styles.emoji}>😅</Text>
          <Text style={styles.title}>Oups !</Text>
          <Text style={styles.message}>
            Une erreur inattendue s'est produite.{'\n'}
            Tes données sont en sécurité.
          </Text>

          {/* Informations de debug (uniquement en DEV) */}
          {__DEV__ && this.state.error && (
            <ScrollView style={styles.errorDetails}>
              <Text style={styles.errorTitle}>🔍 Debug Info:</Text>
              <Text style={styles.errorText}>
                {this.state.error.toString()}
              </Text>
              {this.state.error.stack && (
                <Text style={styles.stackTrace}>
                  {this.state.error.stack}
                </Text>
              )}
              {this.state.errorInfo && (
                <>
                  <Text style={styles.errorTitle}>📍 Component Stack:</Text>
                  <Text style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                </>
              )}
            </ScrollView>
          )}

          {/* Bouton principal de reset */}
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Retour à l'accueil</Text>
          </TouchableOpacity>

          {/* Bouton d'export des logs (uniquement en DEV) */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={this.handleExportLogs}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>📋 Exporter les logs</Text>
            </TouchableOpacity>
          )}

          {/* Message de contact support (production uniquement) */}
          {!__DEV__ && (
            <Text style={styles.supportMessage}>
              Si le problème persiste, contacte le support.
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0F',
    padding: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  errorDetails: {
    maxHeight: 300,
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  errorTitle: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 10,
  },
  errorText: {
    color: '#FF453A',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  stackTrace: {
    color: '#8E8E93',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 8,
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  supportMessage: {
    marginTop: 20,
    fontSize: 12,
    color: '#6E6E73',
    textAlign: 'center',
  },
});

export default ErrorBoundary;
