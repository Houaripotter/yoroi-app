/**
 * Apercu de TON nouvel accueil (27 octobre 2026, refonte Pastel), a la place de l'ancienne grille de tuiles :
 * « Bonjour » et ton prenom, ta scene en carte avec ton personnage, la vraie carte Ton poids (CartePoids, paliers et
 * torii) telle qu'elle sera dans quatre semaines a un rythme sain vers ton cap, puis Ta semaine avec tes jours et tes
 * sports. A l'onboarding (Ton plan) avec tes reponses ; dans les vitrines (nouveautes), avec un exemple marque.
 * Rien ne se touche (pointerEvents none). Aucun chiffre invente : le poids suit ta pesee et ton cap, sinon l'exemple.
 */
import React, { useMemo } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE } from '@/lib/i18n/dateLocale';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CartePoids } from '@/components/yoroi/v2/accueil/CartePoids';
import type { DayWeight } from '@/lib/v2/weightStats';
import { addDaysIso, isoOf } from '@/lib/v2/onboarding/plan';
import { rythmeMoyenKg } from '@/lib/v2/pesee/estimation';
import { SemaineCouleurs } from './SemaineCouleurs';
import { useColors } from './ui';
import { traduire } from '@/lib/i18n/tr';

const SEMAINES = 4;

/** Trois points de ton poids vers ton cap, au milieu de la fourchette conseillee (la meme regle que la demonstration) */
function serieProjetee(start: number, target: number | null, sessions: number | null, today: string): DayWeight[] {
  let end = start;
  if (target != null && Math.abs(target - start) >= 0.2) {
    const move = Math.min(Math.abs(target - start), rythmeMoyenKg(start, target, sessions, false) * SEMAINES);
    end = start + Math.sign(target - start) * move;
  }
  const jours = SEMAINES * 7;
  const out: DayWeight[] = [];
  for (let i = 0; i <= jours; i += jours / 2) {
    const v = Math.round((start + ((end - start) * i) / jours) * 10) / 10;
    out.push({ date: addDaysIso(today, i), value: v, trend: v, hasComposition: false });
  }
  return out;
}

export function ApercuAccueil({ name, scene, perso, start, target, sessions, days, sports, pastille }: {
  name: string | null;
  scene: ImageSourcePropType;
  perso: ImageSourcePropType | null;
  start: number | null;
  target: number | null;
  sessions: number | null;
  days: number[];
  sports: string[];
  /** « Dans 4 semaines » (tes chiffres) ou « Exemple » */
  pastille: string;
}) {
  const c = useColors();
  const aujourdhui = isoOf(new Date());
  const ref = useMemo(() => addDaysIso(aujourdhui, SEMAINES * 7), [aujourdhui]);
  const depart = start ?? 82;
  const cap = start != null ? target : 77;
  const series = useMemo(() => serieProjetee(depart, cap, sessions, aujourdhui), [depart, cap, sessions, aujourdhui]);
  const prenom = (name ?? '').trim().split(/\s+/)[0];
  const date = format(new Date(`${ref}T12:00:00`), 'EEEE d MMMM', { locale: DATE_FNS_LOCALE });
  return (
    <View pointerEvents="none" style={{ borderRadius: 28, backgroundColor: c.background, borderWidth: 1, borderColor: c.border, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Ink size={11.5} weight="bold" color={c.textMuted} numberOfLines={1}>{date.charAt(0).toUpperCase() + date.slice(1)}</Ink>
          <Ink size={20} weight="black" tight color={c.ink} numberOfLines={1}>{prenom ? traduire('Bonjour {0}', prenom) : traduire('Bonjour')}</Ink>
        </View>
        <View style={{ backgroundColor: '#DCE3FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Ink size={11} weight="black" color="#23358F">{pastille}</Ink>
        </View>
      </View>
      <View style={{ height: 118, borderRadius: 20, overflow: 'hidden' }}>
        <Image source={scene} resizeMode="cover" style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
        {perso ? <Image source={perso} resizeMode="contain" style={{ position: 'absolute', right: 6, bottom: 0, width: 82, height: 110 }} accessibilityIgnoresInvertColors /> : null}
      </View>
      <CartePoids series={series} targetWeight={cap} startWeight={depart} today={ref} />
      <View style={{ borderRadius: 22, backgroundColor: c.surface, paddingVertical: 12, paddingHorizontal: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Ink size={11} weight="black" color="#8A3F78" style={{ letterSpacing: 1.4 }}>{traduire('Ta semaine').toUpperCase()}</Ink>
          {days.length ? <Ink size={12.5} weight="black" color="#23358F">{days.length > 1 ? traduire('{0} séances', days.length) : traduire('{0} séance', days.length)}</Ink> : null}
        </View>
        <SemaineCouleurs days={days} sports={sports} size={30} legende={false} />
      </View>
    </View>
  );
}

export default ApercuAccueil;
