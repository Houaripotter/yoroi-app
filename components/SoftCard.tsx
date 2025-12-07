import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';

interface SoftCardProps {
  children: ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

export function SoftCard({ children, style, backgroundColor = theme.colors.surface }: SoftCardProps) {
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.sm,
  },
});
