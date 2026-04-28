// ============================================
// FAKE STATUS BAR
// Overlay style App Store : 09:41 + batterie 100% + signal plein
// Activé uniquement en mode screenshot (créateur)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';

export default function FakeStatusBar() {
  const { useFakeStatusBar, isScreenshotMode } = useScreenshotMode();
  const insets = useSafeAreaInsets();

  if (!isScreenshotMode || !useFakeStatusBar) return null;

  const height = insets.top || (Platform.OS === 'ios' ? 44 : 24);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          height,
          paddingTop: Math.max(insets.top - 20, 4),
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.time}>9:41</Text>
      </View>
      <View style={styles.right}>
        {/* Signal bars */}
        <View style={styles.signalWrap}>
          <View style={[styles.signalBar, { height: 3 }]} />
          <View style={[styles.signalBar, { height: 5 }]} />
          <View style={[styles.signalBar, { height: 7 }]} />
          <View style={[styles.signalBar, { height: 9 }]} />
        </View>
        {/* WiFi */}
        <Text style={styles.wifi}>􀙇</Text>
        {/* Battery */}
        <View style={styles.battery}>
          <View style={styles.batteryFill} />
          <View style={styles.batteryTip} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 6,
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  left: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { color: '#000', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  signalWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  signalBar: { width: 3, backgroundColor: '#000', borderRadius: 1 },
  wifi: { fontSize: 14, color: '#000' },
  battery: {
    width: 26,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    padding: 1,
  },
  batteryFill: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 1,
  },
  batteryTip: {
    position: 'absolute',
    right: -3,
    top: 4,
    width: 2,
    height: 4,
    backgroundColor: '#000',
    borderRadius: 1,
  },
});
