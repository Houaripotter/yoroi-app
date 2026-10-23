/**
 * Blocs de la fiche partenaire v2 : carte de guerrier, predicteur, plan eclair,
 * mission du mois, series, badges, chronologie, face a face chiffre, arsenal,
 * niveau percu, progression, schemas, zones attaquees, objectifs, historique.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { ensureMonthlyMission } from '@/lib/partnerMissionsService';
import type { PartnerMission } from '@/lib/partnerModel';
import { ARCHETYPE_META } from '@/lib/partnerModel';
import { countResults, parseDate, plural, RESULT_COLOR, RESULT_LABEL, shortDate } from '@/lib/v2/combat/rounds';
import type { Partner, SessionEntry } from '@/lib/v2/combat/partners';
import type { PartnerInsights, Zone } from '@/lib/v2/combat/partnerInsights';
import { ZONE_LABELS } from '@/lib/v2/combat/partnerInsights';
import { BrushColumns, BrushTrend } from '../charts';
import { BeltBar, BigButton, Card, CIcon, D, Field, Glass, Hanko, InkBar, Kozane, N, P, Press, RecordBars, ResultPlate, Seal, Section, sportLabel, Stepper, tap, V } from '../ui';

// ─── Carte de guerrier ────────────────────────────────────────────────

export function WarriorCard({ p, ins, onPhoto }: { p: Partner; ins: PartnerInsights; onPhoto: () => void }) {
  const arch = p.archetype ? ARCHETYPE_META[p.archetype] : null;
  return (
    <Glass style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -18, top: -30 }} pointerEvents="none">
        <Glyph kind="sakura" size={180} color="rgba(29,32,41,0.05)" />
      </View>
      <View style={{ padding: 18, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Press onPress={onPhoto} accessibilityRole="button" accessibilityLabel={`Photo de ${p.name}`}>
            <View>
              <Seal name={p.name} photoUri={p.photoUri} belt={p.belt} size={104} tone={ins.title.color} />
              <View style={{ position: 'absolute', right: -6, bottom: -6, width: 34, height: 34, borderRadius: 17, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: P.white }}>
                <CIcon name="camera" size={16} color={P.white} />
              </View>
            </View>
          </Press>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: `${ins.title.color}18` }}>
              <Ink size={13} weight="extraBold" color={ins.title.color}>
                {ins.title.label}
              </Ink>
            </View>
            <Ink size={30} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {p.name}
            </Ink>
            {p.nickname ? (
              <Ink size={14} weight="bold" color={P.ink2} numberOfLines={1}>
                {`« ${p.nickname} »`}
              </Ink>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <BeltBar belt={p.belt} width={78} height={12} />
              {[sportLabel(p.sport), p.weight, arch?.label].filter(Boolean).map((t) => (
                <Ink key={t} size={13} weight="bold" color={P.muted}>
                  {t}
                </Ink>
              ))}
            </View>
          </View>
        </View>
        {ins.total > 0 ? (
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <RecordBars wins={ins.wins} losses={ins.losses} draws={ins.draws} />
            </View>
            <View style={{ alignItems: 'center', minWidth: 84 }}>
              <Ink size={40} weight="black" tight color={ins.winRate != null && ins.winRate >= 50 ? V : D}>
                {`${ins.winRate ?? 0}%`}
              </Ink>
              <Ink size={12} weight="bold" color={P.ink2}>
                de victoires
              </Ink>
            </View>
          </View>
        ) : (
          <Ink size={14} color={P.ink2}>
            Aucun round encore. Lance une séance de combat et indique son nom dans un round : son bilan se remplit tout seul.
          </Ink>
        )}
        {ins.total > 0 ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Ink size={13} weight="bold" color={P.ink2}>
                Niveau de menace
              </Ink>
              <Ink size={13} weight="extraBold" color={ins.threat >= 70 ? D : ins.threat >= 40 ? N : '#4F6B28'}>
                {`${ins.threat >= 70 ? 'Élevé' : ins.threat >= 40 ? 'Modéré' : 'Faible'}, ${ins.threat} %`}
              </Ink>
            </View>
            <InkBar value={ins.threat / 100} color={ins.threat >= 70 ? D : ins.threat >= 40 ? N : '#6E8C3A'} />
            <Ink size={12} color={P.muted}>
              {`${ins.title.description}${ins.avgRating != null ? `. Niveau perçu ${String(ins.avgRating).replace('.', ',')} sur 10` : ''}`}
            </Ink>
          </View>
        ) : null}
      </View>
    </Glass>
  );
}

// ─── Predicteur ───────────────────────────────────────────────────────

export function Predictor({ ins }: { ins: PartnerInsights }) {
  const pv = ins.prediction.value;
  const color = pv >= 70 ? '#4F6B28' : pv >= 50 ? V : pv >= 30 ? N : D;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ink size={14} weight="extraBold" color={P.ink2}>
          Avant de rouler
        </Ink>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <CIcon name={ins.prediction.trend === 'up' ? 'up' : ins.prediction.trend === 'down' ? 'down' : 'flat'} size={16} color={ins.prediction.trend === 'up' ? '#4F6B28' : ins.prediction.trend === 'down' ? D : P.muted} />
          <Ink size={13} weight="bold" color={P.muted}>
            {ins.prediction.trend === 'up' ? 'En forme' : ins.prediction.trend === 'down' ? 'Dans le creux' : 'Stable'}
          </Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={22} weight="black" tight>
            {ins.prediction.mood}
          </Ink>
          <Ink size={13} color={P.ink2}>
            {ins.total < 3 ? 'Pas encore assez de rounds, estimation neutre' : `Confiance ${ins.prediction.confidence}, d'après ton historique et ta forme récente`}
          </Ink>
        </View>
        <View style={{ width: 82, height: 82, borderRadius: 22, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          {/* fond de couleur fixe (fonce dans les deux modes) : le chiffre reste blanc */}
          <Ink size={32} weight="black" tight color={P.pureWhite}>
            {`${pv}`}
          </Ink>
          <Ink size={11} weight="bold" color="rgba(255,255,255,0.85)">
            % de chances
          </Ink>
        </View>
      </View>
      <InkBar value={pv / 100} color={color} height={10} />
    </Card>
  );
}

// ─── Plan eclair ──────────────────────────────────────────────────────

export function GamePlanFlash({ p, ins, onOpenPlan }: { p: Partner; ins: PartnerInsights; onOpenPlan: () => void }) {
  const lines = [...p.whatWorks.slice(0, 3).map((w) => ({ t: w, k: 'ok' as const })), ...p.weaknesses.slice(0, 2).map((w) => ({ t: w, k: 'cible' as const }))];
  const last = ins.blocks[0];
  if (lines.length === 0 && !ins.lastImprovement) {
    return null;
  }
  return (
    <Card style={{ gap: 12, borderColor: '#E9DDBE', backgroundColor: '#FFFDF7' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Hanko size={40} />
        <View style={{ flex: 1 }}>
          <Ink size={18} weight="black" tight>
            Plan pour monter sur le tapis
          </Ink>
          <Ink size={13} color={P.ink2}>
            {`Ce qui marche contre ${p.name} et ses failles`}
          </Ink>
        </View>
      </View>
      {lines.map((l, i) => (
        <View key={`${l.t}_${i}`} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: l.k === 'ok' ? V : N, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <CIcon name={l.k === 'ok' ? 'check' : 'target'} size={13} color={P.white} width={2.8} />
          </View>
          <Ink size={15} weight="bold" style={{ flex: 1 }}>
            {l.k === 'ok' ? l.t : `Cible : ${l.t}`}
          </Ink>
        </View>
      ))}
      {last ? (
        <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: P.line2, gap: 2 }}>
          <Ink size={12} weight="bold" color={P.muted}>
            Dernier résultat
          </Ink>
          <Ink size={14} weight="extraBold" color={RESULT_COLOR[last.result]}>
            {`${RESULT_LABEL[last.result]}${ins.lastImprovement ? `, à travailler : ${ins.lastImprovement.text}` : ''}`}
          </Ink>
        </View>
      ) : null}
      <Pressable onPress={() => { tap(); onOpenPlan(); }} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ink size={14} weight="extraBold" color={P.accent}>
          Ouvrir le plan de jeu complet
        </Ink>
        <CIcon name="chevron" size={14} color={P.accent} />
      </Pressable>
    </Card>
  );
}

// ─── Mission du mois ──────────────────────────────────────────────────

export function MissionCard({ partnerId, entries }: { partnerId: string; entries: SessionEntry[] }) {
  const [mission, setMission] = useState<PartnerMission | null>(null);
  useEffect(() => {
    ensureMonthlyMission(partnerId).then(setMission).catch(() => {});
  }, [partnerId]);
  const progress = useMemo(() => {
    if (!mission) return 0;
    const month = mission.month;
    const rounds = entries.filter((e) => e.training.date.slice(0, 7) === month).flatMap((e) => e.rounds);
    if (mission.targetType === 'wins') return Math.max(mission.progress, countResults(rounds).wins);
    if (mission.targetType === 'rounds') return Math.max(mission.progress, rounds.length);
    if (mission.targetType === 'no_tap') return Math.max(mission.progress, rounds.filter((r) => !(r.result === 'loss' && (r.methodsTaken?.length ?? 0) > 0)).length);
    return mission.progress;
  }, [mission, entries]);
  if (!mission) return null;
  const target = Math.max(1, mission.targetValue);
  const done = progress >= target || !!mission.completedAt;
  const plates = Math.min(10, target);
  const filled = Math.round((Math.min(progress, target) / target) * plates);
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={13} weight="extraBold" color={done ? '#4F6B28' : N}>
            {done ? 'Mission du mois accomplie' : 'Mission du mois'}
          </Ink>
          <Ink size={17} weight="black" tight>
            {mission.text}
          </Ink>
        </View>
        {done ? <Hanko size={44} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 2, flexWrap: 'wrap' }}>
        {Array.from({ length: plates }).map((_, i) => (
          <Kozane key={i} on={i < filled} w={24} h={30} />
        ))}
      </View>
      <Ink size={13} weight="bold" color={P.ink2}>
        {`${Math.min(progress, target)} sur ${target}`}
      </Ink>
    </Card>
  );
}

// ─── Series et badges ─────────────────────────────────────────────────

export function StreaksAndBadges({ ins, p }: { ins: PartnerInsights; p: Partner }) {
  const s = ins.streaks;
  const items: { label: string; value: string; color: string; icon: 'flame' | 'shield' | 'trophy' }[] = [];
  if (s.currentWinStreak >= 2) items.push({ label: 'Série en cours', value: plural(s.currentWinStreak, 'victoire'), color: D, icon: 'flame' });
  if (s.longestWinStreak >= 3 && s.longestWinStreak !== s.currentWinStreak) items.push({ label: 'Record de série', value: plural(s.longestWinStreak, 'victoire'), color: N, icon: 'trophy' });
  if (s.currentNoTapStreak >= 5) items.push({ label: 'Sans taper', value: plural(s.currentNoTapStreak, 'round'), color: '#4F6B28', icon: 'shield' });
  const badges = p.unlockedBadges ?? [];
  if (items.length === 0 && badges.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      {items.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {items.map((it) => (
            <Card key={it.label} style={{ flex: 1, padding: 14, gap: 6 }}>
              <CIcon name={it.icon} size={20} color={it.color} />
              <Ink size={17} weight="black" tight color={it.color}>
                {it.value}
              </Ink>
              <Ink size={12} weight="bold" color={P.ink2}>
                {it.label}
              </Ink>
            </Card>
          ))}
        </View>
      ) : null}
      {badges.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Section title="Sceaux gagnés" sub={`${badges.length} contre ${p.name}`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {badges.map((b) => (
              <View key={b.id} style={{ width: 132, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, gap: 8, alignItems: 'flex-start' }}>
                <Hanko size={36} rotate={-8} />
                <Ink size={14} weight="black" tight numberOfLines={2}>
                  {b.name}
                </Ink>
                <Ink size={11} color={P.ink2} numberOfLines={3}>
                  {b.description}
                </Ink>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

// ─── Chronologie des rounds ───────────────────────────────────────────

export function Timeline({ ins, name }: { ins: PartnerInsights; name: string }) {
  const sorted = [...ins.matchups].filter((m) => m.result).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  if (sorted.length === 0) return null;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ink size={18} weight="black" tight>
          {`Tous les rounds contre ${name}`}
        </Ink>
        <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: `${ins.momentum.color}18` }}>
          <Ink size={12} weight="extraBold" color={ins.momentum.color}>
            {ins.momentum.label}
          </Ink>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingVertical: 2 }}>
        {sorted.map((m, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <ResultPlate result={m.result === 'V' ? 'win' : m.result === 'D' ? 'loss' : 'draw'} size={22} />
            {m.tapOut ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: P.ink, marginTop: 3 }} /> : <View style={{ height: 9 }} />}
          </View>
        ))}
      </ScrollView>
      <Ink size={12} color={P.muted}>
        Du plus ancien au plus récent. Un point noir sous la plaque : tu as tapé.
      </Ink>
    </Card>
  );
}

export function YearTrend({ ins }: { ins: PartnerInsights }) {
  if (!ins.year.some((y) => y.value != null)) return null;
  return (
    <Card style={{ gap: 10 }}>
      <Ink size={18} weight="black" tight>
        Ton taux de victoire sur 12 mois
      </Ink>
      <Ink size={13} color={P.ink2}>
        Victoires sur les rounds gagnés ou perdus, mois par mois
      </Ink>
      <BrushTrend points={ins.year} color={V} />
    </Card>
  );
}

// ─── Face a face chiffre ──────────────────────────────────────────────

export function TaleOfTape({ ins, name }: { ins: PartnerInsights; name: string }) {
  if (ins.total === 0) return null;
  const rows = [
    { label: 'Points', me: ins.pointsFor, him: ins.pointsAgainst },
    { label: 'Soumissions', me: ins.subGiven, him: ins.subTaken },
    { label: 'Victoires', me: ins.wins, him: ins.losses },
  ];
  const it = ins.intensity;
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ink size={14} weight="black" color={V} style={{ flex: 1 }}>
          Toi
        </Ink>
        <Ink size={13} weight="extraBold" color={P.muted}>
          face à face
        </Ink>
        <Ink size={14} weight="black" color={D} style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
          {name}
        </Ink>
      </View>
      {rows.map((r) => {
        const m = Math.max(1, r.me, r.him);
        return (
          <View key={r.label} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Ink size={22} weight="black" tight color={r.me > r.him ? V : P.ink} style={{ flex: 1 }}>
                {String(r.me)}
              </Ink>
              <Ink size={13} weight="bold" color={P.ink2}>
                {r.label}
              </Ink>
              <Ink size={22} weight="black" tight color={r.him > r.me ? D : P.ink} style={{ flex: 1, textAlign: 'right' }}>
                {String(r.him)}
              </Ink>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: P.line2, overflow: 'hidden', alignItems: 'flex-end' }}>
                <View style={{ width: `${(r.me / m) * 100}%`, height: '100%', borderRadius: 5, backgroundColor: V }} />
              </View>
              <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: P.line2, overflow: 'hidden' }}>
                <View style={{ width: `${(r.him / m) * 100}%`, height: '100%', borderRadius: 5, backgroundColor: D }} />
              </View>
            </View>
          </View>
        );
      })}
      {it.guerre + it.technique + it.detendu > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { k: 'À fond', v: it.guerre, c: D, icon: 'bolt' as const },
            { k: 'Technique', v: it.technique, c: V, icon: 'target' as const },
            { k: 'Détendu', v: it.detendu, c: '#4F6B28', icon: 'leaf' as const },
          ]
            .filter((x) => x.v > 0)
            .map((x) => (
              <View key={x.k} style={{ flex: 1, borderRadius: 16, backgroundColor: `${x.c}12`, paddingVertical: 10, alignItems: 'center', gap: 2 }}>
                <CIcon name={x.icon} size={18} color={x.c} />
                <Ink size={18} weight="black" color={x.c}>
                  {String(x.v)}
                </Ink>
                <Ink size={11} weight="bold" color={x.c}>
                  {x.k}
                </Ink>
              </View>
            ))}
        </View>
      ) : null}
    </Card>
  );
}

// ─── Arsenal ──────────────────────────────────────────────────────────

function ArsenalList({ title, sub, items, color }: { title: string; sub: string; items: { label: string; count: number }[]; color: string }) {
  if (items.length === 0) return null;
  const max = items[0].count;
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 20, backgroundColor: `${color}0D`, borderWidth: 1, borderColor: `${color}2A` }}>
      <View>
        <Ink size={15} weight="black" color={color}>
          {title}
        </Ink>
        <Ink size={12} weight="bold" color={P.ink2}>
          {sub}
        </Ink>
      </View>
      {items.map((m, i) => (
        <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ink size={13} weight="black" color={color} style={{ width: 18 }}>
            {String(i + 1)}
          </Ink>
          <Ink size={14} weight="bold" style={{ flex: 1 }} numberOfLines={1}>
            {m.label}
          </Ink>
          <View style={{ width: 64 }}>
            <InkBar value={m.count / max} color={color} height={7} />
          </View>
          <Ink size={13} weight="black" color={color} style={{ width: 30, textAlign: 'right' }}>
            {`x${m.count}`}
          </Ink>
        </View>
      ))}
    </View>
  );
}

export function Arsenal({ ins, name }: { ins: PartnerInsights; name: string }) {
  if (ins.total === 0 || (ins.methodsGiven.length === 0 && ins.methodsTaken.length === 0)) return null;
  return (
    <View style={{ gap: 10 }}>
      <Section title="Arsenal" sub="Qui finit qui, et avec quoi" />
      <ArsenalList title="Ses armes contre toi" sub={`${name} t'a fini ${ins.subTaken} fois`} items={ins.methodsTaken} color={D} />
      <ArsenalList title="Tes armes contre lui" sub={`Tu l'as fini ${ins.subGiven} fois`} items={ins.methodsGiven} color={V} />
    </View>
  );
}

// ─── Niveau percu ─────────────────────────────────────────────────────

export function RatingCard({ ins }: { ins: PartnerInsights }) {
  const r = ins.ratings;
  if (r.length === 0) return null;
  const avg = r.reduce((s, x) => s + x.rating, 0) / r.length;
  const t = ins.ratingTrend;
  const msg =
    t > 1 ? `Tu le perçois ${t} points plus fort qu'au début : il progresse.` : t < -1 ? `Tu le perçois ${Math.abs(t)} points moins fort qu'au début : tu progresses sur lui.` : t === 1 ? 'Légère montée en puissance.' : t === -1 ? 'Tu commences à le dominer légèrement.' : 'Niveau stable round après round.';
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Ink size={18} weight="black" tight>
            Niveau perçu, round par round
          </Ink>
          <Ink size={13} color={P.ink2}>
            {`Sur ${plural(r.length, 'round')}, de ${Math.min(...r.map((x) => x.rating))} à ${Math.max(...r.map((x) => x.rating))}`}
          </Ink>
        </View>
        <Ink size={30} weight="black" tight color={N}>
          {(Math.round(avg * 10) / 10).toString().replace('.', ',')}
          <Ink size={13} weight="bold" color={P.muted}>
            {' sur 10'}
          </Ink>
        </Ink>
      </View>
      {r.length >= 2 ? <BrushColumns data={r.slice(-14).map((x, i) => ({ label: String(i + 1), value: x.rating }))} max={10} color={N} height={130} /> : null}
      <Ink size={14} weight="bold" color={P.ink2}>
        {msg}
      </Ink>
    </Card>
  );
}

// ─── Progression ──────────────────────────────────────────────────────

export function Progression({ ins }: { ins: PartnerInsights }) {
  if (ins.blocks.length === 0) return null;
  const diff = ins.monthly.length >= 2 ? ins.monthly[ins.monthly.length - 1].rate - ins.monthly[0].rate : 0;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ink size={18} weight="black" tight>
          Séance par séance
        </Ink>
        {ins.currentStreak && ins.currentStreak.count >= 2 ? (
          <Ink size={13} weight="extraBold" color={ins.currentStreak.type === 'win' ? V : D}>
            {`${ins.currentStreak.count} ${ins.currentStreak.type === 'win' ? 'victoires' : 'défaites'} d'affilée`}
          </Ink>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {ins.blocks.map((b, i) => (
          <ResultPlate key={i} result={b.result} size={28} dim={i > 0} label={shortDate(b.date).replace('.', '')} />
        ))}
      </ScrollView>
      <Ink size={12} color={P.muted}>
        La plus récente à gauche
      </Ink>
      {ins.monthly.length >= 2 ? (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Ink size={14} weight="extraBold" color={P.ink2}>
            Taux de victoire par mois
          </Ink>
          <BrushColumns data={ins.monthly.map((m) => ({ label: m.label, value: m.rate }))} max={100} format={(v) => `${v}%`} color={V} />
          {Math.abs(diff) >= 5 ? (
            <Ink size={13} weight="extraBold" color={diff > 0 ? '#4F6B28' : D}>
              {`${diff > 0 ? '+' : ''}${diff} points sur ${ins.monthly.length} mois`}
            </Ink>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

// ─── Schemas detectes ─────────────────────────────────────────────────

function ChipList({ items, color }: { items: { label: string; count: number }[]; color: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {items.map((t) => (
        <View key={t.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: `${color}14` }}>
          <Ink size={13} weight="bold" color={color}>
            {t.label}
          </Ink>
          <Ink size={12} weight="black" color={`${color}AA`}>
            {`x${t.count}`}
          </Ink>
        </View>
      ))}
    </View>
  );
}

export function Patterns({ ins }: { ins: PartnerInsights }) {
  if (!ins.lastImprovement && ins.topGiven.length === 0 && ins.topTaken.length === 0 && ins.topWhatWorked.length === 0) return null;
  return (
    <Card style={{ gap: 14 }}>
      <Ink size={18} weight="black" tight>
        Ce qui revient
      </Ink>
      {ins.lastImprovement ? (
        <View style={{ padding: 12, borderRadius: 16, backgroundColor: P.indigoSoft, gap: 2 }}>
          <Ink size={12} weight="extraBold" color={P.indigo}>
            {`Dernier objectif, ${shortDate(ins.lastImprovement.date)}`}
          </Ink>
          <Ink size={15} weight="bold">
            {ins.lastImprovement.text}
          </Ink>
        </View>
      ) : null}
      {ins.topGiven.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Ink size={13} weight="extraBold" color={V}>
            Tes meilleures finitions
          </Ink>
          <ChipList items={ins.topGiven} color={V} />
        </View>
      ) : null}
      {ins.topTaken.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Ink size={13} weight="extraBold" color={D}>
            Il te finit le plus souvent par
          </Ink>
          <ChipList items={ins.topTaken} color={D} />
        </View>
      ) : null}
      {ins.topWhatWorked.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Ink size={13} weight="extraBold" color={N}>
            Ce qui fonctionne le mieux
          </Ink>
          <ChipList items={ins.topWhatWorked} color={N} />
        </View>
      ) : null}
    </Card>
  );
}

// ─── Zones attaquees ──────────────────────────────────────────────────

export function ZoneMap({ ins }: { ins: PartnerInsights }) {
  const z = ins.zones;
  const max = Math.max(1, ...Object.values(z));
  if (ins.subTaken === 0) return null;
  const fill = (k: Zone) => {
    const r = z[k] / max;
    if (r === 0) return P.line2;
    if (r < 0.34) return '#E9C9C6';
    if (r < 0.67) return '#D06F72';
    return D;
  };
  const order = (Object.keys(ZONE_LABELS) as Zone[]).filter((k) => z[k] > 0).sort((a, b) => z[b] - z[a]);
  return (
    <Card style={{ gap: 10 }}>
      <Ink size={18} weight="black" tight>
        Où il t'attrape
      </Ink>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Svg width={110} height={210} viewBox="0 0 110 220">
          <Circle cx={55} cy={22} r={17} fill={P.line} />
          <Rect x={47} y={37} width={16} height={10} rx={4} fill={fill('neck')} />
          <Rect x={30} y={47} width={50} height={70} rx={14} fill={fill('torso')} />
          <Rect x={33} y={52} width={44} height={14} rx={7} fill={fill('back')} opacity={0.9} />
          <Rect x={12} y={50} width={14} height={62} rx={7} fill={fill('arms')} />
          <Rect x={84} y={50} width={14} height={62} rx={7} fill={fill('arms')} />
          <Rect x={32} y={120} width={20} height={92} rx={9} fill={fill('legs')} />
          <Rect x={58} y={120} width={20} height={92} rx={9} fill={fill('legs')} />
        </Svg>
        <View style={{ flex: 1, gap: 8 }}>
          {order.length === 0 ? (
            <Ink size={13} color={P.muted}>
              Les finitions notées ne correspondent à aucune zone connue.
            </Ink>
          ) : (
            order.map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: fill(k) }} />
                <Ink size={13} weight="bold" style={{ flex: 1 }}>
                  {ZONE_LABELS[k]}
                </Ink>
                <Ink size={14} weight="black" color={D}>
                  {String(z[k])}
                </Ink>
              </View>
            ))
          )}
        </View>
      </View>
    </Card>
  );
}

// ─── Objectifs ────────────────────────────────────────────────────────

export function ActiveGoal({ p, onSet, onAchieved }: { p: Partner; onSet: (text: string) => void; onAchieved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.activeGoal?.text ?? '');
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ink size={18} weight="black" tight>
          Objectif du prochain combat
        </Ink>
        <Pressable onPress={() => { tap(); setDraft(p.activeGoal?.text ?? ''); setEditing((v) => !v); }} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Ink size={14} weight="extraBold" color={P.accent}>
            {editing ? 'Annuler' : p.activeGoal?.text ? 'Modifier' : 'Définir'}
          </Ink>
        </Pressable>
      </View>
      {editing ? (
        <View style={{ gap: 10 }}>
          <Field value={draft} onChangeText={setDraft} multiline autoFocus placeholder="Par exemple : travailler ma garde papillon, finir en triangle" />
          <BigButton
            label="Enregistrer l'objectif"
            onPress={() => {
              if (!draft.trim()) return;
              onSet(draft.trim());
              setEditing(false);
            }}
          />
        </View>
      ) : p.activeGoal?.text ? (
        <View style={{ gap: 10 }}>
          <View style={{ padding: 14, borderRadius: 18, backgroundColor: P.accentSoft }}>
            <Ink size={17} weight="extraBold">
              {p.activeGoal.text}
            </Ink>
            <Ink size={12} weight="bold" color={P.ink2} style={{ marginTop: 4 }}>
              {`Depuis le ${shortDate(p.activeGoal.createdAt)}`}
            </Ink>
          </View>
          <BigButton label="Objectif atteint" tone="ink" icon="check" onPress={onAchieved} />
        </View>
      ) : (
        <Ink size={14} color={P.ink2}>
          Fixe-toi un objectif précis pour ton prochain combat contre lui.
        </Ink>
      )}
    </Card>
  );
}

export function LongTermGoal({ p, winRate, onSet, onClear }: { p: Partner; winRate: number | null; onSet: (g: { text: string; targetWinRate: number; deadline: string }) => void; onClear: () => void }) {
  const g = p.longTermGoal;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(g?.text ?? '');
  const [rate, setRate] = useState(g?.targetWinRate ?? 60);
  const defMonths = 3;
  const [months, setMonths] = useState(defMonths);
  const progress = winRate ?? 0;
  const pct = g ? Math.min(100, Math.round((progress / Math.max(1, g.targetWinRate)) * 100)) : 0;
  const daysLeft = g ? Math.ceil((parseDate(g.deadline).getTime() - Date.now()) / 86400000) : 0;
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ink size={18} weight="black" tight>
          Objectif à long terme
        </Ink>
        <Pressable onPress={() => { tap(); setText(g?.text ?? ''); setRate(g?.targetWinRate ?? 60); setEditing((v) => !v); }} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Ink size={14} weight="extraBold" color={P.accent}>
            {editing ? 'Annuler' : g ? 'Modifier' : 'Définir'}
          </Ink>
        </Pressable>
      </View>
      {editing ? (
        <View style={{ gap: 12 }}>
          <Field value={text} onChangeText={setText} placeholder="Par exemple : le dominer en garde fermée" />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={14} weight="bold" color={P.ink2}>
              Taux de victoire visé
            </Ink>
            <Stepper value={rate} onChange={setRate} step={10} min={10} max={100} format={(v) => `${v}%`} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={14} weight="bold" color={P.ink2}>
              Délai
            </Ink>
            <Stepper value={months} onChange={setMonths} min={1} max={24} format={(v) => `${v} mois`} />
          </View>
          <BigButton
            label="Enregistrer l'objectif"
            onPress={() => {
              if (!text.trim()) return;
              const d = new Date();
              d.setMonth(d.getMonth() + months);
              const deadline = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              onSet({ text: text.trim(), targetWinRate: rate, deadline });
              setEditing(false);
            }}
          />
        </View>
      ) : g ? (
        <View style={{ gap: 10 }}>
          <Ink size={16} weight="extraBold">
            {g.text}
          </Ink>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Ink size={13} weight="bold" color={P.ink2}>
              {`${progress} % aujourd'hui, objectif ${g.targetWinRate} %`}
            </Ink>
            <Ink size={13} weight="extraBold" color={daysLeft > 0 ? P.indigo : D}>
              {daysLeft > 0 ? `encore ${plural(daysLeft, 'jour')}` : 'délai dépassé'}
            </Ink>
          </View>
          <InkBar value={pct / 100} color={pct >= 100 ? '#6E8C3A' : P.indigo} height={12} />
          {pct >= 100 ? <BigButton label="Objectif atteint" tone="ink" icon="trophy" onPress={onClear} /> : null}
        </View>
      ) : (
        <Ink size={14} color={P.ink2}>
          Fixe un taux de victoire à atteindre avant une date.
        </Ink>
      )}
    </Card>
  );
}

// ─── Historique des seances ───────────────────────────────────────────

export function SessionHistory({ entries, name, onNew }: { entries: SessionEntry[]; name: string; onNew: () => void }) {
  if (entries.length === 0) {
    return (
      <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        <CIcon name="swords" size={34} color={P.muted} />
        <Ink size={17} weight="black" tight>
          Aucune séance encore
        </Ink>
        <Ink size={14} color={P.ink2} style={{ textAlign: 'center' }}>
          {`Lance une séance de combat et écris « ${name} » dans un round : tout s'affiche ici.`}
        </Ink>
        <View style={{ alignSelf: 'stretch', marginTop: 4 }}>
          <BigButton label="Nouvelle séance de combat" onPress={onNew} />
        </View>
      </Card>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {entries.map((e, i) => (
        <SessionRow key={`${e.training.id ?? i}_${i}`} entry={e} />
      ))}
    </View>
  );
}

function SessionRow({ entry }: { entry: SessionEntry }) {
  const [open, setOpen] = useState(false);
  const c = countResults(entry.rounds);
  const result = c.wins > c.losses ? 'win' : c.losses > c.wins ? 'loss' : 'draw';
  const hasAnalysis = entry.rounds.some((r) => r.gamePlan || r.whatWorked || r.whatDidntWork || r.counteredBy || r.improvement);
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <Pressable onPress={() => { tap(); setOpen((v) => !v); }} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 64 }}>
        <ResultPlate result={result} size={26} />
        <View style={{ flex: 1 }}>
          <Ink size={15} weight="extraBold">
            {`${shortDate(entry.training.date, true)}, ${RESULT_LABEL[result].toLowerCase()}`}
          </Ink>
          <Ink size={13} color={P.ink2}>
            {`${plural(entry.rounds.length, 'round')} : ${c.wins} V, ${c.losses} D${c.draws ? `, ${c.draws} N` : ''}`}
          </Ink>
        </View>
        {hasAnalysis ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: P.gold }} /> : null}
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <CIcon name="chevron" size={16} color={P.muted} />
        </View>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}>
          {entry.rounds.map((r, i) => {
            const rc = r.result ? RESULT_COLOR[r.result] : P.muted;
            const items = [
              { k: 'Plan', v: r.gamePlan, c: P.indigo },
              { k: 'A marché', v: r.whatWorked, c: V },
              { k: "N'a pas marché", v: r.whatDidntWork, c: D },
              { k: 'Contré par', v: r.counteredBy, c: N },
              { k: 'À améliorer', v: r.improvement, c: P.ink2 },
            ].filter((x) => !!x.v);
            return (
              <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: rc, paddingLeft: 12, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Ink size={14} weight="black">
                    {`Round ${r.number}`}
                  </Ink>
                  {r.result ? (
                    <Ink size={13} weight="extraBold" color={rc}>
                      {RESULT_LABEL[r.result]}
                    </Ink>
                  ) : null}
                  {r.pointsFor != null || r.pointsAgainst != null ? (
                    <Ink size={13} weight="bold" color={P.ink2}>
                      {`${r.pointsFor ?? 0} à ${r.pointsAgainst ?? 0}`}
                    </Ink>
                  ) : null}
                </View>
                {r.methodsGiven && r.methodsGiven.length > 0 ? (
                  <Ink size={13} weight="bold" color={V}>
                    {`Finitions : ${r.methodsGiven.map(getMethodDisplayName).join(', ')}`}
                  </Ink>
                ) : null}
                {r.methodsTaken && r.methodsTaken.length > 0 ? (
                  <Ink size={13} weight="bold" color={D}>
                    {`Subies : ${r.methodsTaken.map(getMethodDisplayName).join(', ')}`}
                  </Ink>
                ) : null}
                {r.notes ? (
                  <Ink size={13} color={P.ink2}>
                    {r.notes}
                  </Ink>
                ) : null}
                {items.map((x) => (
                  <View key={x.k} style={{ flexDirection: 'row', gap: 8 }}>
                    <Ink size={12} weight="extraBold" color={x.c} style={{ width: 96 }}>
                      {x.k}
                    </Ink>
                    <Ink size={13} style={{ flex: 1 }}>
                      {x.v}
                    </Ink>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
