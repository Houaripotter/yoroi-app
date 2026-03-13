// ============================================
// YOROI - WATCH STATUS BANNER
// ============================================
// Indicateur discret de connexion Apple Watch / Wear OS
// Apparaît seulement quand une montre est disponible ou en cours de sync
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Check, RefreshCw } from 'lucide-react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { useWatch } from '@/lib/WatchConnectivityProvider';

// Icône montre minimaliste
const WatchIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="7" width="14" height="10" rx="3" stroke={color} strokeWidth="1.8" />
    <Path d="M9 7V5.5C9 4.67 9.67 4 10.5 4h3C14.33 4 15 4.67 15 5.5V7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M9 17v1.5C9 19.33 9.67 20 10.5 20h3c.83 0 1.5-.67 1.5-1.5V17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M12 10v2l1.2 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const WatchStatusBanner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { isWatchAvailable, isWatchReachable, isSyncing, lastSyncDate } = useWatch();

  const [showSuccess, setShowSuccess] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateLoop = useRef<Animated.CompositeAnimation | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasSyncing = useRef(false);

  // Détecter fin de sync → afficher "OK" 3s
  useEffect(() => {
    if (wasSyncing.current && !isSyncing && lastSyncDate) {
      setShowSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setShowSuccess(false), 3000);
    }
    wasSyncing.current = isSyncing;
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [isSyncing, lastSyncDate]);

  // Animation rotation pendant sync
  useEffect(() => {
    if (isSyncing) {
      rotateLoop.current = Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 900, useNativeDriver: true })
      );
      rotateLoop.current.start();
    } else {
      rotateLoop.current?.stop();
      rotateAnim.setValue(0);
    }
  }, [isSyncing]);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const watchName = Platform.OS === 'android' ? 'Wear OS' : 'Apple Watch';

  // États
  const isOk       = showSuccess && !isSyncing;
  const isOnline    = isWatchReachable && !isSyncing && !showSuccess;
  const isPaired    = isWatchAvailable && !isWatchReachable && !isSyncing && !showSuccess;
  const isOffline   = !isWatchAvailable && !isSyncing && !showSuccess;

  // Couleurs selon état
  const dotColor    = isOk ? '#34C759' : isSyncing ? colors.accent : isOnline ? '#34C759' : isPaired ? '#F59E0B' : '#6B7280';
  const iconColor   = isOk ? '#34C759' : isSyncing ? colors.accent : isOnline ? '#34C759' : isPaired ? '#F59E0B' : (isDark ? '#9CA3AF' : '#6B7280');
  // Fond opaque pour contraste garanti quelle que soit la couleur de fond de l'écran
  const bgColor     = colors.backgroundCard;
  const borderColor = `${dotColor}80`;

  const label = isOk      ? 'Watch synchronisée'
              : isSyncing ? 'Sync Watch...'
              : isOnline  ? `${watchName} connectée`
              : isPaired  ? `${watchName} jumelée`
              :             `${watchName} non connectée`;

  return (
    <View style={[styles.banner, { backgroundColor: bgColor, borderColor }]}>
      {/* Point de statut animé */}
      <View style={[styles.dot, { backgroundColor: dotColor }]} />

      {isSyncing ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <RefreshCw size={11} color={iconColor} strokeWidth={2.5} />
        </Animated.View>
      ) : isOk ? (
        <Check size={11} color={iconColor} strokeWidth={2.5} />
      ) : (
        <WatchIcon size={12} color={iconColor} />
      )}

      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

export default WatchStatusBanner;
