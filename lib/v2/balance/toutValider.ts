/**
 * TOUT VALIDER (3 novembre 2026) : valider d'un coup toutes les dates cochees de l'import IA, au lieu de
 * toucher « Oui » date par date (25 dates, c'etait trop long).
 * Fichier pur (aucun import React Native ni base) : teste par jest (__tests__/unit/balanceToutValider.test.ts).
 *
 * Regles :
 * - seules les dates cochees et pas encore enregistrees partent ; la selection de l'utilisateur est gardee ;
 * - DOUBLON : tout ce qui est coche est deja note ce jour-la (meme date, meme mesure). La regle de l'import
 *   s'applique a tout le lot : une valeur identique n'est pas reecrite, une valeur differente n'ecrase rien
 *   (sauf le poids de la balance, qui fait foi, et ce que tu as coche « Remplacer »). Une date sans rien de
 *   nouveau est ignoree et comptee ;
 * - A VERIFIER : une date que l'IA n'a pas su lire, deux dates possibles pas tranchees, une valeur hors norme,
 *   un avertissement de coherence (lib/v2/balance/coherence.ts) ou une carte incomplete. Ces lignes restent de
 *   cote, ouvertes, jamais validees en silence.
 */
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type LigneLot = {
  index: number;
  /** AAAA-MM-JJ, '' si inconnue */
  date: string;
  /** cochee dans la liste */
  include: boolean;
  /** deja enregistree */
  done: boolean;
  /** la date vient de l'ecran, d'un ticket, de la photo ou de toi ; false : l'IA ne l'a pas lue */
  dateLue: boolean;
  /** deux dates possibles (IA et photo) que tu n'as pas tranchees */
  deuxDates: boolean;
  /** libelles des valeurs cochees hors de leur plage */
  horsNorme: string[];
  /** avertissements de coherence (poids loin de tes pesees, IMC...) */
  alertes: string[];
  /** une autre raison qui empeche l'enregistrement (aucune valeur cochee...) */
  incomplete?: string;
  /** tout ce qui est coche est deja note ce jour-la : rien de nouveau a ecrire */
  doublon: boolean;
  /** un poids coche */
  pesee: boolean;
  /** un tour de taille coche */
  tourTaille: boolean;
};

export type RaisonDoute = 'date' | 'deux_dates' | 'hors_norme' | 'alerte' | 'incomplete';

export type LigneDouteuse = { ligne: LigneLot; raison: RaisonDoute; texte: string };

export type Lot = {
  /** les dates qui partent avec Tout valider (doublons compris : ils sont ignores et comptes) */
  aValider: LigneLot[];
  /** celles qui seront vraiment ecrites */
  aEcrire: LigneLot[];
  doublons: LigneLot[];
  aVerifier: LigneDouteuse[];
};

/** Pourquoi une ligne est douteuse, ou undefined si elle peut partir */
export function douteDe(l: LigneLot): LigneDouteuse | undefined {
  if (!l.date || !l.dateLue) return { ligne: l, raison: 'date', texte: traduire('date non lue par ton IA') };
  if (l.deuxDates) return { ligne: l, raison: 'deux_dates', texte: traduire('deux dates possibles') };
  if (l.horsNorme.length) return { ligne: l, raison: 'hors_norme', texte: traduire("valeur hors norme : {0}", l.horsNorme.join(', ')) };
  if (l.alertes.length) return { ligne: l, raison: 'alerte', texte: l.alertes[0] };
  if (l.incomplete) return { ligne: l, raison: 'incomplete', texte: l.incomplete };
  return undefined;
}

export function preparerLot(lignes: LigneLot[]): Lot {
  const lot: Lot = { aValider: [], aEcrire: [], doublons: [], aVerifier: [] };
  for (const l of lignes) {
    if (!l.include || l.done) continue;
    const d = douteDe(l);
    if (d) {
      lot.aVerifier.push(d);
      continue;
    }
    lot.aValider.push(l);
    if (l.doublon) lot.doublons.push(l);
    else lot.aEcrire.push(l);
  }
  return lot;
}

/** « Tout valider (25 dates) » : le nombre de dates qui partent vraiment */
export function texteBouton(n: number): string {
  return traduirePluriel(n, n > 1, 'Tout valider ({0} date)', 'Tout valider ({0} dates)', n);
}

export function questionLot(n: number): string {
  return n > 1 ? traduire("Tu valides les {0} dates d’un coup ?", n) : traduire('Tu valides cette date ?');
}

const MOIS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

function jour(iso: string, annee: boolean): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d === 1 ? '1er' : d} ${MOIS[m - 1] ?? ''}${annee ? ` ${y}` : ''}`;
}

/** « du 3 mars au 1er novembre, 25 pesées, 12 mesures de tour de taille » */
export function resumeLot(lot: Lot): string {
  const dates = lot.aValider.map((l) => l.date).filter(Boolean).sort();
  const parts: string[] = [];
  if (dates.length) {
    const a = dates[0];
    const b = dates[dates.length - 1];
    const annee = a.slice(0, 4) !== b.slice(0, 4);
    parts.push(a === b ? traduire('le {0}', jour(a, annee)) : traduire('du {0} au {1}', jour(a, annee), jour(b, annee)));
  }
  const p = lot.aValider.filter((l) => l.pesee).length;
  const t = lot.aValider.filter((l) => l.tourTaille).length;
  if (p) parts.push(traduirePluriel(p, p > 1, '{0} pesée', '{0} pesées', p));
  if (t) parts.push(traduirePluriel(t, t > 1, '{0} mesure de tour de taille', '{0} mesures de tour de taille', t));
  const autres = lot.aValider.filter((l) => !l.pesee && !l.tourTaille).length;
  if (autres) parts.push(traduirePluriel(autres, autres > 1, '{0} date de mesures', '{0} dates de mesures', autres));
  let txt = parts.join(', ');
  if (lot.doublons.length) txt += '\n' + traduirePluriel(lot.doublons.length, lot.doublons.length > 1, '{0} date déjà notée sera ignorée.', '{0} dates déjà notées seront ignorées.', lot.doublons.length);
  if (lot.aVerifier.length) txt += '\n' + traduirePluriel(lot.aVerifier.length, lot.aVerifier.length > 1, '{0} ligne à vérifier reste de côté.', '{0} lignes à vérifier restent de côté.', lot.aVerifier.length);
  return txt;
}

/** « Ces 2 lignes sont à vérifier » */
export function titreAVerifier(n: number): string {
  return n > 1 ? traduire('Ces {0} lignes sont à vérifier', n) : traduire('Cette ligne est à vérifier');
}

/** Ce que renvoie l'enregistrement d'une date (comme saveBlock de l'ecran) : null si elle n'a pas pu l'etre */
export type ResultatDate = 'new' | 'merged' | 'same' | null;

export type BilanLot = { ajoutees: number; completees: number; ignorees: number; echecs: number[]; aVerifier: number };

/**
 * Enregistre le lot, une date apres l'autre avec les fonctions de l'import (aucune transaction groupee n'existe
 * pour ce flux). Les doublons ne sont pas ecrits ; une date que l'enregistrement trouve deja a jour compte aussi
 * comme ignoree. progression(fait, total) apres chaque date.
 */
export async function enregistrerLot(
  lot: Lot,
  enregistrer: (index: number) => Promise<ResultatDate>,
  progression?: (fait: number, total: number) => void,
): Promise<BilanLot> {
  const bilan: BilanLot = { ajoutees: 0, completees: 0, ignorees: lot.doublons.length, echecs: [], aVerifier: lot.aVerifier.length };
  const total = lot.aEcrire.length;
  let fait = 0;
  for (const l of lot.aEcrire) {
    let r: ResultatDate = null;
    try {
      r = await enregistrer(l.index);
    } catch {
      r = null;
    }
    if (r === 'new') bilan.ajoutees++;
    else if (r === 'merged') bilan.completees++;
    else if (r === 'same') bilan.ignorees++;
    else bilan.echecs.push(l.index);
    fait++;
    progression?.(fait, total);
  }
  return bilan;
}

/** « 20 dates ajoutées, 2 complétées. 3 lignes ignorées, déjà notées. 2 lignes à vérifier. » */
export function messageFinal(b: BilanLot): string {
  const faits = [
    b.ajoutees ? traduirePluriel(b.ajoutees, b.ajoutees > 1, '{0} date ajoutée', '{0} dates ajoutées', b.ajoutees) : '',
    b.completees ? traduirePluriel(b.completees, b.completees > 1, '{0} date complétée', '{0} dates complétées', b.completees) : '',
  ].filter(Boolean);
  const phrases = [faits.length ? `${faits.join(', ')}.` : traduire('Rien de nouveau à ajouter.')];
  if (b.ignorees) phrases.push(traduirePluriel(b.ignorees, b.ignorees > 1, '{0} ligne ignorée, déjà notée.', '{0} lignes ignorées, déjà notées.', b.ignorees));
  if (b.echecs.length) phrases.push(traduirePluriel(b.echecs.length, b.echecs.length > 1, '{0} date n’a pas pu être enregistrée, sa carte est ouverte.', '{0} dates n’ont pas pu être enregistrées, leurs cartes sont ouvertes.', b.echecs.length));
  if (b.aVerifier) phrases.push(traduirePluriel(b.aVerifier, b.aVerifier > 1, '{0} ligne à vérifier, plus haut.', '{0} lignes à vérifier, plus haut.', b.aVerifier));
  return phrases.join(' ');
}

export type BoutonLot = { text: string; style: 'cancel' | 'primary'; onPress?: () => void };

/** Les deux boutons de la fenetre : « Vérifier une par une » ne change rien, « Oui, tout valider » lance le lot */
export function boutonsLot(onOui: () => void): BoutonLot[] {
  return [
    { text: traduire('Vérifier une par une'), style: 'cancel' },
    { text: traduire('Oui, tout valider'), style: 'primary', onPress: onOui },
  ];
}
