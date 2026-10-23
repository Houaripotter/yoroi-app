/**
 * 18 octobre 2026 : « J'ai déjà une sauvegarde » sur un nouvel iPhone. Si le coffre iCloud de l'app
 * (dossier « YOROI » du iCloud Drive) contient une sauvegarde, on la propose tout de suite, avec sa date.
 * « La remettre » la telecharge si besoin et renvoie son chemin ; « Choisir un autre fichier » renvoie undefined
 * et l'ecran ouvre le selecteur habituel. Rien a proposer : undefined tout de suite.
 * Telechargement impossible : 'annule' (un message le dit, l'ecran ne fait rien).
 */
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { listerICloud, preparerICloud } from '@/lib/v2/sauvegarde/coffreICloud';

function quand(ms: number): string {
  const d = new Date(ms);
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${jour} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function choisirSauvegardeICloud(): Promise<string | 'annule' | undefined> {
  const liste = await listerICloud();
  const derniere = liste[0];
  if (!derniere) return undefined;
  const choix = await new Promise<'remettre' | 'autre'>((resolve) => {
    appAlert(
      'Sauvegarde trouvée dans iCloud',
      `Ta dernière copie YOROI date du ${quand(derniere.modifiedAt)}. Tu la remets sur ce téléphone ?`,
      [
        { text: 'Choisir un autre fichier', style: 'cancel', onPress: () => resolve('autre') },
        { text: 'La remettre', isPreferred: true, onPress: () => resolve('remettre') },
      ],
    );
  });
  if (choix === 'autre') return undefined;
  const chemin = await preparerICloud(derniere.name);
  if (!chemin) {
    appAlert('Pas encore téléchargée', 'La sauvegarde est encore dans iCloud. Vérifie ta connexion, puis réessaie dans un instant. Tu peux aussi choisir le fichier toi-même.');
    return 'annule';
  }
  return chemin;
}
