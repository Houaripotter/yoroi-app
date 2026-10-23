/**
 * Error Boundary (refonte v2)
 * Attrape les erreurs de l'arbre React et affiche un ecran papier clair :
 * une phrase simple, Reessayer (bouton principal) et Retour a l'accueil.
 * Vague 16 : le torii a l'aube en fond plein ecran, floute et voile ; le texte est pose sur une carte claire.
 * Le detail technique n'apparait qu'en developpement (__DEV__).
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { FondEpoque } from '@/components/yoroi/v2/fonds/FondEpoque';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { RefreshCw, House } from 'lucide-react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorScreen({ error, onRetry, onHome }: { error: Error | null; onRetry: () => void; onHome: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 48 }}>
      <FondEpoque fond="aube" voile="leger" flou={18} />
      <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', gap: 14, borderRadius: 28, padding: 22, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#1D2029', shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 6 }}>
          <Glyph kind="sakura" size={38} color={c.accent} />
        </View>
        <Ink size={28} weight="black" tight style={{ textAlign: 'center' }}>
          Cet écran a eu un souci
        </Ink>
        <Ink size={15} color={c.textSecondary} style={{ textAlign: 'center', paddingHorizontal: 8 }}>
          Tes données restent sur ton téléphone. Réessaie, ou reviens à l’accueil.
        </Ink>

        {__DEV__ && error ? (
          <ScrollView style={{ maxHeight: 200, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, marginTop: 4 }} contentContainerStyle={{ padding: 12, gap: 6 }}>
            <Ink size={13} weight="bold" color={c.danger}>{error.toString()}</Ink>
            {error.stack ? <Ink size={11} color={c.textMuted}>{error.stack}</Ink> : null}
          </ScrollView>
        ) : null}

        <View style={{ gap: 10, marginTop: 10 }}>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Réessayer"
            style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: pressed ? c.accentPressed : c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 })}
          >
            <RefreshCw size={20} color="#FFFFFF" strokeWidth={2.4} />
            <Ink size={16} weight="extraBold" color="#FFFFFF">Réessayer</Ink>
          </Pressable>
          <Pressable
            onPress={onHome}
            accessibilityRole="button"
            accessibilityLabel="Retour à l’accueil"
            style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 })}
          >
            <House size={20} color={c.ink} strokeWidth={2.2} />
            <Ink size={16} weight="extraBold">Retour à l’accueil</Ink>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  goHome = () => {
    // La navigation n'est disponible qu'une fois le navigateur remonte : on essaie quelques fois
    let tries = 0;
    const attempt = () => {
      tries += 1;
      try {
        router.replace('/(tabs)' as any);
      } catch {
        if (tries < 10) setTimeout(attempt, 60);
      }
    };
    try {
      router.replace('/(tabs)' as any);
      this.resetError();
      return;
    } catch {
      // navigateur demonte pendant l'erreur
    }
    this.resetError();
    setTimeout(attempt, 0);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.resetError);
      }
      return <ErrorScreen error={this.state.error} onRetry={this.resetError} onHome={this.goHome} />;
    }

    return this.props.children;
  }
}
