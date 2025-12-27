import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const quotes = [
  "Chaque jour est une nouvelle chance.",
  "Petit à petit, l'oiseau fait son nid.",
  "Le plus dur, c'est de commencer.",
  "Tu es plus fort que tu ne le penses.",
  "La constance bat l'intensité.",
  "Un pas à la fois vers ton objectif.",
  "Crois en toi, tu en es capable.",
  "Chaque effort compte.",
];

export const EssentielHeader: React.FC = () => {
  const { colors } = useTheme();
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      <Sparkles size={18} color="#F59E0B" />
      <Text style={[styles.quote, { color: colors.textSecondary }]} numberOfLines={2}>"{quote}"</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  quote: {
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 22,
  },
});
