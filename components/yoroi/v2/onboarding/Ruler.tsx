/**
 * Regle a faire glisser, dessinee comme celle de l'ecran Pesee : traits fins, grands traits
 * tous les 10 crans avec leur valeur, curseur indigo au centre, petit retour haptique a chaque cran.
 * La fenetre se recentre toute seule quand la valeur sort de la plage visible (saisie au clavier).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useColors } from './ui';
import { DECIMAL } from '@/lib/i18n/tr';

export function Ruler({
  value,
  onChange,
  step = 0.1,
  span = 30,
  hardMin,
  hardMax,
  tick = 12,
  label,
  onDragStart,
}: {
  value: number;
  onChange: (v: number) => void;
  /** valeur d'un cran */
  step?: number;
  /** demi-largeur de la fenetre, en unites */
  span?: number;
  hardMin: number;
  hardMax: number;
  /** pixels par cran */
  tick?: number;
  label: string;
  onDragStart?: () => void;
}) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const [center, setCenter] = useState(Math.round(value));
  const scrollRef = useRef<ScrollView>(null);
  const lastIdx = useRef<number>(Math.round(value / step));
  const dragging = useRef(false);

  const min = Math.max(hardMin, center - span);
  const max = Math.min(hardMax, center + span);
  const ticks = Math.round((max - min) / step);
  const offsetFor = (v: number) => Math.round((v - min) / step) * tick;

  const path = useMemo(() => {
    let minor = '';
    let major = '';
    for (let i = 0; i <= ticks; i++) {
      const x = i * tick + 1;
      if (i % 10 === 0) major += `M${x} 10v40`;
      else if (i % 5 === 0) minor += `M${x} 16v28`;
      else minor += `M${x} 22v16`;
    }
    return { minor, major };
  }, [ticks, tick]);

  // valeur changee de l'exterieur (clavier, reprise de la sante) : la regle suit
  useEffect(() => {
    const idx = Math.round(value / step);
    if (idx === lastIdx.current && dragging.current) return;
    lastIdx.current = idx;
    if (value < min + step * 10 || value > max - step * 10) {
      const nc = Math.round(value);
      if (nc !== center) {
        setCenter(nc);
        return;
      }
    }
    if (!dragging.current) scrollRef.current?.scrollTo({ x: offsetFor(value), animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // fenetre recentree : on replace le curseur sans animation
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x: offsetFor(value), animated: false }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, width]);

  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = (x: number) => {
    const idx = Math.round(x / tick) + Math.round(min / step);
    const clamped = Math.min(Math.max(idx, Math.round(min / step)), Math.round(max / step));
    if (clamped !== lastIdx.current) {
      lastIdx.current = clamped;
      onChange(Math.round(clamped * step * 10) / 10);
      selectionAsync().catch(() => {});
    }
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (dragging.current) commit(e.nativeEvent.contentOffset.x);
  };
  const stopSoon = (x: number) => {
    commit(x);
    if (endTimer.current) clearTimeout(endTimer.current);
    endTimer.current = setTimeout(() => {
      dragging.current = false;
    }, 450);
  };
  useEffect(() => () => {
    if (endTimer.current) clearTimeout(endTimer.current);
  }, []);

  const labelEvery = 10;
  const labels = Math.floor(ticks / labelEvery) + 1;

  return (
    <View style={{ height: 84 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={tick}
          decelerationRate="fast"
          onScroll={onScroll}
          onScrollBeginDrag={() => {
            dragging.current = true;
            if (endTimer.current) clearTimeout(endTimer.current);
            onDragStart?.();
          }}
          onMomentumScrollBegin={() => {
            if (endTimer.current) clearTimeout(endTimer.current);
            dragging.current = true;
          }}
          onMomentumScrollEnd={(e) => {
            commit(e.nativeEvent.contentOffset.x);
            dragging.current = false;
          }}
          onScrollEndDrag={(e) => stopSoon(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          contentOffset={{ x: offsetFor(value), y: 0 }}
          contentContainerStyle={{ paddingHorizontal: width / 2 - 1 }}
          accessibilityLabel={label}
        >
          <Svg width={ticks * tick + 2} height={84}>
            <Path d={path.minor} stroke={c.textMuted} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
            <Path d={path.major} stroke={c.textSecondary} strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
          <View style={{ position: 'absolute', left: width / 2 - 1, top: 58, flexDirection: 'row' }} pointerEvents="none">
            {Array.from({ length: labels }).map((_, i) => (
              <View key={i} style={{ position: 'absolute', left: i * labelEvery * tick - 21, width: 42, alignItems: 'center' }}>
                <Ink size={12} weight="bold" color={c.textSecondary}>{String(Math.round((min + i * labelEvery * step) * 10) / 10).replace('.', DECIMAL)}</Ink>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}
      <View pointerEvents="none" style={{ position: 'absolute', left: width / 2 - 3, top: 2, width: 6, height: 54, borderRadius: 3, backgroundColor: c.accent }} />
    </View>
  );
}

export default Ruler;
