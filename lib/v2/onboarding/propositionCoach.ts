/**
 * La proposition du coach, une seule fois, après la visite guidée (26 octobre 2026).
 * Houari : « Il vient de finir l'onboarding et tu lui montres directement Commencer la séance : impossible, il vient
 * de télécharger l'app. Mets le directement sur l'accueil pour la présentation de l'app. Le coach peut être après
 * qu'il a fait le tour de l'app ; ne le noie pas. »
 * Fin de l'onboarding : l'accueil, la visite guidée part d'elle-même (components/yoroi/v2/tour/VisiteGuidee.tsx).
 * L'onboarding note ici « à proposer » si le départ du coach n'a jamais eu lieu (yoroi_coach_depart_v1 vide).
 * Une fois la visite faite ou passée, l'accueil montre une carte douce (components/yoroi/v2/onboarding/PropositionCoach.tsx)
 * « Ton coach peut te préparer un programme » avec Oui ou Plus tard. Une réponse, quelle qu'elle soit, et la carte
 * ne revient plus. Plus tard note aussi 'plus_tard' dans le drapeau du coach (lib/v2/programmes/depart.ts) ; Oui ouvre
 * app/coach-depart.tsx, qui garde sa propre logique. Rien ne lance une séance.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { ecrireDepart, lireDepart } from '@/lib/v2/programmes/depart';
import type { EtatDepart } from '@/lib/v2/programmes/depart';

export const CLE_PROPOSITION_COACH = 'yoroi_coach_proposition_v1';
/** emis apres une reponse : la carte de copie dans le cloud (BackupNotice) peut venir ensuite, jamais en meme temps */
export const PROPOSITION_COACH_EVENT = 'yoroi:proposition_coach_repondue';
export type EtatProposition = 'a_proposer' | 'repondu';

/** La regle, sans stockage : la carte se montre seulement si tout est reuni */
export function proposerCoach({ etat, visiteFaite, visiteEnCours, depart }: { etat: EtatProposition | null; visiteFaite: boolean; visiteEnCours: boolean; depart: EtatDepart | null }): boolean {
  return etat === 'a_proposer' && visiteFaite && !visiteEnCours && depart == null;
}

export async function lireProposition(): Promise<EtatProposition | null> {
  try {
    const v = await AsyncStorage.getItem(CLE_PROPOSITION_COACH);
    return v === 'a_proposer' || v === 'repondu' ? v : null;
  } catch {
    return null;
  }
}

/** Fin de l'onboarding : a proposer apres la visite, seulement si le coach n'a jamais ete lance ni remis a plus tard */
export async function preparerProposition(): Promise<void> {
  try {
    const [etat, depart] = await Promise.all([lireProposition(), lireDepart()]);
    if (etat || depart) return;
    await AsyncStorage.setItem(CLE_PROPOSITION_COACH, 'a_proposer');
  } catch {
    // sans importance : le coach reste dans son onglet
  }
}

/** Oui ou Plus tard : la carte ne revient plus. Plus tard note aussi le drapeau du coach. */
export async function repondreProposition(choix: 'oui' | 'plus_tard'): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_PROPOSITION_COACH, 'repondu');
  } catch {
    // au pire la carte revient une fois
  }
  if (choix === 'plus_tard') {
    const d = await lireDepart().catch(() => null);
    if (d !== 'fait') await ecrireDepart('plus_tard');
  }
  try {
    DeviceEventEmitter.emit(PROPOSITION_COACH_EVENT);
  } catch {
    // sans importance : la carte de copie se relit au prochain retour sur l'accueil
  }
}
