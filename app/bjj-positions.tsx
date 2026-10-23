/**
 * Carte des positions JJB v2 : le tatami vu d'en haut, chaque position est une
 * plaque qui s'encre selon tes finitions. Touche une plaque pour noter le temps
 * passe et les soumissions tentees ou reussies depuis cette position.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ALL_SUBMISSIONS } from '@/components/BJJBodyMap';
import { makeId, plural } from '@/lib/v2/combat/rounds';
import { BigButton, Card, Chip, CIcon, D, DetailScreen, Enter, Field, FormSheet, Glass, IconBtn, InkBar, N, P, Press, RankRow, Section, Stat, Stepper, tap, V } from '@/components/yoroi/v2/combat/ui';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

interface SubmissionEntry {
  id: string;
  name: string;
  attempts: number;
  successes: number;
}
interface BJJPosition {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  submissions: SubmissionEntry[];
  timeMinutes: number;
}

const STORAGE_KEY = '@yoroi_bjj_positions';
const DEFAULT_POSITIONS: BJJPosition[] = [
  { id: 'mount', name: 'Monté', x: 50, y: 12, color: '#6E8C3A', submissions: [], timeMinutes: 0 },
  { id: 'back', name: 'Dos', x: 82, y: 24, color: '#6E8C3A', submissions: [], timeMinutes: 0 },
  { id: 'turtle', name: 'Tortue', x: 18, y: 24, color: '#A8832F', submissions: [], timeMinutes: 0 },
  { id: 'side_control', name: 'Contrôle latéral', x: 76, y: 46, color: '#6E8C3A', submissions: [], timeMinutes: 0 },
  { id: 'half_guard', name: 'Demi-garde', x: 24, y: 46, color: '#3D5D9E', submissions: [], timeMinutes: 0 },
  { id: 'guard', name: traduire('Garde fermée'), x: 50, y: 58, color: '#3D5D9E', submissions: [], timeMinutes: 0 },
  { id: 'butterfly', name: 'Papillon', x: 50, y: 74, color: '#3D5D9E', submissions: [], timeMinutes: 0 },
  { id: 'standing', name: 'Debout', x: 50, y: 90, color: '#A8832F', submissions: [], timeMinutes: 0 },
];
const ROLE: Record<string, { color: string; role: string }> = {
  mount: { color: '#6E8C3A', role: 'Dessus' },
  back: { color: '#6E8C3A', role: 'Dessus' },
  side_control: { color: '#6E8C3A', role: 'Dessus' },
  guard: { color: '#3D5D9E', role: 'Dessous' },
  half_guard: { color: '#3D5D9E', role: 'Dessous' },
  butterfly: { color: '#3D5D9E', role: 'Dessous' },
  turtle: { color: '#A8832F', role: 'Transition' },
  standing: { color: '#A8832F', role: 'Debout' },
};
// Transitions dessinees au pinceau entre positions
const LINKS: [string, string][] = [
  ['standing', 'butterfly'],
  ['butterfly', 'guard'],
  ['guard', 'half_guard'],
  ['guard', 'side_control'],
  ['half_guard', 'turtle'],
  ['side_control', 'mount'],
  ['side_control', 'back'],
  ['turtle', 'back'],
  ['mount', 'back'],
];
const QUICK = ['triangle', 'armbar', 'rnc', 'kimura', 'guillotine', 'americana', 'omoplata', 'darce', 'armtri', 'ezekiel', 'bowarrow', 'heelint'];

const sumSucc = (p: BJJPosition) => p.submissions.reduce((s, x) => s + x.successes, 0);

export default function BJJPositionsScreen() {
  const { width } = useWindowDimensions();
  const [positions, setPositions] = useState<BJJPosition[]>(DEFAULT_POSITIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState('');
  const [attempts, setAttempts] = useState(1);
  const [successes, setSuccesses] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved: unknown = JSON.parse(raw);
        if (!Array.isArray(saved)) return;
        setPositions(DEFAULT_POSITIONS.map((def) => {
          const ex = (saved as BJJPosition[]).find((s) => s && s.id === def.id);
          return ex ? { ...def, ...ex, x: def.x, y: def.y, submissions: Array.isArray(ex.submissions) ? ex.submissions : [], timeMinutes: ex.timeMinutes || 0 } : def;
        }));
      })
      .catch(() => {});
  }, []);

  const persist = async (next: BJJPosition[]) => {
    setPositions(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // etat local deja a jour
    }
  };

  const selected = selectedId ? positions.find((p) => p.id === selectedId) ?? null : null;
  const g = useMemo(() => {
    let a = 0;
    let s = 0;
    let t = 0;
    for (const p of positions) {
      t += p.timeMinutes;
      for (const x of p.submissions) {
        a += x.attempts;
        s += x.successes;
      }
    }
    return { a, s, t, rate: a > 0 ? Math.round((s / a) * 100) : 0 };
  }, [positions]);
  const maxSucc = Math.max(1, ...positions.map(sumSucc));

  const mapW = width - 44;
  const mapH = Math.round(mapW * 1.08);
  const plateW = 92;
  const plateH = 56;
  const pos = (p: BJJPosition) => ({ x: (p.x / 100) * mapW, y: (p.y / 100) * mapH });

  const addSub = async () => {
    if (!selected || !name.trim()) return;
    tap('medium');
    const entry: SubmissionEntry = { id: makeId(), name: name.trim(), attempts: Math.max(0, attempts), successes: Math.max(0, Math.min(successes, Math.max(attempts, successes))) };
    await persist(positions.map((p) => (p.id === selected.id ? { ...p, submissions: [...p.submissions, entry] } : p)));
    setSheet(false);
  };
  const bump = async (posId: string, subId: string, field: 'attempts' | 'successes', delta: number) => {
    tap();
    await persist(positions.map((p) => (p.id === posId ? { ...p, submissions: p.submissions.map((s) => (s.id === subId ? { ...s, [field]: Math.max(0, s[field] + delta), ...(field === 'successes' && delta > 0 ? { attempts: Math.max(s.attempts, s.successes + delta) } : {}) } : s)) } : p)));
  };
  const removeSub = async (posId: string, subId: string) => {
    await persist(positions.map((p) => (p.id === posId ? { ...p, submissions: p.submissions.filter((s) => s.id !== subId) } : p)));
  };
  const setTime = async (posId: string, v: number) => {
    await persist(positions.map((p) => (p.id === posId ? { ...p, timeMinutes: Math.max(0, v) } : p)));
  };

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_SUBMISSIONS.filter((s) => QUICK.includes(s.id));
    return ALL_SUBMISSIONS.filter((s) => s.short.toLowerCase().includes(q) || s.full.toLowerCase().includes(q)).slice(0, 12);
  }, [search]);

  return (
    <DetailScreen title="Carte JJB" subtitle={traduire("Tes positions, tes finitions")}>
      <Enter i={0}>
        <Glass style={{ flexDirection: 'row' }}>
          <Stat value={String(g.a)} label="tentatives" color={N} />
          <Stat value={String(g.s)} label="finitions" color={V} />
          <Stat value={`${g.rate} %`} label={traduire("réussite")} color={D} />
          <Stat value={g.t >= 60 ? `${Math.floor(g.t / 60)} h` : `${g.t} min`} label="en position" />
        </Glass>
      </Enter>

      <Enter i={1}>
        <View style={{ width: mapW, height: mapH, borderRadius: 28, overflow: 'hidden', backgroundColor: '#EDE6D3', borderWidth: 1, borderColor: '#E0D6BC' }}>
          <Svg width={mapW} height={mapH} style={{ position: 'absolute' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Rect key={i} x={0} y={(i * mapH) / 6} width={mapW} height={1.5} fill="rgba(156,122,47,0.16)" />
            ))}
            <Rect x={14} y={14} width={mapW - 28} height={mapH - 28} rx={20} fill="none" stroke="rgba(110,140,58,0.35)" strokeWidth={3} />
            {LINKS.map(([a, b]) => {
              const pa = positions.find((p) => p.id === a);
              const pb = positions.find((p) => p.id === b);
              if (!pa || !pb) return null;
              const A = pos(pa);
              const B = pos(pb);
              const mx = (A.x + B.x) / 2 + (A.y - B.y) * 0.12;
              const my = (A.y + B.y) / 2;
              return <Path key={`${a}_${b}`} d={`M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}`} stroke="rgba(29,32,41,0.22)" strokeWidth={5} strokeLinecap="round" fill="none" />;
            })}
          </Svg>
          <Ink size={12} weight="extraBold" color="rgba(29,32,41,0.4)" style={{ position: 'absolute', left: 22, top: 20 }}>
            Dessus
          </Ink>
          <Ink size={12} weight="extraBold" color="rgba(29,32,41,0.4)" style={{ position: 'absolute', left: 22, bottom: 18 }}>
            Debout
          </Ink>
          {positions.map((p) => {
            const c = ROLE[p.id]?.color ?? p.color;
            const s = sumSucc(p);
            const ratio = s / maxSucc;
            const on = p.id === selectedId;
            const fill = s === 0 ? 'rgba(255,255,255,0.88)' : ratio < 0.34 ? `${c}55` : ratio < 0.67 ? `${c}AA` : c;
            const dark = s > 0 && ratio >= 0.34;
            const { x, y } = pos(p);
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  tap();
                  setSelectedId(on ? null : p.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${p.name}, ${plural(s, 'finition')}`}
                style={{ position: 'absolute', left: x - plateW / 2, top: y - plateH / 2, width: plateW, height: plateH }}
              >
                <View style={{ flex: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: fill, borderWidth: on ? 3 : 1.5, borderColor: on ? P.ink : c, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 10, height: 3, backgroundColor: dark ? blancA(0.4) : `${c}40` }} />
                  <Ink size={12} weight="black" color={dark ? P.white : P.ink} numberOfLines={2} style={{ textAlign: 'center', lineHeight: 14 }}>
                    {p.name}
                  </Ink>
                  {s > 0 || p.timeMinutes > 0 ? (
                    <Ink size={11} weight="bold" color={dark ? 'rgba(255,255,255,0.9)' : P.ink2} numberOfLines={1}>
                      {s > 0 ? plural(s, 'finition') : `${p.timeMinutes} min`}
                    </Ink>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Enter>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {[
          { l: traduire('Positions du dessus'), c: '#6E8C3A' },
          { l: 'Gardes', c: '#3D5D9E' },
          { l: traduire('Debout et transitions'), c: '#A8832F' },
        ].map((x) => (
          <View key={x.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: x.c }} />
            <Ink size={12} weight="bold" color={P.ink2}>
              {x.l}
            </Ink>
          </View>
        ))}
      </View>
      <Ink size={12} color={P.muted}>
        {traduire("Plus une plaque est encrée, plus tu finis depuis cette position.")}</Ink>

      {selected ? (
        <Card style={{ gap: 14, borderLeftWidth: 5, borderLeftColor: ROLE[selected.id]?.color ?? selected.color }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Ink size={12} weight="extraBold" color={ROLE[selected.id]?.color ?? selected.color}>
                {ROLE[selected.id]?.role ?? 'Position'}
              </Ink>
              <Ink size={24} weight="black" tight>
                {selected.name}
              </Ink>
            </View>
            <IconBtn icon="close" label={traduire("Fermer la position")} onPress={() => setSelectedId(null)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={14} weight="bold" color={P.ink2}>
              {traduire("Temps passé ici")}</Ink>
            <Stepper value={selected.timeMinutes} step={5} onChange={(v) => setTime(selected.id, v)} format={(v) => `${v} min`} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={16} weight="black">
              {traduire("Soumissions depuis ici")}</Ink>
            <IconBtn
              icon="plus"
              tone="red"
              label={traduire("Ajouter une soumission")}
              onPress={() => {
                setName('');
                setSearch('');
                setAttempts(1);
                setSuccesses(0);
                setSheet(true);
              }}
            />
          </View>
          {selected.submissions.length === 0 ? (
            <Ink size={14} color={P.muted}>
              {traduire("Aucune soumission notée depuis cette position.")}</Ink>
          ) : (
            selected.submissions.map((s) => {
              const rate = s.attempts > 0 ? Math.round((s.successes / s.attempts) * 100) : 0;
              const rc = rate >= 50 ? V : rate >= 25 ? N : D;
              return (
                <View key={s.id} style={{ gap: 8, padding: 12, borderRadius: 18, backgroundColor: P.paper }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ink size={15} weight="black" style={{ flex: 1 }} numberOfLines={2}>
                      {s.name}
                    </Ink>
                    <Ink size={16} weight="black" color={rc}>
                      {`${rate} %`}
                    </Ink>
                    <IconBtn icon="trash" size={36} label={`Retirer ${s.name}`} onPress={() => removeSub(selected.id, s.id)} />
                  </View>
                  <InkBar value={rate / 100} color={rc} height={7} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Press onPress={() => bump(selected.id, s.id, 'attempts', 1)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={traduire("Une tentative de plus pour {0}", s.name)}>
                      <View style={{ height: 44, borderRadius: 14, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                        <Ink size={14} weight="extraBold" color={N}>{`${s.attempts} tentatives`}</Ink>
                        <CIcon name="plus" size={14} color={N} />
                      </View>
                    </Press>
                    <Press onPress={() => bump(selected.id, s.id, 'successes', 1)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={traduire("Une finition de plus pour {0}", s.name)}>
                      <View style={{ height: 44, borderRadius: 14, backgroundColor: V, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                        <Ink size={14} weight="extraBold" color={P.white}>{`${s.successes} finitions`}</Ink>
                        <CIcon name="plus" size={14} color={P.white} />
                      </View>
                    </Press>
                  </View>
                </View>
              );
            })
          )}
        </Card>
      ) : (
        <Card>
          <Ink size={14} color={P.ink2}>
            {traduire("Touche une position sur la carte pour noter ce qui s'y passe.")}</Ink>
        </Card>
      )}

      {g.s > 0 ? (
        <>
          <Section title={traduire("Tes positions offensives")} sub={traduire("Là où tu finis le plus")} />
          <Card style={{ gap: 14 }}>
            {[...positions]
              .map((p) => ({ p, s: sumSucc(p) }))
              .filter((x) => x.s > 0)
              .sort((a, b) => b.s - a.s)
              .slice(0, 4)
              .map((x, i) => (
                <RankRow key={x.p.id} index={i} label={x.p.name} value={x.s} max={maxSucc} color={ROLE[x.p.id]?.color ?? x.p.color} />
              ))}
          </Card>
        </>
      ) : null}

      <FormSheet visible={sheet} onClose={() => setSheet(false)} title={traduire("Nouvelle soumission")} sub={selected ? traduire("Depuis {0}", selected.name.toLowerCase()) : undefined}>
        <Field value={search} onChangeText={(v) => { setSearch(v); setName(v); }} placeholder={traduire("Cherche ou écris une soumission")} autoFocus />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((s) => (
            <Chip key={s.id} label={s.short} on={name === s.short} onPress={() => setName(s.short)} color={P.accent} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Ink size={14} weight="bold" color={P.ink2}>
            Tentatives
          </Ink>
          <Stepper value={attempts} onChange={(v) => { setAttempts(v); if (successes > v) setSuccesses(v); }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Ink size={14} weight="bold" color={P.ink2}>
            {traduire("Réussies")}</Ink>
          <Stepper value={successes} onChange={(v) => { setSuccesses(v); if (v > attempts) setAttempts(v); }} color={V} />
        </View>
        <BigButton label={name.trim() ? traduire("Ajouter {0}", name.trim()) : traduire('Choisis une soumission')} onPress={addSub} disabled={!name.trim()} />
      </FormSheet>
    </DetailScreen>
  );
}
