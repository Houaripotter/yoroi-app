// ============================================
// YOROI, choix d'une zone parmi plusieurs (refonte v2)
// ============================================
// Permet de choisir entre plusieurs zones qui se chevauchent. API inchangee.

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Animated, Easing, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { traduire } from '@/lib/i18n/tr';

export interface Zone {
  id: string;
  name: string;
}

interface ZoneSelectionModalProps {
  visible: boolean;
  zones: Zone[];
  onSelect: (zone: Zone) => void;
  onClose: () => void;
}

// Position du point rouge sur la petite silhouette (repere 24 x 44)
const zonePoint = (zoneName: string): [number, number] => {
  const n = zoneName.toLowerCase();
  if (n.includes('main') || n.includes('doigt') || n.includes('pouce') || n.includes('poignet')) return [3.5, 25];
  if (n.includes('pied') || n.includes('orteil') || n.includes('cheville')) return [9, 41];
  if (n.includes('tête') || n.includes('visage') || n.includes('front')) return [12, 4.5];
  if (n.includes('cou') || n.includes('gorge')) return [12, 10];
  if (n.includes('épaule')) return [6.5, 12.5];
  if (n.includes('coude') || n.includes('bras')) return [4.8, 18.5];
  if (n.includes('pec') || n.includes('poitrine') || n.includes('sternum') || n.includes('thorax') || n.includes('coeur')) return [12, 15];
  if (n.includes('côte')) return [15, 18];
  if (n.includes('hanche')) return [8.5, 25];
  if (n.includes('genou')) return [9, 33];
  if (n.includes('jambe') || n.includes('cuisse') || n.includes('mollet')) return [9, 29.5];
  if (n.includes('dos') || n.includes('lombaire') || n.includes('abdos') || n.includes('ventre')) return [12, 21];
  return [12, 20];
};

const BODY =
  'M12 1.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4zM8 10h8l3.5 2.5 1.5 9-1.8.5-1.7-7.5V24l-1 18h-2.6l-.9-14h-1l-.9 14H8.5l-1-18V15l-1.7 7.5-1.8-.5 1.5-9z';

function ZoneGlyph({ name }: { name: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [x, y] = zonePoint(name);
  return (
    <Svg width={26} height={46} viewBox="0 0 24 44">
      <Path d={BODY} fill={c.fillSubtle} />
      <Circle cx={x} cy={y} r={3.4} fill={c.accent} opacity={0.22} />
      <Circle cx={x} cy={y} r={2} fill={c.accent} />
    </Svg>
  );
}

export const ZoneSelectionModal: React.FC<ZoneSelectionModalProps> = ({ visible, zones, onSelect, onClose }) => {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 280, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 16, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.96);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    try {
      impactAsync(ImpactFeedbackStyle.Light);
    } catch {
      // sans importance
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 240, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSelect = (zone: Zone) => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);
    } catch {
      // sans importance
    }
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 90, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start(() => {
      onSelect(zone);
      onClose();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.overlayTouchable} onPress={handleClose} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} />

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: c.background, paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: c.border }]} />

          <View style={styles.header}>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={26} weight="black" tight>
                Quelle zone ?
              </Ink>
              <Ink size={14} weight="medium" color={c.textSecondary}>
                {traduire("Plusieurs zones se touchent ici. Choisis la bonne.")}</Ink>
            </View>
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel={traduire("Fermer")}
              hitSlop={6}
              style={[styles.closeButton, { backgroundColor: c.surface, borderColor: c.divider }]}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M6 6l12 12M18 6L6 18" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {zones.map((zone) => (
              <Pressable
                key={zone.id}
                onPress={() => handleSelect(zone)}
                accessibilityRole="button"
                accessibilityLabel={zone.name}
                style={({ pressed }) => [
                  styles.zoneItem,
                  { backgroundColor: c.surface, borderColor: pressed ? c.accent : c.divider, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <View style={[styles.glyph, { backgroundColor: c.background }]}>
                  <ZoneGlyph name={zone.name} />
                </View>
                <Ink size={17} weight="extraBold" style={{ flex: 1 }}>
                  {zone.name}
                </Ink>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 5l7 7-7 7" stroke={c.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={handleClose} accessibilityRole="button" style={[styles.cancelButton, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Ink size={16} weight="bold" color={c.textSecondary}>
              {traduire("Annuler")}</Ink>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(29,32,41,0.45)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '75%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 340,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
  },
  glyph: {
    width: 50,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
