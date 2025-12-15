import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// BOUTON + CENTRAL - REDIRECTION
// ============================================
// Ce screen sert uniquement de "pont" pour le bouton +
// Il redirige immediatement vers la modal de pesee

export default function AddScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    // Rediriger immediatement vers la modal de pesee
    const timer = setTimeout(() => {
      router.push('/entry');
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
