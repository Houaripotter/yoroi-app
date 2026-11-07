/**
 * Une seule sonnerie de fin de repos, iPhone ou Apple Watch (7 novembre 2026, plan
 * _propositions/montre_minuteur_2026-11-03/PLAN.md). Avant, chaque appareil gardait sa propre alarme pour le
 * meme repos : le telephone et la montre sonnaient l'un apres l'autre.
 *
 * Regle : le repos de la seance appartient au brouillon du telephone (restEndsAt). La montre qui arme son minuteur
 * pour ce repos le dit (action « arme », lib/v2/seance/actionsIle.ts). Tant que cet accuse correspond au repos en
 * cours, le telephone se tait : pas de notification, pas d'alarme du systeme, pas de son ni de claquettes dans la
 * barre de repos. Sans accuse dans les 5 secondes qui suivent le debut du repos, le telephone sonne comme avant.
 *
 * Reglage « Fin de repos » : Montre (automatique, par defaut : la montre d'abord, le telephone en secours)
 * ou iPhone (le telephone sonne toujours, la montre affiche le repos sans sonner).
 * Logique pure et testee (__tests__/unit/sonneurRepos.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReglageFinRepos = 'montre' | 'iphone';

export const CLE_FIN_REPOS_APPAREIL = 'yoroi_fin_repos_appareil_v1';
/** meme tolerance que la montre (ios/YoroiWatch/Services/Synchro.swift, armerRepos) */
export const TOLERANCE_FIN_MS = 1500;
/** l'accuse de la montre doit arriver dans les 5 s apres le debut du repos (plus l'ecart des horloges) */
export const DELAI_ACCUSE_MS = 5000 + TOLERANCE_FIN_MS;

/** L'accuse de la montre pour le repos en cours : fin armee et debut du repos qu'il couvre */
export type AccuseMontre = { fin: number; debut: number };

type ReposDraft = { restEndsAt: number | null; restTotal: number; reposSurMontre?: AccuseMontre | null };

let reglage: ReglageFinRepos = 'montre';
let charge = false;

export function lireReglageFinRepos(v: unknown): ReglageFinRepos {
  return v === 'iphone' ? 'iphone' : 'montre';
}

/** Le reglage en memoire (Montre tant qu'il n'a pas ete lu) */
export function reglageFinRepos(): ReglageFinRepos {
  return reglage;
}

export async function chargerReglageFinRepos(): Promise<ReglageFinRepos> {
  try {
    reglage = lireReglageFinRepos(await AsyncStorage.getItem(CLE_FIN_REPOS_APPAREIL));
  } catch {
    // Montre par defaut
  }
  charge = true;
  return reglage;
}

/** Lu une fois au premier besoin */
export function assurerReglageFinRepos(): void {
  if (!charge) void chargerReglageFinRepos();
}

export async function enregistrerReglageFinRepos(v: ReglageFinRepos): Promise<void> {
  reglage = v;
  charge = true;
  try {
    await AsyncStorage.setItem(CLE_FIN_REPOS_APPAREIL, v);
  } catch {
    // reglage garde pour cette session seulement
  }
}

/** Debut du repos en cours (les +15 s et -15 s decalent la fin et le total ensemble : le debut ne bouge pas) */
export function debutRepos(d: ReposDraft): number | null {
  if (d.restEndsAt == null || !Number.isFinite(d.restEndsAt)) return null;
  return d.restEndsAt - Math.max(0, d.restTotal) * 1000;
}

/**
 * L'accuse « arme » de la montre (fin armee, envoye a `at`) couvre-t-il le repos en cours ?
 * Il faut la meme fin (1,5 s pres), et soit un accuse arrive dans les 5 s du debut du repos, soit un repos deja
 * confirme dont la fin a juste ete decalee (+15 s, -15 s).
 */
export function accuseValable(d: ReposDraft, fin: number, at: number): AccuseMontre | null {
  const debut = debutRepos(d);
  if (debut === null || d.restEndsAt == null) return null;
  if (!Number.isFinite(fin) || Math.abs(fin - d.restEndsAt) > TOLERANCE_FIN_MS) return null;
  // la montre a arme trop pres de la fin : le telephone garde sa sonnerie
  if (fin - at < 3000) return null;
  const memeRepos = !!d.reposSurMontre && Math.abs(d.reposSurMontre.debut - debut) <= TOLERANCE_FIN_MS;
  if (at - debut > DELAI_ACCUSE_MS && !memeRepos) return null;
  return { fin: d.restEndsAt, debut };
}

/** La montre sonne la fin du repos en cours : le telephone se tait */
export function montreSonne(d: ReposDraft | null | undefined, r: ReglageFinRepos = reglage): boolean {
  if (!d || r === 'iphone' || d.restEndsAt == null || !d.reposSurMontre) return false;
  return Math.abs(d.reposSurMontre.fin - d.restEndsAt) <= TOLERANCE_FIN_MS;
}

// La fin de repos confiee a la montre, connue de tout le telephone (rappel, alarme du systeme)
let finSurMontre: number | null = null;

export function noterFinSurMontre(fin: number | null): void {
  finSurMontre = typeof fin === 'number' && Number.isFinite(fin) ? fin : null;
}

/** Vrai si cette fin de repos sonne sur la montre : ni notification ni alarme sur le telephone */
export function estFinSurMontre(fin: number | null | undefined): boolean {
  if (reglage === 'iphone' || finSurMontre === null || typeof fin !== 'number') return false;
  return Math.abs(fin - finSurMontre) <= TOLERANCE_FIN_MS;
}

/**
 * Le coach vocal laisse sa phrase des 10 s aux claquettes (decision du 7 novembre 2026) : quand les claquettes
 * sont allumees et qu'un appareil les joue (l'ecran ouvert, ou la montre qui sonne ce repos).
 */
export function claquettesAuLieuDuCoach(o: { clapOn: boolean; appActive: boolean; surMontre: boolean }): boolean {
  return o.clapOn && (o.appActive || o.surMontre);
}
