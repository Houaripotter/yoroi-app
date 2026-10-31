/**
 * 31 octobre 2026 (retour de Houari en seance) : les series prevues sous la carte de saisie, en petit, toutes
 * visibles, et un retour net a chaque « Ajouter une serie ».
 * - SeriePrevue : une ligne compacte (numero, « Serie 4 », charge et repetitions prevues si on les connait).
 *   Une serie qui vient d'etre ajoutee arrive avec une courte animation et un liseré de couleur.
 * - PastilleAjout : petite pastille « Serie 5 ajoutee » qui apparait, reste un instant, puis s'efface.
 *   Chaque nouvel ajout (nouvelle `cle`) la relance, meme sur un double appui.
 * Les textes arrivent deja traduits de l'ecran.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from './Icon';
import { ton } from './pastel';

export const DUREE_PASTILLE_MS = 1800;

type SerieProps = {
  numero: number;
  titre: string;
  /** charge et repetitions prevues, vide si on ne les connait pas */
  detail?: string;
  nouvelle?: boolean;
  accessibilityLabel: string;
  onLongPress?: () => void;
};

export function SeriePrevue({ numero, titre, detail, nouvelle = false, accessibilityLabel, onLongPress }: SerieProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const entree = useRef(new Animated.Value(nouvelle ? 0 : 1)).current;

  useEffect(() => {
    if (!nouvelle) return;
    entree.setValue(0);
    Animated.spring(entree, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }).start();
  }, [nouvelle, entree]);

  return (
    <Animated.View
      style={{
        opacity: entree,
        transform: [
          { translateY: entree.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
          { scale: entree.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }}
    >
      <Pressable
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 40,
          paddingHorizontal: 10,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: nouvelle ? c.accent : 'transparent',
          backgroundColor: pressed ? c.fillSubtle : c.fillSoft,
        })}
      >
        <View style={{ minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={12} weight="black" color={c.textSecondary}>{String(numero)}</Ink>
        </View>
        <Ink size={14} weight="bold" color={c.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{titre}</Ink>
        {detail ? <Ink size={14} weight="extraBold" color={c.textMuted} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{detail}</Ink> : null}
      </Pressable>
    </Animated.View>
  );
}

export function PastilleAjout({ cle, texte }: { cle: string; texte: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const menthe = ton('menthe');

  useEffect(() => {
    v.setValue(0);
    const anim = Animated.sequence([
      Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
      Animated.delay(DUREE_PASTILLE_MS - 600),
      Animated.timing(v, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [cle, v]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      style={{
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: menthe.fond,
        opacity: v,
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
      }}
    >
      <Icon name="check" size={14} color={menthe.encre} strokeWidth={3} />
      <Ink size={14} weight="extraBold" color={menthe.encre}>{texte}</Ink>
    </Animated.View>
  );
}
