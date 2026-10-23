/**
 * Vague 47 : « Aujourd'hui » dans le Dojo, la raison de revenir chaque jour.
 * Ta serie de jours (une flamme, les 7 jours de la semaine) et ton coffre du jour.
 * Le coffre s'ouvre une fois le geste du jour fait (seance, pesee, mensurations, photo ou eau notee),
 * et seulement ici : il rapporte plus quand la serie est longue, grand coffre tous les 7 jours.
 * Un verre d'eau suffit : le bouton l'ajoute directement (meme source que l'Accueil).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Pastille } from '@/components/yoroi/v2/dojo/Kozane';
import { tap } from '@/components/yoroi/v2/dojo/parts';
import type { ArmureState } from '@/lib/v2/armure';
import { OuvertureCoffre, imageCoffre, type ResultatCoffre } from '@/components/yoroi/v2/dojo/OuvertureCoffre';
import { rappelCoffreActif, setRappelCoffre } from '@/lib/v2/dojo/rappelCoffre';

const NB = ' ';
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Flamme de la serie : orange vif quand la serie vit, grise sinon */
export function Flamme({ size = 40, vive }: { size?: number; vive: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="fl" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={vive ? '#FFB547' : '#C9C5BB'} />
          <Stop offset="1" stopColor={vive ? '#E8551E' : '#A9A59B'} />
        </LinearGradient>
      </Defs>
      <Path d="M20 3c2 6 9 9 9 19a9 9 0 0 1-18 0c0-5 3-7 4-11 1 3 2 4 4 5-1-5 0-9 1-13z" fill="url(#fl)" />
      <Path d="M20 21c1.6 2.6 4.5 3.6 4.5 7.6a4.5 4.5 0 0 1-9 0c0-2.4 1.6-3.6 2.4-5.6.6 1.2 1.2 1.8 2.1 2.2z" fill={vive ? '#FFE3A3' : '#E4E1D9'} />
    </Svg>
  );
}

type Props = {
  serie: NonNullable<ArmureState['serie']>;
  coffre: NonNullable<ArmureState['coffre']>;
  /** ouvre le coffre ; renvoie l'XP gagnee */
  onOuvrir: () => Promise<ResultatCoffre | null>;
  /** texte sous le gain dans l'ouverture, par exemple « encore 290 XP avant Expert » */
  suite?: string;
  /** ajoute un verre d'eau (le geste le plus simple) */
  onVerre: () => Promise<void>;
  /** 18 octobre : mettre la scene offerte par le grand coffre */
  onCadeau?: (id: string) => void;
  /** 18 octobre : la prochaine scene a gagner avec la serie (« Encore 4 jours pour la scène Rue de Tokyo ») */
  palier?: string;
};

export function Aujourdhui({ serie, coffre, onOuvrir, onVerre, suite, onCadeau, palier }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [busy, setBusy] = useState(false);
  const [gain, setGain] = useState<number | null>(null);
  const pop = useRef(new Animated.Value(0)).current;
  const secoue = useRef(new Animated.Value(0)).current;
  const vive = serie.jours > 0;
  // rappel du soir (une notification douce a 19 h, seulement si les notifications sont deja autorisees)
  const [rappel, setRappel] = useState(true);
  useEffect(() => {
    void rappelCoffreActif().then(setRappel);
  }, []);
  const basculerRappel = () => {
    tap();
    const v = !rappel;
    setRappel(v);
    void setRappelCoffre(v, { serie, coffre } as ArmureState);
  };

  // le coffre pret bouge un peu pour attirer l'oeil
  useEffect(() => {
    if (coffre.etat !== 'pret') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(secoue, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(secoue, { toValue: -1, duration: 160, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(secoue, { toValue: 0, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1800),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [coffre.etat, secoue]);

  // vague 47 : l'ouverture se fait en plein ecran (OuvertureCoffre)
  const [ouverture, setOuverture] = useState(false);
  const ouvrir = () => {
    tap();
    setOuverture(true);
  };
  const ouvrirVraiment = async () => {
    const r = await onOuvrir().catch(() => null);
    if (r) {
      setGain(r.xp);
      pop.setValue(1);
    }
    return r;
  };

  const verre = async () => {
    if (busy) return;
    setBusy(true);
    tap();
    await onVerre().catch(() => undefined);
    setBusy(false);
  };

  const titreSerie = serie.jours > 1 ? 'jours d’affilée' : 'jour d’affilée';
  const sousSerie = serie.aSauver
    ? 'Fais un geste aujourd’hui pour garder ta série.'
    : serie.jours === 0
      ? 'Fais un geste aujourd’hui pour lancer ta série.'
      : 'Ta série continue. Reviens demain.';

  const tourne = secoue.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });
  const grandTexte = coffre.grandDans === 0 ? 'C’est le grand coffre aujourd’hui' : coffre.grandDans === 1 ? 'Grand coffre demain' : `Grand coffre dans ${coffre.grandDans} jours`;

  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 14 }}>
      {/* ta serie */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={`${serie.jours} ${titreSerie}. Ton record : ${serie.record}. ${sousSerie}`}>
        <Flamme size={44} vive={vive} />
        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Ink size={32} weight="black" tight color={vive ? '#E8551E' : c.ink}>{String(serie.jours)}</Ink>
            <Ink size={16} weight="extraBold" style={{ flexShrink: 1 }}>{titreSerie}</Ink>
          </View>
          <Ink size={13} color={serie.aSauver ? '#C2410C' : c.textSecondary}>{sousSerie}</Ink>
        </View>
        {serie.record > 0 ? (
          <View style={{ alignItems: 'center' }}>
            <Ink size={16} weight="black">{String(serie.record)}</Ink>
            <Ink size={11} weight="bold" color={c.textMuted}>record</Ink>
          </View>
        ) : null}
      </View>

      {/* ton coffre du jour */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: coffre.etat === 'pret' ? c.goldTint : c.fillSoft, borderRadius: 18, padding: 12 }}>
        <Animated.View style={{ transform: [{ rotate: tourne }] }}>
          <Image source={imageCoffre(coffre.grand, coffre.etat === 'ouvert')} style={{ width: 78, height: 78 }} resizeMode="contain" />
        </Animated.View>
        <View style={{ flex: 1, gap: 4 }}>
          <Ink size={15} weight="black">
            {coffre.etat === 'ouvert' ? (coffre.grand ? 'Grand coffre ouvert' : 'Coffre ouvert') : coffre.grand ? 'Ton grand coffre' : 'Ton coffre du jour'}
          </Ink>
          {coffre.etat === 'verrouille' ? (
            <Ink size={13} color={c.textSecondary}>{'Une séance, une pesée ou un verre d’eau pour l’ouvrir.'}</Ink>
          ) : coffre.etat === 'pret' ? (
            <Ink size={13} color={c.textSecondary}>{'Ton geste est fait. Ouvre-le pour découvrir ta récompense.'}</Ink>
          ) : (
            <Ink size={13} color={c.textSecondary}>{`+${coffre.xp}${NB}XP gagnés. Le prochain s’ouvre demain.`}</Ink>
          )}
          <Ink size={12} weight="bold" color={c.goldDeep}>{coffre.etat === 'ouvert' && coffre.grandDans === 7 ? 'Grand coffre dans 7 jours' : grandTexte}</Ink>
        </View>
        {gain != null && coffre.etat === 'ouvert' ? (
          <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }], opacity: pop }}>
            <Ink size={22} weight="black" color={c.goldDeep}>{`+${gain}`}</Ink>
          </Animated.View>
        ) : null}
      </View>

      {coffre.etat === 'pret' ? (
        <Pressable
          onPress={ouvrir}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir ton coffre"
          style={({ pressed }) => ({ minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.goldDeep : c.gold })}
        >
          <Ink size={16} weight="black" color="#1D2029">Ouvrir mon coffre</Ink>
        </Pressable>
      ) : coffre.etat === 'verrouille' ? (
        <Pressable
          onPress={verre}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Noter un verre d’eau, 25 centilitres"
          style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentTint : c.surface, borderWidth: 1.5, borderColor: c.accent })}
        >
          <Ink size={15} weight="extraBold" color={c.accent}>Noter un verre d’eau</Ink>
        </Pressable>
      ) : null}
      {/* les 7 jours de la semaine */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {serie.semaine.map((j, i) => (
          <View key={j.date} style={{ alignItems: 'center', gap: 4 }}>
            <Pastille
              etat={j.etat === 'fait' ? 'fait' : j.etat === 'aujourdhui' ? 'partiel' : 'vide'}
              signe={j.etat === 'repos' ? 'repos' : undefined}
              taille={30}
            />
            <Ink size={11} weight={j.etat === 'aujourdhui' ? 'black' : 'bold'} color={j.etat === 'aujourdhui' ? c.accent : c.textMuted}>{JOURS[i]}</Ink>
          </View>
        ))}
      </View>
      {palier ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: c.goldTint }}>
          <Flamme size={18} vive />
          <Ink size={13} weight="bold" color={c.ink} style={{ flex: 1 }}>{palier}</Ink>
        </View>
      ) : null}
      <Ink size={12} color={c.textMuted}>Un jour sans geste par semaine est pardonné, ta série ne casse pas.</Ink>

      <Pressable onPress={basculerRappel} accessibilityRole="switch" accessibilityState={{ checked: rappel }} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 }}>
        <View style={{ width: 34, height: 20, borderRadius: 10, padding: 2, backgroundColor: rappel ? c.accent : c.fillSoft, alignItems: rappel ? 'flex-end' : 'flex-start' }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF' }} />
        </View>
        <Ink size={12} color={c.textSecondary} style={{ flex: 1 }}>{rappel ? 'Petit rappel à 19 h si ton coffre t’attend encore' : 'Rappel du soir coupé'}</Ink>
      </Pressable>
      <OuvertureCoffre visible={ouverture} grand={coffre.grand} serie={serie.jours} ouvrir={ouvrirVraiment} suite={suite} onCadeau={onCadeau} onClose={() => setOuverture(false)} />
    </View>
  );
}
