/**
 * Sonnerie de fin de repos (31 octobre 2026, Houari en pleine seance : « quand mon repos est fini, fais sonner
 * l'iPhone meme verrouille, comme le minuteur d'Apple, avec le meme ecran plein. Une simple notification, non »).
 *
 * Un interrupteur « Sonnerie de fin de repos » dans les reglages de la seance (active par defaut, synchronise).
 * Allume :
 * 1. iPhone sous iOS 26 avec le module natif YoroiAlarmeRepos (AlarmKit, propose dans
 *    _propositions/fin_repos_alarme_2026-10-31, a ajouter dans Xcode) : une vraie alarme du systeme est
 *    programmee a la fin du repos. Elle sonne ecran verrouille, en plein ecran, passe le mode silencieux et la
 *    Concentration, et watchOS la relaie sur la montre jumelee (documentation AlarmKit d'Apple) ;
 * 2. sans ce module (build actuel, iOS plus ancien, Android) ou alarmes refusees : la notification de fin de
 *    repos d'avant (lib/v2/seance/rappelRepos.ts), avec le son du minuteur YOROI et le niveau « urgent »
 *    (time sensitive) au lieu du petit son par defaut.
 * App ouverte a la fin du repos : l'ecran sonne deja (RestBar), l'alarme est retiree juste avant pour ne pas
 * sonner deux fois.
 * Coupe : la notification d'avant, telle quelle.
 * Le module natif est lu sans jamais planter : absent, tout retombe sur la notification.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';

export const CLE_SONNERIE_REPOS = 'yoroi_sonnerie_fin_repos_v1';

/** Active sauf si tu l'as coupee */
export async function chargerSonnerieRepos(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE_SONNERIE_REPOS)) !== '0';
  } catch {
    return true;
  }
}

export async function enregistrerSonnerieRepos(actif: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_SONNERIE_REPOS, actif ? '1' : '0');
    signalerASynchroniser();
  } catch {
    // rien a faire : le reglage reste celui de la seance en cours
  }
}

export type AutorisationAlarme = 'autorise' | 'refuse' | 'inconnu';

/** Le module natif iOS (ios/Yoroi/AlarmeRepos/, propose dans _propositions/fin_repos_alarme_2026-10-31) */
export type ModuleAlarmeRepos = {
  /** iOS 26 ou plus et AlarmKit present */
  disponible: () => Promise<boolean>;
  autorisation: () => Promise<string>;
  demanderAutorisation: () => Promise<string>;
  /** programme l'alarme a finMs (ms depuis 1970), renvoie son identifiant ou null */
  programmer: (finMs: number, titre: string, corps: string) => Promise<string | null>;
  annuler: (id: string) => Promise<boolean>;
  toutAnnuler: () => Promise<boolean>;
};

const METHODES: (keyof ModuleAlarmeRepos)[] = ['disponible', 'autorisation', 'demanderAutorisation', 'programmer', 'annuler', 'toutAnnuler'];

/** Le module natif complet, ou null (build sans le module, Android, web) */
export function lireModuleAlarme(mods: Record<string, unknown> | undefined = NativeModules as Record<string, unknown>, os: string = Platform.OS): ModuleAlarmeRepos | null {
  if (os !== 'ios' || !mods) return null;
  const m = mods.YoroiAlarmeRepos as Partial<Record<keyof ModuleAlarmeRepos, unknown>> | undefined;
  if (!m || typeof m !== 'object') return null;
  return METHODES.every((k) => typeof m[k] === 'function') ? (m as unknown as ModuleAlarmeRepos) : null;
}

export function normaliserAutorisation(v: unknown): AutorisationAlarme {
  return v === 'autorise' || v === 'refuse' ? v : 'inconnu';
}

export type VoieFinRepos = 'alarme' | 'notification';

/** Alarme du systeme seulement si la sonnerie est voulue, le module la, et les alarmes pas refusees */
export function voieFinRepos(o: { sonnerie: boolean; disponible: boolean; autorisation: AutorisationAlarme }): VoieFinRepos {
  if (!o.sonnerie || !o.disponible) return 'notification';
  return o.autorisation === 'refuse' ? 'notification' : 'alarme';
}

/** Identifiants des alarmes, distincts de ceux des notifications dans le rappel de fin de repos */
export const PREFIXE_ALARME = 'alarme:';
export function estIdAlarme(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(PREFIXE_ALARME);
}

/** App ouverte : l'alarme est retiree 1,5 s avant la fin, l'ecran sonne lui meme */
export const AVANCE_RETRAIT_MS = 1500;

/** Delai avant de retirer l'alarme si l'app est encore ouverte, ou null (pas de fin, ou deja passee) */
export function delaiRetraitPremierPlan(finMs: number | null | undefined, maintenant: number): number | null {
  if (typeof finMs !== 'number' || !Number.isFinite(finMs)) return null;
  const d = finMs - AVANCE_RETRAIT_MS - maintenant;
  return d > 0 ? d : null;
}

// ---- Branchement sur l'app ----

let derniere: string | null = null;
const CLE_DEMANDE = 'yoroi_alarme_repos_demande_v1';

/**
 * Programme l'alarme de fin de repos si c'est la voie choisie. Renvoie son identifiant (prefixe « alarme: »),
 * ou null : la notification prend le relais.
 * Premiere fois (autorisation jamais demandee) : la demande part une fois, au premier repos.
 */
export async function programmerAlarmeRepos(finMs: number, titre: string, corps: string, mod: ModuleAlarmeRepos | null = lireModuleAlarme()): Promise<string | null> {
  if (!mod) return null;
  try {
    const sonnerie = await chargerSonnerieRepos();
    if (!sonnerie) return null;
    const disponible = !!(await mod.disponible());
    let autorisation = normaliserAutorisation(await mod.autorisation());
    if (disponible && sonnerie && autorisation === 'inconnu') {
      const deja = await AsyncStorage.getItem(CLE_DEMANDE).catch(() => null);
      if (!deja) {
        await AsyncStorage.setItem(CLE_DEMANDE, '1').catch(() => {});
        autorisation = normaliserAutorisation(await mod.demanderAutorisation());
      }
    }
    if (voieFinRepos({ sonnerie, disponible, autorisation }) !== 'alarme' || autorisation !== 'autorise') return null;
    const id = await mod.programmer(finMs, titre, corps);
    if (!id) return null;
    derniere = PREFIXE_ALARME + id;
    return derniere;
  } catch {
    return null;
  }
}

export async function annulerAlarmeRepos(id: string, mod: ModuleAlarmeRepos | null = lireModuleAlarme()): Promise<void> {
  if (!mod || !estIdAlarme(id)) return;
  if (derniere === id) derniere = null;
  try {
    await mod.annuler(id.slice(PREFIXE_ALARME.length));
  } catch {
    // deja partie
  }
}

/** App ouverte a la fin du repos : l'alarme en cours est retiree (l'ecran sonne) */
export async function retirerAlarmeRepos(mod: ModuleAlarmeRepos | null = lireModuleAlarme()): Promise<void> {
  if (derniere) await annulerAlarmeRepos(derniere, mod);
}

/** Seance terminee ou abandonnee : plus aucune alarme de repos */
export async function retirerToutesAlarmesRepos(mod: ModuleAlarmeRepos | null = lireModuleAlarme()): Promise<void> {
  derniere = null;
  if (!mod) return;
  try {
    await mod.toutAnnuler();
  } catch {
    // rien de programme
  }
}

/** Pour l'interrupteur : ce qu'il peut promettre sur cet appareil */
export async function etatSonnerieAppareil(mod: ModuleAlarmeRepos | null = lireModuleAlarme()): Promise<{ disponible: boolean; autorisation: AutorisationAlarme }> {
  if (!mod) return { disponible: false, autorisation: 'inconnu' };
  try {
    const disponible = !!(await mod.disponible());
    return { disponible, autorisation: disponible ? normaliserAutorisation(await mod.autorisation()) : 'inconnu' };
  } catch {
    return { disponible: false, autorisation: 'inconnu' };
  }
}

/** Interrupteur allume : la demande d'autorisation part tout de suite (l'utilisateur sait pourquoi) */
export async function demanderAlarmesRepos(mod: ModuleAlarmeRepos | null = lireModuleAlarme()): Promise<AutorisationAlarme> {
  if (!mod) return 'inconnu';
  try {
    if (!(await mod.disponible())) return 'inconnu';
    await AsyncStorage.setItem(CLE_DEMANDE, '1').catch(() => {});
    return normaliserAutorisation(await mod.demanderAutorisation());
  } catch {
    return 'inconnu';
  }
}

/** Pour les tests */
export function _derniereAlarme(): string | null {
  return derniere;
}
