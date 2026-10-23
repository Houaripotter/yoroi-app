/**
 * « Début de mon objectif » (courbe v2, 16 octobre, Houari : « il faut que l'utilisateur choisisse quand il commence
 * sa perte, prise ou maintien de poids »).
 *
 * Stockage : les champs du profil qui existent deja, start_date et start_weight. Ce sont eux que lisent la ligne
 * directrice et le torii (usePlanPoids, departDuPlan), la montre (lib/v2/montre/contexte.ts), les widgets, les
 * predictions et le chemin vers le torii (departDuChemin) : changer la date recalcule tout, depuis une seule source.
 * Rien ne change pour un objectif existant tant que tu ne touches pas a la date (valeur par defaut = comportement
 * d'avant : la date de creation de l'objectif et ton poids de depart). Le tout premier debut est garde de cote
 * (yoroi_debut_origine_v1) pour pouvoir y revenir.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getProfile, saveProfile } from '@/lib/database';
import { jourDe } from './ligneDirectrice';

const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}/;
export const CLE_DEBUT_ORIGINE = 'yoroi_debut_origine_v1';

type PeseeJour = { date: string; value: number; trend?: number };

/**
 * Ton poids au debut choisi (18 octobre, audit du poids : plus de tendance lissee, elle donnait un debut a 90,8 kg
 * quand ta vraie pesee etait a 91,1 kg, et la courbe ne partait plus du point « Début ») : ta pesee de ce jour ;
 * sinon ta premiere pesee dans les 7 jours qui suivent ; sinon ta pesee la plus proche ; null sans pesee.
 * C'est une proposition : la feuille « Ton objectif » te laisse regler ce poids a la regle.
 */
export function poidsAuDebut(series: PeseeJour[], date: string): number | null {
  const ok = series.filter((p) => p && p.value > 0 && ISO.test(p.date));
  if (!ok.length || !ISO.test(date)) return null;
  const t = jourDe(date);
  const jour = ok.find((p) => p.date.slice(0, 10) === date.slice(0, 10));
  if (jour) return Math.round(jour.value * 10) / 10;
  const apres = ok.find((p) => p.date.slice(0, 10) > date.slice(0, 10) && jourDe(p.date) - t <= 7 * DAY);
  if (apres) return Math.round(apres.value * 10) / 10;
  let best = ok[0];
  let bd = Infinity;
  for (const p of ok) {
    const d = Math.abs(jourDe(p.date) - t);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return Math.round(best.value * 10) / 10;
}

/** La date proposee : le debut deja enregistre (creation de ton objectif), sinon ta premiere pesee, sinon aujourd'hui */
export function debutPropose(profil: { start_date?: string | null } | null | undefined, series: { date: string }[], today: string): string {
  const d = profil?.start_date;
  if (d && ISO.test(d) && d.slice(0, 10) <= today) return d.slice(0, 10);
  const premiere = series.find((p) => ISO.test(p.date));
  return premiere ? premiere.date.slice(0, 10) : today;
}

/** Ce qui sera ecrit pour une nouvelle date (sans pesee, le poids de depart deja enregistre reste) */
export function nouveauDebut(date: string, series: PeseeJour[], ancienPoids: number | null | undefined): { start_date: string; start_weight: number | undefined } {
  const p = poidsAuDebut(series, date);
  return { start_date: date.slice(0, 10), start_weight: p ?? (ancienPoids && ancienPoids > 0 ? ancienPoids : undefined) };
}

/** Garde le tout premier debut (une seule fois), pour « revenir au début d'origine » */
async function garderOrigine(profil: { start_date?: string | null; start_weight?: number | null } | null): Promise<void> {
  try {
    const deja = await AsyncStorage.getItem(CLE_DEBUT_ORIGINE);
    if (deja) return;
    await AsyncStorage.setItem(CLE_DEBUT_ORIGINE, JSON.stringify({ start_date: profil?.start_date ?? null, start_weight: profil?.start_weight ?? null }));
  } catch {
    // stockage indisponible : rien de grave, seul le retour a l'origine manquera
  }
}

/** Le debut d'origine garde, ou null */
export async function lireOrigine(): Promise<{ start_date: string | null; start_weight: number | null } | null> {
  try {
    const raw = await AsyncStorage.getItem(CLE_DEBUT_ORIGINE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Previent tout ce qui lit le debut (courbes, torii, montre, widgets, predictions) */
export function annoncerDebut(): void {
  DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
  DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
}

/**
 * Change le debut de ton objectif tout de suite (depuis le detail du poids) : la date et ton poids de ce jour.
 * Renvoie le debut ecrit, ou null si rien n'a change (pas de profil, date dans le futur).
 */
export async function changerDebutObjectif(date: string, series: PeseeJour[], today: string, poids?: number | null): Promise<{ start_date: string; start_weight: number | undefined } | null> {
  if (!ISO.test(date) || date.slice(0, 10) > today) return null;
  if (poids != null && !(poids >= 20 && poids <= 400)) return null;
  const profil = await getProfile();
  if (!profil) return null;
  await garderOrigine(profil);
  // 18 octobre : le poids regle a la main dans la feuille « Ton objectif » passe avant la pesee du jour
  const n = poids != null ? { start_date: date.slice(0, 10), start_weight: Math.round(poids * 10) / 10 } : nouveauDebut(date, series, profil.start_weight);
  await saveProfile({ ...profil, start_date: n.start_date, start_weight: n.start_weight });
  annoncerDebut();
  return n;
}

/** Pour l'ecran du profil, qui enregistre lui-meme : garde l'origine avant le premier changement */
export async function avantChangementDebut(): Promise<void> {
  try {
    await garderOrigine(await getProfile());
  } catch {
    // rien
  }
}
