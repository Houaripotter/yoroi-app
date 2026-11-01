/**
 * La version B d'une séance (1er novembre 2026, A et B au choix, alternance.ts). Quand ton programme n'a pas de
 * séance B et que tu choisis d'alterner, YOROI la prépare :
 *  - mêmes muscles : chaque exercice est remplacé par un équivalent du même groupe (changerExo.ts, equivalents :
 *    tes machines, les remplaçants écrits à la main, le même muscle principal), en gardant si possible le même
 *    matériel (une machine pour une machine, des poids libres pour des poids libres) et la même façon de compter
 *    (répétitions ou secondes) ;
 *  - mêmes séries, mêmes répétitions, même repos, même ordre, mêmes liens de superset ;
 *  - tes exercices écartés (« Pas dans ma salle », « Ça me fait mal ») ne sont jamais choisis ; tes machines à toi
 *    peuvent l'être ;
 *  - que des exercices réels de constants/exerciseLibrary.ts (ou tes machines). Pas d'équivalent : l'exercice reste
 *    celui de la séance A, rien n'est inventé. Le cardio et la mobilité restent tels quels.
 * Données pures, le même résultat à chaque appel. Testé dans __tests__/unit/alternance.test.ts.
 */
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { equivalents, familleChange } from '@/lib/v2/seances/changerExo';
import type { MachinePerso } from '@/lib/v2/seances/machinesPerso';
import { sansPrise } from '@/lib/v2/seance/prise';
import type { SeancePerso } from './monProgramme';
import type { ExoProgramme } from './types';

const SANS_VARIANTE = /^(CARDIO|MOBILIT|FLEXIBILIT)/i;

const tenu = (nom: string): boolean => EXERCISE_LIBRARY.find((e) => e.name === nom)?.unit === 'time';

/** L'équivalent B d'un exercice, ou null (on garde celui de la séance A) */
export function equivalentB(e: ExoProgramme, o: { ecartes?: Iterable<string>; perso?: readonly MachinePerso[]; deja?: Iterable<string> } = {}): { nom: string; muscle: string } | null {
  if (typeof e.minutes === 'number' || SANS_VARIANTE.test(e.muscle ?? '')) return null;
  const perso = o.perso ?? [];
  const liste = equivalents(e.nom, { muscle: e.muscle, perso, ecartes: o.ecartes, deja: o.deja, max: 5 });
  if (!liste.length) return null;
  const famille = familleChange(sansPrise(e.nom).base, perso);
  const memeCompte = (n: string) => !!e.secondes === tenu(n) || perso.some((m) => m.nom === n);
  const choix =
    liste.find((x) => x.meme && x.famille === famille && memeCompte(x.nom)) ??
    liste.find((x) => x.meme && memeCompte(x.nom)) ??
    liste.find((x) => x.famille === famille && memeCompte(x.nom)) ??
    liste.find((x) => memeCompte(x.nom));
  return choix ? { nom: choix.nom, muscle: choix.muscle } : null;
}

/**
 * La séance B : sa brique est celle de la séance A (c'est sa version B), sans sid (elle n'est posée sur aucun jour).
 * `autres` : les exercices déjà pris ailleurs, à éviter si possible (jamais deux fois le même dans la séance).
 */
export function genererVarianteB(s: SeancePerso, o: { ecartes?: Iterable<string>; perso?: readonly MachinePerso[] } = {}): SeancePerso {
  const ecartes = Array.from(o.ecartes ?? []);
  const pris = new Set(s.exos.map((e) => e.nom));
  const exos = s.exos.map((e): ExoProgramme => {
    const eq = equivalentB(e, { ecartes, perso: o.perso, deja: pris });
    if (!eq) return { ...e };
    pris.add(eq.nom);
    const { conseil: _c, poidsDuCorps: _p, secondes: _s, ...reste } = e;
    const corps = familleChange(eq.nom, o.perso ?? []) === 'corps';
    return { ...reste, nom: eq.nom, muscle: eq.muscle, ...(corps && e.poidsDuCorps ? { poidsDuCorps: true } : {}), ...(e.secondes ? { secondes: true } : {}) };
  });
  return { ...(s.titre ? { titre: s.titre } : {}), exos, ...(s.brique ? { brique: s.brique } : {}) };
}

/** Combien d'exercices changent entre A et B */
export function exercicesChanges(a: SeancePerso, b: SeancePerso): number {
  return a.exos.reduce((n, e, i) => n + (b.exos[i] && b.exos[i].nom !== e.nom ? 1 : 0), 0);
}
