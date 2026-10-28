/**
 * Plan de « Tout effacer » : la partie pure, sans module natif, donc testable.
 * Elle decide quelles tables vider ou supprimer, quelles cles du trousseau effacer
 * et quels fichiers du dossier Documents retirer. L'execution est dans
 * effacerToutesMesDonnees() de lib/storage.ts.
 */

/** Prefixe des copies de tables faites par le mode demo (lib/demoDataService.ts) */
import { traduire } from '@/lib/i18n/tr';
export const PREFIXE_SAUVEGARDE_DEMO = 'demo_bak_';

/**
 * Tables gardees telles quelles. Chaque exception est justifiee :
 * - events_catalog : catalogue public des competitions, importe depuis les fichiers JSON
 *   livres avec l'app (lib/eventsService.ts). Aucune donnee personnelle, et le vider
 *   forcerait un reimport complet au prochain lancement.
 * - android_metadata : table technique qu'Android peut creer (langue de la base).
 *   Aucune donnee personnelle.
 * Tout le reste (app_metadata compris : il ne contient que la version du catalogue,
 * qui sera reecrite au reimport) est vide.
 */
export const TABLES_GARDEES: readonly string[] = ['events_catalog', 'android_metadata'];

/** Seuls ces noms sont acceptes dans une requete (un nom de table ne peut pas etre passe en parametre ?) */
export const nomDeTableSur = (nom: string): boolean => /^[A-Za-z0-9_]+$/.test(nom);

export interface PlanTables {
  /** Tables dont on supprime toutes les lignes (le schema reste) */
  aVider: string[];
  /** Tables supprimees entierement (copies du mode demo) */
  aSupprimer: string[];
}

/** Repartit les tables lues dans sqlite_master entre « a vider » et « a supprimer » */
export function planDesTables(noms: readonly string[]): PlanTables {
  const aVider: string[] = [];
  const aSupprimer: string[] = [];
  for (const nom of noms) {
    if (!nom || nom.startsWith('sqlite_') || !nomDeTableSur(nom)) continue;
    if (nom.startsWith(PREFIXE_SAUVEGARDE_DEMO)) aSupprimer.push(nom);
    else if (!TABLES_GARDEES.includes(nom)) aVider.push(nom);
  }
  return { aVider, aSupprimer };
}

/**
 * Cles du trousseau (SecureStore) gardees. L'abonnement n'est pas une donnee de sante :
 * effacer son cache ferait croire a l'abonne qu'il a perdu Premium jusqu'a la
 * prochaine reponse de RevenueCat (constantes de context/PremiumContext.tsx).
 * Les cles du mode createur (lib/v2/creator/creatorStore.ts) sont ajoutees par l'appelant.
 */
export const CLES_SECURE_GARDEES: readonly string[] = ['yoroi_premium_cache_v1', 'yoroi_premium_product_v1'];

/** Cles du trousseau connues de YOROI (relevees dans le code vivant) */
export const CLES_SECURE_CONNUES: readonly string[] = [
  '@yoroi_backup_encryption_password',
  '@yoroi_body_composition',
  '@yoroi_current_weight',
  '@yoroi_fasting_active_mode',
  '@yoroi_fasting_custom',
  '@yoroi_fasting_history',
  '@yoroi_fasting_ramadan',
  '@yoroi_fasting_start_time',
  '@yoroi_health_last_weight',
  '@yoroi_hydration_settings',
  '@yoroi_injuries',
  '@yoroi_measurements',
  '@yoroi_mood_log',
  '@yoroi_photos',
  '@yoroi_sleep_entries',
  '@yoroi_target_weight',
  '@yoroi_user_body_status',
  '@yoroi_user_settings',
  '@yoroi_water_intake',
  'yoroi_peer_pairs_v1',
];

/** Meme nettoyage du nom que lib/security/secureStorage.ts */
export const nomSecure = (cle: string): string => cle.replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * Cles du trousseau a effacer : les cles connues, plus chaque cle AsyncStorage
 * (d'anciennes versions ont range certaines donnees aux deux endroits),
 * moins les cles gardees (comparees apres nettoyage du nom).
 */
export function clesSecureAEffacer(clesAsync: readonly string[], gardeesEnPlus: readonly string[] = []): string[] {
  const gardees = new Set([...CLES_SECURE_GARDEES, ...gardeesEnPlus].map(nomSecure));
  const vues = new Set<string>();
  const resultat: string[] = [];
  for (const cle of [...CLES_SECURE_CONNUES, ...clesAsync]) {
    if (!cle) continue;
    const nom = nomSecure(cle);
    if (gardees.has(nom) || vues.has(nom)) continue;
    vues.add(nom);
    resultat.push(cle);
  }
  return resultat;
}

/**
 * Elements du dossier Documents a supprimer : tout sauf
 * - SQLite : le dossier de la base yoroi.db, ouverte en ce moment. Elle est videe table
 *   par table puis compactee (VACUUM), la supprimer ici casserait la connexion ouverte.
 * - les noms caches (commencant par un point) : fichiers techniques d'outils (client de
 *   developpement), YOROI n'en ecrit jamais.
 */
export function fichiersDocumentsAEffacer(noms: readonly string[]): string[] {
  return noms.filter((n) => !!n && n !== 'SQLite' && !n.startsWith('.'));
}

/** Ce que « Tout effacer » efface (texte affiche avant de confirmer) */
export const TEXTE_EFFACE =
  traduire('Tout ce que YOROI garde sur ce téléphone est effacé : pesées, mensurations, séances, photos, sauvegardes, réglages, rappels.');

/** Ce que « Tout effacer » ne peut pas effacer, selon le telephone */
export function texteResteEnDehors(os: string): string {
  const sante = os === 'android' ? 'Health Connect' : os === 'ios' ? 'Apple Santé' : null;
  const debut = sante ? traduire("ce qui a été écrit dans {0}, ", sante) : '';
  return traduire("Restent en dehors de YOROI : {0}tes sauvegardes copiées dans ton dossier cloud, et les images enregistrées dans ta galerie. Tu peux les supprimer à la main.", debut);
}

/** Les deux paragraphes ensemble, pour une fenetre de confirmation */
export const messageEffacement = (os: string): string => `${TEXTE_EFFACE}\n\n${texteResteEnDehors(os)}`;
