// ============================================
// UNIVERSAL SHARE CARD : YOROI  ★ PREMIUM
// ============================================
// Format 9:16, Instagram Stories / TikTok
// Rounds + techniques affichés, Branding complet
// ============================================

import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Training } from '@/lib/database';
import { CombatRoundData } from '@/components/social-cards/SessionCard';
import { traduire, LOCALE } from '@/lib/i18n/tr';

const GOLD  = '#D4AF37';
const WHITE = '#FFFFFF';
const WIN   = '#22C55E';
const LOSS  = '#EF4444';
const DRAW  = '#9CA3AF';

// ─── Sport config (toutes variantes orthographiques) ────────────────────────

const SPORT_CFG: Record<string, { color: string; label: string; cat: 'combat' | 'running' | 'cycling' | 'strength' | 'generic' }> = {
  bjj:                { color: '#3B82F6', label: traduire('JIU JITSU BRÉSILIEN'), cat: 'combat'   },
  jjb:                { color: '#3B82F6', label: traduire('JIU JITSU BRÉSILIEN'), cat: 'combat'   },
  jiujitsu:           { color: '#3B82F6', label: traduire('JIU JITSU BRÉSILIEN'), cat: 'combat'   },
  jiujitsubrasileiro: { color: '#3B82F6', label: traduire('JIU JITSU BRÉSILIEN'), cat: 'combat'   },
  jiujitsub:          { color: '#3B82F6', label: traduire('JIU JITSU BRÉSILIEN'), cat: 'combat'   },
  judo:               { color: '#2563EB', label: traduire('JUDO'),                cat: 'combat'   },
  mma:                { color: '#EF4444', label: 'MMA',                 cat: 'combat'   },
  muaythai:           { color: '#A855F7', label: traduire('MUAY THAI'),           cat: 'combat'   },
  muay:               { color: '#A855F7', label: traduire('MUAY THAI'),           cat: 'combat'   },
  kickboxing:         { color: '#F97316', label: traduire('KICK BOXING'),         cat: 'combat'   },
  kickboxe:           { color: '#F97316', label: traduire('KICK BOXING'),         cat: 'combat'   },
  boxing:             { color: '#F59E0B', label: traduire('BOXE'),                cat: 'combat'   },
  boxe:               { color: '#F59E0B', label: traduire('BOXE'),                cat: 'combat'   },
  grappling:          { color: '#10B981', label: traduire('GRAPPLING'),           cat: 'combat'   },
  wrestling:          { color: '#6366F1', label: traduire('WRESTLING'),           cat: 'combat'   },
  lutte:              { color: '#6366F1', label: traduire('LUTTE'),               cat: 'combat'   },
  sambo:              { color: '#EC4899', label: traduire('SAMBO'),               cat: 'combat'   },
  karate:             { color: '#8B5CF6', label: traduire('KARATÉ'),              cat: 'combat'   },
  taekwondo:          { color: '#14B8A6', label: traduire('TAEKWONDO'),           cat: 'combat'   },
  running:            { color: '#22C55E', label: traduire('RUNNING'),             cat: 'running'  },
  course:             { color: '#22C55E', label: traduire('RUNNING'),             cat: 'running'  },
  trail:              { color: '#84CC16', label: traduire('TRAIL RUNNING'),       cat: 'running'  },
  triathlon:          { color: '#06B6D4', label: traduire('TRIATHLON'),           cat: 'running'  },
  natation:           { color: '#0EA5E9', label: traduire('NATATION'),            cat: 'running'  },
  swimming:           { color: '#0EA5E9', label: traduire('NATATION'),            cat: 'running'  },
  cycling:            { color: '#F59E0B', label: traduire('CYCLISME'),            cat: 'cycling'  },
  cyclisme:           { color: '#F59E0B', label: traduire('CYCLISME'),            cat: 'cycling'  },
  velo:               { color: '#F59E0B', label: traduire('CYCLISME'),            cat: 'cycling'  },
  musculation:        { color: '#EF4444', label: traduire('MUSCULATION'),         cat: 'strength' },
  crossfit:           { color: '#F97316', label: traduire('CROSSFIT'),            cat: 'strength' },
  fitness:            { color: '#F97316', label: traduire('FITNESS'),             cat: 'strength' },
  yoga:               { color: '#A78BFA', label: traduire('YOGA'),                cat: 'generic'  },
};

function getCfg(sport?: string) {
  if (!sport) return { color: GOLD, label: 'ENTRAÎNEMENT', cat: 'generic' as const };
  const key = sport
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-_/]+/g, '')
    .split(',')[0];
  return SPORT_CFG[key] ?? { color: GOLD, label: sport.toUpperCase().split(',')[0].trim(), cat: 'generic' as const };
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function fmtDur(min?: number) {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h === 0 ? `${m}min` : m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
function fmtDist(km?: number) {
  if (!km) return null;
  return km >= 100 ? `${Math.round(km)}` : km.toFixed(1);
}
function fmtPace(speed?: number) {
  if (!speed || speed <= 0) return null;
  const p = 60 / speed, min = Math.floor(p), sec = Math.round((p - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')}/km`;
}
function fmtDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UniversalShareCardProps {
  training: Partial<Training>;
  rounds?: CombatRoundData[];
  width: number;
  backgroundImage?: string;
  profilePhoto?: string | null;
  userName?: string;
  rank?: string;
  yearlyCount?: number;
  yearlyObjective?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const UniversalShareCard = React.memo(
  React.forwardRef<View, UniversalShareCardProps>(function UniversalShareCard(
    { training, rounds, width, backgroundImage, profilePhoto, userName = 'CHAMPION', rank, yearlyCount, yearlyObjective },
    ref
  ) {
    const s      = width / 390;
    const height = width * (16 / 9);
    const cfg    = useMemo(() => getCfg(training.sport), [training.sport]);
    const accent = cfg.color;
    const bgPhoto = backgroundImage ?? profilePhoto ?? null;

    // ── Stats héro par catégorie ──────────────────────────────────────────
    const data = useMemo(() => {
      const cat = cfg.cat;

      if (cat === 'combat' && rounds && rounds.length > 0) {
        const w = rounds.filter(r => r.result === 'win').length;
        const l = rounds.filter(r => r.result === 'loss').length;
        const d = rounds.filter(r => r.result === 'draw').length;
        const ptsFor = rounds.reduce((a, r) => a + (r.pointsFor ?? 0), 0);
        const ptsAg  = rounds.reduce((a, r) => a + (r.pointsAgainst ?? 0), 0);
        const techs  = rounds.flatMap(r => r.usedTechniques ?? []).reduce((a, t) => a + (t.count ?? 1), 0);
        return {
          heroNum: `${w}V ${d}N ${l}D`,
          heroSub: 'BILAN',
          badge: w > 0 && l === 0 ? traduire('IMBATTU') : null,
          stats: [
            { v: String(rounds.length), l: 'ROUNDS' },
            { v: fmtDur(training.duration_minutes ?? training.duration), l: 'DURÉE' },
            ptsFor > 0 ? { v: `${ptsFor} à ${ptsAg}`, l: 'POINTS' } : null,
            techs > 0  ? { v: String(techs), l: 'TECHNIQUES' } : null,
          ].filter(Boolean) as { v: string; l: string }[],
        };
      }

      if (cat === 'combat') {
        return {
          heroNum: fmtDur(training.duration_minutes ?? training.duration),
          heroSub: traduire('DURÉE'), badge: null,
          stats: [
            training.rounds     ? { v: String(training.rounds),            l: 'ROUNDS'    } : null,
            training.intensity  ? { v: `RPE ${training.intensity}`,        l: 'INTENSITÉ' } : null,
            training.calories   ? { v: `${training.calories} kcal`,        l: 'CALORIES'  } : null,
            training.heart_rate ? { v: `${training.heart_rate} bpm`,       l: 'FC MOY'    } : null,
          ].filter(Boolean) as { v: string; l: string }[],
        };
      }

      if (cat === 'running') {
        const km = fmtDist(training.distance);
        if (km) {
          const distNum = training.distance!;
          return {
            heroNum: km, heroSub: traduire('KILOMÈTRES'),
            badge: distNum >= 42.195 ? 'MARATHON' : distNum >= 21.1 ? 'SEMI MARATHON' : distNum >= 10 ? '10 KM+' : null,
            stats: [
              { v: fmtDur(training.duration_minutes ?? training.duration), l: 'DURÉE' },
              fmtPace(training.speed)  ? { v: fmtPace(training.speed)!,    l: 'ALLURE' }   : null,
              training.heart_rate      ? { v: `${training.heart_rate} bpm`,l: 'FC MOY' }   : null,
              training.calories        ? { v: `${training.calories} kcal`, l: 'CALORIES' } : null,
            ].filter(Boolean) as { v: string; l: string }[],
          };
        }
      }

      if (cat === 'cycling') {
        const km = fmtDist(training.distance);
        return {
          heroNum: km ?? fmtDur(training.duration_minutes ?? training.duration),
          heroSub: km ? traduire('KILOMÈTRES') : traduire('DURÉE'), badge: null,
          stats: [
            { v: fmtDur(training.duration_minutes ?? training.duration), l: 'DURÉE' },
            training.watts    ? { v: `${training.watts}W`,      l: 'WATTS'   } : null,
            training.cadence  ? { v: `${training.cadence} rpm`, l: 'CADENCE' } : null,
            training.calories ? { v: `${training.calories} kcal`, l: 'CALORIES' } : null,
          ].filter(Boolean) as { v: string; l: string }[],
        };
      }

      if (cat === 'strength') {
        const exs = training.exercises ?? [];
        const ton = exs.reduce((t, e) => t + (e.sets ?? 1) * (e.reps ?? 0) * (e.weight ?? 0), 0);
        if (ton > 0) {
          return {
            heroNum: ton >= 1000 ? `${(ton / 1000).toFixed(1)}T` : `${Math.round(ton)}kg`,
            heroSub: 'TONNAGE', badge: null,
            stats: [
              { v: fmtDur(training.duration_minutes ?? training.duration), l: 'DURÉE' },
              exs.length > 0     ? { v: String(exs.length),          l: 'EXERCICES' } : null,
              training.intensity ? { v: `RPE ${training.intensity}`, l: 'INTENSITÉ' } : null,
              training.calories  ? { v: `${training.calories} kcal`, l: 'CALORIES'  } : null,
            ].filter(Boolean) as { v: string; l: string }[],
          };
        }
        return {
          heroNum: fmtDur(training.duration_minutes ?? training.duration),
          heroSub: traduire('DURÉE'), badge: null,
          stats: [
            training.exercises?.length ? { v: String(training.exercises.length), l: 'EXERCICES' } : null,
            training.intensity  ? { v: `RPE ${training.intensity}`,              l: 'INTENSITÉ' } : null,
            training.calories   ? { v: `${training.calories} kcal`,              l: 'CALORIES'  } : null,
            training.heart_rate ? { v: `${training.heart_rate} bpm`,             l: 'FC MOY'    } : null,
          ].filter(Boolean) as { v: string; l: string }[],
        };
      }

      return {
        heroNum: fmtDur(training.duration_minutes ?? training.duration),
        heroSub: traduire('DURÉE'), badge: null,
        stats: [
          training.intensity  ? { v: `RPE ${training.intensity}`,  l: 'INTENSITÉ' } : null,
          training.calories   ? { v: `${training.calories} kcal`,  l: 'CALORIES'  } : null,
          training.heart_rate ? { v: `${training.heart_rate} bpm`, l: 'FC MOY'    } : null,
        ].filter(Boolean) as { v: string; l: string }[],
      };
    }, [training, rounds, cfg]);

    const stats4     = data.stats.slice(0, 4);
    const statW      = (width - 44 * s - 8 * s) / 2;
    const heroFontSz = data.heroNum.length > 7 ? 42 * s : data.heroNum.length > 4 ? 58 * s : 76 * s;

    // Rounds à afficher (max 6)
    const hasCombatRounds = cfg.cat === 'combat' && rounds && rounds.length > 0;
    const visibleRounds   = hasCombatRounds ? rounds!.slice(0, 6) : [];
    const moreRounds      = hasCombatRounds && rounds!.length > 6 ? rounds!.length - 6 : 0;

    return (
      <View
        ref={ref}
        style={{ width, height, borderRadius: 22 * s, overflow: 'hidden', backgroundColor: '#080808' }}
        collapsable={false}
      >
        {/* ══ FOND ══════════════════════════════════════════════════════════ */}
        {bgPhoto ? (
          <Image source={{ uri: bgPhoto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460', '#080808']}
            start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        {/* ══ GRADIENT STRAVA : clair au milieu, sombre en bas ═════════════ */}
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.50)',
            'rgba(0,0,0,0.08)',
            'rgba(0,0,0,0.00)',
            'rgba(0,0,0,0.00)',
            'rgba(0,0,0,0.60)',
            'rgba(0,0,0,0.90)',
            'rgba(0,0,0,0.98)',
          ]}
          locations={[0, 0.12, 0.25, 0.45, 0.60, 0.78, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* ══ TRAIT ACCENT HAUT ═════════════════════════════════════════════ */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4 * s, backgroundColor: accent }} />

        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <View style={{
          position: 'absolute', top: 18 * s, left: 18 * s, right: 18 * s,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 7 * s,
            backgroundColor: 'rgba(0,0,0,0.55)',
            paddingHorizontal: 11 * s, paddingVertical: 6 * s,
            borderRadius: 30 * s, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
          }}>
            <View style={{ width: 22 * s, height: 22 * s, borderRadius: 6 * s, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: WHITE, fontSize: 12 * s, fontWeight: '900' }}>Y</Text>
            </View>
            <Text style={{ color: WHITE, fontSize: 11 * s, fontWeight: '900', letterSpacing: 3 }}>YOROI</Text>
          </View>
          <View style={{ backgroundColor: accent, paddingHorizontal: 11 * s, paddingVertical: 6 * s, borderRadius: 30 * s }}>
            <Text style={{ color: WHITE, fontSize: 8 * s, fontWeight: '900', letterSpacing: 1.5 }}>{traduire(cfg.label)}</Text>
          </View>
        </View>

        {/* ══ BADGE IMBATTU / MARATHON flottant ════════════════════════════ */}
        {data.badge && (
          <View style={{ position: 'absolute', top: height * 0.36, alignSelf: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', top: -12 * s, left: -24 * s, right: -24 * s, bottom: -12 * s, borderRadius: 50 * s, backgroundColor: accent, opacity: 0.28 }} />
            <View style={{ backgroundColor: accent, paddingHorizontal: 26 * s, paddingVertical: 11 * s, borderRadius: 40 * s, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.40)' }}>
              <Text style={{ color: WHITE, fontSize: 21 * s, fontWeight: '900', letterSpacing: 5 }}>{data.badge}</Text>
            </View>
          </View>
        )}

        {/* ══ BLOC INFÉRIEUR ════════════════════════════════════════════════ */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 * s, paddingTop: 14 * s, paddingBottom: 16 * s }}>

          {/* Nom + rang */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 * s, gap: 8 * s }}>
            <Text style={{ color: WHITE, fontSize: 17 * s, fontWeight: '900', letterSpacing: 0.5, flex: 1 }} numberOfLines={1}>
              {userName.toUpperCase()}
            </Text>
            {rank ? (
              <View style={{ borderWidth: 1, borderColor: `${GOLD}70`, paddingHorizontal: 7 * s, paddingVertical: 2 * s, borderRadius: 7 * s }}>
                <Text style={{ color: GOLD, fontSize: 7.5 * s, fontWeight: '800', letterSpacing: 1 }}>{rank.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>

          {/* Date + club */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 * s, marginBottom: 12 * s }}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 8.5 * s, fontWeight: '700', letterSpacing: 0.8 }}>{fmtDate(training.date)}</Text>
            {training.club_name ? (
              <>
                <View style={{ width: 3 * s, height: 3 * s, borderRadius: 2, backgroundColor: accent }} />
                <Text style={{ color: `${accent}DD`, fontSize: 8.5 * s, fontWeight: '700' }} numberOfLines={1}>{training.club_name.toUpperCase()}</Text>
              </>
            ) : null}
          </View>

          {/* ── HERO STAT ─────────────────────────────────────────────── */}
          <View style={{ marginBottom: 12 * s }}>
            <Text style={{ color: WHITE, fontSize: heroFontSz, fontWeight: '900', letterSpacing: -1.5, lineHeight: heroFontSz * 0.97, includeFontPadding: false }}>
              {data.heroNum}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 * s, marginTop: 4 * s }}>
              <View style={{ width: 26 * s, height: 2.5 * s, backgroundColor: accent, borderRadius: 2 }} />
              <Text style={{ color: accent, fontSize: 8.5 * s, fontWeight: '900', letterSpacing: 2.5 }}>{data.heroSub}</Text>
            </View>
          </View>

          {/* ── COMBAT LOG : rounds détaillés ─────────────────────────── */}
          {hasCombatRounds && (
            <View style={{ marginBottom: 10 * s }}>
              {/* Titre section */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * s, marginBottom: 7 * s }}>
                <View style={{ flex: 1, height: 1, backgroundColor: `${accent}45` }} />
                <Text style={{ color: accent, fontSize: 7.5 * s, fontWeight: '900', letterSpacing: 2 }}>{traduire("COMBAT LOG")}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: `${accent}45` }} />
              </View>

              {/* Lignes de rounds */}
              {visibleRounds.map((r, i) => {
                const rc = r.result === 'win' ? WIN : r.result === 'loss' ? LOSS : DRAW;
                const rl = r.result === 'win' ? 'V' : r.result === 'loss' ? 'D' : r.result === 'draw' ? 'N' : null;
                const score = (r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0
                  ? `${r.pointsFor ?? 0} à ${r.pointsAgainst ?? 0} pts` : null;
                const topTechs = (r.usedTechniques ?? [])
                  .slice(0, 2)
                  .map(t => t.count && t.count > 1 ? `${t.label} ×${t.count}` : t.label)
                  .join(', ');
                const givenSub = (r.methodsGiven ?? []).slice(0, 1)[0] ?? null;
                const takenSub = (r.methodsTaken ?? []).slice(0, 1)[0] ?? null;

                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3.5 * s, borderBottomWidth: i < visibleRounds.length - 1 ? 0.5 : 0, borderBottomColor: 'rgba(255,255,255,0.07)' }}>
                    {/* Numéro */}
                    <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 8.5 * s, fontWeight: '900', width: 22 * s, marginTop: 1 }}>
                      R{r.number}
                    </Text>

                    {/* Contenu */}
                    <View style={{ flex: 1, gap: 1.5 * s }}>
                      {r.partner ? (
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 8.5 * s, fontWeight: '700' }} numberOfLines={1}>
                          vs {r.partner}
                        </Text>
                      ) : null}
                      {score ? (
                        <Text style={{ color: WHITE, fontSize: 8 * s, fontWeight: '800' }}>{score}</Text>
                      ) : null}
                      {topTechs ? (
                        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 7.5 * s, fontWeight: '600' }} numberOfLines={1}>
                          {topTechs}
                        </Text>
                      ) : null}
                      {givenSub ? (
                        <Text style={{ color: `${WIN}AA`, fontSize: 7.5 * s, fontWeight: '700' }} numberOfLines={1}>
                          ↗ {givenSub}
                        </Text>
                      ) : null}
                      {takenSub ? (
                        <Text style={{ color: `${LOSS}AA`, fontSize: 7.5 * s, fontWeight: '700' }} numberOfLines={1}>
                          ↘ {takenSub}
                        </Text>
                      ) : null}
                    </View>

                    {/* Badge résultat */}
                    {rl ? (
                      <View style={{ backgroundColor: `${rc}20`, borderWidth: 1, borderColor: `${rc}80`, paddingHorizontal: 6 * s, paddingVertical: 2.5 * s, borderRadius: 5 * s, marginLeft: 5 * s }}>
                        <Text style={{ color: rc, fontSize: 9 * s, fontWeight: '900' }}>{rl}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {moreRounds > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 7.5 * s, fontWeight: '700', marginTop: 3 * s }}>
                  {traduire("+{0} rounds supplémentaires", moreRounds)}</Text>
              )}
            </View>
          )}

          {/* ── STATS GRID (hors combat avec rounds) ─────────────────── */}
          {stats4.length > 0 && !hasCombatRounds && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 * s, marginBottom: 10 * s }}>
              {stats4.map((st, i) => (
                <View key={i} style={{
                  width: statW, backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1, borderColor: `${accent}30`,
                  borderRadius: 10 * s, paddingVertical: 8 * s, paddingHorizontal: 10 * s,
                }}>
                  <Text style={{ color: WHITE, fontSize: 16 * s, fontWeight: '900', letterSpacing: -0.5, lineHeight: 18 * s }} numberOfLines={1}>{st.v}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.42)', fontSize: 7 * s, fontWeight: '700', letterSpacing: 1.2, marginTop: 2 * s }}>{st.l}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Stats compactes pour combat avec rounds ──────────────── */}
          {hasCombatRounds && stats4.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 12 * s, marginBottom: 10 * s, paddingHorizontal: 2 * s }}>
              {stats4.map((st, i) => (
                <View key={i} style={{ alignItems: 'center' }}>
                  <Text style={{ color: WHITE, fontSize: 13 * s, fontWeight: '900' }}>{st.v}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 6.5 * s, fontWeight: '700', letterSpacing: 1 }}>{st.l}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Séance #N ────────────────────────────────────────────── */}
          {yearlyCount ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 * s, marginBottom: 10 * s }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 7 * s, fontWeight: '700', letterSpacing: 1 }}>
                {traduire("SÉANCE #{0}{1}, {2}", yearlyCount, yearlyObjective ? ` SUR ${yearlyObjective}` : '', new Date().getFullYear())}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </View>
          ) : null}

          {/* ══ FOOTER BRANDING ══════════════════════════════════════════ */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            borderTopWidth: 1, borderTopColor: `${GOLD}40`,
            paddingTop: 9 * s, gap: 8 * s,
          }}>
            {/* Logo + texte */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 * s, flex: 1 }}>
              <View style={{ width: 28 * s, height: 28 * s, borderRadius: 7 * s, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: WHITE, fontSize: 14 * s, fontWeight: '900' }}>Y</Text>
              </View>
              <View>
                <Text style={{ color: GOLD, fontSize: 13 * s, fontWeight: '900', letterSpacing: 2.5 }}>YOROI</Text>
                <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: 6.5 * s, fontWeight: '700', letterSpacing: 0.5 }}>{traduire("SUIVI SPORT & BIEN ÊTRE")}</Text>
              </View>
            </View>

            {/* Badges App Store + Google Play */}
            <View style={{ gap: 3 * s }}>
              <Image
                source={require('@/assets/images/appstore.png')}
                style={{ width: 74 * s, height: 22 * s }}
                resizeMode="contain"
              />
              <Image
                source={require('@/assets/images/android.png')}
                style={{ width: 74 * s, height: 22 * s }}
                resizeMode="contain"
              />
            </View>
          </View>

        </View>{/* fin bloc inférieur */}
      </View>
    );
  })
);
