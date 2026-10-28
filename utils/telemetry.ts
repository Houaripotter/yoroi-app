/**
 * Mesure d'audience et rapports de plantage de YOROI (13 octobre 2026).
 *
 * REGLE QUI PRIME SUR TOUT : aucune valeur de sante ne part. Ni poids, ni mensuration, ni calorie, ni frequence
 * cardiaque, ni duree ou charge de seance, ni donnee d'Apple Sante ou Health Connect, ni texte saisi, ni nom, ni lieu.
 * Ce qui part, ce sont des faits d'usage pris dans des listes fermees ecrites ici.
 *
 * Garanties techniques :
 *  1. NomEvenement est une liste fermee : TypeScript refuse tout autre nom a la compilation.
 *  2. Chaque evenement a ses parametres, chacun pris dans une liste fermee : aucune chaine libre, aucun nombre mesure.
 *  3. Le consentement (actif par defaut, decision de Houari du 13 octobre) coupe au niveau du SDK
 *     (setAnalyticsCollectionEnabled et Sentry) : evenements automatiques et maison s'arretent ensemble.
 *  4. Un compteur local, lisible dans Reglages, Confidentialite, ne quitte jamais le telephone.
 *
 * track(evenement, params) fait, dans cet ordre : consentement (sort si coupe), compteur local, fil d'ariane Sentry,
 * envoi a Firebase Analytics.
 *
 * Tant que Firebase et Sentry ne sont pas installes, utils/telemetryTransport.ts est une coquille : tout est compte
 * en local, rien ne part. Voir le document de projet « mesure, installation ».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transport } from './telemetryTransport';
import type { SourcePaywall, SourcePremium } from '@/lib/v2/premium/sources';
import type { SourcePartage } from '@/lib/v2/partage/mesure';
import type { TrancheAge } from '@/lib/v2/onboarding/trancheAge';

/** Heure de debut d'execution du bundle JavaScript : sert a first_screen_rendered */
const T0 = Date.now();

// ---------------------------------------------------------------------------
// Listes fermees des valeurs de parametres
// ---------------------------------------------------------------------------

export type Plan = 'mensuel' | 'annuel';
export type OuiNon = 'oui' | 'non';
export type Resultat = 'ok' | 'refuse' | 'annule' | 'erreur' | 'trouve' | 'rien';
export type Erreur = 'reseau' | 'store' | 'configuration' | 'acces_inactif' | 'inconnu';
export type Tentative = '1' | '2' | '3';
export type Onglet = 'accueil' | 'seances' | 'progres' | 'dojo';
export type Famille = 'muscu' | 'combat' | 'cardio' | 'autre';
export type Plateforme = 'apple_sante' | 'health_connect';
export type Origine = 'icone' | 'notification' | 'widget' | 'lien';
export type Duree = 'moins_1s' | '1_2s' | '2_4s' | 'plus_4s';
export type TrancheJours = 'j1' | 'j2_7' | 'j8_30' | 'j30_plus';
export type TrancheEcart = 'meme_jour' | '1j' | '2_3j' | '4_7j' | '8_30j' | 'plus_30j';
export type TrancheSerie = '1' | '2_3' | '4_7' | '8_plus';
export type TrancheNombre = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8_plus';
export type TrancheUsage = '1' | '2_5' | '6_20' | '21_50' | '51_plus';
export type Rang = '1' | '2' | '3' | '4' | '5';
export type Statut = 'gratuit' | 'essai' | 'abonne';
export type EcranPermission = 'pesee' | 'seance' | 'timer' | 'sparring' | 'reglages' | 'essai';
export type MomentAvis = 'troisieme_seance';
export type TypeNotif =
  | 'pesee' | 'seance' | 'sommeil' | 'hydratation' | 'serie' | 'recap' | 'carte_sociale' | 'citation'
  | 'conseil' | 'montre' | 'charge' | 'competition' | 'sparring' | 'fin_essai' | 'synchro' | 'autre';
export type TypeExport = 'json' | 'csv' | 'pdf';
export type MethodePoids = 'manuel' | 'balance' | 'photo_balance' | 'sante' | 'onboarding';
export type MethodeSeance = 'live' | 'dictee' | 'deja_faite' | 'saisie' | 'montre' | 'refaire';
export type TypeObjectif = 'poids' | 'seance';
export type EtapeVisite = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14';

export type NiveauStockage = 'proche' | 'critique';
export type CauseStockage = 'total' | 'cle';

export type EtapeOnboarding =
  | 'accroche' | 'prenom' | 'toi' | 'age' | 'univers' | 'objectif' | 'frein' | 'affirmation' | 'sport' | 'poids'
  | 'taille' | 'cap' | 'rythme' | 'moment' | 'demo' | 'comparaison' | 'forge' | 'resultat' | 'premium';

/** Choix de l'onboarding. Le frein ne part qu'en renseigne ou passe : il peut contenir une blessure. */
export type ChoixOnboarding =
  | 'homme' | 'femme' | 'passe' | 'renseigne'
  | 'japon' | 'classique' | 'aucun'
  | 'perdre' | 'prendre' | 'combat' | 'maintenir'
  | 'muscu' | 'cardio' | 'autre'
  | 'regle' | 'sante'
  | 'reveil' | 'douche' | 'midi' | 'soir' | 'heure';

/** Noms d'ecran normalises : construits a partir des segments de route, jamais de valeur dedans */
export type Ecran = string & { readonly __ecran: unique symbol };

// ---------------------------------------------------------------------------
// Liste fermee des evenements et de leurs parametres
// ---------------------------------------------------------------------------

type Rien = Record<string, never>;

export interface Evenements {
  // demarrage
  app_first_open: Rien;
  app_boot: { origine: Origine };
  first_screen_rendered: { duree: Duree };
  screen_view: { ecran: Ecran };
  // onboarding
  onboarding_etape: { etape: EtapeOnboarding };
  onboarding_choix: { etape: EtapeOnboarding; choix?: ChoixOnboarding; famille?: Famille; tranche_nombre?: TrancheNombre };
  onboarding_restauration: { resultat: Resultat };
  onboarding_termine: { statut: Statut };
  // paywall
  paywall_view: { source: SourcePaywall; statut: Statut };
  paywall_cta_tap: { source: SourcePaywall; plan?: Plan };
  paywall_plan_choisi: { source: SourcePaywall; plan: Plan };
  paywall_purchase_ok: { source: SourcePaywall; plan: Plan; essai: OuiNon };
  paywall_purchase_cancel: { source: SourcePaywall; plan: Plan };
  paywall_purchase_error: { source: SourcePaywall; plan: Plan; erreur: Erreur };
  paywall_restore_tap: { source: SourcePaywall };
  paywall_restore_result: { source: SourcePaywall; resultat: Resultat };
  paywall_dismiss_free: { source: SourcePaywall };
  paywall_offerings_error: { source: SourcePaywall; tentative: Tentative };
  paywall_offerings_retry: { source: SourcePaywall; tentative: Tentative };
  paywall_offerings_recovered: { source: SourcePaywall; tentative: Tentative };
  premium_degradation_evitee: Rien;
  premium_perdu_confirme: Rien;
  // mur premium
  premium_gate_hit: { source: SourcePremium };
  premium_gate_cta: { source: SourcePremium };
  // usage
  tab_open: { onglet: Onglet };
  poids_saisi: { methode: MethodePoids; tranche_pesees?: TrancheUsage };
  seance_enregistree: { famille: Famille; methode: MethodeSeance; tranche_seances: TrancheUsage };
  mensuration_ajoutee: Rien;
  composition_ajoutee: Rien;
  photo_ajoutee: Rien;
  objectif_defini: { type: TypeObjectif };
  sommeil_saisi: Rien;
  hydratation_saisie: Rien;
  competition_ajoutee: Rien;
  sante_connexion: { plateforme: Plateforme; resultat: Resultat };
  sauvegarde_exportee: { type: TypeExport };
  donnees_effacees: Rien;
  /** 28 octobre 2026 : stockage de l'app presque plein (Android limite AsyncStorage), aucune valeur ni nom de cle */
  stockage_presque_plein: { niveau: NiveauStockage; cause: CauseStockage };
  // retention
  session_return: { tranche_jours: TrancheJours; tranche_ecart: TrancheEcart };
  serie_semaines: { tranche_serie: TrancheSerie };
  serie_cassee: { tranche_serie: TrancheSerie };
  rang_atteint: { rang: Rang };
  // notifications
  notif_permission_proposee: { ecran: EcranPermission };
  notif_permission_plus_tard: { ecran: EcranPermission };
  notif_permission_demandee: { ecran: EcranPermission };
  notif_permission_accordee: { ecran: EcranPermission };
  notif_permission_refusee: { ecran: EcranPermission };
  notif_ouverte: { type: TypeNotif };
  // partage et avis
  share_tap: { source: SourcePartage };
  share_envoye: { source: SourcePartage };
  avis_demande: { moment: MomentAvis };
}

export type NomEvenement = keyof Evenements;

/** Proprietes utilisateur : listes fermees elles aussi */
export interface Proprietes {
  objectif_principal?: 'perdre' | 'prendre' | 'combat' | 'maintenir' | 'aucun';
  genre?: 'homme' | 'femme' | 'autre' | 'non_renseigne';
  /** 26 octobre 2026 : tranche d'age (liste fermee), jamais l'age ni la date de naissance */
  tranche_age?: TrancheAge | 'non_renseigne';
  famille_principale?: Famille;
  statut_premium?: Statut;
  univers?: 'japon' | 'classique' | 'aucun';
  sante_connectee?: OuiNon;
  notifs_autorisees?: OuiNon;
  mode?: 'competiteur' | 'loisir';
  version_installation?: string;
}

// ---------------------------------------------------------------------------
// Tranches (fonctions pures, testees)
// ---------------------------------------------------------------------------

export function trancheDuree(ms: number): Duree {
  if (ms < 1000) return 'moins_1s';
  if (ms < 2000) return '1_2s';
  if (ms < 4000) return '2_4s';
  return 'plus_4s';
}

export function trancheJours(jours: number): TrancheJours | null {
  if (jours < 1) return null;
  if (jours === 1) return 'j1';
  if (jours <= 7) return 'j2_7';
  if (jours <= 30) return 'j8_30';
  return 'j30_plus';
}

export function trancheEcart(jours: number): TrancheEcart {
  if (jours < 1) return 'meme_jour';
  if (jours < 2) return '1j';
  if (jours < 4) return '2_3j';
  if (jours < 8) return '4_7j';
  if (jours <= 30) return '8_30j';
  return 'plus_30j';
}

export function trancheSerie(n: number): TrancheSerie {
  if (n <= 1) return '1';
  if (n <= 3) return '2_3';
  if (n <= 7) return '4_7';
  return '8_plus';
}

export function trancheNombre(n: number): TrancheNombre {
  if (n >= 8) return '8_plus';
  return String(Math.max(0, Math.floor(n))) as TrancheNombre;
}

export function trancheUsage(n: number): TrancheUsage {
  if (n <= 1) return '1';
  if (n <= 5) return '2_5';
  if (n <= 20) return '6_20';
  if (n <= 50) return '21_50';
  return '51_plus';
}

/** Famille d'un sport, a partir de sa categorie dans lib/sports.ts */
export function familleDeCategorie(categorie: string | null | undefined): Famille {
  if (!categorie) return 'autre';
  if (categorie.startsWith('combat')) return 'combat';
  if (categorie === 'fitness') return 'muscu';
  if (categorie === 'cardio') return 'cardio';
  return 'autre';
}

export function familleDeSport(sportId: string | null | undefined): Famille {
  if (!sportId) return 'autre';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SPORTS } = require('@/lib/sports') as { SPORTS: { id: string; category: string }[] };
    return familleDeCategorie(SPORTS.find((s) => s.id === sportId)?.category);
  } catch {
    return 'autre';
  }
}

/**
 * Nom d'ecran a partir des segments expo-router : groupes retires, segments dynamiques gardes par leur nom
 * (jamais leur valeur). ['(tabs)', 'progres'] donne progres, ['sante', '[metrique]'] donne sante_metrique.
 */
export function nomEcran(segments: readonly string[]): Ecran {
  const parts = segments
    .filter((s) => !(s.startsWith('(') && s.endsWith(')')))
    .map((s) => s.replace(/^\[\.{0,3}/, '').replace(/\]$/, ''))
    .map((s) => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase())
    .filter(Boolean);
  const nom = parts.join('_') || 'accueil';
  return (nom === 'index' ? 'accueil' : nom).slice(0, 40) as Ecran;
}

// ---------------------------------------------------------------------------
// Etat : consentement et compteur local
// ---------------------------------------------------------------------------

const CLE_CONSENTEMENT = '@yoroi_mesure_consentement';
const CLE_COMPTEUR = '@yoroi_mesure_compteur';
const CLE_FIRST_OPEN = '@yoroi_mesure_first_open_envoye';
const CLE_PREMIERE_OUVERTURE = '@yoroi_mesure_premiere_ouverture';
const CLE_DERNIERE_OUVERTURE = '@yoroi_mesure_derniere_ouverture';
const CLE_DERNIER_RETOUR = '@yoroi_mesure_dernier_retour';
const CLE_SERIE = '@yoroi_mesure_serie';

let consentement: boolean | null = null;
let attente: { nom: NomEvenement; params?: Record<string, string> }[] = [];
let compteur: { total: number; parEvenement: Record<string, number> } | null = null;

export type CompteurLocal = { total: number; parEvenement: Record<string, number> };

/** La mesure est-elle reellement branchee (Firebase installe) ? Sert a la politique de confidentialite. */
export function mesureDisponible(): boolean {
  return transport.disponible;
}

export function consentementActif(): boolean {
  return consentement !== false;
}

async function chargerCompteur(): Promise<CompteurLocal> {
  if (compteur) return compteur;
  try {
    const raw = await AsyncStorage.getItem(CLE_COMPTEUR);
    const p = raw ? JSON.parse(raw) : null;
    compteur = p && typeof p.total === 'number' ? p : { total: 0, parEvenement: {} };
  } catch {
    compteur = { total: 0, parEvenement: {} };
  }
  return compteur!;
}

async function incrementer(nom: NomEvenement): Promise<void> {
  const c = await chargerCompteur();
  c.total += 1;
  c.parEvenement[nom] = (c.parEvenement[nom] ?? 0) + 1;
  try {
    await AsyncStorage.setItem(CLE_COMPTEUR, JSON.stringify(c));
  } catch {
    // compteur local seulement
  }
}

export async function lireCompteurLocal(): Promise<CompteurLocal> {
  const c = await chargerCompteur();
  return { total: c.total, parEvenement: { ...c.parEvenement } };
}

/** A appeler une fois au demarrage, le plus tot possible */
export async function initTelemetry(): Promise<void> {
  try {
    const v = await AsyncStorage.getItem(CLE_CONSENTEMENT);
    consentement = v !== 'off';
  } catch {
    consentement = true;
  }
  await transport.init(consentement);
  const enAttente = attente;
  attente = [];
  for (const e of enAttente) await envoyer(e.nom, e.params);
}

/** Interrupteur de Reglages, Confidentialite : coupe ou rallume tout, au niveau du SDK */
export async function setConsentement(actif: boolean): Promise<void> {
  consentement = actif;
  try {
    await AsyncStorage.setItem(CLE_CONSENTEMENT, actif ? 'on' : 'off');
  } catch {
    // le choix reste en memoire pour la session
  }
  await transport.setActif(actif);
}

async function envoyer(nom: NomEvenement, params?: Record<string, string>): Promise<boolean> {
  // 1. consentement
  if (consentement === false) return false;
  // 2. compteur local
  await incrementer(nom);
  // 3. fil d'ariane Sentry : le nom et des valeurs de listes fermees, rien d'autre
  transport.filAriane(nom, params);
  // 4. Firebase Analytics
  return transport.evenement(nom, params);
}

/**
 * Le point d'entree unique. Les parametres sont types par evenement : seules les valeurs des listes fermees passent.
 */
export function track<N extends NomEvenement>(nom: N, ...args: Evenements[N] extends Rien ? [] : [Evenements[N]]): void {
  const brut = args[0] as Record<string, string | undefined> | undefined;
  const params: Record<string, string> | undefined = brut
    ? Object.fromEntries(Object.entries(brut).filter(([, v]) => typeof v === 'string' && v.length > 0)) as Record<string, string>
    : undefined;
  if (consentement === null) {
    if (attente.length < 50) attente.push({ nom, params });
    return;
  }
  void envoyer(nom, params);
}

export function setProprietes(p: Proprietes): void {
  if (consentement === false) return;
  transport.proprietes(p as Record<string, string | undefined>);
}

/** Identifiant d'instance Firebase, pour l'attribut RevenueCat $firebaseAppInstanceId. Null tant que non installe. */
export async function idInstanceMesure(): Promise<string | null> {
  if (consentement === false) return null;
  return transport.idInstance();
}

// ---------------------------------------------------------------------------
// Evenements de cycle de vie
// ---------------------------------------------------------------------------

const JOUR = 24 * 60 * 60 * 1000;

/** Une seule fois dans la vie de l'app. ENVOYE D'ABORD, drapeau pose ensuite : un envoi rate sera retente. */
export async function trackFirstOpen(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(CLE_FIRST_OPEN)) return;
    if (consentement === false || !transport.disponible) return;
    const ok = await envoyer('app_first_open');
    if (ok) await AsyncStorage.setItem(CLE_FIRST_OPEN, '1');
  } catch {
    // retente au prochain lancement
  }
}

export function trackBoot(origine: Origine): void {
  track('app_boot', { origine });
}

let premierEcranEnvoye = false;
export function trackFirstScreenRendered(): void {
  if (premierEcranEnvoye) return;
  premierEcranEnvoye = true;
  track('first_screen_rendered', { duree: trancheDuree(Date.now() - T0) });
}

/** Une fois par jour au plus : jours depuis la premiere ouverture et temps depuis la derniere */
export async function trackReturn(maintenant = Date.now()): Promise<void> {
  try {
    const [premiere, derniere, dernierRetour] = await Promise.all([
      AsyncStorage.getItem(CLE_PREMIERE_OUVERTURE),
      AsyncStorage.getItem(CLE_DERNIERE_OUVERTURE),
      AsyncStorage.getItem(CLE_DERNIER_RETOUR),
    ]);
    if (!premiere) {
      await AsyncStorage.multiSet([[CLE_PREMIERE_OUVERTURE, String(maintenant)], [CLE_DERNIERE_OUVERTURE, String(maintenant)]]);
      return;
    }
    const jourCivil = (t: number) => new Date(t).toDateString();
    const dejaAujourdhui = dernierRetour && jourCivil(Number(dernierRetour)) === jourCivil(maintenant);
    const jours = Math.floor((maintenant - Number(premiere)) / JOUR);
    const ecart = derniere ? (maintenant - Number(derniere)) / JOUR : 0;
    await AsyncStorage.setItem(CLE_DERNIERE_OUVERTURE, String(maintenant));
    if (dejaAujourdhui) return;
    const tj = trancheJours(jours);
    if (!tj) return;
    track('session_return', { tranche_jours: tj, tranche_ecart: trancheEcart(ecart) });
    await AsyncStorage.setItem(CLE_DERNIER_RETOUR, String(maintenant));
  } catch {
    // sans importance
  }
}

/** Une fois par semaine : longueur de la serie de semaines tenues, et le moment ou elle se casse */
export async function trackSerie(semainesTenues: number, maintenant = Date.now()): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CLE_SERIE);
    const avant = raw ? (JSON.parse(raw) as { serie: number; envoye: number }) : null;
    if (avant && avant.serie > 0 && semainesTenues === 0) track('serie_cassee', { tranche_serie: trancheSerie(avant.serie) });
    const uneSemaine = !avant || maintenant - avant.envoye >= 7 * JOUR;
    if (semainesTenues > 0 && uneSemaine) {
      track('serie_semaines', { tranche_serie: trancheSerie(semainesTenues) });
      await AsyncStorage.setItem(CLE_SERIE, JSON.stringify({ serie: semainesTenues, envoye: maintenant }));
    } else {
      await AsyncStorage.setItem(CLE_SERIE, JSON.stringify({ serie: semainesTenues, envoye: avant?.envoye ?? 0 }));
    }
  } catch {
    // sans importance
  }
}
