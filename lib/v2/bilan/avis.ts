/**
 * Demande de note sur le store, en feuille YOROI (16 octobre 2026, agent BILAN COULEURS).
 * Houari : « Attends 5 secondes, une fois qu'il quitte, mets une pop-up pour lui demander de mettre une note
 * sur le store, en fonction de son téléphone Android ou iOS. »
 *
 * Après « Terminer » d'un bilan (fin de séance ou page de bilan), 5 secondes plus tard, la feuille
 * « Tu aimes YOROI ? » s'ouvre sur l'écran d'arrivée (hôte : components/yoroi/v2/bilan/BilanAuto.tsx).
 * Règle (decisionAvisMaison, pure et testée dans __tests__/unit/avisMaison.test.ts) :
 *  - jamais pendant l'onboarding ni la démo ;
 *  - pas avant 3 séances enregistrées (compteur yoroi_review_count de lib/reviewPromptService.ts) ;
 *  - au plus une fois tous les 60 jours ;
 *  - plus jamais après « Noter », ni après 3 « Plus tard ».
 * « Noter » : la fenêtre native (expo-store-review) quand elle est disponible, sinon la fiche du store
 * (lib/appConfig.ts : App Store id6757306612 ; Google Play par la recherche tant que l'app n'y a pas de lien direct).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

export const CLE_AVIS_MAISON = '@yoroi_avis_maison_v1';
export const AVIS_MAISON_EVENT = 'YOROI_AVIS_MAISON';
export const DELAI_AVIS_MS = 5000;
export const SEANCES_AVANT_AVIS_MAISON = 3;
export const JOURS_ENTRE_AVIS = 60;
export const REFUS_MAX = 3;
const JOUR_MS = 86400000;

/** derniere : quand la feuille a ete montree (ms) ; refus : « Plus tard » ; note : « Noter » touche */
export type EtatAvis = { derniere: number | null; refus: number; note: boolean };
export const ETAT_AVIS_VIDE: EtatAvis = { derniere: null, refus: 0, note: false };

export type EntreeAvisMaison = {
  etat: EtatAvis;
  /** seances enregistrees depuis toujours */
  seances: number;
  maintenant: number;
  onboardingFini: boolean;
  demo: boolean;
  /** une autre fenetre (rappels, celebration, fenetre maison) est deja a l'ecran */
  autreFenetre: boolean;
};

/** Faut-il montrer la feuille maintenant ? */
export function decisionAvisMaison(e: EntreeAvisMaison): boolean {
  if (!e.onboardingFini || e.demo || e.autreFenetre) return false;
  if (e.etat.note || e.etat.refus >= REFUS_MAX) return false;
  if (e.seances < SEANCES_AVANT_AVIS_MAISON) return false;
  if (e.etat.derniere !== null && e.maintenant - e.etat.derniere < JOURS_ENTRE_AVIS * JOUR_MS) return false;
  return true;
}

export function lireEtatBrut(brut: string | null): EtatAvis {
  try {
    const o = brut ? JSON.parse(brut) : null;
    if (!o || typeof o !== 'object') return { ...ETAT_AVIS_VIDE };
    return {
      derniere: typeof o.derniere === 'number' && Number.isFinite(o.derniere) ? o.derniere : null,
      refus: typeof o.refus === 'number' && o.refus > 0 ? Math.floor(o.refus) : 0,
      note: o.note === true,
    };
  } catch {
    return { ...ETAT_AVIS_VIDE };
  }
}

export async function lireEtatAvis(): Promise<EtatAvis> {
  try {
    return lireEtatBrut(await AsyncStorage.getItem(CLE_AVIS_MAISON));
  } catch {
    return { ...ETAT_AVIS_VIDE };
  }
}

async function ecrireEtat(etat: EtatAvis): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_AVIS_MAISON, JSON.stringify(etat));
  } catch {
    // rien de grave : au pire la feuille reviendra
  }
}

/** Lit tout ce qu'il faut et rend la decision (appelee par l'hote au moment d'ouvrir) */
export async function peutMontrerAvis(autreFenetre: boolean, maintenant = Date.now()): Promise<boolean> {
  try {
    const [etat, brut, onboarding, demo] = await Promise.all([
      lireEtatAvis(),
      AsyncStorage.getItem('yoroi_review_count'),
      AsyncStorage.getItem('yoroi_onboarding_done'),
      AsyncStorage.getItem('@yoroi_demo_data_active'),
    ]);
    const seances = parseInt(brut || '0', 10) || 0;
    return decisionAvisMaison({ etat, seances, maintenant, onboardingFini: onboarding === 'true', demo: demo === 'true', autreFenetre });
  } catch {
    return false;
  }
}

/** La feuille vient de s'ouvrir : le delai de 60 jours part d'ici */
export async function avisMontre(maintenant = Date.now()): Promise<void> {
  const e = await lireEtatAvis();
  await ecrireEtat({ ...e, derniere: maintenant });
}

/** « Plus tard » (ou fermeture de la feuille) */
export async function avisPlusTard(): Promise<void> {
  const e = await lireEtatAvis();
  await ecrireEtat({ ...e, refus: e.refus + 1 });
}

/** « Noter » : on ne redemande plus jamais */
export async function avisNote(): Promise<void> {
  const e = await lireEtatAvis();
  await ecrireEtat({ ...e, note: true });
}

let minuteur: ReturnType<typeof setTimeout> | null = null;

/** Apres « Terminer » d'un bilan : la feuille s'ouvre 5 secondes plus tard, sur l'ecran d'arrivee */
export function programmerAvis(delai = DELAI_AVIS_MS): void {
  if (minuteur) clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    minuteur = null;
    DeviceEventEmitter.emit(AVIS_MAISON_EVENT);
  }, delai);
}
