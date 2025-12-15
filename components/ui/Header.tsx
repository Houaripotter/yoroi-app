import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showClose?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  rightElement?: React.ReactNode;
  transparent?: boolean;
}

export function Header({
  title,
  showBack = false,
  showClose = false,
  onBack,
  onClose,
  rightElement,
  transparent = false,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: transparent ? 'transparent' : colors.background,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left Button */}
        <View style={styles.leftContainer}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.button, { backgroundColor: colors.card }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          {showClose && (
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, { backgroundColor: colors.card }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <X size={22} color={colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          {title && (
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        {/* Right Element */}
        <View style={styles.rightContainer}>
          {rightElement}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 44,
  },
  leftContainer: {
    width: 44,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rightContainer: {
    width: 44,
    alignItems: 'flex-end',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Header;
