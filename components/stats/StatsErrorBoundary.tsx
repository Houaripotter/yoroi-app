// ============================================
// STATS ERROR BOUNDARY
// Isolation des crash par onglet : si un onglet plante,
// les autres restent fonctionnels. L'utilisateur voit un
// message propre au lieu d'un écran blanc.
// ============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, RotateCw } from 'lucide-react-native';
import { logger } from '@/lib/security/logger';

interface Props {
  children: React.ReactNode;
  tabName?: string;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class StatsErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message || 'Erreur inconnue' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(`[StatsErrorBoundary] Crash onglet ${this.props.tabName || 'inconnu'}:`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMsg: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <AlertTriangle size={32} color="#F59E0B" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Cet onglet a rencontré un souci</Text>
          <Text style={styles.sub}>
            Les autres onglets fonctionnent normalement. Tu peux réessayer ci-dessous.
          </Text>
          {__DEV__ && (
            <Text style={styles.debug} numberOfLines={3}>
              {this.state.errorMsg}
            </Text>
          )}
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.85}>
            <RotateCw size={16} color="#FFFFFF" />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
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
    padding: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F59E0B15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 280,
  },
  debug: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
