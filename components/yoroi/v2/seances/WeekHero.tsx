/**
 * La semaine en un coup d'oeil (onglet Seances) : seances et jours entraines, pastilles du lundi au dimanche,
 * duree, volume, charge et jours, chacun compare a la semaine passee au meme jour.
 * Appui sur la charge : ecran Charge d'entrainement.
 * 27 octobre 2026 (maquette Pastel-Seances) : la carte blanche garde le nombre de seances, le badge Objectif tenu a
 * droite et les 7 jours en carres ; les quatre chiffres sortent dessous en quatre cartes pastel (duree creme, volume
 * bleu, charge peche, jours menthe). Avant : _archive_ancien_design_2026-10-09/refonte_phase2_2026-10-27.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { PeriodStats, WeekCompare } from '@/lib/v2/seances/weekCompare';
import { formatPoints, fr1 } from '@/lib/v2/seances/weekCompare';
import { tonnageParts } from '@/lib/v2/trainingWeek';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { WeekPlates } from './WeekPlates';
import type { DayPlate } from './WeekPlates';
import { Icon } from './Icon';
import { tap } from './ui';
import { P, paletteSombre } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const NB = ' ';

function fmtMin(min: number): string {
  const m = Math.round(Math.abs(min));
  if (m < 60) return `${m}${NB}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}${NB}h${NB}${String(r).padStart(2, '0')}` : `${h}${NB}h`;
}

function fmtKg(kg: number, unite: UnitePoids = 'kg'): string {
  // format unique du tonnage (lib/v2/trainingWeek), dans l'unite du reglage (18 octobre 2026)
  const p = tonnageParts(Math.abs(kg), unite);
  return `${p.value}${NB}${p.unit}`;
}

type Volume = { label: string; value: string; delta: number; fmt: (n: number) => string };

/** Volume adapte a ta pratique : tonnage en musculation, sinon rounds, sinon distance, sinon series */
function volumeOf(cur: PeriodStats, prev: PeriodStats, unite: UnitePoids = 'kg'): Volume {
  if (cur.tonnageKg > 0 || prev.tonnageKg > 0) return { label: 'tonnage', value: fmtKg(cur.tonnageKg, unite), delta: cur.tonnageKg - prev.tonnageKg, fmt: (n) => fmtKg(n, unite) };
  if (cur.rounds > 0 || prev.rounds > 0) return { label: 'rounds', value: String(cur.rounds), delta: cur.rounds - prev.rounds, fmt: (n) => String(Math.abs(Math.round(n))) };
  if (cur.distanceKm > 0 || prev.distanceKm > 0) return { label: 'distance', value: `${fr1(cur.distanceKm)}${NB}km`, delta: cur.distanceKm - prev.distanceKm, fmt: (n) => `${fr1(Math.abs(n))}${NB}km` };
  return { label: traduire('séries'), value: String(cur.sets), delta: cur.sets - prev.sets, fmt: (n) => String(Math.abs(Math.round(n))) };
}

function Trend({ delta, text, hasPrev, couleur }: { delta: number; text: string; hasPrev: boolean; couleur?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (!hasPrev && delta <= 0) return <Ink size={12} weight="extraBold" color={couleur ?? c.textMuted} numberOfLines={1}>{traduire("rien la semaine passée")}</Ink>;
  if (Math.abs(delta) < 0.5) return <Ink size={12} weight="extraBold" color={couleur ?? c.textMuted} numberOfLines={1}>{traduire("comme la semaine passée")}</Ink>;
  const up = delta > 0;
  const color = couleur ?? (up ? c.successText : c.textSecondary);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Svg width={12} height={12} viewBox="0 0 24 24">
        <Path d={up ? 'M12 19V5M6 11l6-6 6 6' : 'M12 5v14M6 13l6 6 6-6'} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Ink size={12} weight="extraBold" color={color} numberOfLines={1} style={{ flexShrink: 1 }}>{text}</Ink>
    </View>
  );
}

/** Les quatre teintes pastel des chiffres de la semaine (maquette), et leur version sombre */
type TeinteTuile = 'creme' | 'bleu' | 'peche' | 'menthe';
const TEINTES_TUILE: Record<TeinteTuile, { clair: [string, string]; sombre: [string, string] }> = {
  creme: { clair: ['#FFF1C7', '#7A5200'], sombre: ['#2F2A1C', '#E3C47B'] },
  bleu: { clair: ['#DCE9FF', '#1F4FA8'], sombre: ['#212B42', '#8FA8DE'] },
  peche: { clair: ['#FFE1D6', '#8A3A18'], sombre: ['#3A2622', '#F0A58C'] },
  menthe: { clair: ['#D7F5E6', '#1C6B45'], sombre: ['#1F2B24', '#93C9A8'] },
};
export function couleursTuile(t: TeinteTuile): { fond: string; texte: string } {
  const [fond, texte] = TEINTES_TUILE[t][paletteSombre() ? 'sombre' : 'clair'];
  return { fond, texte };
}

function Tile({ label, value, children, onPress, a11y, teinte }: { label: string; value: string; children: React.ReactNode; onPress?: () => void; a11y?: string; teinte: TeinteTuile }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = couleursTuile(teinte);
  const body = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <Ink size={12.5} weight="extraBold" color={t.texte} numberOfLines={1} style={{ flexShrink: 1 }}>{label.charAt(0).toUpperCase() + label.slice(1)}</Ink>
        {onPress ? <Icon name="chevron" size={14} color={t.texte} strokeWidth={2.6} /> : null}
      </View>
      <Ink size={25} weight="black" tight color={c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ letterSpacing: -0.5 }}>{value}</Ink>
      {children}
    </>
  );
  const style = { flexBasis: '47%' as const, flexGrow: 1, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 22, backgroundColor: t.fond, gap: 2 };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={a11y ?? label} style={({ pressed }) => [style, pressed ? { opacity: 0.85 } : null]}>
      {body}
    </Pressable>
  );
}

export function WeekHero({
  week,
  plates,
  weeklyGoal,
  onOpenCharge,
  onChooseGoal,
}: {
  week: WeekCompare;
  plates: DayPlate[];
  /** 0 : pas d'objectif choisi, seul le nombre de seances s'affiche */
  weeklyGoal: number;
  /** 27 octobre 2026 : l'illustration du sport n'est plus dans la carte (maquette), props gardees pour les appels */
  art?: ImageSourcePropType | null;
  tint?: string;
  onOpenCharge: () => void;
  onChooseGoal?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const cur = week.current;
  const prev = week.previousSoFar;
  const hasPrev = prev.sessions > 0;
  const unite = useUnitePoids();
  const vol = volumeOf(cur, prev, unite);
  const loadPct = prev.load > 0 ? Math.round(((cur.load - prev.load) / prev.load) * 100) : 0;
  const goalReached = weeklyGoal > 0 && cur.sessions >= weeklyGoal;
  const full = week.previousFull;

  return (
    <View style={{ gap: 12 }}>
    <View style={{ borderRadius: 26, backgroundColor: P.white, padding: 16, gap: 14, shadowColor: '#1D2033', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
      <View style={{ gap: 4 }}>
        <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire("Cette semaine, {0}", week.range)}</Ink>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Ink size={40} weight="black" tight style={{ lineHeight: 44, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {String(cur.sessions)}
            <Ink size={16} weight="extraBold" color={c.ink}>{traduirePluriel(cur.sessions, cur.sessions > 1, " séance{0}", " séances{0}", weeklyGoal > 0 ? ` sur ${weeklyGoal}` : '')}</Ink>
          </Ink>
          {goalReached ? (
            <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: couleursTuile('menthe').fond }}>
              <Ink size={12.5} weight="black" color={couleursTuile('menthe').texte}>{traduire("Objectif tenu")}</Ink>
            </View>
          ) : null}
        </View>
        {goalReached ? null : weeklyGoal > 0 ? (
          <Ink size={13} color={c.textSecondary}>
            {cur.sessions === 0 ? traduire('ta semaine commence ici') : traduire("encore {0} pour ton objectif", weeklyGoal - cur.sessions)}
          </Ink>
        ) : (
          <View style={{ gap: 2 }}>
            {cur.sessions === 0 ? <Ink size={13} color={c.textSecondary}>{traduire("ta semaine commence ici")}</Ink> : null}
            {onChooseGoal ? (
              <Pressable onPress={onChooseGoal} accessibilityRole="button" accessibilityLabel={traduire("Choisir un objectif de séances")} hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
                <Ink size={13} weight="extraBold" color={c.accentText}>{traduire("Choisir un objectif, si tu veux")}</Ink>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <WeekPlates plates={plates} />
    </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Tile teinte="creme" label={traduire("durée")} value={cur.minutes ? fmtMin(cur.minutes) : `0${NB}min`}>
          <Trend couleur={couleursTuile('creme').texte} delta={cur.minutes - prev.minutes} text={fmtMin(cur.minutes - prev.minutes)} hasPrev={hasPrev} />
        </Tile>
        <Tile teinte="bleu" label={traduire(vol.label)} value={vol.value}>
          <Trend couleur={couleursTuile('bleu').texte} delta={vol.delta} text={vol.fmt(vol.delta)} hasPrev={hasPrev} />
        </Tile>
        <Tile teinte="peche" label="charge" value={`${formatPoints(cur.load)}${NB}pts`} onPress={onOpenCharge} a11y={traduire("Ta charge d’entraînement, voir le détail")}>
          <Trend couleur={couleursTuile('peche').texte} delta={prev.load > 0 ? loadPct : cur.load} text={prev.load > 0 ? `${Math.abs(loadPct)}${NB}%` : `${formatPoints(cur.load)}${NB}pts`} hasPrev={hasPrev} />
        </Tile>
        <Tile teinte="menthe" label={traduire("jours entraînés")} value={traduire("{0} sur 7", cur.days)}>
          <Trend couleur={couleursTuile('menthe').texte} delta={cur.days - prev.days} text={traduirePluriel(Math.abs(cur.days - prev.days), Math.abs(cur.days - prev.days) > 1, "{0} jour", "{0} jours", Math.abs(cur.days - prev.days))} hasPrev={hasPrev} />
        </Tile>
      </View>

      <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>
        {full.sessions > 0
          ? traduirePluriel(full.sessions, full.sessions > 1, "Comparé à la semaine passée au même jour. Semaine passée entière : {0} séance{1}.", "Comparé à la semaine passée au même jour. Semaine passée entière : {0} séances{1}.", full.sessions, full.minutes ? `, ${fmtMin(full.minutes)}` : '')
          : traduire('Comparé à la semaine passée au même jour.')}
      </Ink>
    </View>
  );
}
