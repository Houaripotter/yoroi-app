/**
 * Journal du dernier echange avec tes autres telephones (28 octobre 2026), pour l'ecran de synchro :
 * quand, avec quel appareil, combien d'elements de chaque type sont partis et arrives, et les erreurs.
 * Garde en memoire et dans le telephone (<CLE_JOURNAL>, propre a ce telephone, jamais sauvegarde ni envoye).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { traduire } from '@/lib/i18n/tr';

export const CLE_JOURNAL = '@yoroi_peer_journal_v1';

export type Sens = 'recu' | 'envoye';

export interface Echange {
  /** heure ISO de la fin de l'echange */
  quand: string;
  appareil: string;
  /** nombre d'elements par type (cle de TYPES_AFFICHES) */
  compte: Record<string, number>;
  /** elements non appliques ou cles en erreur ; vide : tout est passe */
  erreurs: string[];
}

export interface Journal {
  recu?: Echange;
  envoye?: Echange;
  /** derniere erreur hors echange (connexion, message illisible) */
  erreur?: { quand: string; texte: string };
}

/** Tables de la base et types de reglages, regroupes pour l'affichage */
const TYPE_DE_TABLE: Record<string, string> = {
  trainings: 'seances', slot_occurrences: 'seances', weekly_plan: 'planning', weights: 'pesees',
  measurements: 'mensurations', body_compositions: 'mensurations', sleep_entries: 'sommeil', fasting_sessions: 'jeune',
  clubs: 'clubs', competitions: 'competitions', combats: 'competitions', injuries: 'blessures',
  injury_eva_history: 'blessures', injury_treatments: 'blessures', treatment_reminders: 'blessures',
  achievements: 'badges', progression_items: 'carnet', practice_logs: 'carnet', training_goals: 'objectifs',
  profile: 'profil', hydratation: 'eau', objectifs_poids: 'objectifs', objectives: 'objectifs',
};

export const typeDeTable = (t: string): string => TYPE_DE_TABLE[t] ?? 'donnees';

/** Libelles a l'ecran, dans l'ordre d'affichage */
export function libelleType(type: string): string {
  switch (type) {
    case 'seances': return traduire('Séances');
    case 'planning': return traduire('Planning');
    case 'pesees': return traduire('Pesées');
    case 'mensurations': return traduire('Mensurations');
    case 'sommeil': return traduire('Sommeil');
    case 'jeune': return traduire('Jeûne');
    case 'clubs': return traduire('Clubs');
    case 'competitions': return traduire('Compétitions');
    case 'blessures': return traduire('Blessures');
    case 'badges': return traduire('Badges');
    case 'carnet': return traduire('Carnet');
    case 'objectifs': return traduire('Objectifs');
    case 'profil': return traduire('Profil');
    case 'eau': return traduire('Eau');
    case 'partenaires': return traduire('Partenaires');
    case 'records': return traduire('Records');
    case 'charges': return traduire('Charges');
    case 'photos': return traduire('Photos, sans les fichiers');
    case 'seances_enregistrees': return traduire('Mes séances');
    case 'programmes': return traduire('Programmes');
    case 'scene': return traduire('Scène et personnage');
    case 'rappels': return traduire('Rappels');
    case 'reglages': return traduire('Réglages');
    case 'suppressions': return traduire('Suppressions');
    default: return traduire('Autres données');
  }
}

let journal: Journal = {};
let lu = false;
const abonnes = new Set<(j: Journal) => void>();

export async function lireJournal(): Promise<Journal> {
  if (lu) return journal;
  try {
    const brut = await AsyncStorage.getItem(CLE_JOURNAL);
    const j = brut ? JSON.parse(brut) : {};
    if (j && typeof j === 'object') journal = { ...j, ...journal };
  } catch { /* journal vide */ }
  lu = true;
  return journal;
}

async function publier(): Promise<void> {
  try { await AsyncStorage.setItem(CLE_JOURNAL, JSON.stringify(journal)); } catch { /* garde en memoire */ }
  for (const cb of abonnes) {
    try { cb(journal); } catch { /* ecran ferme */ }
  }
}

export function ajouter(compte: Record<string, number>, type: string, n: number): void {
  if (n > 0) compte[type] = (compte[type] ?? 0) + n;
}

export async function noterEchange(sens: Sens, e: Echange): Promise<void> {
  await lireJournal();
  journal = { ...journal, [sens]: e };
  await publier();
}

export async function noterErreur(texte: string): Promise<void> {
  await lireJournal();
  journal = { ...journal, erreur: { quand: new Date().toISOString(), texte: texte.slice(0, 200) } };
  await publier();
}

/** S'abonne au journal ; renvoie la fonction pour se desabonner */
export function suivreJournal(cb: (j: Journal) => void): () => void {
  abonnes.add(cb);
  void lireJournal().then(cb).catch(() => undefined);
  return () => { abonnes.delete(cb); };
}

export const __test__ = { oublier: () => { journal = {}; lu = false; abonnes.clear(); } };
