// ============================================
// YOROI - PEER SYNC BANNER
// ============================================
// Indicateur discret de synchronisation iPhone <-> iPad
// Apparait seulement quand un appareil est connecté
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Wifi, Check, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { onSyncStatusChange, SyncStatus } from '@/lib/peerSyncService';

export const PeerSyncBanner: React.FC = () => {
  const { colors } = useTheme();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connectedPeers: [],
    isSyncing: false,
    lastSyncTs: null,
    lastSyncDevice: null,
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation de rotation pour l'icône de sync
  const rotateAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const unsub = onSyncStatusChange((newStatus) => {
      setSyncStatus(prev => {
        // Détecter fin de sync -> afficher "OK" 3 secondes
        if (prev.isSyncing && !newStatus.isSyncing && newStatus.lastSyncTs) {
          setShowSuccess(true);
          if (successTimer.current) clearTimeout(successTimer.current);
          successTimer.current = setTimeout(() => setShowSuccess(false), 3000);
        }
        return newStatus;
      });
    });

    return () => {
      unsub();
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  // Animation de rotation quand sync en cours
  useEffect(() => {
    if (syncStatus.isSyncing) {
      rotateAnimation.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.current.start();
    } else {
      rotateAnimation.current?.stop();
      rotateAnim.setValue(0);
    }
  }, [syncStatus.isSyncing]);

  const isVisible = syncStatus.connectedPeers.length > 0 || showSuccess;

  // Fade in/out
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  if (!isVisible) return null;

  const peerName =
    syncStatus.connectedPeers[0] ||
    syncStatus.lastSyncDevice ||
    'Appareil';

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: fadeAnim,
          backgroundColor: colors.card,
          borderColor: showSuccess
            ? '#34C75920'
            : `${colors.accent}20`,
        },
      ]}
    >
      {showSuccess && !syncStatus.isSyncing ? (
        <>
          <Check size={13} color="#34C759" strokeWidth={2.5} />
          <Text style={[styles.text, { color: '#34C759' }]}>
            Sync avec {peerName}
          </Text>
        </>
      ) : syncStatus.isSyncing ? (
        <>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw size={13} color={colors.accent} strokeWidth={2.5} />
          </Animated.View>
          <Text style={[styles.text, { color: colors.accent }]}>
            Sync en cours...
          </Text>
        </>
      ) : (
        <>
          <Wifi size={13} color={colors.textMuted} strokeWidth={2} />
          <Text style={[styles.text, { color: colors.textMuted }]}>
            {peerName} connecté
          </Text>
        </>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

export default PeerSyncBanner;
