/**
 * Avant la liste « Choisis ton programme » (27 octobre 2026), app/coach-depart.tsx. Houari : « D'abord une page qui
 * demande combien de jours tu veux t'entraîner, et selon ça tu proposes. » Puis : « vois ce qui serait le mieux ».
 * Trois écrans au plus, un toucher chacun, tous préréglés avec ce qu'on sait déjà :
 *  1. tes jours par semaine (toujours montré, les nombres du catalogue seulement : 2 à 6 aujourd'hui) ;
 *  2. puis, s'ils ne sont pas connus, ton temps par séance, ton niveau, ton lieu (les deux premiers qui manquent).
 * Tout est déjà connu (jours, temps et niveau) : un seul écran « Ton profil », avec « Modifier ».
 * La liste garde les types (PPL, Upper Lower...) et les classe, sans rien cacher :
 *  1. le bon nombre de jours d'abord ; 2. ton niveau ; 3. ton lieu (salle, haltères, sans matériel) ;
 *  4. la durée la plus proche de ton temps. Aucun programme au bon nombre de jours : les plus proches, dits comme tels.
 * Aucun programme nouveau : ceux de GROUPES_PROGRAMMES (modules.ts) et du catalogue. Pur, testé dans
 * __tests__/unit/preselection.test.ts.
 */
import { programmeParId } from './catalogue';
import type { Equipement } from './materiel';
import { GROUPES_PROGRAMMES } from './modules';
import type { Materiel, Niveau, Programme } from './types';

export type Envies = {
  /** jours par semaine voulus */
  jours: number;
  /** absents : non connus, ils ne comptent pas dans le classement */
  niveau?: Niveau;
  /** minutes par séance (75 : plus d'une heure) */
  temps?: number;
  lieu?: Materiel;
};

export type QuestionPre = 'jours' | 'temps' | 'niveau' | 'lieu';
export type EtapePre = QuestionPre | 'profil';

/** Les familles « par type d'entraînement », d'où vient la famille ouverte en premier */
const FAMILLES_SPLIT = ['ppl', 'upper-lower', 'push-pull', 'full-body', 'split'];

/** Les programmes de la liste par type, sans doublon */
export function programmesDeLaListe(): Programme[] {
  const vus = new Set<string>();
  const out: Programme[] = [];
  for (const g of GROUPES_PROGRAMMES) {
    for (const id of g.ids) {
      const p = programmeParId(id);
      if (p && !vus.has(id)) {
        vus.add(id);
        out.push(p);
      }
    }
  }
  return out;
}

/** Les nombres de jours qui ont au moins un programme, du plus petit au plus grand */
export function joursProposes(): number[] {
  return [...new Set(programmesDeLaListe().map((p) => p.joursParSemaine))].sort((a, b) => a - b);
}

/** Combien de programmes pour ce nombre de jours */
export function nombreDeProgrammes(jours: number): number {
  return programmesDeLaListe().filter((p) => p.joursParSemaine === jours).length;
}

/** Le nombre proposé le plus proche (7 jours : 6) ; égalité : le plus petit */
export function joursLePlusProche(n: number, proposes: readonly number[] = joursProposes()): number | undefined {
  if (!proposes.length || !Number.isFinite(n) || n <= 0) return undefined;
  return [...proposes].sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || a - b)[0];
}

const RANG_NIVEAU: Record<Niveau, number> = { debutant: 0, intermediaire: 1, confirme: 2 };

/** Les écarts d'un programme à tes envies, dans l'ordre du classement */
export function ecarts(p: Programme, e: Envies): [number, number, number, number] {
  return [
    Math.abs(p.joursParSemaine - e.jours),
    e.niveau ? Math.abs(RANG_NIVEAU[p.niveau] - RANG_NIVEAU[e.niveau]) : 0,
    e.lieu ? (p.materiel === e.lieu ? 0 : 1) : 0,
    e.temps ? Math.abs(p.dureeMin - e.temps) : 0,
  ];
}

function comparer(a: Programme, b: Programme, e: Envies): number {
  const x = ecarts(a, e);
  const y = ecarts(b, e);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/** Les programmes classés (tri stable : à égalité, l'ordre de la liste reste) */
export function classer(ids: readonly string[], e: Envies): Programme[] {
  const l = ids.map((id) => programmeParId(id)).filter((p): p is Programme => !!p);
  return l.map((p, i) => ({ p, i })).sort((a, b) => comparer(a.p, b.p, e) || a.i - b.i).map((x) => x.p);
}

export type TriFamille = {
  /** au bon nombre de jours, ou les plus proches si aucun */
  premiers: Programme[];
  /** false : aucun programme de la famille au bon nombre de jours, `premiers` sont les plus proches */
  exact: boolean;
  /** les autres nombres de jours, derrière « Voir les autres programmes » */
  autres: Programme[];
};

export function trierFamille(ids: readonly string[], e: Envies): TriFamille {
  const l = classer(ids, e);
  if (!l.length) return { premiers: [], exact: true, autres: [] };
  const exacts = l.filter((p) => p.joursParSemaine === e.jours);
  if (exacts.length) return { premiers: exacts, exact: true, autres: l.filter((p) => p.joursParSemaine !== e.jours) };
  const min = Math.min(...l.map((p) => Math.abs(p.joursParSemaine - e.jours)));
  const proches = l.filter((p) => Math.abs(p.joursParSemaine - e.jours) === min);
  return { premiers: proches, exact: false, autres: l.filter((p) => !proches.includes(p)) };
}

/** La famille ouverte en premier : celle du programme « par type » le mieux classé (égalité : la première) */
export function meilleureFamille(e: Envies): string {
  let best: { id: string; p: Programme } | null = null;
  for (const g of GROUPES_PROGRAMMES) {
    if (!FAMILLES_SPLIT.includes(g.id)) continue;
    const p = classer(g.ids, e)[0];
    if (p && (!best || comparer(p, best.p, e) < 0)) best = { id: g.id, p };
  }
  return best?.id ?? GROUPES_PROGRAMMES[0].id;
}

/** Ton matériel enregistré (suivi.ts, chargerMateriel) vers ton lieu ; rien d'enregistré : inconnu */
export function lieuDuMateriel(m: readonly Equipement[] | null | undefined): Materiel | undefined {
  if (m == null) return undefined;
  if (m.includes('barre') || m.includes('machines') || m.includes('poulie')) return 'salle';
  if (m.includes('halteres')) return 'halteres';
  return 'maison';
}

/**
 * Les écrans à montrer avant la liste. Les jours, le temps et le niveau connus : « Ton profil » seul.
 * Sinon les jours (préréglés s'ils sont connus), puis les deux premières questions qui manquent : trois écrans au plus.
 */
export function etapesPreselection(connu: Record<QuestionPre, boolean>): EtapePre[] {
  if (connu.jours && connu.temps && connu.niveau) return ['profil'];
  const reste = (['temps', 'niveau', 'lieu'] as const).filter((k) => !connu[k]).slice(0, 2);
  return ['jours', ...reste];
}
