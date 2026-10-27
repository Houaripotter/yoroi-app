/**
 * Logo de club importe par l'utilisateur (27 octobre 2026, Houari : « j'ai ajouté le logo de mon club et je ne le
 * vois plus »). ClubForm et AddClubModal copient la photo choisie dans le dossier Documents de l'app et gardent son
 * chemin complet. Sur iPhone, ce chemin contient l'identifiant du conteneur de l'app, qui change quand l'app est
 * reinstallee ou restauree : l'ancien chemin ne mene plus a rien alors que le fichier est toujours la.
 * cheminLogoActuel recale un logo club_logo_... sur le dossier Documents d'aujourd'hui. Aucun import natif : testable.
 */
export function cheminLogoActuel(uri: string, dossierDocuments: string | null | undefined): string {
  if (!dossierDocuments || !uri.startsWith('file')) return uri;
  const m = /\/Documents\/(club_logo_[^/]+)$/.exec(uri);
  if (!m) return uri;
  const base = dossierDocuments.endsWith('/') ? dossierDocuments : `${dossierDocuments}/`;
  return `${base}${m[1]}`;
}

/** Le dossier Documents de l'app, null hors iPhone et Android (web, jest) */
export function dossierDocuments(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('expo-file-system/legacy') as { documentDirectory?: string | null };
    return fs.documentDirectory ?? null;
  } catch {
    return null;
  }
}
