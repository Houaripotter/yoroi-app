/**
 * L'analyse de la photo d'une carte ouverte (phase native, 2 novembre 2026), sans React : utilisee par useCarte.
 *
 * * Une analyse seulement avec le moteur « Nouveau », lu au moment de l'appel (analysePhoto.ts).
 * * Une seule analyse compte : la derniere demandee. Un resultat arrive trop tard (autre photo, passage a « Ancien »,
 *   carte fermee) est ignore et son masque efface.
 * * Les masques temporaires (cacheDirectory/cartes_tmp/masques/) sont effaces : au changement de photo, au passage a
 *   « Ancien », apres un export ou un partage (termine ou annule), et a la sortie de la carte.
 *   Ceux d'une session coupee partent au demarrage suivant (viderCartesTmp, tmp.ts).
 */
import { analyserPhoto } from './analysePhoto';
import type { AnalysePhoto } from './analysePhoto';
import { moteurCourant } from '../store';
import type { MoteurCartes } from '../store';
import { effacerCopieCarte, effacerMasques } from '../tmp';

export type AnalyseCarte = {
  /** nouvelle photo (ou null) : l'analyse d'avant est oubliee, son masque efface */
  changerPhoto(uri: string | null): Promise<void>;
  /** l'interrupteur du moteur a change : « Ancien » efface tout, « Nouveau » analyse la photo en place */
  moteurChange(m: MoteurCartes): Promise<void>;
  /** apres un export ou un partage, termine ou annule : le masque n'est plus utile */
  apresExport(): Promise<void>;
  /** la carte s'ouvre (ou se rouvre : double montage de React en developpement) */
  ouvrir(): void;
  /** la carte se ferme */
  fermer(): Promise<void>;
};

export function creerAnalyseCarte(definir: (a: AnalysePhoto | null) => void): AnalyseCarte {
  let jeton = 0;
  let photo: string | null = null;
  let ferme = false;
  let courante: AnalysePhoto | null = null;

  const poser = (a: AnalysePhoto | null) => {
    courante = a;
    definir(a);
  };

  const lancer = async (uri: string | null): Promise<void> => {
    const j = ++jeton;
    poser(null);
    await effacerMasques().catch(() => undefined);
    // le moteur est lu par analyserPhoto, au moment de l'appel : avec « Ancien », le natif n'est pas appele
    if (!uri || ferme) return;
    let a: AnalysePhoto | null = null;
    try {
      a = await analyserPhoto(uri);
    } catch {
      a = null;
    }
    if (!a) return;
    if (j !== jeton || ferme || photo !== uri || moteurCourant() !== 'nouveau') {
      // trop tard : on ne garde rien
      await effacerCopieCarte(a.masque?.uri).catch(() => false);
      return;
    }
    poser(a);
  };

  return {
    changerPhoto(uri) {
      photo = uri;
      return lancer(uri);
    },
    async moteurChange(m) {
      if (m === 'nouveau') {
        if (photo && !courante) await lancer(photo);
        return;
      }
      jeton++;
      poser(null);
      await effacerMasques().catch(() => undefined);
    },
    async apresExport() {
      if (courante?.masque) poser({ ...courante, masque: null });
      await effacerMasques().catch(() => undefined);
    },
    ouvrir() {
      ferme = false;
    },
    async fermer() {
      ferme = true;
      jeton++;
      photo = null;
      courante = null;
      await effacerMasques().catch(() => undefined);
    },
  };
}
