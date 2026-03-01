// ============================================
// CONTEXTUAL TIP - Bulle non-bloquante
// Apparait 800ms apres le montage si le tip n'a pas ete vu
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  shouldShowTip,
  dismissTip,
  CONTEXTUAL_TIPS,
  TipId,
} from '@/lib/contextualTipsService';
import {
  Home,
  BarChart3,
  Calendar,
  Plus,
  Menu,
  BookOpen,
  Zap,
  User,
  Check,
} from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  home: Home,
  'bar-chart': BarChart3,
  calendar: Calendar,
  plus: Plus,
  menu: Menu,
  book: BookOpen,
  zap: Zap,
  user: User,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ContextualTipProps {
  tipId: TipId;
  bottomOffset?: number;
}

export function ContextualTip({ tipId, bottomOffset = 100 }: ContextualTipProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const tipData = CONTEXTUAL_TIPS[tipId];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const check = async () => {
      const show = await shouldShowTip(tipId);
      if (show) {
        timer = setTimeout(() => {
          setVisible(true);
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        }, 800);
      }
    };
    check();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleDismiss = async () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      await dismissTip(tipId);
      setVisible(false);
    });
  };

  if (!visible || !tipData) return null;

  const IconComponent = ICON_MAP[tipData.icon];

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: colors.borderLight,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Barre accent a gauche */}
        <View style={[styles.accentBar, { backgroundColor: tipData.color }]} />

        <View style={styles.content}>
          {/* Header : icone + titre */}
          <View style={styles.header}>
            {IconComponent && (
              <View style={[styles.iconContainer, { backgroundColor: tipData.color + '20' }]}>
                <IconComponent size={18} color={tipData.color} />
              </View>
            )}
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {tipData.title}
            </Text>
          </View>

          {/* 3 bullets */}
          <View style={styles.bullets}>
            {tipData.lines.map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: tipData.color }]} />
                <Text style={[styles.bulletText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {line}
                </Text>
              </View>
            ))}
          </View>

          {/* Bouton OK */}
          <TouchableOpacity
            style={[styles.okButton, { backgroundColor: tipData.color }]}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Check size={14} color="#FFFFFF" />
            <Text style={styles.okText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  card: {
    width: SCREEN_WIDTH - 32,
    maxWidth: 400,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  accentBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  bullets: {
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  okButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  okText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
