/**
 * Cartes a partager : memoire locale (sur le telephone) du reglage des propositions automatiques,
 * des moments deja proposes et du dernier habillage choisi (pour retrouver ton style la fois suivante).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { JOURNAL_VIDE, noterProposition } from './moments';
import type { JournalCartes } from './moments';
import type { ModeleId, OptionsCarte, RaisonPesee } from './types';
import { COULEURS } from './couleurs';
import { DIRECTION_DEFAUT, estDirection, ORDRE_CARROUSEL } from './directions';

/**
 * 31 octobre 2026 (cartes v2) : les 10 directions remplacent les six modeles. Le nom MODELES_SIX reste pour les appels
 * existants ; c'est l'ordre du carrousel de l'atelier.
 */
export const MODELES_SIX: ModeleId[] = [...ORDRE_CARROUSEL];

const KEY = 'yoroi_cartes_partage_v1';
const PREFS_KEY = 'yoroi_cartes_partage_style_v1';
export const CARTES_REGLAGE_EVENT = 'YOROI_CARTES_REGLAGE';

export type StyleMemorise = Omit<OptionsCarte, 'chiffres'>;

export const STYLE_DEFAUT: StyleMemorise = {
  // 31 octobre 2026 (cartes v2) : l'Affiche de gala d'abord ; ensuite la direction choisie la derniere fois
  modele: DIRECTION_DEFAUT,
  format: 'story',
  // 31 octobre 2026 : plus de scenes, une couleur franche par defaut (ou ta photo, jamais memorisee)
  fond: 'couleur',
  couleur: 'rouge',
  sombre: true,
  personnage: true,
  masque: 'aucun',
  slogan: 0,
};

export async function lireJournal(): Promise<JournalCartes> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return JOURNAL_VIDE;
    const j = JSON.parse(raw) as Partial<JournalCartes>;
    return { auto: j.auto !== false, vus: Array.isArray(j.vus) ? j.vus : [], dernierPasPesee: j.dernierPasPesee ?? null };
  } catch {
    return JOURNAL_VIDE;
  }
}

async function ecrire(j: JournalCartes) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(j));
  } catch {
    // rien de grave : au pire la proposition reviendrait une fois
  }
}

export async function marquerVu(cle: string, opts?: { raison?: RaisonPesee | null; aujourdhui?: string }): Promise<void> {
  const j = await lireJournal();
  await ecrire(noterProposition(j, cle, opts));
}

export async function setPropositionsAuto(auto: boolean): Promise<void> {
  const j = await lireJournal();
  await ecrire({ ...j, auto });
  DeviceEventEmitter.emit(CARTES_REGLAGE_EVENT, auto);
}

export async function lireStyle(): Promise<StyleMemorise> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return STYLE_DEFAUT;
    return migrerStyle({ ...STYLE_DEFAUT, ...(JSON.parse(raw) as Partial<StyleMemorise>) });
  } catch {
    return STYLE_DEFAUT;
  }
}

/**
 * 31 octobre 2026 : un reglage d'avant la refonte (une scene, un decor, un ancien modele) retombe sur
 * une couleur franche et la direction par defaut. La photo n'est jamais memorisee.
 */
export function migrerStyle(s: StyleMemorise): StyleMemorise {
  const fond = s.fond === 'photo' || s.fond === 'couleur' ? s.fond : 'couleur';
  // un ancien modele (Affiche, Bandeau, Ticket...) retombe sur la direction par defaut
  const modele = estDirection(s.modele) ? s.modele : DIRECTION_DEFAUT;
  const couleur = COULEURS.some((c) => c.id === s.couleur) ? s.couleur : STYLE_DEFAUT.couleur;
  const sortie = s.sortie === 'autocollant' ? 'autocollant' : 'story';
  return { ...s, fond, modele, couleur, sortie };
}

export async function ecrireStyle(s: StyleMemorise): Promise<void> {
  try {
    // la photo personnelle n'est jamais memorisee comme fond : on revient sur la scene
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...s, fond: s.fond === 'photo' ? 'couleur' : s.fond }));
  } catch {
    // facultatif
  }
}
