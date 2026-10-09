// ============================================
// Page 404 · Écran introuvable (deep link invalide, route supprimée, etc.)
// Design propre aligné sur le thème de l'app.
// ============================================

import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Compass, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

export default function NotFoundScreen() {
  const { colors, isDark, screenBackground, screenText } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: 'Écran introuvable', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: screenBackground, paddingTop: insets.top + 40 }]}>
        {/* Icône décorative */}
        <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}>
          <Compass size={48} color={colors.accent} strokeWidth={2} />
        </View>

        {/* Titre + message */}
        <Text style={[styles.title, { color: screenText }]}>Cette page n'existe plus</Text>
        <Text style={[styles.subtitle, { color: screenText, opacity: 0.7 }]}>
          Le lien que tu as suivi pointe vers un écran qui a été déplacé ou supprimé.
        </Text>

        {/* Bouton primaire */}
        <Link href="/" asChild>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            activeOpacity={0.85}
          >
            <Home size={18} color={colors.textOnAccent} strokeWidth={2.5} />
            <Text style={[styles.primaryBtnText, { color: colors.textOnAccent }]}>Retour à l'accueil</Text>
            <ChevronRight size={18} color={colors.textOnAccent} strokeWidth={2.5} />
          </TouchableOpacity>
        </Link>

        {/* Signature discrète */}
        <Text style={[styles.signature, { color: screenText, opacity: 0.4 }]}>YOROI</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 28,
    borderWidth: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 32,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  signature: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
