/**
 * AV (1er novembre 2026, « avec les photos qu'on envoie depuis le +, est-ce que tout est OK ? ») :
 * ou va chaque ligne « autre » d'un bloc YOROI BALANCE lu par ton IA.
 *  - mensurations en plus (poignet, cheville, genou, fessiers, taille la plus etroite, biceps contracte) :
 *    yoroi_mensurations_plus_v1 (lib/v2/mesures/mensurationsPlus.ts) ;
 *  - biomarqueurs (glycemie, tension, cetones, lactate, temperature, bilan sanguin) : yoroi_biomarqueurs_v1 ;
 *  - plis cutanes en mm : yoroi_plis_v1, quand la methode est complete (7 plis, ou les 3 de ton sexe) ;
 *  - le reste : la pesee du jour (colonne JSON scale_extras), comme avant.
 * Tout reste aussi dans le sac des mesures (lib/v2/mesures/sac.ts), rien ne se perd.
 * Les biomarqueurs et les plis ne vont jamais dans la pesee : ils ont leurs propres ecrans.
 * Fichier pur (teste par __tests__/unit/importPhotoComplet.test.ts).
 */
import type { ScaleAutre } from './format';
import { zoneDepuisNom } from '@/lib/v2/mesures/mensurationsPlus';
import { cleDe } from '@/lib/v2/mesures/sac';
import { creerBiomarqueur, TYPE_BIO } from '@/lib/v2/mesures/biomarqueurs';
import type { Biomarqueur, TypeBio } from '@/lib/v2/mesures/biomarqueurs';
import { creerMesurePlis, PLIS_7, PLIS_3_FEMME, PLIS_3_HOMME } from '@/lib/v2/mesures/plis';
import type { MesurePlis, Pli, Sexe } from '@/lib/v2/mesures/plis';

export type Rangement = 'mensuration_plus' | 'biomarqueur' | 'pli' | 'pesee';

/** Unites d'une analyse de sang (bilan libre quand le nom n'est pas un biomarqueur connu) */
const UNITES_BILAN = /^(mmol\/l|µmol\/l|umol\/l|nmol\/l|pmol\/l|mg\/dl|mg\/l|g\/l|g\/dl|ng\/ml|ng\/l|pg\/ml|µg\/l|ug\/l|µg\/dl|ui\/l|u\/l|mui\/l|miu\/l|meq\/l|giga\/l|g\/µl|t\/l|10\^9\/l|10\^12\/l|fl|pg)$/i;
const LONGUEUR = /^(cm|in|inch|inches|pouces?|"|″|)$/i;

/** Le pli d'un nom (« Pli triceps », « Skinfold chest », « Pli sous scapulaire ») ; undefined sinon */
export function pliDepuisNom(nom: string): Pli | undefined {
  const k = cleDe(nom);
  if (!/(^|_)(pli|plis|skinfold|skin_fold|pince)(_|$)/.test(k)) return undefined;
  if (/sous_scap|subscap/.test(k)) return 'sous_scapulaire';
  if (/supra_?iliaque|suprailiac|supra_iliac|iliaque/.test(k)) return 'supra_iliaque';
  if (/axill|midaxill/.test(k)) return 'axillaire';
  if (/pectoral|poitrine|chest|pec/.test(k)) return 'pectoral';
  if (/triceps/.test(k)) return 'triceps';
  if (/abdo|ventre|abdomen/.test(k)) return 'abdominal';
  if (/cuisse|thigh/.test(k)) return 'cuisse';
  return undefined;
}

/** Le type de biomarqueur d'un nom et de son unite ; undefined si ce n'en est pas un */
export function typeBioDepuisNom(nom: string, unite = ''): TypeBio | undefined {
  const k = cleDe(nom);
  const u = unite.trim().toLowerCase();
  if (/glycemi|glucos|blood_sugar|sucre_sanguin/.test(k)) return /jeun|fasting|matin/.test(k) ? 'glycemie_jeun' : /repas|post|apres|meal/.test(k) ? 'glycemie_repas' : 'glycemie';
  if (/cetone|ketone|bhb|hydroxybutyr/.test(k)) return 'cetones';
  if (/lactat/.test(k)) return 'lactate';
  if (/temperature|temp_corp|body_temp/.test(k) && /^(°c|°f|c|f|degres?|)$/.test(u)) return 'temperature';
  if (/systol|diastol|tension|blood_pressure|pression_art/.test(k)) return 'tension';
  if (/(^|_)(bilan|prise_de_sang|analyse|blood_test|lab)(_|$)/.test(k)) return 'libre';
  if (UNITES_BILAN.test(u)) return 'libre';
  return undefined;
}

/** Ou ranger une ligne autre */
export function rangementDe(nom: string, unite = ''): Rangement {
  if (zoneDepuisNom(nom) && LONGUEUR.test(unite.trim())) return 'mensuration_plus';
  if (pliDepuisNom(nom) && /^(mm|)$/i.test(unite.trim())) return 'pli';
  if (typeBioDepuisNom(nom, unite)) return 'biomarqueur';
  return 'pesee';
}

/** Les lignes autre separees par rangement */
export function separerAutres(autres: ScaleAutre[]): Record<Rangement, ScaleAutre[]> {
  const out: Record<Rangement, ScaleAutre[]> = { mensuration_plus: [], biomarqueur: [], pli: [], pesee: [] };
  for (const a of autres ?? []) if (a && a.nom) out[rangementDe(a.nom, a.unite ?? '')].push(a);
  return out;
}

/** Le nom d'une analyse du bilan libre, sans le mot « Bilan » devant (« Bilan Ferritine » : Ferritine) */
function nomBilan(nom: string): string {
  return nom.replace(/^\s*(bilan( sanguin)?|prise de sang|analyse|blood test|lab)\s*[:,-]?\s*/i, '').trim() || nom.trim();
}

/**
 * Les biomarqueurs de lignes autre. La tension arrive en deux lignes (systolique, diastolique) ou en une
 * (« Tension = 125/80 mmHg »). Source « import », les memes identifiants que la reprise depuis le sac
 * (lib/v2/mesures/biomarqueurs.ts, depuisSac) : importer deux fois ne cree pas de doublon.
 */
export function biomarqueursDepuisAutres(autres: ScaleAutre[], date: string, heure?: string | null, maintenant: Date = new Date()): Biomarqueur[] {
  const out: Biomarqueur[] = [];
  let sys: { v: number; u: string } | undefined;
  let dia: { v: number; u: string } | undefined;
  for (const a of autres ?? []) {
    const u = (a.unite ?? '').trim();
    const type = typeBioDepuisNom(a.nom, u);
    if (!type) continue;
    if (type === 'tension') {
      const k = cleDe(a.nom);
      const slash = /^\/\s*(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(u);
      if (slash) {
        const b = creerBiomarqueur({ date, heure, type, valeur: a.valeur, valeur2: Number(slash[1].replace(',', '.')), unite: slash[2].trim() || 'mmHg', source: 'import' }, maintenant);
        if (b) out.push(b);
      } else if (/diastol/.test(k)) dia = { v: a.valeur, u: u || 'mmHg' };
      else sys = { v: a.valeur, u: u || 'mmHg' };
      continue;
    }
    const b =
      type === 'libre'
        ? creerBiomarqueur({ date, heure, type, valeur: a.valeur, unite: u, nom: nomBilan(a.nom), source: 'import' }, maintenant)
        : creerBiomarqueur({ date, heure, type, valeur: a.valeur, unite: u || TYPE_BIO[type].unite, source: 'import' }, maintenant);
    if (b) out.push(b);
  }
  if (sys && dia) {
    const b = creerBiomarqueur({ date, heure, type: 'tension', valeur: sys.v, valeur2: dia.v, unite: sys.u, source: 'import' }, maintenant);
    if (b) out.push(b);
  }
  return out;
}

/** Les plis lus, par pli (le dernier ecrit l'emporte) */
export function plisDepuisAutres(autres: ScaleAutre[]): Partial<Record<Pli, number>> {
  const plis: Partial<Record<Pli, number>> = {};
  for (const a of autres ?? []) {
    const p = pliDepuisNom(a.nom);
    if (p && /^(mm|)$/i.test((a.unite ?? '').trim()) && a.valeur > 0 && a.valeur < 80) plis[p] = a.valeur;
  }
  return plis;
}

/**
 * Une mesure de plis complete : les 7 plis, sinon les 3 de ton sexe (ceux des hommes si le sexe n'est pas
 * connu, sans pourcentage). null si la methode n'est pas complete : les plis restent dans le sac.
 */
export function mesurePlisDepuisAutres(autres: ScaleAutre[], date: string, sexe: Sexe | null, age: number | null, maintenant: Date = new Date()): MesurePlis | null {
  const plis = plisDepuisAutres(autres);
  const a = (l: Pli[]) => l.every((p) => plis[p] !== undefined);
  if (a(PLIS_7)) return creerMesurePlis(date, 'jp7', sexe, age, plis, maintenant);
  if (sexe && a(sexe === 'femme' ? PLIS_3_FEMME : PLIS_3_HOMME)) return creerMesurePlis(date, 'jp3', sexe, age, plis, maintenant);
  if (!sexe && a(PLIS_3_HOMME)) return creerMesurePlis(date, 'jp3', null, null, plis, maintenant);
  return null;
}
