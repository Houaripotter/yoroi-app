import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { Quote } from '@/lib/quotes';

interface QuoteCardProps {
  quote: Quote;
  style?: ViewStyle;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, style }) => {
  const { colors } = useTheme();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.card,
        borderLeftColor: colors.gold,
        borderColor: colors.border,
      },
      style,
    ]}>
      <Text style={[styles.quoteText, { color: colors.textPrimary }]}>"{quote.text}"</Text>
      <Text style={[styles.author, { color: colors.gold }]}>— {quote.author}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.lg,
    padding: 20,
    borderLeftWidth: 3,
    borderWidth: 1,
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  author: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default QuoteCard;
