// ============================================
// 🔒 ERROR BOUNDARY GLOBAL - YOROI
// ============================================
// Capture toutes les erreurs React et affiche un écran d'erreur convivial

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { logger } from '@/lib/logger';

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

    // TODO: En production, envoyer à un service de monitoring
    // Exemples: Sentry, Crashlytics
    // if (!__DEV__) {
    //   Sentry.captureException(error, {
    //     contexts: {
    //       react: {
    //         componentStack: errorInfo.componentStack,
    //       },
    //     },
    //   });
    // }
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

  handleExportLogs = () => {
    const logs = logger.exportLogs();
    logger.info('Logs exported for debugging', { logsLength: logs.length });

    // TODO: Permettre à l'utilisateur de copier/partager les logs
    // Peut utiliser expo-clipboard ou expo-sharing
    // await Clipboard.setStringAsync(logs);
    // Alert.alert('Logs copiés', 'Les logs ont été copiés dans le presse-papier');
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
