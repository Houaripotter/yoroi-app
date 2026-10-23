/**
 * Offre Yoroi Premium : UNE seule source pour ce que Premium ajoute (paywall, onboarding, PremiumGate),
 * et la lecture des offres du store (prix, devise, periode, essai). Rien n'est ecrit en dur :
 * prix, periodes et essais viennent toujours de ce que RevenueCat renvoie.
 */
import { Platform } from 'react-native';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { freeTrialOf, type FreeTrial } from '@/lib/v2/onboarding/trial';
import { FREE_LIMITS } from '@/lib/v2/premium/limits';
import { traduire, DECIMAL, LOCALE } from '@/lib/i18n/tr';

// ===== Ce que Premium ajoute (verifie dans le code, ecran par ecran) =====

export type PremiumRow = {
  id: string;
  /** libelle court de la ligne du tableau */
  label: string;
  /** precision sous le libelle, en quelques mots */
  sub: string;
  /** ce qu'a la version gratuite (null : pas inclus, un cadenas s'affiche) */
  free: string | null;
  /** ce que Premium donne, en un ou deux mots */
  premium: string;
  /** phrase plus longue pour la carte Premium d'un ecran verrouille */
  desc: string;
  icon: IconName;
  perkIcon: 'infinite' | 'chart' | 'trophy' | 'save';
};

const FREE_MONTHS = Math.round(FREE_LIMITS.chartDays / 30);

/**
 * Six lignes vraies, tirees des limites (lib/v2/premium/limits.ts) et du code :
 *  - courbes : FREE_LIMITS.chartDays (PeriodSwitch), annee sante (app/sante/[metrique].tsx)
 *  - analyses : weight-predictions, radar-performance, wrapped sous PremiumGate, bilan PDF (settings/donnees.tsx),
 *    signes vitaux du sommeil (sleep-detail.tsx)
 *  - combat : combat-analytics, rounds-insights, matchup-matrix, competition-camp, weight-cut, nutrition-plan
 *    sous PremiumGate, et FREE_LIMITS.upcomingCompetitions (app/add-competition.tsx)
 *  - carnet : TesVideos et la progression des mouvements (RecordsView), records et techniques gratuits
 *  - photos : FREE_LIMITS.progressPhotos (app/photos.tsx)
 *  - monde : isThemeUnlocked et isPackUnlocked (lib/v2/dojo/personnages.ts)
 */
export const PREMIUM_ROWS: PremiumRow[] = [
  { id: 'courbes', label: traduire('Courbes et historique'), sub: traduire('Poids, mesures, force et santé'), free: traduire("{0} mois", FREE_MONTHS), premium: traduire('Tout'), desc: traduire('Tes courbes sur 6 mois, 1 an et tout ton historique'), icon: 'calendar', perkIcon: 'infinite' },
  { id: 'analyses', label: traduire('Analyses et prédictions'), sub: traduire('Toutes tes prévisions, radar, bilan PDF'), free: traduire('Une ligne'), premium: 'Incluses', desc: traduire('Ton poids projeté, ton radar de performance et ton bilan en PDF'), icon: 'target', perkIcon: 'chart' },
  { id: 'combat', label: traduire('Combat et compétition'), sub: traduire('Compétitions, rounds, camp, coupe'), free: traduire("{0} à venir", FREE_LIMITS.upcomingCompetitions), premium: traduire('Sans limite'), desc: traduire('Tes rounds analysés, ton camp et ta coupe jusqu’à la pesée'), icon: 'swords', perkIcon: 'trophy' },
  { id: 'carnet', label: traduire('Vidéos et progression'), sub: traduire('Dans ton carnet, records gratuits'), free: null, premium: 'Incluses', desc: traduire('Tes vidéos et la progression de tes mouvements, dans ton carnet'), icon: 'camera', perkIcon: 'save' },
  { id: 'photos', label: traduire('Photos de progression'), sub: traduire('Dans ton coffre, sur ton téléphone'), free: `${FREE_LIMITS.progressPhotos} photos`, premium: traduire('Sans limite'), desc: traduire('Autant de photos de progression que tu veux'), icon: 'image', perkIcon: 'save' },
  { id: 'monde', label: traduire('Scènes et personnages'), sub: traduire('Tout le monde samouraï'), free: traduire('Une partie'), premium: traduire('Tous'), desc: traduire('Toutes les scènes et tous les personnages du monde samouraï, sans attendre'), icon: 'image', perkIcon: 'save' },
];

/** Ce qui reste gratuit, a dire clairement */
export const FREE_FOREVER = traduire('Peser, noter tes séances, voir ta semaine, le Dojo et les chronos : gratuit, sans limite.');

// ===== Preuve sociale =====

export type StoreRating = { note: number; notes: number };

/**
 * Notes reelles des stores, relevees A LA MAIN (jamais inventees).
 * App Store : 43 notes, moyenne 5 sur 5 (verifie dans App Store Connect le 11 octobre 2026).
 * Google Play : 6 notes, moyenne 5 sur 5.
 * Une note a null ne s'affiche pas.
 */
export const REAL_STORE_RATING: { miseAJour: string; appStore: StoreRating | null; googlePlay: StoreRating | null } = {
  miseAJour: '2026-10-11',
  appStore: { note: 5, notes: 43 },
  googlePlay: { note: 5, notes: 6 },
};

/** « 5,0 sur 5, 49 notes sur l’App Store et Google Play » : les deux stores additionnes, moyenne ponderee */
export function ratingLine(): string | null {
  const list = [REAL_STORE_RATING.appStore, REAL_STORE_RATING.googlePlay].filter((r): r is StoreRating => !!r && r.note > 0 && r.notes > 0);
  if (list.length === 0) return null;
  const total = list.reduce((n, r) => n + r.notes, 0);
  const moyenne = list.reduce((n, r) => n + r.note * r.notes, 0) / total;
  const note = (Math.floor(moyenne * 10) / 10).toFixed(1).replace('.', DECIMAL);
  const stores = REAL_STORE_RATING.appStore && REAL_STORE_RATING.googlePlay ? traduire('sur l’App Store et Google Play') : REAL_STORE_RATING.appStore ? traduire('sur l’App Store') : traduire('sur Google Play');
  return traduire("{0} sur 5, {1} {2} {3}", note, total, total > 1 ? 'notes' : 'note', stores);
}

/** La note des deux stores reunis, pour la note avec lauriers : « 5,0 », 49, « App Store et Google Play » */
export function storeRating(): { note: string; total: number; stores: string } | null {
  const list = [REAL_STORE_RATING.appStore, REAL_STORE_RATING.googlePlay].filter((r): r is StoreRating => !!r && r.note > 0 && r.notes > 0);
  if (list.length === 0) return null;
  const total = list.reduce((n, r) => n + r.notes, 0);
  const moyenne = list.reduce((n, r) => n + r.note * r.notes, 0) / total;
  const note = (Math.floor(moyenne * 10) / 10).toFixed(1).replace('.', DECIMAL);
  const stores = REAL_STORE_RATING.appStore && REAL_STORE_RATING.googlePlay ? traduire('App Store et Google Play') : REAL_STORE_RATING.appStore ? 'App Store' : 'Google Play';
  return { note, total, stores };
}

// ===== Lecture des offres du store =====

export type PeriodUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type StorePeriod = { unit: PeriodUnit; count: number };

/** Duree ISO 8601 du store (P1M, P1Y, P3M, P1W, P7D) */
export function parseIsoPeriod(iso: unknown): StorePeriod | null {
  const m = typeof iso === 'string' ? /^P(\d+)([DWMY])$/.exec(iso.trim()) : null;
  if (!m) return null;
  const map: Record<string, PeriodUnit> = { D: 'DAY', W: 'WEEK', M: 'MONTH', Y: 'YEAR' };
  const count = Number(m[1]);
  if (!(count > 0)) return null;
  // P12M et P52W valent un an
  if (m[2] === 'M' && count === 12) return { unit: 'YEAR', count: 1 };
  return { unit: map[m[2]], count };
}

/** « par mois », « par an », « tous les 3 mois » */
export function periodPhrase(p: StorePeriod): string {
  const n = p.count;
  switch (p.unit) {
    case 'YEAR':
      return n === 1 ? traduire('par an') : `tous les ${n} ans`;
    case 'MONTH':
      return n === 1 ? traduire('par mois') : `tous les ${n} mois`;
    case 'WEEK':
      return n === 1 ? 'par semaine' : `toutes les ${n} semaines`;
    default:
      return n === 1 ? 'par jour' : traduire("tous les {0} jours", n);
  }
}

/** « 1 an », « 1 mois », « 3 mois », « 1 semaine » */
export function durationPhrase(p: StorePeriod): string {
  const n = p.count;
  switch (p.unit) {
    case 'YEAR':
      return n === 1 ? '1 an' : traduire("{0} ans", n);
    case 'MONTH':
      return traduire("{0} mois", n);
    case 'WEEK':
      return n === 1 ? '1 semaine' : traduire("{0} semaines", n);
    default:
      return n === 1 ? traduire('1 jour') : traduire("{0} jours", n);
  }
}

/** Nombre de mois couverts par une periode */
export function monthsIn(p: StorePeriod): number {
  if (p.unit === 'YEAR') return 12 * p.count;
  if (p.unit === 'MONTH') return p.count;
  if (p.unit === 'WEEK') return (p.count * 12) / 52;
  return (p.count * 12) / 365;
}

/** Montant dans la devise du store, au format francais */
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2).replace('.', DECIMAL)} ${currency}`;
  }
}

type RawProduct = {
  identifier?: string;
  price?: number;
  priceString?: string;
  currencyCode?: string;
  subscriptionPeriod?: string | null;
};

type RawPackage = { identifier?: string; packageType?: string; product?: RawProduct };

export function productOf(raw: unknown): RawProduct | null {
  return ((raw as RawPackage | null)?.product as RawProduct | undefined) ?? null;
}

export type OfferKind = 'annual' | 'monthly' | 'other';

export type OfferInfo = {
  /** identifiant du produit dans le store */
  productId: string;
  kind: OfferKind;
  price: number | null;
  currency: string | null;
  /** prix formate par le store */
  priceString: string;
  period: StorePeriod | null;
  /** « par an », « par mois » (vide si le store ne donne pas de periode) */
  per: string;
  /** equivalent mensuel calcule depuis le prix et la devise du store (offres de plus d'un mois) */
  perMonth: string | null;
  /** equivalent par jour, calcule depuis le prix et la devise du store (offres d'un an ou plus) */
  perDay: string | null;
  /** nom de l'abonnement affiche (« YOROI Premium annuel ») */
  name: string;
  /** nom court de la carte (« Annuel », « Mensuel ») */
  short: string;
  /** duree d'une periode (« 1 an », « 1 mois »), vide si le store ne la donne pas */
  duration: string;
};

/** Periode d'un paquet : celle du produit, sinon le type de paquet RevenueCat */
function periodOf(raw: unknown): StorePeriod | null {
  const fromStore = parseIsoPeriod(productOf(raw)?.subscriptionPeriod);
  if (fromStore) return fromStore;
  const type = String((raw as RawPackage | null)?.packageType ?? '').toUpperCase();
  if (type === 'ANNUAL') return { unit: 'YEAR', count: 1 };
  if (type === 'SIX_MONTH') return { unit: 'MONTH', count: 6 };
  if (type === 'THREE_MONTH') return { unit: 'MONTH', count: 3 };
  if (type === 'TWO_MONTH') return { unit: 'MONTH', count: 2 };
  if (type === 'MONTHLY') return { unit: 'MONTH', count: 1 };
  if (type === 'WEEKLY') return { unit: 'WEEK', count: 1 };
  return null;
}

export function describeOffer(raw: unknown, priceStringFallback = ''): OfferInfo {
  const product = productOf(raw);
  const period = periodOf(raw);
  const price = typeof product?.price === 'number' && product.price > 0 ? product.price : null;
  const currency = product?.currencyCode || null;
  const kind: OfferKind = period?.unit === 'YEAR' && period.count === 1 ? 'annual' : period?.unit === 'MONTH' && period.count === 1 ? 'monthly' : 'other';
  const months = period ? monthsIn(period) : 0;
  const perMonth = price && currency && months > 1 ? formatMoney(price / months, currency) : null;
  const perDay = price && currency && months >= 12 ? formatMoney(price / ((months / 12) * 365), currency) : null;
  return {
    productId: product?.identifier ?? '',
    kind,
    price,
    currency,
    priceString: product?.priceString ?? priceStringFallback,
    period,
    per: period ? periodPhrase(period) : '',
    perMonth,
    perDay,
    name: kind === 'annual' ? 'YOROI Premium annuel' : kind === 'monthly' ? 'YOROI Premium mensuel' : period ? `YOROI Premium ${durationPhrase(period)}` : 'YOROI Premium',
    short: kind === 'annual' ? traduire('Annuel') : kind === 'monthly' ? traduire('Mensuel') : period ? durationPhrase(period).replace(/^./, (x) => x.toUpperCase()) : traduire('Abonnement'),
    duration: period ? durationPhrase(period) : '',
  };
}

/** Economie de l'annuel face au mensuel, en pour cent, calculee sur les vrais prix (null si incalculable) */
export function savingsPercent(annual: OfferInfo | null, monthly: OfferInfo | null): number | null {
  if (!annual?.price || !monthly?.price || !annual.period || !monthly.period) return null;
  if (annual.currency && monthly.currency && annual.currency !== monthly.currency) return null;
  const sameDuration = monthly.price * (monthsIn(annual.period) / monthsIn(monthly.period));
  if (!(sameDuration > 0)) return null;
  const pct = Math.round((1 - annual.price / sameDuration) * 100);
  return pct >= 1 ? pct : null;
}

export type Eligibility = 'eligible' | 'ineligible' | 'unknown';

/**
 * Essai gratuit auquel l'utilisateur a vraiment droit.
 * iOS : l'essai du produit, seulement si RevenueCat confirme l'eligibilite.
 * Android : Google Play ne propose la phase gratuite (defaultOption.freePhase) qu'aux comptes eligibles.
 */
export function trialFor(raw: unknown, eligibility: Record<string, Eligibility>): FreeTrial | null {
  const t = freeTrialOf(raw);
  if (!t) return null;
  if (Platform.OS === 'ios') {
    const id = productOf(raw)?.identifier ?? '';
    return eligibility[id] === 'eligible' ? t : null;
  }
  return t;
}

/** Offres dans l'ordre d'affichage : l'annuel, le mensuel, puis le reste */
export function sortOffers<T extends { raw: unknown }>(list: T[]): { pkg: T; info: OfferInfo }[] {
  const rank = (k: OfferKind) => (k === 'annual' ? 0 : k === 'monthly' ? 1 : 2);
  return list
    .map((pkg) => ({ pkg, info: describeOffer(pkg.raw) }))
    .filter((o) => o.info.priceString !== '')
    .sort((a, b) => rank(a.info.kind) - rank(b.info.kind));
}
