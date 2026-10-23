/**
 * Onglets J, S, M, 6 M de l'ecran « Ta nuit » et l'historique en barres (une nuit par barre, ou une semaine en 6 M).
 * Les durees viennent de tes nuits enregistrees, rien n'est complete.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';
import type { SleepEntry } from '@/lib/sleepService';
import { duree } from './outils';
import { GrandeDuree } from './GrandeDuree';
import { traduire } from '@/lib/i18n/tr';

export type Periode = 'J' | 'S' | 'M' | '6M';
const LIBELLE: Record<Periode, string> = { J: 'J', S: 'S', M: 'M', '6M': '6 M' };
const NOM: Record<Periode, string> = { J: 'jour', S: 'semaine', M: 'mois', '6M': traduire('six mois') };

export function OngletsPeriode({ value, onChange }: { value: Periode; onChange: (p: Periode) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: P.line2, borderRadius: 12, padding: 3 }} accessibilityRole="tablist">
      {(Object.keys(LIBELLE) as Periode[]).map((p) => {
        const on = p === value;
        return (
          <Pressable
            key={p}
            onPress={() => onChange(p)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Vue ${NOM[p]}`}
            style={{ flex: 1, minHeight: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.white : 'transparent', shadowColor: '#000', shadowOpacity: on ? 0.08 : 0, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
          >
            <Ink size={14} weight={on ? 'black' : 'bold'} color={on ? P.ink : P.ink2}>
              {LIBELLE[p]}
            </Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

const JOURS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const JOURS_LONG = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];

function cle(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Barre = { label: string; detail: string; valeur: number | null };

/** Une barre par nuit (S, M) ou par semaine (6 M), finissant au jour regarde */
export function barresPeriode(entries: SleepEntry[], fin: string, periode: Exclude<Periode, 'J'>): { barres: Barre[]; moyenne: number | null; du: Date; au: Date } {
  const parJour = new Map<string, number>();
  for (const e of entries) {
    const k = (e.date ?? '').slice(0, 10);
    if (e.duration > 0) parJour.set(k, Math.max(parJour.get(k) ?? 0, e.duration));
  }
  const au = new Date(fin.slice(0, 10) + 'T12:00:00');
  const jours = periode === 'S' ? 7 : periode === 'M' ? 30 : 26 * 7;
  const du = new Date(au);
  du.setDate(du.getDate() - (jours - 1));
  const vals: number[] = [];
  const barres: Barre[] = [];
  if (periode === '6M') {
    for (let s = 0; s < 26; s++) {
      const n: number[] = [];
      const a = new Date(du);
      a.setDate(a.getDate() + s * 7);
      for (let j = 0; j < 7; j++) {
        const d = new Date(a);
        d.setDate(d.getDate() + j);
        const v = parJour.get(cle(d));
        if (v) n.push(v);
      }
      n.forEach((v) => vals.push(v));
      const b = new Date(a);
      b.setDate(b.getDate() + 6);
      const prem = s === 0 || a.getDate() <= 7;
      barres.push({
        label: prem ? MOIS[a.getMonth()] : '',
        detail: traduire("Semaine du {0} {1}{2}", a.getDate(), MOIS[a.getMonth()], n.length ? `, ${n.length} ${n.length > 1 ? 'nuits' : 'nuit'}` : ''),
        valeur: n.length ? Math.round(n.reduce((x, y) => x + y, 0) / n.length) : null,
      });
    }
  } else {
    for (let i = 0; i < jours; i++) {
      const d = new Date(du);
      d.setDate(d.getDate() + i);
      const v = parJour.get(cle(d)) ?? null;
      if (v) vals.push(v);
      const label = periode === 'S' ? JOURS[d.getDay()] : (jours - 1 - i) % 7 === 0 ? String(d.getDate()) : '';
      barres.push({ label, detail: `${JOURS_LONG[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`, valeur: v });
    }
  }
  const moyenne = vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null;
  return { barres, moyenne, du, au };
}

export function Historique({ entries, fin, periode }: { entries: SleepEntry[]; fin: string; periode: Exclude<Periode, 'J'> }) {
  const { barres, moyenne, du, au } = useMemo(() => barresPeriode(entries, fin, periode), [entries, fin, periode]);
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const H = 150;
  const AXE = 22;
  const DROITE = 30;
  const max = Math.max(9 * 60, ...barres.map((b) => b.valeur ?? 0));
  const top = Math.ceil(max / 120) * 120;
  const plot = Math.max(1, w - DROITE);
  const pas = plot / barres.length;
  const larg = Math.max(3, Math.min(periode === 'S' ? 22 : 8, pas - 3));
  const sy = (v: number) => 4 + (1 - v / top) * (H - 4);
  const grads = [0, top / 2, top];
  const toucher = (e: GestureResponderEvent) => setSel(Math.min(barres.length - 1, Math.max(0, Math.floor(e.nativeEvent.locationX / pas))));
  const b = sel !== null ? barres[sel] : null;
  const plage = traduire("{0} {1} au {2} {3}", du.getDate(), MOIS[du.getMonth()], au.getDate(), MOIS[au.getMonth()]);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ paddingHorizontal: 4, gap: 2 }}>
        <Ink size={13} weight="bold" color={P.muted}>
          {periode === '6M' ? traduire('Moyenne par nuit, sur six mois') : traduire('Moyenne par nuit')}
        </Ink>
        {moyenne !== null ? (
          <GrandeDuree min={moyenne} size={60} />
        ) : (
          <Ink size={20} weight="black" tight style={{ paddingVertical: 6 }}>
            {traduire("Pas encore de nuit sur cette période")}</Ink>
        )}
        <Ink size={14} weight="bold" color={P.ink2}>
          {plage}
        </Ink>
      </View>
      <View style={{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 18, gap: 8 }}>
        <View style={{ minHeight: 18, justifyContent: 'center' }}>
          <Ink size={13} weight={b ? 'extraBold' : 'bold'} color={b ? P.ink : P.muted} numberOfLines={1}>
            {b ? `${b.detail} : ${b.valeur ? duree(b.valeur) : traduire('pas de nuit')}` : traduire('Touche une barre pour lire la nuit')}
          </Ink>
        </View>
        <View
          onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
          style={{ height: H + AXE }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={traduire("Durée de sommeil, {0}{1}", plage, moyenne !== null ? `, moyenne ${duree(moyenne)}` : '')}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={toucher}
          onResponderMove={toucher}
          onResponderRelease={() => setSel(null)}
          onResponderTerminate={() => setSel(null)}
        >
          {w > 0 ? (
            <Svg width={w} height={H + AXE}>
              {grads.map((g) => (
                <Line key={g} x1={0} x2={plot} y1={Math.round(sy(g)) + 0.5} y2={Math.round(sy(g)) + 0.5} stroke={g === 0 ? P.line : P.line2} strokeWidth={1} />
              ))}
              {barres.map((br, i) =>
                br.valeur ? (
                  <Rect key={i} x={i * pas + (pas - larg) / 2} y={sy(br.valeur)} width={larg} height={Math.max(2, sy(0) - sy(br.valeur))} rx={Math.min(4, larg / 2)} ry={Math.min(4, larg / 2)} fill={P.indigo} opacity={sel === null || sel === i ? 1 : 0.35} />
                ) : null,
              )}
            </Svg>
          ) : null}
          {w > 0
            ? grads.map((g) => (
                <Ink key={`g${g}`} size={11} weight="bold" color={P.muted} style={{ position: 'absolute', right: 0, top: sy(g) - 8, width: DROITE - 4, textAlign: 'right' }}>
                  {`${g / 60} h`}
                </Ink>
              ))
            : null}
          {w > 0
            ? barres.map((br, i) =>
                br.label ? (
                  <Ink key={`x${i}`} size={11} weight="bold" color={P.muted} numberOfLines={1} style={{ position: 'absolute', top: H + 5, left: i * pas + pas / 2 - 20, width: 40, textAlign: 'center' }}>
                    {traduire(br.label)}
                  </Ink>
                ) : null,
              )
            : null}
        </View>
      </View>
    </View>
  );
}
