/**
 * Bilan de l'annee (refonte v2) : une histoire en plusieurs pages, papier de riz et laque,
 * gros chiffres, guerrier du rang, et a la fin une carte a partager en image.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Animated, Easing, Image, Pressable, StatusBar, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { heavyHaptic, lightHaptic } from '@/lib/haptics';
import { generateWrappedStats, type WrappedStats } from '@/lib/yoroiWrappedService';
import { getSportName } from '@/lib/sports';
import logger from '@/lib/security/logger';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, P } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { Icon as EIcon } from '@/components/yoroi/v2/espace/ui';
import { StoryCard } from '@/components/yoroi/v2/partage/StoryCard';
import { Mini, Panel, PlateRow, figureFor, fmtDuration, paletteOf } from '@/components/yoroi/v2/partage/cardKit';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { useStudio } from '@/lib/v2/partage/useStudio';
import { shareCard } from '@/lib/v2/partage/capture';
import { blancA } from '@/components/yoroi/livePalette';

const STORY_DURATION = 5000;
const ACCENTS: Record<string, string> = { Fevrier: 'Février', Aout: 'Août', Decembre: 'Décembre' };

type Fact = { value: string; label: string; accent?: boolean };
type Slide = { dark: boolean; label: string; big: string; unit?: string; sub?: string; foot?: string; figure?: 'guerrier' | 'sport'; plates?: number; facts?: Fact[]; hero?: boolean };

const frNum = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ',');

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return fmtDuration(min);
  const d = Math.floor(h / 24);
  return `${d} j ${h % 24} h`;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export default function WrappedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const id = useCardIdentity();
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const studio = useStudio({ initialStyle: 'laque', dialogTitle: 'Partager mon bilan' });

  useEffect(() => {
    heavyHaptic().catch(() => {});
    generateWrappedStats().then(setStats).catch((e) => logger.warn('[Wrapped]', e));
  }, []);

  const sport = stats?.topSport ? (getSportName(stats.topSport) ?? stats.topSport) : '';
  const month = stats ? (ACCENTS[stats.bestMonth.name] ?? stats.bestMonth.name) : '';

  const hours = stats ? formatMinutes(stats.totalMinutes) : '';
  const wEvo = stats?.weightEvolution && Math.abs(stats.weightEvolution.delta) >= 0.1 ? stats.weightEvolution : null;
  const slides: Slide[] = stats ? [
    {
      dark: true,
      hero: true,
      label: `Ton année ${stats.year}`,
      big: `${stats.totalSessions}`,
      unit: stats.totalSessions > 1 ? 'séances' : 'séance',
      sub: `${hours} d’entraînement`,
      facts: [
        { value: sport || 'À trouver', label: 'Sport favori' },
        { value: month, label: 'Mois le plus fort' },
        { value: `${stats.longestStreak}\u00A0j`, label: 'Plus longue série', accent: true },
        { value: String(stats.personalBests), label: stats.personalBests > 1 ? 'Records battus' : 'Record battu' },
        { value: String(stats.uniqueDays), label: 'Jours actifs' },
      ],
      foot: 'Touche pour revivre ton année',
      figure: 'guerrier',
    },
    {
      dark: false,
      label: 'Séances',
      big: `${stats.totalSessions}`,
      sub: `${stats.uniqueDays} jours actifs`,
      facts: [
        { value: frNum(stats.avgPerWeek), label: 'par semaine' },
        { value: `${stats.monthsActive}`, label: stats.monthsActive > 1 ? 'mois actifs' : 'mois actif' },
        { value: hours, label: 'au total' },
      ],
      foot: 'Chaque séance compte',
    },
    {
      dark: true,
      label: 'Ta plus longue série',
      big: `${stats.longestStreak}`,
      unit: 'jours',
      sub: 'd’affilée',
      plates: Math.min(1, stats.longestStreak / 30),
      facts: [
        { value: `${stats.uniqueDays}`, label: 'jours actifs' },
        { value: frNum(stats.avgPerWeek), label: 'séances par semaine' },
      ],
      foot: 'La discipline, c’est toi',
    },
    {
      dark: false,
      label: 'Ton sport',
      big: sport || 'À trouver',
      sub: stats.topSportCount ? `${stats.topSportCount} séances` : undefined,
      facts: stats.topSportCount && stats.totalSessions ? [
        { value: `${Math.round((stats.topSportCount / stats.totalSessions) * 100)}\u00A0%`, label: 'de tes séances' },
        { value: `${stats.totalSessions - stats.topSportCount}`, label: 'dans tes autres sports' },
      ] : undefined,
      foot: sport ? `Ton arme favorite en ${stats.year}` : undefined,
      figure: 'sport',
    },
    {
      dark: true,
      label: 'Temps total',
      big: hours,
      sub: 'à t’entraîner',
      facts: stats.totalSessions ? [
        { value: `${Math.round(stats.totalMinutes / stats.totalSessions)}\u00A0min`, label: 'par séance' },
        { value: `${stats.totalSessions}`, label: 'séances' },
      ] : undefined,
      foot: 'Chaque minute compte',
    },
    {
      dark: false,
      label: 'Ton mois le plus fort',
      big: month,
      sub: `${stats.bestMonth.sessions} séances`,
      facts: [{ value: `${stats.monthsActive}`, label: stats.monthsActive > 1 ? 'mois actifs dans l’année' : 'mois actif dans l’année' }],
      foot: 'Ton pic de forme',
    },
    {
      dark: true,
      label: 'Tes records',
      big: `${stats.personalBests}`,
      unit: stats.personalBests > 1 ? 'records battus' : 'record battu',
      facts: wEvo ? [{ value: `${wEvo.delta > 0 ? '+' : '\u2212'}${frNum(Math.abs(wEvo.delta))}\u00A0${wEvo.unit}`, label: 'sur la balance depuis janvier' }] : undefined,
      foot: 'Le tampon rouge te va bien',
    },
  ] : [];
  const total = slides.length + 1; // derniere page : la carte
  const isLast = slideIdx >= slides.length;

  useEffect(() => {
    if (!stats || !stats.ready) return;
    progress.setValue(0);
    enter.setValue(0);
    Animated.timing(enter, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (isLast) return;
    const anim = Animated.timing(progress, { toValue: 1, duration: STORY_DURATION, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (finished) {
        setSlideIdx((i) => Math.min(i + 1, total - 1));
        lightHaptic().catch(() => {});
      }
    });
    return () => anim.stop();
  }, [slideIdx, stats]);

  const next = () => { lightHaptic().catch(() => {}); if (!isLast) setSlideIdx((i) => i + 1); };
  const prev = () => { lightHaptic().catch(() => {}); if (slideIdx > 0) setSlideIdx((i) => i - 1); };
  const close = () => { lightHaptic().catch(() => {}); router.back(); };

  if (!stats) {
    return (
      <DetailScreen title="Bilan de l’année">
        <View style={{ paddingVertical: 80, alignItems: 'center' }}>
          <Ink size={15} weight="bold" color={P.ink2}>Ton bilan se prépare</Ink>
        </View>
      </DetailScreen>
    );
  }

  if (!stats.ready) {
    return (
      <DetailScreen title="Bilan de l’année">
        <EmptyState title={`Ton bilan ${stats.year} arrive`} text="Il faut au moins 5 séances enregistrées pour débloquer ton bilan. Continue, il se construit à chaque entraînement." action="Lancer une séance" onAction={() => router.push('/seance' as any)} />
      </DetailScreen>
    );
  }

  const fallback = `Mon bilan YOROI ${stats.year} : ${stats.totalSessions} séances, ${stats.longestStreak} jours d’affilée, ${formatMinutes(stats.totalMinutes)} d’entraînement.`;
  const s = slides[slideIdx];
  const p = paletteOf(isLast ? 'papier' : s.dark ? 'laque' : 'papier');
  const fig = figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre, sport: s?.figure === 'sport' ? stats.topSport : null });
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const cardW = Math.max(220, Math.min(W - 64, 360, Math.floor(((H - insets.top - insets.bottom - 290) * 9) / 16)));

  return (
    <PremiumGate source="bilan_annuel" featureTitle="Bilan de l’année" perks={['Ton année résumée en quelques écrans', 'Tes séances, tes jours actifs et tes temps forts', 'Un bilan à partager']}>
      <View style={{ flex: 1, backgroundColor: p.bg[1] }}>
        <StatusBar barStyle={!isLast && s.dark ? 'light-content' : 'dark-content'} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: p.bg[0] }} />
        {!isLast ? (
          <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: insets.top + 30 }}>
            <Glyph kind="sakura" size={W * 0.72} color={p.watermark} />
          </View>
        ) : null}

        <View style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 10, flexDirection: 'row', gap: 4, zIndex: 5 }}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: p.line, overflow: 'hidden' }}>
              <Animated.View style={{ height: 4, backgroundColor: p.accent, width: i < slideIdx ? '100%' : i === slideIdx && !isLast ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : i === slideIdx ? '100%' : '0%' }} />
            </View>
          ))}
        </View>

        <View style={{ position: 'absolute', right: 16, top: insets.top + 26, zIndex: 6 }}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={8} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: !isLast && s.dark ? 'rgba(255,255,255,0.12)' : blancA(0.9), alignItems: 'center', justifyContent: 'center' }}>
            <EIcon name="close" size={20} color={!isLast && s.dark ? '#FFFFFF' : P.ink} stroke={2.6} />
          </Pressable>
        </View>

        {!isLast ? (
          <>
            <Pressable onPress={prev} accessibilityRole="button" accessibilityLabel="Page précédente" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', zIndex: 2 }} />
            <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Page suivante" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '65%', zIndex: 2 }} />
            <Animated.View style={{ flex: 1, paddingTop: insets.top + 90, paddingHorizontal: 28, paddingBottom: insets.bottom + 30, opacity: enter, transform: [{ scale }] }}>
              <Ink size={16} weight="bold" color={p.ink2}>{s.label}</Ink>
              {s.hero ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Ink size={96} weight="black" tight color={p.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ lineHeight: 100 }}>{s.big}</Ink>
                    {s.unit ? <Ink size={26} weight="black" color={p.accent}>{s.unit}</Ink> : null}
                    {s.sub ? <Ink size={18} weight="extraBold" color={p.ink} style={{ marginTop: 6 }}>{s.sub}</Ink> : null}
                  </View>
                  <Image source={fig} style={{ width: W * 0.34, height: W * 0.45 }} resizeMode="contain" />
                </View>
              ) : null}
              {s.hero ? null : <Ink size={s.big.length > 6 ? 54 : 110} weight="black" tight color={p.ink} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{ lineHeight: s.big.length > 6 ? 58 : 112, marginTop: 8 }}>{s.big}</Ink>}
              {!s.hero && s.unit ? <Ink size={26} weight="black" color={p.accent}>{s.unit}</Ink> : null}
              {!s.hero && s.sub ? <Ink size={20} weight="extraBold" color={p.ink} style={{ marginTop: 6 }}>{s.sub}</Ink> : null}
              {s.plates != null ? <View style={{ marginTop: 18 }}><PlateRow p={p} progress={s.plates} count={10} w={24} /></View> : null}
              {s.facts && s.facts.length ? (
                <Panel p={p} style={{ marginTop: 22, gap: 14 }}>
                  {chunk(s.facts, s.facts.length === 3 ? 3 : 2).map((row, ri) => (
                    <View key={ri} style={{ flexDirection: 'row', gap: 12 }}>
                      {row.map((f) => (
                        <Mini key={f.label} p={p} onPanel value={f.value} label={f.label} accent={f.accent ? p.accent : undefined} />
                      ))}
                      {row.length < (s.facts!.length === 3 ? 3 : 2) ? <View style={{ flex: (s.facts!.length === 3 ? 3 : 2) - row.length }} /> : null}
                    </View>
                  ))}
                </Panel>
              ) : null}
              <View style={{ flex: 1 }} />
              {s.figure && !s.hero ? <Image source={fig} style={{ alignSelf: 'flex-end', width: W * 0.55, height: W * 0.7 }} resizeMode="contain" /> : null}
              {s.foot ? <Ink size={15} weight="bold" color={p.muted}>{s.foot}</Ink> : null}
            </Animated.View>
          </>
        ) : (
          <Animated.View style={{ flex: 1, paddingTop: insets.top + 70, paddingBottom: insets.bottom + 14, paddingHorizontal: 22, alignItems: 'center', gap: 14, opacity: enter }}>
            <Pressable onPress={prev} accessibilityRole="button" accessibilityLabel="Page précédente" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
              <Ink size={14} weight="bold" color={P.ink2}>Revoir l’histoire</Ink>
            </Pressable>
            <View style={{ shadowColor: P.ink, shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 8 }}>
              <StoryCard
                ref={studio.cardRef}
                variant={studio.style === 'photo' ? 'laque' : studio.style}
                width={cardW}
                label={`Bilan ${stats.year}`}
                kicker={`Mon année ${stats.year}`}
                name={id.name || undefined}
                big={stats.totalSessions}
                bigUnit="séances"
                caption={`${stats.uniqueDays} jours actifs`}
                subCaption={sport ? `Sport favori : ${sport}` : undefined}
                figure={figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre })}
                rankKanji={id.rankKanji}
                rankName={id.rankName}
                stamp="record"
                panel={(pp) => (
                  <Panel p={pp} style={{ flexDirection: 'row', gap: 10 }}>
                    <Mini p={pp} onPanel value={`${stats.longestStreak} j`} label="Plus longue série" accent={pp.accent} />
                    <Mini p={pp} onPanel value={formatMinutes(stats.totalMinutes)} label="Temps total" />
                    <Mini p={pp} onPanel value={month} label="Meilleur mois" />
                  </Panel>
                )}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
              {(['laque', 'papier'] as const).map((k) => (
                <Pressable key={k} onPress={() => { lightHaptic().catch(() => {}); studio.setStyleRaw(k); }} accessibilityRole="button" accessibilityLabel={k === 'laque' ? 'Habillage laque' : 'Habillage papier'} style={{ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.style === k ? P.ink : P.white, borderWidth: 1, borderColor: P.line2 }}>
                  <Ink size={14} weight="extraBold" color={studio.style === k ? '#FFFFFF' : P.ink}>{k === 'laque' ? 'Laque' : 'Papier'}</Ink>
                </Pressable>
              ))}
            </View>
            <View style={{ alignSelf: 'stretch', gap: 8 }}>
              <BigButton label="Partager mon bilan" icon="share" onPress={() => { shareCard(studio.cardRef, 'Partager mon bilan', fallback, 'bilan_annuel'); }} />
            </View>
          </Animated.View>
        )}
      </View>
    </PremiumGate>
  );
}
