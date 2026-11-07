/**
 * Les declencheurs de la copie automatique (7 novembre 2026). Houari : « sauvegarde 100 % automatique ».
 * Plan : _propositions/sauvegarde_auto_2026-11-05/PLAN.md, etape 1 (JS seulement, pas de nouveau build).
 *
 * Une copie silencieuse (sans les photos, lib/v2/sauvegarde/regleCopieCloud.ts) part :
 *  - apres une seance enregistree (lib/v2/seance/save.ts, et la carte de fin de seance CopieCloud) ;
 *  - apres une pesee enregistree (lib/v2/pesee/save.ts) ;
 *  - quand l'app passe en arriere plan, si une donnee a change depuis la derniere copie. iOS laisse environ
 *    30 secondes : on les demande avec le module deja dans l'app (lib/backgroundTaskService.ts) ;
 *  - une fois par jour a l'ouverture de l'app (lib/autoBackupService.ts, comme avant).
 * Jamais plus d'une ecriture toutes les 2 minutes : plusieurs saisies a la suite donnent une seule copie.
 * Tout est dans des try/catch : une copie ratee ne bloque jamais rien.
 *
 * delaiAvantEcriture() et peutEcrireMaintenant() sont purs (testes dans __tests__/unit/sauvegardeAuto.test.ts).
 */
import { AppState, DeviceEventEmitter, Platform, type AppStateStatus } from 'react-native';
import { logger } from '@/lib/security/logger';

/** Au moins 2 minutes entre deux ecritures */
export const INTERVALLE_MIN_MS = 2 * 60 * 1000;
/** Petit temps de regroupement apres une saisie (plusieurs pesees ou une correction juste apres) */
export const REGROUPEMENT_MS = 20 * 1000;
/** En arriere plan, on n'attend pas plus que ca une fenetre libre (iOS laisse environ 30 s) */
const ATTENTE_MAX_ARRIERE_PLAN_MS = 20 * 1000;
/** DATA_CHANGED_EVENT de lib/v2/useWeightData.ts (repris ici pour ne pas charger un module d'ecran) */
const DONNEES_CHANGEES = 'YOROI_DATA_CHANGED';

export type Raison = 'seance' | 'pesee' | 'arriere_plan' | 'bouton';

/** Combien attendre avant d'ecrire : le regroupement, et jamais avant 2 minutes apres la derniere ecriture */
export function delaiAvantEcriture(now: number, derniereEcriture: number, regroupement = REGROUPEMENT_MS): number {
  const libre = derniereEcriture ? derniereEcriture + INTERVALLE_MIN_MS - now : 0;
  return Math.max(regroupement, libre, 0);
}

/** Une ecriture tout de suite respecte-t-elle les 2 minutes ? */
export function peutEcrireMaintenant(now: number, derniereEcriture: number): boolean {
  return !derniereEcriture || now - derniereEcriture >= INTERVALLE_MIN_MS;
}

// ---- etat (en memoire : un lancement de l'app) ----
let sale = false;
let version = 0;
let minuterie: ReturnType<typeof setTimeout> | null = null;
let enCours: Promise<boolean> | null = null;
let attentes: ((ok: boolean) => void)[] = [];
let installe = false;

// chargements a la demande (require, comme lib/autoBackupService.ts) : pas de boucle d'import au demarrage
async function auto(): Promise<typeof import('@/lib/autoBackupService')> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/autoBackupService');
}

async function derniereEcriture(): Promise<number> {
  try {
    return (await auto()).derniereEcritureSilencieuse();
  } catch {
    return 0;
  }
}

function regler(ok: boolean) {
  const l = attentes;
  attentes = [];
  for (const r of l) {
    try {
      r(ok);
    } catch {
      // rien
    }
  }
}

/** Ecrit maintenant (partage l'ecriture deja en cours) */
async function ecrire(raison: Raison): Promise<boolean> {
  if (enCours) return enCours;
  if (minuterie) {
    clearTimeout(minuterie);
    minuterie = null;
  }
  const v = version;
  enCours = (async () => {
    try {
      const ok = await (await auto()).executerCopieSilencieuse(raison);
      if (ok && version === v) sale = false;
      return ok;
    } catch (e) {
      logger.warn('[Declencheurs] copie impossible', e);
      return false;
    } finally {
      enCours = null;
    }
  })();
  const ok = await enCours;
  regler(ok);
  // une saisie pendant l'ecriture : une autre copie, toujours 2 minutes apres
  if (sale && version !== v) void planifier(raison);
  return ok;
}

async function planifier(raison: Raison): Promise<void> {
  if (minuterie || enCours) return;
  const d = delaiAvantEcriture(Date.now(), await derniereEcriture());
  if (minuterie || enCours) return;
  minuterie = setTimeout(() => {
    minuterie = null;
    void ecrire(raison);
  }, d);
}

/**
 * Une donnee vient d'etre enregistree : une copie part bientot (regroupee, au plus une toutes les 2 minutes).
 * attendre : la promesse se resout quand cette copie est faite (carte de fin de seance).
 */
export function demanderCopie(raison: Raison, o: { attendre?: boolean } = {}): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return Promise.resolve(false);
    sale = true;
    version += 1;
    const p = o.attendre ? new Promise<boolean>((r) => attentes.push(r)) : Promise.resolve(true);
    void planifier(raison);
    return p;
  } catch {
    return Promise.resolve(false);
  }
}

/** Geste de l'utilisateur (« Sauvegarder maintenant ») : tout de suite, sans attendre la fenetre */
export async function copierToutDeSuite(raison: Raison = 'bouton'): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    version += 1;
    return await ecrire(raison);
  } catch {
    return false;
  }
}

/** Une donnee a change ailleurs (evenement de l'app) : pas de copie tout de suite, mais une en quittant l'app */
export function marquerChangement(): void {
  sale = true;
  version += 1;
}

/** L'app passe en arriere plan : si une donnee a change, la copie part pendant les secondes que laisse iOS */
export async function auPassageArrierePlan(): Promise<void> {
  if (!sale || Platform.OS === 'web') return;
  let tache = false;
  let bg: typeof import('@/lib/backgroundTaskService').backgroundTaskService | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    bg = (require('@/lib/backgroundTaskService') as typeof import('@/lib/backgroundTaskService')).backgroundTaskService;
    tache = bg.prendre('sauvegarde');
    if (enCours) {
      await enCours;
      if (!sale) return;
    }
    const attente = delaiAvantEcriture(Date.now(), await derniereEcriture(), 0);
    if (attente > ATTENTE_MAX_ARRIERE_PLAN_MS) return; // la copie planifiee partira au retour dans l'app
    if (attente > 0) await new Promise((r) => setTimeout(r, attente));
    if (sale) await ecrire('arriere_plan');
  } catch (e) {
    logger.warn('[Declencheurs] arriere plan', e);
  } finally {
    if (tache && bg) bg.rendre('sauvegarde');
  }
}

/** Branche l'arriere plan et les changements de donnees (une seule fois, au demarrage) */
export function installerDeclencheurs(): void {
  if (installe || Platform.OS === 'web') return;
  installe = true;
  try {
    AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background') void auPassageArrierePlan();
    });
    DeviceEventEmitter.addListener(DONNEES_CHANGEES, marquerChangement);
  } catch (e) {
    logger.warn('[Declencheurs] installation impossible', e);
  }
}

/** Tests seulement */
export function _etatDeclencheurs() {
  return { sale, version, planifiee: !!minuterie, enCours: !!enCours, attentes: attentes.length };
}
export function _remettreDeclencheurs() {
  if (minuterie) clearTimeout(minuterie);
  minuterie = null;
  sale = false;
  version = 0;
  enCours = null;
  attentes = [];
  installe = false;
}
