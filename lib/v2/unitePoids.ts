/**
 * Unite d'affichage des charges et des poids (18 octobre 2026, sortie 3.0.0).
 * Le reglage « Unité de poids » (Profil, cle @yoroi_settings.weight_unit : 'kg' ou 'lbs') est lu par
 * useUnits / useUnitePoids (components/yoroi/v2/espace/reglages/prefs.ts).
 * Tout reste STOCKE en kilos : on convertit seulement au moment d'afficher.
 * 1 lb = 0,45359237 kg (definition internationale). En livres on garde le meme nombre de decimales
 * qu'en kilos a cet endroit (« 100 kg » donne « 220 lb », « 82,5 kg » donne « 181,9 lb »).
 * Logique pure, testee dans __tests__/unit/unitePoids.test.ts.
 */

export type UnitePoids = 'kg' | 'lb';

/** 1 livre = 0,45359237 kg */
export const KG_PAR_LB = 0.45359237;

const NBSP = ' ';
const MOINS = '−';

/** Le reglage enregistre ('kg' ou 'lbs') vers l'unite affichee */
export function uniteDepuisReglage(v: string | null | undefined): UnitePoids {
  return v === 'lbs' || v === 'lb' ? 'lb' : 'kg';
}

/** kilos vers l'unite affichee */
export function versUnitePoids(kg: number, u: UnitePoids): number {
  return u === 'lb' ? kg / KG_PAR_LB : kg;
}

/** unite affichee vers kilos (pour une saisie) */
export function depuisUnitePoids(v: number, u: UnitePoids): number {
  return u === 'lb' ? v * KG_PAR_LB : v;
}

/** « 1 250,5 » : virgule decimale, espaces insecables entre les milliers a partir de 10 000, zeros inutiles retires */
export function nombrePoids(n: number, decimales = 1): string {
  if (!Number.isFinite(n)) return '0';
  const f = 10 ** decimales;
  const r = Math.round(Math.abs(n) * f) / f;
  const [ent, dec] = String(r).split('.');
  const groupes = ent.length > 4 ? ent.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) : ent;
  return `${n < 0 && r !== 0 ? MOINS : ''}${groupes}${dec ? `,${dec}` : ''}`;
}

/** Libelle court de l'unite : « kg » ou « lb » */
export function libelleUnite(u: UnitePoids): string {
  return u === 'lb' ? 'lb' : 'kg';
}

/** Une charge en kilos, affichee dans l'unite choisie : { value: '220,5', unit: 'lb' } */
export function chargeParts(kg: number, u: UnitePoids, decimales = 1): { value: string; unit: string } {
  return { value: nombrePoids(versUnitePoids(kg, u), decimales), unit: libelleUnite(u) };
}

/** « 220,5 lb » ou « 100 kg » */
export function chargeTexte(kg: number, u: UnitePoids, decimales = 1): string {
  const p = chargeParts(kg, u, decimales);
  return `${p.value} ${p.unit}`;
}

/**
 * Remplace chaque « 85 kg », « −1,7 kg », « 1 250 kg » d'un texte deja ecrit en kilos par sa valeur en livres,
 * avec autant de decimales que l'original. En kilos le texte ne change pas.
 */
export function texteEnUnitePoids(texte: string, u: UnitePoids): string {
  if (u === 'kg' || !texte) return texte;
  return texte.replace(/([+−-]?)(\d{1,3}(?:[   ]\d{3})+|\d+)(?:[,.](\d+))?(\s| )?kg\b/g, (_m, signe: string, ent: string, dec: string | undefined, esp: string | undefined) => {
    const kg = Number(`${ent.replace(/[   ]/g, '')}.${dec ?? '0'}`);
    if (!Number.isFinite(kg)) return _m;
    const v = nombrePoids(versUnitePoids(kg, 'lb'), dec ? dec.length : 0);
    return `${signe}${v}${esp ?? ' '}lb`;
  });
}

/** Une valeur deja formatee en kilos (« 84,6 », « −0,5 », « +2 ») vers l'unite affichee, en gardant le signe et les decimales */
export function valeurKgEnUnite(valeur: string, u: UnitePoids): string {
  if (u === 'kg') return valeur;
  const m = /^\s*([+−-]?)\s*(\d[\d   ]*)(?:[,.](\d+))?\s*$/.exec(valeur);
  if (!m) return valeur;
  const kg = Number(`${m[2].replace(/[   ]/g, '')}.${m[3] ?? '0'}`);
  if (!Number.isFinite(kg)) return valeur;
  return `${m[1]}${nombrePoids(versUnitePoids(kg, 'lb'), m[3] ? m[3].length : 0)}`;
}

/**
 * Saisie d'une charge (seance de musculation) : la valeur montree dans le champ, arrondie au centieme
 * comme le champ (Stepper), pour qu'un aller-retour ne derive jamais (135 lb reste 135 lb).
 */
export function saisieDepuisKg(kg: number, u: UnitePoids): number {
  if (u === 'kg') return kg;
  return Math.round(versUnitePoids(kg, 'lb') * 100) / 100;
}

/** La valeur saisie dans le champ vers les kilos enregistres, sans arrondi (pas de derive) */
export function kgDepuisSaisie(v: number, u: UnitePoids): number {
  return u === 'kg' ? v : depuisUnitePoids(v, 'lb');
}
