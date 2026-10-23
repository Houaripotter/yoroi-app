/**
 * Saisons de YOROI 3.0.0 (18 octobre 2026) : quelle decoration de saison est active selon la date LOCALE.
 *
 * Les dates de Houari, chaque annee (18 octobre 2026) :
 *   halloween  du 1er octobre au 1er novembre inclus (comme INRO)
 *   noel       du 25 novembre au 1er janvier inclus (la fenetre passe le nouvel an ; INRO commence le 20 novembre)
 *
 * Les fenetres sont configurables (FENETRES_SAISONS) : jour et mois de debut et de fin, bornes incluses.
 * Une fenetre dont la fin tombe avant le debut dans l'annee passe le nouvel an (25 novembre au 1er janvier).
 * Si deux fenetres se chevauchent, la premiere de la liste gagne.
 *
 * Fichier pur (aucun import React Native) : teste dans __tests__/unit/saisonsCalendrier.test.ts.
 * Le reglage (« Décorations de saison »), l'apercu force du Studio et le hook sont a cote (reglage.ts, apercu.ts,
 * useSaison.ts). Les decorations : components/yoroi/v2/saisons/DecorSaison.tsx.
 */

export type SaisonId = 'halloween' | 'noel';

/** Un jour de l'annee : mois de 1 (janvier) a 12, jour de 1 a 31 */
export type JourAnnee = { mois: number; jour: number };

export type FenetreSaison = {
  id: SaisonId;
  nom: string;
  /** premier jour, inclus */
  debut: JourAnnee;
  /** dernier jour, inclus */
  fin: JourAnnee;
};

export const FENETRES_SAISONS: FenetreSaison[] = [
  { id: 'halloween', nom: 'Halloween', debut: { mois: 10, jour: 1 }, fin: { mois: 11, jour: 1 } },
  { id: 'noel', nom: 'Noël', debut: { mois: 11, jour: 25 }, fin: { mois: 1, jour: 1 } },
];

export const NOMS_SAISONS: Record<SaisonId, string> = { halloween: 'Halloween', noel: 'Noël' };

/** Rang d'un jour dans l'annee (mois * 100 + jour) : se compare sans tenir compte des annees bissextiles */
function rang(j: JourAnnee): number {
  return j.mois * 100 + j.jour;
}

/** Le jour de l'annee d'une date, en heure locale */
export function jourLocal(d: Date): JourAnnee {
  return { mois: d.getMonth() + 1, jour: d.getDate() };
}

/** La date (heure locale) tombe dans la fenetre, bornes incluses ; gere le passage du nouvel an */
export function dansFenetre(d: Date, f: Pick<FenetreSaison, 'debut' | 'fin'>): boolean {
  const r = rang(jourLocal(d));
  const a = rang(f.debut);
  const b = rang(f.fin);
  if (a <= b) return r >= a && r <= b;
  // la fenetre passe le nouvel an : de debut au 31 decembre, puis du 1er janvier a fin
  return r >= a || r <= b;
}

/** La saison active a cette date, ou null */
export function saisonDuJour(d: Date, fenetres: FenetreSaison[] = FENETRES_SAISONS): SaisonId | null {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  for (const f of fenetres) if (dansFenetre(d, f)) return f.id;
  return null;
}

/** Choix de l'apercu du Studio : la date du jour, une saison forcee, ou aucune */
export type ChoixApercu = 'auto' | SaisonId | 'aucune';

/**
 * La saison a montrer : rien si les decorations sont coupees ; sinon l'apercu force du Studio s'il y en a un,
 * sinon la saison du jour.
 */
export function saisonAffichee(opts: { date: Date; active: boolean; apercu?: ChoixApercu; fenetres?: FenetreSaison[] }): SaisonId | null {
  const { date, active, apercu = 'auto', fenetres = FENETRES_SAISONS } = opts;
  if (apercu === 'aucune') return null;
  if (apercu === 'halloween' || apercu === 'noel') return apercu; // l'apercu du Studio passe meme reglage coupe
  if (!active) return null;
  return saisonDuJour(date, fenetres);
}

/** Libelle court pour les reglages : ce qui est en cours, ou la prochaine saison */
export function resumeSaison(d: Date, active: boolean, fenetres: FenetreSaison[] = FENETRES_SAISONS): string {
  if (!active) return 'Désactivées';
  const s = saisonDuJour(d, fenetres);
  if (s) return `${NOMS_SAISONS[s]} en ce moment, sur ton accueil et tes widgets`;
  return 'Halloween et Noël, sur ton accueil et tes widgets';
}

/**
 * 19 octobre 2026 (carte « Décorations de saison » de Personnaliser) : la saison a montrer en premier.
 * Pendant une saison, celle-ci ; sinon la prochaine qui arrive dans FENETRES_SAISONS.
 */
export function saisonEnTete(d: Date, fenetres: FenetreSaison[] = FENETRES_SAISONS): SaisonId {
  const en = saisonDuJour(d, fenetres);
  if (en) return en;
  if (!fenetres.length || !(d instanceof Date) || Number.isNaN(d.getTime())) return 'halloween';
  const r = rang(jourLocal(d));
  // la premiere fenetre qui commence apres aujourd'hui dans l'annee, sinon la premiere de l'annee suivante
  const tri = [...fenetres].sort((a, b) => rang(a.debut) - rang(b.debut));
  return (tri.find((f) => rang(f.debut) > r) ?? tri[0]).id;
}
