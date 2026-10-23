/**
 * 18 octobre 2026 : « J'ai déjà une sauvegarde » sur un nouvel iPhone. Si le coffre iCloud de l'app
 * (dossier « YOROI » du iCloud Drive) contient une sauvegarde, on la propose tout de suite, avec sa date.
 * « La remettre » la telecharge si besoin et renvoie son chemin ; « Choisir un autre fichier » renvoie undefined
 * et l'ecran ouvre le selecteur habituel. Rien a proposer : undefined tout de suite.
 * Telechargement impossible : 'annule' (un message le dit, l'ecran ne fait rien).
 */
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { listerICloud, preparerICloud } from '@/lib/v2/sauvegarde/coffreICloud';
import { traduire, LOCALE } from '@/lib/i18n/tr';

function quand(ms: number): string {
  const d = new Date(ms);
  const jour = d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  return traduire("{0} à {1} h {2}", jour, d.getHours(), String(d.getMinutes()).padStart(2, '0'));
}

export async function choisirSauvegardeICloud(): Promise<string | 'annule' | undefined> {
  const liste = await listerICloud();
  const derniere = liste[0];
  if (!derniere) return undefined;
  const choix = await new Promise<'remettre' | 'autre'>((resolve) => {
    appAlert(
      traduire('Sauvegarde trouvée dans iCloud'),
      traduire("Ta dernière copie YOROI date du {0}. Tu la remets sur ce téléphone ?", quand(derniere.modifiedAt)),
      [
        { text: traduire('Choisir un autre fichier'), style: 'cancel', onPress: () => resolve('autre') },
        { text: traduire('La remettre'), isPreferred: true, onPress: () => resolve('remettre') },
      ],
    );
  });
  if (choix === 'autre') return undefined;
  const chemin = await preparerICloud(derniere.name);
  if (!chemin) {
    appAlert(traduire('Pas encore téléchargée'), traduire('La sauvegarde est encore dans iCloud. Vérifie ta connexion, puis réessaie dans un instant. Tu peux aussi choisir le fichier toi-même.'));
    return 'annule';
  }
  return chemin;
}
