/**
 * Courbe du poids de Progres et du detail du poids (vague 32) : la meme courbe que la carte de l'accueil
 * (components/yoroi/v2/charts/CourbePoids.tsx), avec ton style choisi dans les Reglages, ton cap, ton torii
 * et ta ligne directrice si l'interrupteur est actif. Style 1 : l'ecran affiche la pesee touchee en grand
 * (onScrub) ; styles 2 a 4 : la bulle au-dessus du doigt.
 * Vague 33 : meme torii que l'accueil (jamais dans le passe, en or si atteint), « Mon plan » et sa pastille.
 * Vague 34 : fond (detail du poids) : la courbe posee sur ta scene, comme la carte rouleau de l'accueil.
 * Ancienne version (tendance et pesees en points) : _archive_ancien_design_2026-10-09/vague32/courbes/.
 */
import React, { useMemo } from 'react';
import type { DayWeight } from '@/lib/v2/weightStats';
import { localISO } from '@/lib/v2/accueil/hydration';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { usePlanPoids } from '@/lib/v2/pesee/usePlanPoids';
import { CourbePoids, POIDS } from '../charts/CourbePoids';
import { SceneCourbe, sceneDuFond } from '../charts/FondCourbe';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { traduire } from '@/lib/i18n/tr';

/** Couleur du poids dans toute l'app (vague 32 : le violet du degrade) */
export const WEIGHT_COLOR = POIDS.c2;

type Props = {
  points: DayWeight[];
  goal?: number | null;
  height?: number;
  onScrub?: (p: DayWeight | null) => void;
  /** appui court : ouvre le detail du poids (le glisse garde le curseur) */
  onPress?: () => void;
  /** false pour un exemple (donnees fictives) : ni ligne directrice ni torii */
  plan?: boolean;
  /** toutes tes pesees (pour trouver le debut du plan), sinon les points affiches */
  series?: DayWeight[];
  /** periode affichee (jours) ou PERIODE_PLAN */
  periode?: number;
  /** la pastille du torii lointain : bascule sur « Mon plan » */
  onToriiPress?: () => void;
  /** vague 34 : la courbe posee sur la scene choisie (Reglages, Apparence), comme l'accueil */
  fond?: boolean;
  /** courbe v2 : debut de l'axe du temps (lib/v2/pesee/cadrageCourbe.ts) */
  debut?: string | null;
  /** 18 octobre : ta projection a ton rythme reel (lib/v2/pesee/etatObjectif.ts), en pointilles sur « Mon plan » */
  projection?: { date: string; value: number }[] | null;
  /** 18 octobre : la meme legende que la carte de l'accueil, sous la courbe (chaque trait a sa legende) */
  legende?: boolean;
};

export function WeightTrendChart({ points, goal = null, height = 300, onScrub, onPress, plan, series, periode, onToriiPress, fond = false, debut = null, projection = null, legende = false }: Props) {
  const prefs = usePrefsCourbes();
  const { espace } = useEspace();
  const scene = fond ? sceneDuFond(prefs.fond, espace.scene) : null;
  const real = plan ?? !!(onScrub || onPress);
  const today = localISO();
  const all = series ?? points;
  const p = usePlanPoids(all, goal ?? null, { enabled: real, check: false, today });
  const curve = useMemo(() => points.map((q) => ({ date: q.date, value: q.value })), [points]);
  const byDate = useMemo(() => new Map(points.map((q) => [q.date, q])), [points]);
  const courbe = (
    <CourbePoids
      points={curve}
      style={prefs.style}
      showCap={prefs.cap && !!goal}
      cap={goal ?? null}
      ligne={real ? p.ligne : null}
      torii={real ? p.torii : null}
      atteint={real ? p.atteint : false}
      periode={periode}
      debut={debut}
      today={today}
      projection={real ? projection : null}
      legende={legende}
      onToriiPress={real && p.ligne && p.torii ? onToriiPress : undefined}
      height={height - 6}
      onScrub={(s) => {
        if (!onScrub) return;
        if (prefs.style !== 1) return;
        onScrub(s && !s.point.week ? byDate.get(s.point.date) ?? null : null);
      }}
      onPress={onPress}
      label={traduire("Courbe de ton poids")}
      surScene={!!scene}
    />
  );
  if (!fond || !scene) return courbe;
  return <SceneCourbe scene={scene}>{courbe}</SceneCourbe>;
}
