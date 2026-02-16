import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface ActionLinkProps {
  icon?: string;
  title: string;
  subtitle: string;
  screen: string;
}

export const ActionLink: React.FC<ActionLinkProps> = ({ title, subtitle, screen }) => {
  const { colors } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    // Navigation vers l'écran spécifié
    if (screen === 'calculator' || screen === 'calculators') {
      router.push('/calculators');
    } else if (screen === 'hydration') {
      router.push('/hydration');
    } else if (screen === 'timer') {
      router.push('/timer');
    } else {
      // Fallback
      router.push('/(tabs)/more');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: '#1E293B' }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: '#64748B' }]}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color="#3B82F6" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
