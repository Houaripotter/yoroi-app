/**
 * Ce qui a le droit de partir dans le cloud (7 novembre 2026). Pur, teste dans __tests__/unit/sauvegardeAuto.test.ts.
 *
 * Houari : les photos de progres ne quittent jamais le telephone.
 *  - Une sauvegarde automatique ou silencieuse (chaque jour, apres une seance, une pesee, en quittant l'app, avant
 *    une action risquee) se fait SANS les photos, sauf si l'appelant demande les photos expres.
 *  - Une copie dans le cloud (coffre iCloud de l'app, dossier iCloud Drive ou Google Drive relie) ne part que
 *    d'un fichier SANS photos. Une sauvegarde complete faite a la main reste sur le telephone et dans la feuille
 *    de partage : c'est toi qui choisis ou elle va.
 *  - Une sauvegarde automatique sans aucune pesee ni seance (premier lancement, base pas encore prete) ne part
 *    jamais dans le cloud : elle ecraserait la copie d'avant une reinstallation.
 */
export type OptionsExport = { silent?: boolean; includePhotos?: boolean };

/** Les options reelles : les photos seulement pour un export demande a la main, ou si l'appelant les demande expres */
export function optionsExport(o?: OptionsExport): { silent: boolean; includePhotos: boolean } {
  const silent = o?.silent === true;
  const includePhotos = typeof o?.includePhotos === 'boolean' ? o.includePhotos : !silent;
  return { silent, includePhotos };
}

/** Le fichier peut-il partir dans le cloud ? Jamais avec les photos ; jamais une copie automatique vide */
export function copieCloudPermise(o: { silent: boolean; includePhotos: boolean; counts?: { weights: number; trainings: number } }): boolean {
  if (o.includePhotos) return false;
  if (o.silent && o.counts && o.counts.weights + o.counts.trainings === 0) return false;
  return true;
}
