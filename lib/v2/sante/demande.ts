/**
 * Demande d'acces a Apple Sante ou Health Connect (14 octobre 2026).
 *
 * 1. Un ecran explicatif d'abord (onboarding, mini onboarding de la 3.0), puis la fenetre du systeme.
 * 2. Refus ou « Plus tard » : une carte discrete sur l'Accueil, au plus 3 fois :
 *    - 1re relance : apres la premiere seance notee a la main depuis le refus (ou, sans seance, 3 jours apres) ;
 *    - 2e : 3 jours apres la 1re ; 3e : 7 jours apres la 2e ; puis plus jamais d'elle-meme.
 *    « Ne plus me demander » coupe tout. Reglages, Sante et appareils reste toujours ouvert.
 * 3. iOS ne montre sa fenetre qu'une fois par type de donnee et ne dit jamais si la lecture est refusee :
 *    apres l'autorisation, si aucune donnee n'est lue (pas, energie, distance, frequence au repos sur 30 jours),
 *    on considere l'acces comme refuse et la carte guide vers les reglages (etapes ecrites + bouton).
 * La logique du calendrier est pure et testee (__tests__/unit/demandeSante.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import { validateLinkingURL } from '@/lib/security/validators';
import { traduire } from '@/lib/i18n/tr';

export const DEMANDE_SANTE_KEY = '@yoroi_sante_demande_v1';
const JOUR = 86400000;
/** delais entre deux relances (en jours) : apres la 1re, puis apres la 2e */
export const DELAIS_RELANCE = [3, 7] as const;
/** sans seance notee, la 1re relance vient quand meme apres ce delai */
export const DELAI_SANS_SEANCE = 3;
export const RELANCES_MAX = 3;
/** delai avant de juger qu'une autorisation n'a rien donne (le temps de la premiere lecture) */
export const DELAI_VERIF_LECTURE_MS = 10 * 60 * 1000;

export type StatutSante = 'jamais' | 'acceptee' | 'refusee' | 'passee';

export type DemandeSante = {
  statut: StatutSante;
  /** debut du calendrier : date du refus ou du passage (ISO) */
  depuis: string | null;
  /** seances notees a la main au moment du refus */
  seancesAuRefus: number | null;
  /** relances deja montrees puis fermees (0 a 3) */
  relances: number;
  derniereRelance: string | null;
  nePlus: boolean;
  /** iOS : la fenetre du systeme a deja ete montree, elle ne reviendra pas */
  fenetreSysteme: boolean;
  /** date de la derniere autorisation donnee (ISO) */
  autoriseeLe: string | null;
  /** des donnees ont deja ete lues apres l'autorisation : plus besoin de verifier */
  donneesVues: boolean;
  /** l'autorisation n'a rien donne (lecture vide) : on guide vers les reglages */
  lectureVide: boolean;
};

export const DEMANDE_VIDE: DemandeSante = {
  statut: 'jamais',
  depuis: null,
  seancesAuRefus: null,
  relances: 0,
  derniereRelance: null,
  nePlus: false,
  fenetreSysteme: false,
  autoriseeLe: null,
  donneesVues: false,
  lectureVide: false,
};

const ms = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
};

/** Une relance est-elle due maintenant ? */
export function relanceDue(s: DemandeSante, now: Date, seancesManuelles: number): boolean {
  if (s.nePlus) return false;
  if (s.statut !== 'refusee' && s.statut !== 'passee') return false;
  if (s.relances >= RELANCES_MAX) return false;
  const t = now.getTime();
  if (s.relances === 0) {
    if (s.seancesAuRefus != null && seancesManuelles > s.seancesAuRefus) return true;
    const d = ms(s.depuis);
    return d != null && t - d >= DELAI_SANS_SEANCE * JOUR;
  }
  const last = ms(s.derniereRelance) ?? ms(s.depuis);
  if (last == null) return true;
  const delai = DELAIS_RELANCE[Math.min(s.relances - 1, DELAIS_RELANCE.length - 1)];
  return t - last >= delai * JOUR;
}

/** Refus ou « Passer » sur l'ecran explicatif (ou fenetre systeme fermee sans rien) */
export function apresRefus(s: DemandeSante, now: Date, seancesManuelles: number, statut: 'refusee' | 'passee' = 'passee'): DemandeSante {
  // une deuxieme reponse negative ne remet jamais le calendrier ni le compte des relances a zero
  if (s.depuis) return { ...s, statut };
  return { ...s, statut, depuis: now.toISOString(), seancesAuRefus: seancesManuelles };
}

/** L'utilisateur a accepte (la fenetre systeme a ete montree) */
export function apresAutorisation(s: DemandeSante, now: Date): DemandeSante {
  return { ...s, statut: 'acceptee', fenetreSysteme: true, autoriseeLe: now.toISOString(), lectureVide: false, donneesVues: false };
}

/** La carte a ete montree puis fermee (« Plus tard ») */
export function apresRelance(s: DemandeSante, now: Date): DemandeSante {
  return { ...s, relances: Math.min(RELANCES_MAX, s.relances + 1), derniereRelance: now.toISOString() };
}

export function nePlusDemander(s: DemandeSante): DemandeSante {
  return { ...s, nePlus: true };
}

/**
 * Apres une autorisation : que dit la lecture ?
 * Des donnees : c'est bon pour de bon. Rien apres le delai : l'acces est sans doute refuse,
 * on repasse en « refusee » (calendrier des relances) avec le guide vers les reglages.
 */
export function apresLecture(s: DemandeSante, now: Date, aDesDonnees: boolean, seancesManuelles: number): DemandeSante {
  if (s.statut !== 'acceptee' || s.donneesVues) return s;
  if (aDesDonnees) return { ...s, donneesVues: true, lectureVide: false };
  const a = ms(s.autoriseeLe);
  if (a == null || now.getTime() - a < DELAI_VERIF_LECTURE_MS) return s;
  // les relances deja faites sont gardees : on ne repart jamais de zero (au plus 3 relances en tout)
  return {
    ...s,
    statut: 'refusee',
    depuis: s.depuis ?? now.toISOString(),
    seancesAuRefus: s.seancesAuRefus ?? seancesManuelles,
    lectureVide: true,
    fenetreSysteme: true,
  };
}

/** Ce que la carte propose : la fenetre du systeme (encore possible) ou le guide des reglages */
export function modeDemande(s: DemandeSante, platform: string): 'fenetre' | 'reglages' {
  if (s.lectureVide) return 'reglages';
  if (platform === 'ios' && s.fenetreSysteme) return 'reglages';
  return 'fenetre';
}

// ── Stockage ──────────────────────────────────────────────────────────────

export function lireDemande(raw: string | null): DemandeSante {
  if (!raw) return { ...DEMANDE_VIDE };
  try {
    const o = JSON.parse(raw) as Partial<DemandeSante>;
    return { ...DEMANDE_VIDE, ...o, relances: Math.max(0, Math.min(RELANCES_MAX, Number(o.relances) || 0)) };
  } catch {
    return { ...DEMANDE_VIDE };
  }
}

export async function getDemandeSante(): Promise<DemandeSante> {
  try {
    return lireDemande(await AsyncStorage.getItem(DEMANDE_SANTE_KEY));
  } catch {
    return { ...DEMANDE_VIDE };
  }
}

export async function saveDemandeSante(s: DemandeSante): Promise<void> {
  try {
    await AsyncStorage.setItem(DEMANDE_SANTE_KEY, JSON.stringify(s));
  } catch (e) {
    logger.warn('[Sante] demande non enregistree', e);
  }
}

export async function majDemandeSante(f: (s: DemandeSante) => DemandeSante): Promise<DemandeSante> {
  const next = f(await getDemandeSante());
  await saveDemandeSante(next);
  return next;
}

// ── Textes et reglages ────────────────────────────────────────────────────

export const nomSante = (platform: string = Platform.OS) => (platform === 'android' ? 'Health Connect' : 'Apple Santé');

/** Les etapes pour rouvrir l'acces quand la fenetre du systeme ne revient plus */
export function etapesReglages(platform: string = Platform.OS): string[] {
  if (platform === 'android') {
    return [traduire('Ouvre Health Connect (le bouton ci-dessous).'), traduire('Touche Autorisations des applis, puis YOROI.'), traduire('Active ce que tu veux partager, puis reviens ici.')];
  }
  return [
    traduire('Ouvre l’app Santé (le bouton ci-dessous).'),
    traduire('Touche ta photo en haut à droite, puis Apps, puis YOROI.'),
    traduire('Active les données à partager, puis reviens ici.'),
  ];
}

export const cheminReglagesIos = traduire('Ou dans Réglages : Santé, Accès aux données et appareils, YOROI.');

/**
 * Ouvre l'endroit ou l'on regle l'acces.
 * iOS : l'app Sante (x-apple-health://, ouverte sans canOpenURL, qui renvoie faux tant que le schema
 * n'est pas declare dans LSApplicationQueriesSchemes), sinon les Reglages de YOROI.
 * Android : les reglages de Health Connect, sinon les reglages de l'app.
 */
export async function ouvrirReglagesSante(openHealthConnectSettings?: () => Promise<void>): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      if (openHealthConnectSettings) {
        await openHealthConnectSettings();
        return true;
      }
      await Linking.openSettings();
      return true;
    }
    if (Platform.OS === 'ios') {
      const v = validateLinkingURL('x-apple-health://');
      if (v.valid) {
        try {
          await Linking.openURL(v.sanitized);
          return true;
        } catch {
          // Sante introuvable : les Reglages
        }
      }
      await Linking.openSettings();
      return true;
    }
  } catch (e) {
    logger.warn('[Sante] reglages non ouverts', e);
  }
  return false;
}

/**
 * Des donnees venues de Sante ont-elles ete lues ? (series de useSante, sur 30 jours)
 * Seulement des mesures que YOROI ne note jamais lui-meme (pas de sommeil ni de seances, qu'on peut saisir a la main).
 */
export function aDesDonneesSante(series: Record<string, { value: number }[] | undefined> | null | undefined): boolean {
  if (!series) return false;
  return ['pas', 'energie-active', 'fc-repos', 'distance'].some((k) => (series[k] ?? []).some((p) => p && p.value > 0));
}
