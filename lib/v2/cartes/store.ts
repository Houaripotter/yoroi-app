/**
 * Cartes a partager : memoire locale (sur le telephone) du reglage des propositions automatiques,
 * des moments deja proposes et du dernier habillage choisi (pour retrouver ton style la fois suivante).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { JOURNAL_VIDE, noterProposition } from './moments';
import type { JournalCartes } from './moments';
import type { OptionsCarte, RaisonPesee } from './types';

const KEY = 'yoroi_cartes_partage_v1';
const PREFS_KEY = 'yoroi_cartes_partage_style_v1';
export const CARTES_REGLAGE_EVENT = 'YOROI_CARTES_REGLAGE';

export type StyleMemorise = Omit<OptionsCarte, 'chiffres'>;

export const STYLE_DEFAUT: StyleMemorise = {
  modele: 'affiche',
  format: 'story',
  fond: 'scene',
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
    return { ...STYLE_DEFAUT, ...(JSON.parse(raw) as Partial<StyleMemorise>) };
  } catch {
    return STYLE_DEFAUT;
  }
}

export async function ecrireStyle(s: StyleMemorise): Promise<void> {
  try {
    // la photo personnelle n'est jamais memorisee comme fond : on revient sur la scene
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...s, fond: s.fond === 'photo' ? 'scene' : s.fond }));
  } catch {
    // facultatif
  }
}
