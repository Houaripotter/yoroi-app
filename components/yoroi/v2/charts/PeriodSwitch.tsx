/**
 * Choix de la periode, identique sur tous les graphiques de l'app :
 * memes puces, memes libelles, meme ordre.
 */
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import Svg, { Path, Rect } from 'react-native-svg';
import { usePremium } from '@/context/PremiumContext';
import { FREE_LIMITS } from '@/lib/v2/premium/limits';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';

export type PeriodOption = { value: number; label: string };

/** Periodes communes (en jours, 0 = tout l'historique) */
export const CHART_PERIODS: PeriodOption[] = [
  { value: 30, label: '1 mois' },
  { value: 90, label: '3 mois' },
  { value: 180, label: '6 mois' },
  { value: 365, label: '1 an' },
  { value: 0, label: 'Tout' },
];

/**
 * Periodes courtes avec la semaine (vague 26) : le Resume de Progres et la courbe de poids,
 * comme l'ancien onglet Stats ou « 7 jours » etait le choix de tous les jours. 7 jours, 1 mois
 * et 3 mois restent gratuits ; 1 an et Tout suivent la regle Premium de lib/v2/premium/limits.ts.
 */
export const SHORT_PERIODS: PeriodOption[] = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '1 mois' },
  { value: 90, label: '3 mois' },
  { value: 365, label: '1 an' },
  { value: 0, label: 'Tout' },
];

/** Courbe de poids (vague 32) : 1 M, 3 M, 6 M, 1 A, comme le labo des courbes valide */
export const POIDS_PERIODS: PeriodOption[] = [
  { value: 30, label: '1 M' },
  { value: 90, label: '3 M' },
  { value: 180, label: '6 M' },
  { value: 365, label: '1 A' },
];

/**
 * « Mon plan » (vague 33) : du debut de ton plan jusqu'au torii, futur compris. Remplace le defilement horizontal,
 * qui generait le doigt qui lit les valeurs. Seulement quand tu as un plan avec un torii.
 */
export const PERIODE_PLAN = -1;
export const POIDS_PERIODS_PLAN: PeriodOption[] = [...POIDS_PERIODS, { value: PERIODE_PLAN, label: 'Mon plan' }];
/** Vague 34, carte « rouleau » de l'accueil : les memes periodes en onglets legers, « Plan » en un mot */
export const POIDS_PERIODS_PLAN_COURT: PeriodOption[] = [...POIDS_PERIODS, { value: PERIODE_PLAN, label: 'Plan' }];

/** Pastille de la periode choisie : violette, la meme sur tous les graphiques (vague 32) */
export const PERIOD_ON = '#7B5CFF';
const PERIOD_TRACK = '#F1EEFF';
/** onglet choisi de la carte rouleau : un voile violet leger, texte violet (pas de grosse pastille pleine) */
const PERIOD_LEGER = 'rgba(123,92,255,0.12)';

/** « sur 3 mois », « sur 7 jours », « depuis le début » */
export function periodPhrase(days: number): string {
  if (days === PERIODE_PLAN) return 'sur ton plan';
  const p = CHART_PERIODS.find((x) => x.value === days) ?? SHORT_PERIODS.find((x) => x.value === days);
  if (!days || !p) return 'depuis le début';
  return `sur ${p.label}`;
}

/** Periode la plus longue offerte en version gratuite (en jours), lue dans lib/v2/premium/limits.ts */
export const FREE_CHART_MAX_DAYS: number = FREE_LIMITS.chartDays;
/** Periode par defaut quand une periode Premium est demandee en version gratuite */
export const FREE_CHART_FALLBACK_DAYS: number = FREE_LIMITS.chartDays;

/** 1 an et Tout sont reserves a Premium */
export function isPremiumPeriod(days: number): boolean {
  if (days === PERIODE_PLAN) return false;
  return days === 0 || days > FREE_CHART_MAX_DAYS;
}

/** « 3 M » se dit « 3 mois » */
function spoken(p: PeriodOption): string {
  return p.label.replace(/^(\d+) M$/, '$1 mois').replace(/^1 A$/, '1 an');
}

function Padlock({ color }: { color: string }) {
  return (
    <Svg width={10} height={12} viewBox="0 0 20 24" fill="none">
      <Path d="M5 10V7a5 5 0 0 1 10 0v3" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Rect x={2} y={10} width={16} height={12} rx={3} fill={color} />
    </Svg>
  );
}

export function PeriodSwitch({
  value,
  onChange,
  options = CHART_PERIODS,
  style,
  premiumLock = true,
  variant = 'pastille',
}: {
  value: number;
  onChange: (v: number) => void;
  options?: PeriodOption[];
  style?: StyleProp<ViewStyle>;
  /** false pour une liste d'historique : toutes les periodes restent ouvertes */
  premiumLock?: boolean;
  /** vague 34 : « onglets » legers (sans piste de fond, petite pastille sur le choix), pour la carte rouleau */
  variant?: 'pastille' | 'onglets';
}) {
  const leger = variant === 'onglets';
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { isPremium, isLoading } = usePremium();
  const lockOn = premiumLock && !isPremium && !isLoading;

  // Version gratuite : une periode longue choisie par defaut revient a 3 mois
  useEffect(() => {
    if (lockOn && isPremiumPeriod(value)) {
      const fallback = options.find((o) => o.value === FREE_CHART_FALLBACK_DAYS) ?? options.find((o) => !isPremiumPeriod(o.value));
      if (fallback) onChange(fallback.value);
    }
  }, [lockOn, value, options, onChange]);
  return (
    <View style={[leger ? { flexDirection: 'row', alignItems: 'center', gap: 2 } : { flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: theme.isDark ? c.fillSoft : PERIOD_TRACK }, style]} accessibilityRole="tablist">
      {options.map((p) => {
        const locked = lockOn && isPremiumPeriod(p.value);
        const on = p.value === value && !locked;
        return (
          <Pressable
            key={p.label}
            onPress={() => {
              selectionAsync().catch(() => {});
              if (locked) {
                ouvrirPaywall('periode_longue');
                return;
              }
              onChange(p.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${p.value === PERIODE_PLAN ? 'Mon plan, du début jusqu’au torii' : p.value ? `Période ${spoken(p)}` : 'Tout l’historique'}${locked ? ', avec Premium' : ''}`}
            hitSlop={leger ? { top: 8, bottom: 8 } : undefined}
            style={[
              leger
                ? { minHeight: 26, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? PERIOD_LEGER : 'transparent' }
                : { flex: p.value === PERIODE_PLAN ? 1.75 : 1, minHeight: 40, borderRadius: 11, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? PERIOD_ON : 'transparent' },
              on && !leger ? { shadowColor: PERIOD_ON, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 } : null,
            ]}
          >
            {locked ? <Padlock color={c.textMuted} /> : null}
            <Ink size={leger ? 12.5 : 13} weight={on ? 'extraBold' : 'bold'} color={on ? (leger ? PERIOD_ON : '#FFFFFF') : locked ? c.textMuted : c.textSecondary} numberOfLines={1}>
              {p.label}
            </Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
