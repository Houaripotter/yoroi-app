/**
 * Coach vocal (28 octobre 2026) : les phrases dites dans les écouteurs pendant la séance en direct.
 * Demande d'un ami de Houari : être accompagné pendant la séance (« ne lâche pas », « pense à ton objectif »,
 * « c'est bientôt fini », « concentre toi »), avec sa musique qui continue.
 *
 * Chaque phrase a un identifiant stable `cv_fr_<moment>_<n>` : c'est aussi le nom du fichier audio enregistré
 * (voix ElevenLabs Antonin, liste dans _propositions/coach_vocal_phrases_fr.md, fichiers branchés dans sons.ts).
 * Règles : 10 mots au plus, aucun tiret, aucun chiffre, aucun adjectif accordé (prêt, fier, concentré),
 * aucune affirmation scientifique. Plusieurs variantes par moment, le moteur évite de répéter la même.
 * Le moteur (moteur.ts) est générique : la musculation l'utilise, le sprint réutilisera les moments d'intervalles.
 */

export type Moment =
  | 'debut_seance'
  | 'debut_exo'
  | 'fin_repos_10s'
  | 'reprise'
  | 'derniere_serie'
  | 'derniere_rep'
  | 'encouragement'
  | 'record_battu'
  | 'progression_validee'
  | 'mi_seance'
  | 'fin_seance'
  | 'rappel_objectif_perte'
  | 'rappel_objectif_muscle'
  | 'rappel_objectif_combat'
  | 'rappel_objectif_forme'
  | 'concentration'
  | 'echauffement'
  | 'sprint'
  | 'recup'
  | 'dernier_sprint'
  | 'fin_intervalles';

/** Texte de chaque variante, dans l'ordre : la variante n a l'identifiant cv_fr_<moment>_<n> */
export const TEXTES: Record<Moment, readonly string[]> = {
  debut_seance: [
    "C'est parti. Je suis avec toi jusqu'au bout.",
    'On commence. Une série après l’autre.',
    'Séance lancée. Prends ton temps pour bien démarrer.',
    "Allez, on s'y met ensemble.",
  ],
  debut_exo: [
    'Nouvel exercice. Prends ta position.',
    'Exercice suivant. Installe toi bien.',
    "On change d'exercice. Soigne ta technique.",
    'Nouveau mouvement. Contrôle chaque répétition.',
    'On passe à la suite. Respire et place toi.',
  ],
  fin_repos_10s: [
    'Dix secondes.',
    'Encore dix secondes, prépare toi.',
    'Dix secondes, mets toi en place.',
    'Plus que dix secondes de repos.',
    'Dix secondes. Reprends ta position.',
  ],
  reprise: [
    "C'est reparti.",
    'Repos terminé, à toi.',
    'Allez, série suivante.',
    'On y retourne.',
    'Fin du repos, on enchaîne.',
  ],
  derniere_serie: [
    'Dernière série, donne tout.',
    "Dernière série de l'exercice. Fais la propre.",
    "C'est la dernière, termine fort.",
    "Dernière série. Tout ce qu'il te reste.",
    "Plus qu'une série, vas y.",
  ],
  derniere_rep: [
    'Dernières répétitions, ne lâche pas.',
    "Tiens bon, c'est bientôt fini.",
    "Pousse jusqu'au bout.",
    'Ne lâche rien maintenant.',
    'Allez, termine la série.',
  ],
  encouragement: [
    "Plus qu'une série, ne lâche pas.",
    'Belle série. Il en reste une.',
    'Bien. Récupère, la dernière arrive.',
    'Tu tiens bon. Encore une tout à l’heure.',
    "C'est bientôt fini pour cet exercice.",
    "Respire. Encore une et c'est fait.",
  ],
  record_battu: [
    'Nouveau record. Bravo !',
    'Record battu, tu progresses.',
    "C'est ton meilleur résultat. Énorme.",
    'Record ! Garde cette énergie.',
  ],
  progression_validee: [
    'Validé. La prochaine fois, on te propose plus lourd.',
    'Objectif tenu. Prochaine séance, la charge monte.',
    'Toutes tes répétitions. La prochaine fois, plus lourd.',
    'Bien tenu. La charge augmentera à la prochaine séance.',
  ],
  mi_seance: [
    'La moitié est faite. Continue comme ça.',
    'Moitié de la séance. Tu es dans le rythme.',
    'Déjà la moitié. Garde ton énergie.',
    'On est à la moitié, tu tiens bon.',
  ],
  fin_seance: [
    'Séance terminée. Bravo, beau travail.',
    "C'est fini. Pense à bien t'hydrater.",
    'Bien joué, une séance de plus au compteur.',
    'Fini pour aujourd’hui. Récupère bien.',
  ],
  rappel_objectif_perte: [
    'Pense à ton objectif. Chaque séance te rapproche.',
    'Rappelle toi pourquoi tu es là. Continue.',
    'Ton objectif de poids, garde le en tête.',
  ],
  rappel_objectif_muscle: [
    'Pense au muscle que tu construis. Continue.',
    'Ton objectif muscle se joue maintenant.',
    'Chaque série bien faite construit ton physique.',
  ],
  rappel_objectif_combat: [
    'Pense à ton prochain combat. Tiens bon.',
    "Ton objectif combat, c'est ici qu'il se prépare.",
    'Pense au combat. Chaque série te prépare.',
  ],
  rappel_objectif_forme: [
    'Pense à ton objectif. Tu es sur la bonne voie.',
    'Rappelle toi pourquoi tu as commencé.',
    'Garde ton objectif en tête, continue.',
  ],
  concentration: [
    'Pose ton téléphone, concentre toi.',
    'Reviens à ta séance, concentre toi.',
    "Range le téléphone, ta série t'attend.",
  ],
  echauffement: [
    'Échauffement. Commence doucement.',
    "On s'échauffe, à ton rythme.",
    'Échauffement, monte progressivement.',
  ],
  sprint: [
    'Sprint ! Vas y.',
    "C'est parti, à fond.",
    'Accélère, maintenant.',
    'Sprint, donne tout.',
    'Go, pousse fort.',
  ],
  recup: [
    'Récupère. Respire bien.',
    'Ralentis, souffle.',
    'Récupération, relâche les épaules.',
    'On récupère, garde un petit rythme.',
    'Repos actif, respire.',
  ],
  dernier_sprint: [
    "Dernier sprint, tout ce qu'il te reste.",
    'Le dernier, ne lâche rien.',
    'Dernier effort, vas y à fond.',
  ],
  fin_intervalles: [
    'Intervalles terminés. Récupère tranquillement.',
    'Fini. Marche un peu pour récupérer.',
    "C'est fait, bravo. Retour au calme.",
  ],
};

export const MOMENTS = Object.keys(TEXTES) as Moment[];

/** Identifiant de fichier d'une variante (n commence à 1) */
export function idPhrase(moment: Moment, n: number): string {
  return `cv_fr_${moment}_${n}`;
}

/** Les identifiants des variantes d'un moment */
export function variantes(moment: Moment): string[] {
  return TEXTES[moment].map((_, i) => idPhrase(moment, i + 1));
}

/** Toutes les phrases : identifiant vers texte */
export const PHRASES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(MOMENTS.flatMap((m) => TEXTES[m].map((t, i) => [idPhrase(m, i + 1), t] as const))),
);

/** Texte d'un identifiant, ou null s'il n'existe pas */
export function textePhrase(id: string): string | null {
  return Object.prototype.hasOwnProperty.call(PHRASES, id) ? PHRASES[id] : null;
}
