/**
 * Pictogrammes des chronos : la structure de la seance dessinee en SVG.
 * Barre haute = effort (indigo), barre basse = repos (mousse). On comprend d'un coup d'oeil
 * comment le temps est decoupe, sans connaitre le sigle.
 */
import React from 'react';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import type { TimerMode } from '@/lib/v2/carnet/chrono';
import { PHASE_COLORS } from '@/lib/v2/carnet/chrono';

const W = 88;
const H = 52;
const BASE = 44; // ligne de sol
const TALL = 30; // hauteur d'un effort
const LOW = 11; // hauteur d'un repos

type Block = { w: number; kind: 'e' | 'r' };

function Blocks({ list, gap = 2.5 }: { list: Block[]; gap?: number }) {
  const total = list.reduce((s, b) => s + b.w, 0) + gap * (list.length - 1);
  let x = (W - total) / 2;
  return (
    <>
      {list.map((b, i) => {
        const h = b.kind === 'e' ? TALL : LOW;
        const el = <Rect key={i} x={x} y={BASE - h} width={b.w} height={h} rx={Math.min(3, b.w / 2)} fill={b.kind === 'e' ? PHASE_COLORS.effort.main : PHASE_COLORS.repos.main} />;
        x += b.w + gap;
        return el;
      })}
    </>
  );
}

export function ChronoPicto({ mode, size = 1 }: { mode: TimerMode | 'sparring'; size?: number }) {
  const e = PHASE_COLORS.effort.main;
  let body: React.ReactNode = null;
  switch (mode) {
    case 'musculation':
      // serie courte, long repos, serie, long repos, serie
      body = <Blocks gap={3} list={[{ w: 9, kind: 'e' }, { w: 18, kind: 'r' }, { w: 9, kind: 'e' }, { w: 18, kind: 'r' }, { w: 9, kind: 'e' }]} />;
      break;
    case 'combat':
      body = <Blocks gap={2.5} list={[{ w: 20, kind: 'e' }, { w: 6, kind: 'r' }, { w: 20, kind: 'e' }, { w: 6, kind: 'r' }, { w: 20, kind: 'e' }]} />;
      break;
    case 'sparring':
      body = (
        <>
          <Blocks gap={2.5} list={[{ w: 20, kind: 'e' }, { w: 6, kind: 'r' }, { w: 20, kind: 'e' }, { w: 6, kind: 'r' }, { w: 20, kind: 'e' }]} />
          {/* une coche au-dessus de chaque round : le resultat note */}
          {[0, 1, 2].map((i) => {
            const cx = 13 + i * 28.5;
            return <Path key={i} d={`M${cx - 4} 7.5l3 3 5.5 -6`} stroke={PHASE_COLORS.effort.deep} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
          })}
        </>
      );
      break;
    case 'tabata': {
      const list: Block[] = [];
      for (let i = 0; i < 8; i++) {
        list.push({ w: 5.5, kind: 'e' });
        if (i < 7) list.push({ w: 2.8, kind: 'r' });
      }
      body = <Blocks gap={1.4} list={list} />;
      break;
    }
    case 'emom': {
      // 4 minutes : chaque minute commence par l'exercice, puis on souffle
      const minute = 19;
      const x0 = (W - minute * 4) / 2;
      body = (
        <>
          {[0, 1, 2, 3].map((m) => {
            const x = x0 + m * minute;
            return (
              <React.Fragment key={m}>
                <Rect x={x + 1} y={BASE - TALL} width={8} height={TALL} rx={2.5} fill={e} />
                <Rect x={x + 10.5} y={BASE - LOW} width={7} height={LOW} rx={2.5} fill={PHASE_COLORS.repos.main} />
              </React.Fragment>
            );
          })}
          {[0, 1, 2, 3, 4].map((m) => (
            <Line key={`t${m}`} x1={x0 + m * minute} y1={6} x2={x0 + m * minute} y2={BASE + 4} stroke="#B9B6AE" strokeWidth={1.2} strokeDasharray="2 2.5" />
          ))}
        </>
      );
      break;
    }
    case 'amrap': {
      // un long effort, decoupe en tours, puis une fleche qui boucle
      const x0 = 8;
      const lap = 12;
      body = (
        <>
          {[0, 1, 2, 3].map((i) => (
            <Rect key={i} x={x0 + i * (lap + 2.5)} y={BASE - TALL} width={lap} height={TALL} rx={3} fill={i % 2 === 0 ? e : PHASE_COLORS.effort.deep} opacity={i === 3 ? 0.45 : 1} />
          ))}
          <Path d="M81 23a7 7 0 1 1-5-6.7" stroke={e} strokeWidth={2.4} strokeLinecap="round" fill="none" />
          <Path d="M74 12.5l2.6 4.2-4.6 1.6" stroke={e} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
      break;
    }
    case 'fortime':
    default: {
      // des marches qui montent jusqu'au drapeau
      const steps = [10, 16, 22, 28];
      body = (
        <>
          {steps.map((h, i) => (
            <Rect key={i} x={8 + i * 15} y={BASE - h} width={13} height={h} rx={3} fill={e} opacity={0.55 + i * 0.15} />
          ))}
          <Line x1={73} y1={BASE} x2={73} y2={6} stroke={PHASE_COLORS.effort.deep} strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M73 7h11l-3 5 3 5H73z" fill={PHASE_COLORS.repos.main} />
        </>
      );
      break;
    }
  }
  return (
    <Svg width={W * size} height={H * size} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={4} y1={BASE + 0.5} x2={W - 4} y2={BASE + 0.5} stroke="#C9CEDF" strokeWidth={1.2} strokeLinecap="round" />
      {body}
    </Svg>
  );
}
