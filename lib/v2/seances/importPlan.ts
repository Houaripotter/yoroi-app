/**
 * « Importer mes séances » de l'onglet Séances (16 octobre 2026, SEANCES AVATAR) : règles pures, testées
 * (__tests__/unit/importSeances.test.ts). Rien n'est importé deux fois :
 * 1. identifiant Santé déjà connu (en base, ou doublon effacé par le nettoyage) : déjà présente ;
 * 2. même empreinte (début, type, durée) que la synchro : déjà présente ;
 * 3. même séance qu'une séance notée dans YOROI ou enregistrée par la montre YOROI (estMemeSeance de dedupe.ts) :
 *    pas importée, reliée à la tienne (YOROI est toujours gardé) ;
 * 4. même séance qu'une séance déjà importée (autre app, autre identifiant) : déjà présente ;
 * 5. la même séance deux fois dans Santé (montre et autre app) : une seule, la plus complète.
 * Une séance arrivée pendant l'import par la synchro de fond (identifiant connu maintenant, inconnu au départ)
 * compte comme importée, sans être ajoutée une 2e fois.
 */
import type { Training } from '@/lib/database';
import { estMemeSeance, richesseSeance } from './dedupe';

export type PeriodeImport = '30j' | '3m' | '1a' | 'tout';

export const PERIODES_IMPORT: { key: PeriodeImport; label: string; jours: number | null }[] = [
  { key: '30j', label: '30 jours', jours: 30 },
  { key: '3m', label: '3 mois', jours: 92 },
  { key: '1a', label: '1 an', jours: 366 },
  { key: 'tout', label: 'Tout', jours: null },
];

export const joursDe = (p: PeriodeImport): number | null => PERIODES_IMPORT.find((x) => x.key === p)?.jours ?? null;

/** Une séance lue dans Apple Santé ou Health Connect, prête à entrer dans la base */
export type SeanceSante = { training: Training; empreinte: string; debutIso?: string };

export type PlanImport = {
  /** séances à ajouter, dans l'ordre de lecture */
  aAjouter: SeanceSante[];
  /** arrivées pendant l'import par la synchro de fond : comptées importées, pas ajoutées */
  arriveesPendant: number;
  dejaPresentes: number;
  /** même séance qu'une séance notée dans YOROI ou de la montre YOROI */
  reliees: SeanceSante[];
  /** la même séance deux fois dans Santé, gardée une fois */
  enDouble: number;
  trouvees: number;
};

const estImportee = (t: Training) => !!t.healthkit_uuid;
const vientDeYoroi = (t: Training) => /yoroi/i.test(String(t.source ?? ''));
const jourDe = (t: Training) => String(t.date ?? '').slice(0, 10);

export function planifierImport(
  candidats: SeanceSante[],
  existantes: Training[],
  connus: { ids: Set<string>; empreintes: Set<string> },
  connusAvant?: { ids: Set<string>; empreintes: Set<string> },
): PlanImport {
  const avant = connusAvant ?? connus;
  const parJour = new Map<string, Training[]>();
  for (const t of existantes) {
    const k = jourDe(t);
    const l = parJour.get(k);
    if (l) l.push(t);
    else parJour.set(k, [t]);
  }
  const plan: PlanImport = { aAjouter: [], arriveesPendant: 0, dejaPresentes: 0, reliees: [], enDouble: 0, trouvees: candidats.length };
  const idsVus = new Set<string>();

  for (const c of candidats) {
    const t = c.training;
    const id = t.healthkit_uuid ? String(t.healthkit_uuid) : '';
    if (id && idsVus.has(id)) {
      plan.enDouble++;
      continue;
    }
    if (id) idsVus.add(id);

    // 1 et 2 : déjà connue (avant l'import, ou arrivée pendant par la synchro de fond)
    const connueAvant = (id && avant.ids.has(id)) || avant.empreintes.has(c.empreinte);
    if (connueAvant) {
      plan.dejaPresentes++;
      continue;
    }
    if ((id && connus.ids.has(id)) || connus.empreintes.has(c.empreinte)) {
      plan.arriveesPendant++;
      continue;
    }

    // 3 et 4 : la même séance est déjà dans ton historique
    const memeJour = parJour.get(jourDe(t)) ?? [];
    const yoroi = memeJour.find((e) => !estImportee(e) && estMemeSeance(t, e));
    if (yoroi || vientDeYoroi(t)) {
      plan.reliees.push(c);
      continue;
    }
    if (memeJour.some((e) => estImportee(e) && estMemeSeance(t, e))) {
      plan.dejaPresentes++;
      continue;
    }

    // 5 : la même séance deux fois dans Santé, on garde la plus complète
    const i = plan.aAjouter.findIndex((a) => jourDe(a.training) === jourDe(t) && estMemeSeance(a.training, t));
    if (i >= 0) {
      plan.enDouble++;
      if (richesseSeance(t) > richesseSeance(plan.aAjouter[i].training)) plan.aAjouter[i] = c;
      continue;
    }
    plan.aAjouter.push(c);
  }
  return plan;
}

export type ResultatImport = {
  importees: number;
  dejaPresentes: number;
  reliees: number;
  enDouble: number;
  erreurs: number;
  trouvees: number;
};

export function resultatDe(plan: PlanImport, ajoutees: number, erreurs: number): ResultatImport {
  return {
    importees: ajoutees + plan.arriveesPendant,
    dejaPresentes: plan.dejaPresentes,
    reliees: plan.reliees.length,
    enDouble: plan.enDouble,
    erreurs,
    trouvees: plan.trouvees,
  };
}

const n = (v: number, un: string, plusieurs: string) => `${v} ${v > 1 ? plusieurs : un}`;

/** « 12 séances importées, 3 déjà présentes », puis le détail (reliées, en double, erreurs) */
export function texteResultat(r: ResultatImport, source: string): { titre: string; detail: string } {
  if (r.trouvees === 0) {
    return { titre: 'Aucune séance trouvée', detail: `${source} n’a aucune séance sur cette période.` };
  }
  const deja = r.dejaPresentes + r.reliees;
  let titre: string;
  if (r.importees === 0) titre = deja > 0 ? `Rien de nouveau, ${n(deja, 'séance déjà présente', 'séances déjà présentes')}` : 'Aucune séance importée';
  else titre = `${n(r.importees, 'séance importée', 'séances importées')}${deja > 0 ? `, ${deja} déjà présente${deja > 1 ? 's' : ''}` : ''}`;
  const lignes: string[] = [];
  if (r.reliees > 0) lignes.push(`${n(r.reliees, 'séance reliée', 'séances reliées')} à celles notées dans YOROI ou par ta montre YOROI, sans doublon.`);
  if (r.enDouble > 0) lignes.push(`${n(r.enDouble, 'séance en double', 'séances en double')} dans ${source}, gardée${r.enDouble > 1 ? 's' : ''} une seule fois.`);
  if (r.erreurs > 0) lignes.push(`${n(r.erreurs, 'séance n’a pas pu être enregistrée', 'séances n’ont pas pu être enregistrées')}. Relance l’import pour réessayer.`);
  return { titre, detail: lignes.join('\n') };
}
