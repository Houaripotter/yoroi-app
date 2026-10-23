/**
 * Actions de la demande d'acces a Sante (14 octobre 2026), partagees par l'onboarding, le mini onboarding
 * de la 3.0 et la carte de l'Accueil. Le calendrier et les regles sont dans lib/v2/sante/demande.ts (pur, teste).
 */
import { getTrainingsCount } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { connecterSanteSuivi } from '@/lib/v2/onboarding/save';
import { Platform } from 'react-native';
import healthConnect from '@/lib/healthConnect';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { apresAutorisation, apresRefus, apresRelance, majDemandeSante, nePlusDemander, ouvrirReglagesSante } from './demande';
import { messageConnexion } from './connexion';
import type { IssueConnexion } from './connexion';
import { traduire } from '@/lib/i18n/tr';

/** Seances notees a la main (celles qui ne viennent pas de Sante) */
export async function seancesManuelles(): Promise<number> {
  try {
    return (await getTrainingsCount()).manual;
  } catch {
    return 0;
  }
}

/**
 * Ouvre la fenetre du systeme (apres l'ecran explicatif). Vrai seulement si une lecture reelle renvoie des donnees
 * (14 octobre 2026, SANTE CONNEXION). Sinon, sauf { alerte: false }, une fenetre explique quoi faire dans Reglages.
 */
export async function demanderAccesSante(opts?: { alerte?: boolean }): Promise<boolean> {
  return (await demanderAccesSanteIssue(opts)) === 'connecte';
}

/** Meme demande, mais renvoie l'issue complete (carte « Importe tes données » de l'Accueil, 18 octobre 2026) */
export async function demanderAccesSanteIssue(opts?: { alerte?: boolean }): Promise<IssueConnexion> {
  let issue: IssueConnexion = 'erreur';
  try {
    issue = await connecterSanteSuivi();
  } catch (e) {
    logger.warn('[Sante] demande d’accès impossible', e);
  }
  const ok = issue === 'connecte';
  const n = await seancesManuelles();
  // iOS « rien lu » : la fenetre a ete repondue, la carte de l'Accueil verifiera la lecture plus tard
  const accepte = ok || (Platform.OS === 'ios' && issue === 'rien_lu');
  await majDemandeSante((s) => (accepte ? apresAutorisation(s, new Date()) : apresRefus(s, new Date(), n, issue === 'abandon' ? 'passee' : 'refusee')));
  if (ok) {
    // le temps de lire « C'est relié, import en cours » sur l'ecran explicatif
    await new Promise((r) => setTimeout(r, 1200));
  } else if (opts?.alerte !== false) {
    montrerIssueSante(issue);
  }
  return issue;
}

/** Fenetre claire apres une connexion qui n'a rien donne, avec le bouton qui ouvre les reglages */
export function montrerIssueSante(issue: IssueConnexion): void {
  const m = messageConnexion(issue, Platform.OS);
  if (!m.reglages) {
    appAlert(m.titre, m.texte);
    return;
  }
  const fn = (healthConnect as unknown as { openHealthConnectSettings?: () => Promise<void> }).openHealthConnectSettings;
  appAlert(m.titre, m.texte, [
    { text: traduire('Plus tard'), style: 'cancel' },
    {
      text: Platform.OS === 'android' ? 'Ouvrir Health Connect' : traduire('Ouvrir Santé'),
      onPress: () => {
        void ouvrirReglagesSante(Platform.OS === 'android' && typeof fn === 'function' ? () => fn.call(healthConnect) : undefined);
      },
    },
  ]);
}

/** « Plus tard » sur l'ecran explicatif */
export async function passerAccesSante(): Promise<void> {
  const n = await seancesManuelles();
  await majDemandeSante((s) => apresRefus(s, new Date(), n, 'passee'));
}

/** « Plus tard » sur la carte de l'Accueil */
export async function reporterRelanceSante(): Promise<void> {
  await majDemandeSante((s) => apresRelance(s, new Date()));
}

export async function nePlusDemanderSante(): Promise<void> {
  await majDemandeSante(nePlusDemander);
}
