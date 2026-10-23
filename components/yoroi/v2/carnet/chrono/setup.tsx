/**
 * Ecrans de reglage des chronos : liste des chronos en grandes cartes illustrees,
 * resume de la seance (duree en grand, bande des phases), grosses puces de choix,
 * et bouton de lancement colle en bas qui ne cache rien.
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P, Press, CIcon } from '../ui';
import type { CIconName } from '../ui';
import { useAccent } from '@/components/yoroi/v2/accueil/kit';
import { ChronoPicto } from './Picto';
import { TimelineBand } from './parts';
import type { TimerMode } from '@/lib/v2/carnet/chrono';
import { blancA, paletteSombre } from '@/components/yoroi/livePalette';
import { ORNEMENTS } from '@/components/yoroi/v2/ornements/images';
import { SCENES } from '@/components/yoroi/v2/accueil/images';
import { pickSportArt } from '@/lib/v2/seance/sportArt';
import { traduire } from '@/lib/i18n/tr';

/**
 * Vague 45 (Houari : « c'est beau mais c'est fade ») : chaque chrono a sa couleur et son illustration de sport.
 * Jamais de rouge (reserve aux records et aux erreurs). Couleurs lues au rendu : elles suivent le mode sombre.
 */
export type ModeLook = { couleur: string; doux: string; art: ImageSourcePropType };
const ARTS: Record<TimerMode | 'sparring', string> = { musculation: 'musculation', combat: 'boxe', tabata: 'fitness', emom: 'crosstraining', amrap: 'hyrox', fortime: 'course', sparring: 'mma' };
export function lookDuMode(mode: TimerMode | 'sparring'): ModeLook {
  const s = paletteSombre();
  const art = pickSportArt(ARTS[mode], false).source;
  switch (mode) {
    case 'musculation':
      return { couleur: P.indigo, doux: P.indigoSoft, art };
    case 'combat':
      return { couleur: P.goldDark, doux: P.goldSoft, art };
    case 'tabata':
      return { couleur: P.mossText, doux: P.mossSoft, art };
    case 'emom':
      return { couleur: s ? '#5FB8E0' : '#1A7FA8', doux: s ? '#1B2B36' : '#E1F0F6', art };
    case 'amrap':
      return { couleur: s ? '#A08CF5' : '#6A4FE0', doux: s ? '#262241' : '#ECE8FB', art };
    case 'fortime':
      return { couleur: P.lacquer, doux: s ? '#232733' : '#E9EAEE', art };
    default:
      return { couleur: P.ink, doux: P.paper, art };
  }
}

/** Le bandeau illustre en haut des chronos : le dojo, le chrono de l'app, une phrase */
export function ChronoBanner() {
  return (
    <View style={{ height: 148, borderRadius: 26, overflow: 'hidden', backgroundColor: P.ink }} accessible accessibilityLabel={traduire("Tes chronos : rounds, repos, intervalles")}>
      <Image source={SCENES.dojo} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
      <LinearGradient colors={['rgba(16,19,27,0.86)', 'rgba(16,19,27,0.55)', 'rgba(16,19,27,0.05)']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Ink size={22} weight="black" tight color={P.pureWhite}>{traduire("Ton temps, découpé")}</Ink>
          <Ink size={13} weight="bold" color="rgba(255,255,255,0.86)">{traduire("Le gong, les claquettes et la vibration te guident, même téléphone posé.")}</Ink>
        </View>
        <Image source={ORNEMENTS.chrono} style={{ width: 112, height: 112 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    </View>
  );
}

/** Le dernier chrono lance, mis en avant : « Reprendre : Rounds 5 x 3 min » */
export function ReprendreCard({ mode, resume, onPress }: { mode: TimerMode; resume: string; onPress: () => void }) {
  const look = lookDuMode(mode);
  return (
    <Press onPress={onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={`Reprendre : ${resume}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, paddingRight: 16, borderRadius: 24, backgroundColor: look.doux, borderWidth: 2, borderColor: look.couleur }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: blancA(0.7), overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Image source={look.art} style={{ width: 64, height: 76 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={12} weight="extraBold" color={look.couleur}>{traduire("Reprendre")}</Ink>
          <Ink size={18} weight="black" tight numberOfLines={2}>{resume}</Ink>
        </View>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: look.couleur, alignItems: 'center', justifyContent: 'center' }}>
          <CIcon name="play" size={20} color={P.white} />
        </View>
      </View>
    </Press>
  );
}

/** Hauteur reservee sous le contenu defilant pour le bouton colle en bas */
export const DOCK_SPACE = 132;

/** Grande carte d'un chrono : pictogramme de la structure, nom clair, sigle en petit, une phrase */
export function ModeCard({ mode, title, tag, text, onPress, dark, vive }: { mode: TimerMode | 'sparring'; title: string; tag?: string; text: string; onPress: () => void; dark?: boolean; /** vague 45 : la carte vivante (couleur et illustration du chrono) */ vive?: boolean }) {
  // audit 43 : en sombre, la carte foncee reste foncee (l'encre y devient claire)
  const darkBg = paletteSombre() ? '#232838' : P.ink;
  if (vive) {
    const look = lookDuMode(mode);
    return (
      <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${text}`}>
        <View style={{ flexDirection: 'row', alignItems: 'stretch', borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, overflow: 'hidden', minHeight: 132 }}>
          <View style={{ width: 104, backgroundColor: look.doux, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
            <Image source={look.art} style={{ width: 104, height: 122 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: look.couleur }} />
          </View>
          <View style={{ flex: 1, padding: 14, paddingRight: 10, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 }}>
                <Ink size={18} weight="black" tight>{title}</Ink>
                {tag ? (
                  <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: look.doux, justifyContent: 'center' }}>
                    <Ink size={11} weight="extraBold" color={look.couleur}>{tag}</Ink>
                  </View>
                ) : null}
              </View>
              <CIcon name="chevron" size={18} color={look.couleur} />
            </View>
            <Ink size={13} weight="medium" color={P.ink2} style={{ lineHeight: 18 }}>{text}</Ink>
            <View style={{ alignSelf: 'flex-start', marginTop: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: P.paper }}>
              <ChronoPicto mode={mode} size={0.52} />
            </View>
          </View>
        </View>
      </Press>
    );
  }
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${text}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingRight: 12, borderRadius: 24, backgroundColor: dark ? darkBg : P.white, borderWidth: 1, borderColor: dark ? darkBg : P.line2 }}>
        <View style={{ width: 84, height: 70, borderRadius: 18, backgroundColor: dark ? blancA(0.94) : paletteSombre() ? P.line2 : '#F5F4EF', alignItems: 'center', justifyContent: 'center' }}>
          <ChronoPicto mode={mode} size={0.86} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 }}>
            <Ink size={17} weight="black" tight color={dark ? (paletteSombre() ? P.ink : P.white) : P.ink}>{title}</Ink>
            {tag ? (
              <View style={{ paddingHorizontal: 7, height: 20, borderRadius: 6, backgroundColor: dark ? 'rgba(255,255,255,0.14)' : paletteSombre() ? P.line : '#EEECE6', justifyContent: 'center' }}>
                <Ink size={11} weight="extraBold" color={dark ? 'rgba(255,255,255,0.8)' : P.ink2}>{tag}</Ink>
              </View>
            ) : null}
          </View>
          <Ink size={13} weight="medium" color={dark ? 'rgba(255,255,255,0.74)' : P.ink2} style={{ lineHeight: 18 }}>{text}</Ink>
        </View>
        <CIcon name="chevron" size={18} color={dark ? P.goldLight : P.muted} />
      </View>
    </Press>
  );
}

export function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Ink size={12} weight="bold" color={P.ink2}>{text}</Ink>
    </View>
  );
}

/** Resume de la seance : la duree en tres grand, une phrase, la bande des phases et sa legende */
export function SetupHero({ label, big, line, band, legend }: { label: string; big: string; line: string; band?: { seconds: number; color: string }[]; legend?: { color: string; text: string }[] }) {
  return (
    <View style={{ borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 18, gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Ink size={13} weight="extraBold" color={P.muted}>{label}</Ink>
        <Ink size={50} weight="black" style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{big}</Ink>
        <Ink size={15} weight="bold" color={P.ink2}>{line}</Ink>
      </View>
      {band && band.length > 0 ? <TimelineBand parts={band} height={16} /> : null}
      {legend && legend.length > 0 ? (
        <View style={{ flexDirection: 'row', columnGap: 16, rowGap: 6, flexWrap: 'wrap' }}>
          {legend.map((l) => <Legend key={l.text} color={l.color} text={traduire(l.text)} />)}
        </View>
      ) : null}
    </View>
  );
}

/** Bloc de reglage : un titre, une explication courte, puis le contenu */
export function SetupBlock({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 16, gap: 12 }}>
      {title ? (
        <View style={{ gap: 2 }}>
          <Ink size={18} weight="black" tight>{title}</Ink>
          {hint ? <Ink size={13} weight="medium" color={P.muted}>{hint}</Ink> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Grosses puces de choix en grille : toujours lisibles en entier (titre sur deux lignes au besoin).
 * columns : nombre de puces par ligne.
 */
export function ChoiceGrid<T extends string | number>({ items, value, onPick, columns = 3, big }: { items: { key: T; title: string; sub?: string }[]; value: T | null; onPick: (k: T) => void; columns?: number; big?: boolean }) {
  const { accent } = useAccent();
  const rows: { key: T; title: string; sub?: string }[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((it) => {
            const on = it.key === value;
            return (
              <View key={String(it.key)} style={{ flex: 1 }}>
                <Press onPress={() => onPick(it.key)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={it.sub ? `${it.title}, ${it.sub}` : it.title}>
                  <View style={{ minHeight: big ? 72 : it.sub ? 62 : 52, paddingHorizontal: 6, paddingVertical: 8, borderRadius: 18, backgroundColor: on ? accent : paletteSombre() ? P.line2 : '#F5F4EF', borderWidth: 1.5, borderColor: on ? accent : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <Ink size={big ? 19 : columns >= 3 ? 14 : 15} weight="black" tight color={on ? P.white : P.ink} style={{ textAlign: 'center' }} numberOfLines={2}>{traduire(it.title)}</Ink>
                    {it.sub ? <Ink size={12} weight="bold" color={on ? (paletteSombre() ? P.white : 'rgba(255,255,255,0.8)') : P.muted} style={{ textAlign: 'center' }} numberOfLines={1}>{traduire(it.sub)}</Ink> : null}
                  </View>
                </Press>
              </View>
            );
          })}
          {/* cases vides pour garder la meme largeur sur la derniere ligne */}
          {row.length < columns ? Array.from({ length: columns - row.length }).map((_, k) => <View key={`v${k}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}

/** Bouton de lancement colle en bas, sur un fond papier : le contenu defile au-dessus sans etre cache */
export function StartDock({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14, backgroundColor: P.paper, borderTopWidth: 1, borderTopColor: P.line2 }}>
      {children}
    </View>
  );
}

/** Tres gros bouton d'action : un titre et une precision dessous, lisible et facile a toucher en sueur */
export function HugeButton({ title, sub, icon = 'play', onPress, tone = 'accent' }: { title: string; sub?: string; icon?: CIconName; onPress: () => void; tone?: 'accent' | 'ink' }) {
  const { accent } = useAccent();
  const bg = tone === 'ink' ? P.ink : accent;
  return (
    <Press onPress={onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={sub ? `${title}, ${sub}` : title}>
      <View style={{ minHeight: sub ? 78 : 64, borderRadius: 24, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, shadowColor: bg, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <CIcon name={icon} size={24} color={P.white} width={2.8} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={20} weight="black" tight color={P.white} numberOfLines={1}>{title}</Ink>
          {sub ? <Ink size={13} weight="bold" color={paletteSombre() ? 'rgba(29,32,41,0.78)' : 'rgba(255,255,255,0.78)'} numberOfLines={1}>{sub}</Ink> : null}
        </View>
      </View>
    </Press>
  );
}

/** Reglage du repos en grand : la valeur sur toute la largeur, puis deux gros boutons moins et plus */
export function BigAdjust({ value, label, onMinus, onPlus, stepLabel = '15\u00a0s', color = P.ink }: { value: string; label: string; onMinus: () => void; onPlus: () => void; stepLabel?: string; color?: string }) {
  const btn = (icon: 'minus' | 'plus', fn: () => void, name: string) => (
    <View style={{ flex: 1 }}>
      <Press onPress={fn} haptic="light" accessibilityRole="button" accessibilityLabel={`${name} ${stepLabel}`}>
        <View style={{ height: 56, borderRadius: 18, backgroundColor: paletteSombre() ? P.line2 : '#F0EEE8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <CIcon name={icon} size={22} color={P.ink} width={2.8} />
          <Ink size={17} weight="black" tight>{stepLabel}</Ink>
        </View>
      </Press>
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'center', gap: 0 }}>
        <Ink size={13} weight="extraBold" color={P.muted}>{label}</Ink>
        <Ink size={56} weight="black" color={color} style={{ fontVariant: ['tabular-nums'], textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Ink>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {btn('minus', onMinus, traduire('Moins'))}
        {btn('plus', onPlus, 'Plus')}
      </View>
    </View>
  );
}
