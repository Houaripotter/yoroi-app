/**
 * Séance de musculation sur l'écran verrouillé et dans la Dynamic Island (24 octobre 2026) : tu sors de l'app
 * (un message, une musique), ta séance reste sous tes yeux. Même Live Activity que le chrono
 * (lib/v2/widgets/activiteChrono.ts, ios/YoroiWidgets/ActiviteChrono.swift), rien à changer côté natif :
 *  - pendant l'effort : « Hip Thrust Barre, série 2 sur 4 », et le temps de séance qui monte ;
 *  - pendant le repos : « Repos » et le compte à rebours natif, puis retour sur l'effort tout seul.
 * Le compte tourne seul côté iOS : aucun envoi chaque seconde. Sans module natif (Android, Expo Go), rien.
 */
import { useEffect, useRef } from 'react';
import { activiteChronoDisponible, arreterActiviteNatif, demarrerActiviteNatif, majActiviteNatif } from './natif';

export type EtatSeance = {
  /** titre de la séance (« Fessiers et ventre plat, Fessiers A ») */
  titre: string;
  /** début de la séance, en ms */
  debutMs: number;
  /** « Hip Thrust Barre, série 2 sur 4 », ou vide entre deux exercices */
  libelle: string;
  /** fin du repos en cours, en ms, ou null */
  finReposMs: number | null;
  /** durée totale du repos en cours, en secondes */
  reposTotalS: number;
  /** ce qui vient après le repos (« Ensuite : série 3 ») */
  ensuite: string;
};

/** Le JSON attendu par la Live Activity du chrono (round et rounds à 0 : le libellé s'affiche) */
export function etatActivite(e: EtatSeance, maintenant: number): string {
  const repos = e.finReposMs != null && e.finReposMs > maintenant;
  return JSON.stringify(
    repos
      ? {
          titre: e.titre,
          phase: 'repos',
          libelle: e.ensuite,
          round: 0,
          rounds: 0,
          debutMs: (e.finReposMs as number) - Math.max(1, e.reposTotalS) * 1000,
          finMs: e.finReposMs,
          figeS: Math.max(0, Math.round(((e.finReposMs as number) - maintenant) / 1000)),
          enPause: false,
          monte: false,
        }
      : {
          titre: e.titre,
          phase: 'effort',
          libelle: e.libelle,
          round: 0,
          rounds: 0,
          debutMs: e.debutMs,
          // le temps monte depuis le début de la séance ; la fin sert seulement de borne (6 heures)
          finMs: e.debutMs + 6 * 3600 * 1000,
          figeS: Math.max(0, Math.round((maintenant - e.debutMs) / 1000)),
          enPause: false,
          monte: true,
        },
  );
}

// etat global (hors composant) : la seance continue quand l'ecran est reduit
let seanceEnDirect = false;
let minuteurRepos: ReturnType<typeof setTimeout> | null = null;

/** Vrai pendant une seance en direct : le chrono ne lance pas sa propre Live Activity (ils partagent la meme) */
export const activiteSeanceEnCours = (): boolean => seanceEnDirect;

function envoyer(etat: EtatSeance): void {
  const json = etatActivite(etat, Date.now());
  // demarrer remplace toute Live Activity du chrono (le natif termine les precedentes) : jamais d'etat perdu
  if (!seanceEnDirect) {
    seanceEnDirect = true;
    demarrerActiviteNatif(json);
  } else {
    majActiviteNatif(json);
  }
  if (minuteurRepos) clearTimeout(minuteurRepos);
  minuteurRepos = null;
  // le repos fini : retour sur l'effort, meme si l'ecran de la seance est ferme (minuteur global)
  if (etat.finReposMs != null && etat.finReposMs > Date.now()) {
    minuteurRepos = setTimeout(() => {
      minuteurRepos = null;
      if (seanceEnDirect) majActiviteNatif(etatActivite({ ...etat, finReposMs: null }, Date.now()));
    }, etat.finReposMs - Date.now() + 100);
  }
}

/** Démarre et met à jour la Live Activity de la séance (etat null : rien). L'arrêt : terminerActiviteSeance. */
export function useActiviteSeance(etat: EtatSeance | null): void {
  const cle = etat ? `${etat.titre}|${etat.debutMs}|${etat.libelle}|${etat.finReposMs ?? 0}` : '';
  const dernier = useRef('');
  useEffect(() => {
    if (!activiteChronoDisponible() || !etat) return;
    // a la reprise de l'ecran (meme cle), une mise a jour suffit ; le natif garde l'activite
    if (dernier.current === cle && seanceEnDirect) return;
    dernier.current = cle;
    envoyer(etat);
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Fin de la séance (enregistrée, abandonnée, remplacée) : la Live Activity s'arrête. Appelée par clearDraft
 * (lib/v2/seance/model.ts). Quitter l'écran avec « Réduire » ne l'arrête PAS : la séance continue.
 */
export function terminerActiviteSeance(): void {
  if (minuteurRepos) clearTimeout(minuteurRepos);
  minuteurRepos = null;
  if (!seanceEnDirect) return;
  seanceEnDirect = false;
  if (activiteChronoDisponible()) arreterActiviteNatif();
}
