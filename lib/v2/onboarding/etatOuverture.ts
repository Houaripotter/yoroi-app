/**
 * Qui ouvre l'app : nouvel utilisateur, utilisateur qui met a jour, ou reinstallation (18 octobre 2026, INSTALLATION).
 * Logique testee (__tests__/unit/onboardingInstallation.test.ts), appelee par app/index.tsx.
 *
 * Regle :
 *  1. Le marqueur yoroi_onboarding_done (pose par l'onboarding, la restauration et ici) : utilisateur existant.
 *  2. Un onboarding commence et pas fini (brouillon present, marqueur absent) : on le reprend, paywall compris.
 *  3. Des donnees dans la base SQLite (profil, seances, pesees) : utilisateur existant. Elles vivent dans la
 *     sandbox de l'app, effacee a la suppression : si elles sont la, c'est une mise a jour (ou une restauration
 *     complete du telephone, qui ramene aussi AsyncStorage).
 *  4. Le trousseau iOS SURVIT a la suppression de l'app. Un profil dans le trousseau ne compte donc que si une
 *     trace locale d'usage existe aussi (visite guidee faite, nouveautes de la 3.0 vues). Sans aucune trace :
 *     c'est une reinstallation, onboarding complet et paywall ; le trousseau sert seulement a preremplir
 *     (lib/v2/onboarding/fusion.ts) et rien n'y est efface.
 *  5. Prudence : si une lecture echoue (trois essais), jamais d'onboarding ; l'app s'ouvre normalement
 *     (lectureRatee) et la decision est refaite au lancement suivant.
 *
 * Le jeton du mode createur, le cache d'abonnement et _private ne sont jamais lus ici.
 */
import { DRAFT_KEY } from './draft';
import { NOUVEAUTES_30_KEY } from './parcours';
import { traduire } from '@/lib/i18n/tr';

export const ONBOARDING_DONE_KEY = 'yoroi_onboarding_done';
export const TOUR_DONE_KEY = '@yoroi_onboarding_tour_done';
/** Studio : un seul lancement comme une installation neuve, sans rien effacer (consomme a la lecture) */
export const SIMULER_INSTALLATION_KEY = '@yoroi_studio_simuler_installation';

/**
 * Cles posees seulement apres un vrai premier usage, jamais au demarrage avant cette decision.
 * Le brouillon et l'acceptation des conditions n'en font pas partie : ils existent pendant l'onboarding.
 */
export const TRACES_LOCALES_KEYS = [TOUR_DONE_KEY, NOUVEAUTES_30_KEY] as const;

type ReglagesLus = { username?: string; gender?: string; height?: number; targetWeight?: number } | null | undefined;
type ProfilLu = { name?: string; avatar_gender?: string; height_cm?: number; target_weight?: number } | null | undefined;

export type LecteursOuverture = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  /** lecture STRICTE du trousseau : lance une erreur si illisible */
  getSettings: () => Promise<ReglagesLus>;
  saveSettings: (s: Record<string, unknown>) => Promise<unknown>;
  getProfile: () => Promise<ProfilLu>;
  getTrainingsCount: () => Promise<{ total: number }>;
  getLatestWeight: () => Promise<unknown>;
  sleep?: (ms: number) => Promise<void>;
  log?: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void };
};

export type Raison =
  | 'simulation'
  | 'marqueur'
  | 'onboarding_en_cours'
  | 'profil_sqlite'
  | 'seances'
  | 'pesees'
  | 'trousseau_et_traces'
  | 'reinstallation'
  | 'nouveau'
  | 'lecture_ratee';

export type EtatUtilisateur = { existant: boolean; lectureRatee: boolean; raison: Raison };

type Lu<T> = { ok: true; value: T } | { ok: false };

const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Trois essais espaces de 500 ms ; { ok: false } au lieu de lancer */
async function lire<T>(l: LecteursOuverture, label: string, fn: () => Promise<T>): Promise<Lu<T>> {
  for (let essai = 1; essai <= 3; essai++) {
    try {
      return { ok: true, value: await fn() };
    } catch (e) {
      l.log?.warn(`[Ouverture] Lecture ${label} echouee (essai ${essai}/3)`, e);
      if (essai < 3) await (l.sleep ?? attendre)(500);
    }
  }
  return { ok: false };
}

async function marquerFait(l: LecteursOuverture) {
  try {
    await l.setItem(ONBOARDING_DONE_KEY, 'true');
  } catch {
    // sans importance : la decision sera refaite au prochain lancement
  }
}

export async function etatUtilisateur(l: LecteursOuverture): Promise<EtatUtilisateur> {
  // 0. Studio : « Simuler une premiere installation » (un seul lancement, rien n'est efface)
  try {
    if ((await l.getItem(SIMULER_INSTALLATION_KEY)) === 'true') {
      await l.removeItem(SIMULER_INSTALLATION_KEY).catch(() => undefined);
      l.log?.info('[Ouverture] Simulation d\'une premiere installation (Studio)');
      return { existant: false, lectureRatee: false, raison: 'simulation' };
    }
  } catch {
    // illisible : on decide normalement
  }

  // 1. Marqueur durable
  const flag = await lire(l, 'marqueur', () => l.getItem(ONBOARDING_DONE_KEY));
  if (flag.ok && flag.value === 'true') return { existant: true, lectureRatee: false, raison: 'marqueur' };
  let echec = !flag.ok;

  // 2. Onboarding commence, pas fini : on le reprend (il peut avoir deja enregistre la pesee du jour)
  if (flag.ok) {
    const draft = await lire(l, 'brouillon', () => l.getItem(DRAFT_KEY));
    if (draft.ok && draft.value) {
      l.log?.info('[Ouverture] Onboarding en cours : reprise');
      return { existant: false, lectureRatee: false, raison: 'onboarding_en_cours' };
    }
    if (!draft.ok) echec = true;
  }

  // 3. Trousseau : lu, mais il ne suffit plus a lui seul (il survit a la suppression de l'app)
  const settings = await lire(l, 'reglages', () => l.getSettings());
  const profilTrousseau = settings.ok && !!settings.value?.username && !!settings.value?.gender;
  if (!settings.ok) echec = true;

  // 4. Base SQLite (dans la sandbox de l'app)
  const profile = await lire(l, traduire('profil SQLite'), () => l.getProfile());
  if (profile.ok) {
    const p = profile.value;
    if (p && p.name) {
      // reglages resynchronises seulement s'ils manquent (rien n'est ecrase)
      if (settings.ok && !profilTrousseau) {
        try {
          await l.saveSettings({
            username: p.name,
            gender: p.avatar_gender === 'femme' ? 'female' : 'male',
            height: p.height_cm,
            targetWeight: p.target_weight,
            onboardingCompleted: true,
          });
        } catch {
          // sans importance
        }
      }
      await marquerFait(l);
      return { existant: true, lectureRatee: false, raison: 'profil_sqlite' };
    }
  } else echec = true;

  const trainings = await lire(l, 'seances', () => l.getTrainingsCount());
  if (trainings.ok) {
    if (trainings.value && trainings.value.total > 0) {
      await marquerFait(l);
      return { existant: true, lectureRatee: false, raison: 'seances' };
    }
  } else echec = true;

  const weight = await lire(l, 'pesees', () => l.getLatestWeight());
  if (weight.ok) {
    if (weight.value) {
      await marquerFait(l);
      return { existant: true, lectureRatee: false, raison: 'pesees' };
    }
  } else echec = true;

  // 5. Profil du trousseau : existant seulement avec une trace locale d'usage
  if (profilTrousseau) {
    const traces = await lire(l, 'traces locales', async () => {
      for (const k of TRACES_LOCALES_KEYS) {
        if ((await l.getItem(k)) != null) return true;
      }
      return false;
    });
    if (traces.ok && traces.value) {
      await marquerFait(l);
      return { existant: true, lectureRatee: false, raison: 'trousseau_et_traces' };
    }
    if (!traces.ok) echec = true;
    else if (!echec) {
      l.log?.info('[Ouverture] Reinstallation : profil du trousseau sans aucune trace locale, onboarding complet');
      return { existant: false, lectureRatee: false, raison: 'reinstallation' };
    }
  }

  if (echec) {
    l.log?.warn('[Ouverture] Lecture impossible : l\'app s\'ouvre SANS onboarding par securite');
    return { existant: false, lectureRatee: true, raison: 'lecture_ratee' };
  }
  l.log?.info('[Ouverture] Aucun utilisateur : onboarding');
  return { existant: false, lectureRatee: false, raison: 'nouveau' };
}
