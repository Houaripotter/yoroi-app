/**
 * 31 octobre 2026 (cartes de partage v2) : les 10 directions qui remplacent les 6 modeles.
 * Sources : _propositions/cartes_partage_v2_2026-10-31 (CHOIX.md, html/directions.js, planches).
 * Ici la logique pure : la liste, l'ordre du carrousel, ce qui est propose pour chaque carte,
 * les comparaisons droles (table de conversions vraies), le face a face de l'Affiche de gala,
 * la serie de semaines et l'ecusson de la carte holographique. Rien n'est invente : une donnee absente
 * masque la ligne ou la direction. Teste dans __tests__/unit/cartesDirections.test.tsx.
 */
import type { CarteData, DirectionId, DonneesSeance, ModeleId, StatKey } from './types';
import { chiffresDisponibles, nombre } from './chiffres';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type DirectionInfo = {
  id: DirectionId;
  /** numero de la planche, « 08 » */
  num: string;
  nom: string;
  explication: string;
  /** autocollant transparent : sortie Story ou Autocollant (PNG transparent) */
  autocollant?: boolean;
};

export const DIRECTIONS: DirectionInfo[] = [
  { id: 'net', num: '01', nom: traduire('Autocollant net'), explication: traduire('Ton chiffre géant et 3 stats, à poser sur ta photo.'), autocollant: true },
  { id: 'chrome', num: '02', nom: traduire('Autocollant chrome'), explication: traduire('Ton chiffre en métal chromé, les stats en verre dépoli.'), autocollant: true },
  { id: 'stickers', num: '03', nom: traduire('Planche de stickers'), explication: traduire('Tes stickers YOROI collés de travers sur ta photo.'), autocollant: true },
  { id: 'holo', num: '04', nom: traduire('Carte holographique'), explication: traduire('Ta séance en carte de collection à reflets.') },
  { id: 'retro', num: '05', nom: traduire('Rétrospective explosive'), explication: traduire('Ton chiffre comparé à quelque chose de vrai et de drôle.') },
  { id: 'flash', num: '06', nom: traduire('Flash argentique'), explication: traduire('Ta photo au flash sur une bande de pellicule.') },
  { id: 'maillot', num: '07', nom: traduire('Maillot'), explication: traduire('Ton chiffre floqué sur un maillot.') },
  { id: 'gala', num: '08', nom: traduire('Affiche de gala'), explication: traduire('Toi contre ta séance précédente, le verdict en bandeau.') },
  { id: 'serie', num: '09', nom: traduire('Série en feu'), explication: traduire('Tes semaines d’affilée et tes 12 dernières semaines.') },
  { id: 'tv', num: '10', nom: traduire('Diffusion TV'), explication: traduire('Ta séance en habillage de retransmission.') },
];

/** L'ordre du carrousel de l'atelier (les preferees d'abord) */
export const ORDRE_CARROUSEL: DirectionId[] = ['gala', 'stickers', 'chrome', 'net', 'holo', 'retro', 'serie', 'flash', 'maillot', 'tv'];
export const AUTOCOLLANTS: DirectionId[] = ['net', 'chrome', 'stickers'];
/** Un exploit (record, palier, bilan) : le chrome, le maillot du record, la carte holographique */
export const DIRECTIONS_EXPLOIT: DirectionId[] = ['chrome', 'maillot', 'holo'];
/** La direction par defaut, la premiere fois */
export const DIRECTION_DEFAUT: DirectionId = 'gala';

export function estDirection(id: string | null | undefined): id is DirectionId {
  return DIRECTIONS.some((x) => x.id === id);
}

export function infoDirection(id: DirectionId): DirectionInfo {
  return DIRECTIONS.find((x) => x.id === id) ?? DIRECTIONS[0];
}

export function estAutocollant(id: ModeleId): boolean {
  return (AUTOCOLLANTS as string[]).includes(id);
}

// ============================================
// SERIE EN FEU : le vrai nombre de semaines d'affilee
// ============================================

/** Les semaines d'affilee (objectif tenu, moteur de l'armure), a partir de 2 ; null sinon (la direction est masquee) */
export function serieDe(d: CarteData): number | null {
  const n = Math.round(d.serieSemaines ?? 0);
  return n >= 2 ? n : null;
}

/** La grille des 12 semaines, seulement si elle a ete lue dans ton historique (12 semaines de 7 jours) */
export function grilleDe(d: CarteData): boolean[][] | null {
  const g = d.grille;
  return Array.isArray(g) && g.length === 12 && g.every((s) => Array.isArray(s) && s.length === 7) ? g : null;
}

// ============================================
// RETROSPECTIVE : les comparaisons droles, toutes vraies
// ============================================

/**
 * Table des conversions. Chaque valeur est une reference publique :
 * - elephant d'Afrique : jusqu'a 6 000 kg pour un adulte (WWF, fiche « African elephant », poids jusqu'a 6 tonnes) ;
 * - bison d'Amerique : un male adulte pese jusqu'a 2 000 livres, environ 900 kg (US National Park Service, Yellowstone, « Bison ») ;
 * - terrain de football : 105 m de long, la longueur recommandee par la FIFA (Football Stadiums, Technical recommendations
 *   and requirements, terrain de 105 x 68 m ; les Lois du jeu de l'IFAB fixent 100 a 110 m pour les matchs internationaux).
 */
export const CONVERSIONS = {
  elephant: { kg: 6000, source: 'WWF, African elephant : jusqu’à 6 tonnes' },
  bison: { kg: 900, source: 'US National Park Service, Yellowstone : bison mâle jusqu’à 2 000 livres' },
  terrain: { m: 105, source: 'FIFA, Football Stadiums Technical recommendations : terrain de 105 x 68 m' },
} as const;

export type Conversion = {
  /** le chiffre compare et son unite, « 12 480 » « kg » ; la cle du chiffre (les autres stats l'ecartent) */
  valeur: string;
  unite: string;
  cle: StatKey;
  /** « Tu as soulevé » */
  intro: string;
  /** « soit » */
  lien: string;
  /** le nombre de la comparaison, calcule : « 2,1 » */
  nombre: string;
  /** « éléphants » */
  libelle: string;
  /** « d'Afrique, en fonte » */
  detail: string;
  /** la reference de la table */
  source: string;
};

/** Le nombre d'une comparaison : une decimale sous 10 (sans « ,0 »), entier au dela */
export function nombreComparaison(n: number): string {
  if (n >= 10) return nombre(n, 0);
  return nombre(Math.round(n * 10) / 10, 1);
}

/**
 * La comparaison de la carte : le tonnage en elephants (ou en bisons sous 3 tonnes), la distance en terrains de foot.
 * null s'il n'y a rien de vrai a comparer : la Retrospective est alors masquee.
 */
export function conversionPour(d: CarteData): Conversion | null {
  const s = d.moment === 'seance' ? d.seance : null;
  if (!s) return null;
  const lien = traduire('soit');
  if (d.famille === 'muscu' || (s.tonnage >= 450 && !(s.distanceKm > 0))) {
    const kg = s.tonnage;
    if (kg >= CONVERSIONS.elephant.kg / 2) {
      const n = kg / CONVERSIONS.elephant.kg;
      return { valeur: nombre(kg, 0), unite: 'kg', cle: 'charge', intro: traduire('Tu as soulevé'), lien, nombre: nombreComparaison(n), libelle: n >= 2 ? traduire('éléphants') : traduire('éléphant'), detail: traduire('d’Afrique, en fonte'), source: CONVERSIONS.elephant.source };
    }
    if (kg >= CONVERSIONS.bison.kg / 2) {
      const n = kg / CONVERSIONS.bison.kg;
      return { valeur: nombre(kg, 0), unite: 'kg', cle: 'charge', intro: traduire('Tu as soulevé'), lien, nombre: nombreComparaison(n), libelle: n >= 2 ? traduire('bisons') : traduire('bison'), detail: traduire('adultes, en fonte'), source: CONVERSIONS.bison.source };
    }
    return null;
  }
  if (s.distanceKm >= 0.5) {
    const n = (s.distanceKm * 1000) / CONVERSIONS.terrain.m;
    return { valeur: nombre(s.distanceKm, s.distanceKm >= 100 ? 0 : 2), unite: 'km', cle: 'distance', intro: traduire('Tu as couru'), lien, nombre: nombreComparaison(n), libelle: n >= 2 ? traduire('terrains de foot') : traduire('terrain de foot'), detail: traduire('mis bout à bout'), source: CONVERSIONS.terrain.source };
  }
  return null;
}

// ============================================
// AFFICHE DE GALA : toi contre ta seance precedente
// ============================================

export type LigneGala = { cle: StatKey; label: string; avant: string; apres: string; unite?: string; /** vrai si aujourd'hui fait mieux */ gagne: boolean; egal: boolean };

/** La valeur brute d'un chiffre, pour savoir qui gagne ; null si le chiffre ne se compare pas */
function brut(s: DonneesSeance, k: StatKey): number | null {
  switch (k) {
    case 'charge': return s.tonnage;
    case 'series': return s.series;
    case 'duree': return s.dureeMin;
    case 'distance': return s.distanceKm;
    case 'allure': return s.distanceKm > 0 ? -(s.dureeMin / s.distanceKm) : null;
    case 'rounds': return s.rounds;
    case 'intensite': return s.intensite ?? 0;
    case 'calories': return s.calories;
    case 'repetitions': return s.repetitions ?? 0;
    case 'denivele': return s.deniveleM ?? 0;
    default: return null;
  }
}

/** Les chiffres compares, dans l'ordre du sport : seulement ceux que les deux seances ont, 3 au plus */
export function lignesGala(d: CarteData): LigneGala[] {
  const p = d.precedente;
  if (d.moment !== 'seance' || !d.seance || !p?.seance) return [];
  const auj = chiffresDisponibles(d);
  const hier = chiffresDisponibles({ ...d, seance: p.seance, serieSemaines: 0 });
  const out: LigneGala[] = [];
  for (const a of auj) {
    if (out.length >= 3) break;
    const b = hier.find((x) => x.key === a.key);
    const ra = brut(d.seance, a.key);
    const rb = brut(p.seance, a.key);
    if (!b || ra === null || rb === null || !(Math.abs(ra) > 0) || !(Math.abs(rb) > 0)) continue;
    // meme unite des deux cotes (ex. 980 kg contre 1,2 t) : sinon on garde la valeur avec son unite
    const memeUnite = (a.unit ?? '') === (b.unit ?? '');
    out.push({ cle: a.key, label: a.label, avant: memeUnite ? b.value : `${b.value} ${b.unit ?? ''}`.trim(), apres: memeUnite ? a.value : `${a.value} ${a.unit ?? ''}`.trim(), unite: memeUnite ? a.unit : undefined, gagne: ra > rb, egal: ra === rb });
  }
  return out;
}

export type Verdict = 'gagne' | 'nul' | 'revanche' | 'premier';

/** Le verdict du bandeau : aujourd'hui gagne s'il fait mieux sur plus de lignes ; « premier » sans seance precedente */
export function verdictGala(lignes: LigneGala[]): Verdict {
  if (!lignes.length) return 'premier';
  const g = lignes.filter((l) => l.gagne).length;
  const p = lignes.filter((l) => !l.gagne && !l.egal).length;
  return g > p ? 'gagne' : g === p ? 'nul' : 'revanche';
}

export function texteVerdict(v: Verdict): { debut: string; fin: string } {
  if (v === 'gagne') return { debut: traduire('VAINQUEUR :'), fin: traduire('TOI, AUJOURD’HUI') };
  if (v === 'nul') return { debut: traduire('MATCH NUL :'), fin: traduire('REVANCHE AU PROCHAIN ROUND') };
  if (v === 'revanche') return { debut: traduire('ROUND PERDU :'), fin: traduire('LA REVANCHE SE PRÉPARE') };
  return { debut: traduire('PREMIER COMBAT :'), fin: traduire('LE RECORD À BATTRE') };
}

// ============================================
// CARTE HOLOGRAPHIQUE : l'ecusson
// ============================================

/**
 * L'ecusson dore : aucune « note de forme » n'existe pour une seance dans l'app, on montre un vrai compteur,
 * le rang de la seance dans l'annee (la 47e de 2026), ou les seances de la semaine. null sinon (ecusson masque).
 */
export function ecussonHolo(d: CarteData): { valeur: string; label: string } | null {
  if (d.moment === 'seance' && (d.rangAnnee ?? 0) > 0) return { valeur: String(d.rangAnnee), label: traduirePluriel(d.rangAnnee!, d.rangAnnee! > 1, 'SÉANCE', 'SÉANCES') };
  if (d.moment === 'semaine' && (d.semaine?.seances ?? 0) > 0) return { valeur: String(d.semaine!.seances), label: traduirePluriel(d.semaine!.seances, d.semaine!.seances > 1, 'SÉANCE', 'SÉANCES') };
  return null;
}

/** L'annee de l'ecusson, « 2026 », lue dans la date de la seance ; null si elle n'est pas connue */
export function anneeDe(d: CarteData): string | null {
  const m = /^(\d{4})/.exec(d.dateIso ?? d.exploit?.date ?? d.semaine?.debut ?? '');
  return m ? m[1] : null;
}

// ============================================
// CE QUI EST PROPOSE POUR CHAQUE CARTE
// ============================================

export function directionDispo(d: CarteData, id: DirectionId): boolean {
  if (d.moment === 'avant_apres') return false;
  if (d.moment === 'exploit') return DIRECTIONS_EXPLOIT.includes(id);
  switch (id) {
    case 'gala':
      // sans seance precedente, la carte montre seulement aujourd'hui
      return d.moment === 'seance' && !!d.seance;
    case 'retro':
      return conversionPour(d) !== null;
    case 'serie':
      return serieDe(d) !== null;
    case 'maillot':
      return d.moment === 'seance';
    default:
      return d.moment === 'seance' || d.moment === 'pesee' || d.moment === 'semaine';
  }
}

/** Les directions proposees pour cette carte, dans l'ordre du carrousel */
export function directionsPour(d: CarteData): DirectionInfo[] {
  return ORDRE_CARROUSEL.filter((id) => directionDispo(d, id)).map(infoDirection);
}

/** La direction dessinee : celle choisie si elle est proposee, sinon la premiere du carrousel (anciens modeles compris) */
export function directionEffective(d: CarteData, id: ModeleId | null | undefined): DirectionId {
  if (estDirection(id) && directionDispo(d, id)) return id;
  return directionsPour(d)[0]?.id ?? 'net';
}
