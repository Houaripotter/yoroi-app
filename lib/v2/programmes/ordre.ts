/**
 * Ordre des exercices d'une seance (25 octobre 2026, Houari : « mets les exercices au banc a la suite,
 * que l'utilisateur ne fasse pas banc, poulie, banc »). Applique a tous les programmes de musculation,
 * ceux d'aujourd'hui et ceux qu'on ajoutera.
 *
 * Regles, dans cet ordre :
 * 1. Le premier exercice ne bouge jamais : c'est le gros mouvement, fait quand on est frais
 *    (les exercices faits en debut de seance progressent le plus en force, Simao 2012, Nunes 2021).
 * 2. Les gros mouvements (polyarticulaires) restent avant les petits (isolation), et les abdos a la fin.
 * 3. Dans chaque niveau, les exercices du meme poste se suivent (banc, poulie, barre fixe...),
 *    sinon l'ordre d'origine est garde.
 */
import type { ExoProgramme } from './types';

export type Poste = 'banc' | 'poulie' | 'rack' | 'barre-fixe' | 'sol' | 'machine' | 'libre';

/** Ou se fait l'exercice. Les machines sont toutes differentes : chacune reste son propre poste. */
export function posteDe(nom: string): Poste | `machine:${string}` {
  const n = nom.toLowerCase();
  if (/poulie|cable|pulldown|face pull|seated row|v-bar|tirage horizontal|tirage poitrine|tirage serré|pallof|straight arm|kick-back poulie/.test(n)) return 'poulie';
  if (/traction|suspendu|dead hang|hanging|suspension/.test(n)) return 'barre-fixe';
  if (/machine|presse|leg curl|leg extension|pec deck|hack squat|smith|chest press|low row|abducteurs/.test(n)) return `machine:${n}`;
  if (/couché|incliné|assis|barre au front|skullcrusher|rowing haltère|pull over \(haltère\)|dips banc|hip thrust barre|chest supported|curl concentré/.test(n)) return 'banc';
  if (/squat barre|front squat|box squat|rowing barre|deadlift \(|good morning|militaire \(barre\)|push press|close grip|sumo|rowing t-bar/.test(n)) return 'rack';
  if (/au sol|floor press|crunch|gainage|dead bug|bird dog|planche|relevé de jambes \(sol\)|sit-ups|glute bridge|clamshells|donkey|copenhagen|mountain|roulette|pompes|nordic/.test(n)) return 'sol';
  return 'libre';
}

/** 0 gros mouvement, 1 isolation, 2 abdos et gainage */
export function niveauDe(e: ExoProgramme): 0 | 1 | 2 {
  if (e.muscle === 'ABDOS') return 2;
  const n = e.nom.toLowerCase();
  if (/curl|extension|élévations|écartés|oiseau|pec deck|butterfly|mollets|kickback|kick-back|face pull|shrugs|abducteurs|pull over|barre au front|skullcrusher|rotation|y raises|clamshells|banded|donkey|plate pinch|gripper|wrist|pince|traversée/.test(n)) return 1;
  return 0;
}

export function ordonnerParPoste(exos: ExoProgramme[]): ExoProgramme[] {
  if (exos.length < 3) return exos;
  const [premier, ...reste] = exos;
  const premiereVue = new Map<string, number>();
  reste.forEach((e, i) => {
    const cle = `${niveauDe(e)}|${posteDe(e.nom)}`;
    if (!premiereVue.has(cle)) premiereVue.set(cle, i);
  });
  const tries = reste
    .map((e, i) => ({ e, i, niv: niveauDe(e), groupe: premiereVue.get(`${niveauDe(e)}|${posteDe(e.nom)}`) ?? i }))
    .sort((a, b) => a.niv - b.niv || a.groupe - b.groupe || a.i - b.i)
    .map((x) => x.e);
  return [premier, ...tries];
}
