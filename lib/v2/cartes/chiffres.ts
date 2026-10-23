/**
 * Cartes a partager : les chiffres disponibles, le choix par defaut selon le sport et le masquage du poids.
 * Logique pure (testee dans __tests__/unit/cartesPartage.test.ts). Aucun chiffre n'est estime :
 * une donnee absente ou nulle ne donne aucun chiffre.
 */
import type { CarteData, Famille, Masque, StatKey, StatValue } from './types';
import { exploitVisible } from './exploits';
import { traduire } from '@/lib/i18n/tr';

export const MIN_CHIFFRES = 2;
export const MAX_CHIFFRES = 4;

const NBSP = '\u00A0';
/** vrai signe moins, plus net que le trait d'union */
export const MOINS = '\u2212';

/** 72.46 -> "72,5" ; 1250 -> "1 250" */
export function nombre(n: number, decimales = 1): string {
  if (!Number.isFinite(n)) return '0';
  const f = 10 ** decimales;
  const r = Math.round(Math.abs(n) * f) / f;
  const [ent, dec] = String(r).split('.');
  const groupes = ent.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${n < 0 && r !== 0 ? MOINS : ''}${groupes}${dec ? `,${dec}` : ''}`;
}

/** minutes -> { value, unit } : 53 -> 53 min ; 65 -> 1h05 */
export function duree(min: number): { value: string; unit?: string } {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return { value: String(m), unit: 'min' };
  const h = Math.floor(m / 60);
  const r = m % 60;
  return { value: r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h` };
}

/** allure en minutes par kilometre -> 5'12 */
export function allure(dureeMin: number, km: number): string | null {
  if (!(dureeMin > 0) || !(km > 0.2)) return null;
  const secParKm = Math.round((dureeMin * 60) / km);
  if (secParKm < 120 || secParKm > 20 * 60) return null;
  return `${Math.floor(secParKm / 60)}'${String(secParKm % 60).padStart(2, '0')}`;
}

/** Famille de sport a partir de la categorie de lib/sports.ts et de l'id du sport */
export function familleDe(categorie: string | null | undefined, sportId?: string | null): Famille {
  const id = String(sportId ?? '').split(',')[0].trim().toLowerCase();
  if (categorie === 'combat_grappling' || categorie === 'combat_striking') return 'combat';
  if (['musculation', 'muscu', 'powerlifting', 'street_workout', 'crossfit', 'hyrox', 'halterophilie'].includes(id)) return 'muscu';
  if (categorie === 'collectif') return 'collectif';
  if (categorie === 'cardio' || ['running', 'course', 'trail', 'velo', 'cyclisme', 'marche', 'natation'].includes(id)) return 'course';
  if (categorie === 'fitness') return 'muscu';
  return 'autre';
}

/** Ordre de preference des chiffres d'une seance, par famille */
export const PRIORITE_SEANCE: Record<Famille, StatKey[]> = {
  muscu: ['charge', 'series', 'duree', 'calories', 'fc_moy', 'fc_max', 'zones', 'serie_semaines'],
  combat: ['rounds', 'duree', 'fc_moy', 'calories', 'fc_max', 'zones', 'serie_semaines'],
  course: ['distance', 'allure', 'duree', 'fc_moy', 'calories', 'fc_max', 'zones', 'serie_semaines'],
  collectif: ['duree', 'distance', 'calories', 'fc_moy', 'fc_max', 'zones', 'serie_semaines'],
  autre: ['duree', 'calories', 'fc_moy', 'distance', 'fc_max', 'zones', 'rounds', 'series', 'charge', 'serie_semaines'],
};

const PRIORITE_PESEE: StatKey[] = ['poids', 'ecart', 'objectif_pct', 'reste', 'serie_semaines'];
const PRIORITE_SEMAINE: StatKey[] = ['seances', 'temps_total', 'poids_semaine', 'serie_semaines'];

const ZONES_NOMS = [traduire('Récupération'), 'Endurance', 'Tempo', 'Seuil', 'Maximum'];

/** Libelle « perdus » ou « pris » selon le sens */
function sensLabel(d: number): string {
  return d < 0 ? 'perdus' : traduire('pris');
}

/** Pourcentage signe d'un ecart par rapport a une base : -2,9 % */
function pct(ecart: number, base: number): string {
  const p = (ecart / base) * 100;
  const s = nombre(p, 1);
  return `${p > 0 ? '+' : ''}${s}`;
}

function kgSigne(d: number): string {
  return `${d > 0 ? '+' : d < 0 ? MOINS : ''}${nombre(Math.abs(d), 1)}`;
}

/**
 * Tous les chiffres disponibles pour ce moment, dans l'ordre de preference du sport.
 * Masque : 'ecart' ne montre que des ecarts en kilos, 'pourcentage' que des pourcentages ;
 * dans les deux cas aucun poids absolu n'apparait.
 */
export function chiffresDisponibles(d: CarteData, masque: Masque = 'aucun'): StatValue[] {
  const out: StatValue[] = [];
  const push = (v: StatValue | null) => {
    if (v && v.value) out.push(v);
  };
  const serie = d.serieSemaines ?? 0;
  const serieStat: StatValue | null = serie >= 2 ? { key: 'serie_semaines', label: traduire('semaines d’affilée'), value: String(serie) } : null;

  if (d.moment === 'seance' && d.seance) {
    const s = d.seance;
    const fam = d.famille ?? 'autre';
    const all: Partial<Record<StatKey, StatValue | null>> = {
      duree: s.dureeMin > 0 ? { key: 'duree', label: traduire('durée'), ...duree(s.dureeMin) } : null,
      rounds: s.rounds > 0 ? { key: 'rounds', label: s.rounds > 1 ? 'rounds' : 'round', value: String(s.rounds) } : null,
      series: s.series > 0 ? { key: 'series', label: s.series > 1 ? traduire('séries') : traduire('série'), value: String(s.series) } : null,
      charge:
        s.tonnage >= 1
          ? s.tonnage >= 1000
            ? { key: 'charge', label: traduire('soulevées'), value: nombre(s.tonnage / 1000, 1), unit: 't' }
            : { key: 'charge', label: traduire('soulevés'), value: nombre(s.tonnage, 0), unit: 'kg' }
          : null,
      distance: s.distanceKm > 0 ? { key: 'distance', label: 'distance', value: nombre(s.distanceKm, s.distanceKm >= 100 ? 0 : 2), unit: 'km' } : null,
      allure: (() => {
        const a = fam === 'course' || fam === 'autre' ? allure(s.dureeMin, s.distanceKm) : null;
        return a ? { key: 'allure', label: 'allure', value: a, unit: '/km' } : null;
      })(),
      fc_moy: s.fcMoy > 0 ? { key: 'fc_moy', label: traduire('FC moyenne'), value: String(Math.round(s.fcMoy)), unit: 'bpm' } : null,
      fc_max: s.fcMax > 0 ? { key: 'fc_max', label: traduire('FC max'), value: String(Math.round(s.fcMax)), unit: 'bpm' } : null,
      calories: s.calories > 0 ? { key: 'calories', label: 'calories', value: nombre(s.calories, 0), unit: 'kcal' } : null,
      zones: (() => {
        const z = s.zones;
        if (!z || z.length !== 5) return null;
        const total = z.reduce((a, b) => a + (b > 0 ? b : 0), 0);
        if (total < 60) return null;
        const i = z.indexOf(Math.max(...z));
        return { key: 'zones', label: traduire('zone dominante'), value: ZONES_NOMS[i], zones: z.map((x) => (x > 0 ? x : 0)) };
      })(),
      serie_semaines: serieStat,
    };
    for (const k of PRIORITE_SEANCE[fam]) push(all[k] ?? null);
    // les chiffres hors de la liste de la famille restent proposables, a la fin
    for (const k of Object.keys(all) as StatKey[]) if (!PRIORITE_SEANCE[fam].includes(k)) push(all[k] ?? null);
    return out;
  }

  if (d.moment === 'pesee' && d.pesee) {
    const p = d.pesee;
    const ref = p.depart && p.depart > 0 ? p.depart : p.precedent && p.precedent > 0 ? p.precedent : null;
    const ecart = ref ? p.poids - ref : null;
    const depuis = p.depart && p.depart > 0 ? traduire('depuis le départ') : traduire('depuis la dernière');
    const hasGoal = !!(p.objectif && p.objectif > 0 && p.depart && p.depart > 0 && Math.abs(p.depart - p.objectif) >= 0.1);
    let pctObjectif: number | null = null;
    let reste: number | null = null;
    if (hasGoal) {
      const losing = p.objectif! < p.depart!;
      const span = Math.abs(p.depart! - p.objectif!);
      const done = losing ? p.depart! - p.poids : p.poids - p.depart!;
      pctObjectif = Math.max(0, Math.min(1, done / span));
      reste = Math.max(0, losing ? p.poids - p.objectif! : p.objectif! - p.poids);
    }
    const all: Partial<Record<StatKey, StatValue | null>> = {
      poids:
        masque === 'aucun'
          ? { key: 'poids', label: traduire('aujourd’hui'), value: nombre(p.poids, 1), unit: 'kg' }
          : null,
      ecart:
        ecart !== null && Math.abs(ecart) >= 0.1
          ? masque === 'pourcentage'
            ? { key: 'ecart', label: `${sensLabel(ecart)} ${depuis}`, value: pct(ecart, ref!), unit: '%' }
            : { key: 'ecart', label: `${sensLabel(ecart)} ${depuis}`, value: kgSigne(ecart), unit: 'kg' }
          : null,
      objectif_pct: pctObjectif !== null ? { key: 'objectif_pct', label: traduire('du chemin vers l’objectif'), value: String(Math.round(pctObjectif * 100)), unit: '%' } : null,
      reste:
        reste !== null && reste >= 0.1
          ? masque === 'pourcentage'
            ? { key: 'reste', label: traduire('avant l’objectif'), value: nombre((reste / p.depart!) * 100, 1), unit: '%' }
            : { key: 'reste', label: traduire('avant l’objectif'), value: nombre(reste, 1), unit: 'kg' }
          : null,
      serie_semaines: serieStat,
    };
    for (const k of PRIORITE_PESEE) push(all[k] ?? null);
    return out;
  }

  if (d.moment === 'exploit' && d.exploit) {
    // un exploit a un seul chiffre heros, dessine par sa propre mise en page
    const e = exploitVisible(d.exploit, masque);
    if (e.hero.value) out.push({ key: 'exploit', label: e.accroche, value: e.hero.value, unit: e.hero.unit || undefined });
    return out;
  }

  if (d.moment === 'semaine' && d.semaine) {
    const w = d.semaine;
    const all: Partial<Record<StatKey, StatValue | null>> = {
      seances: w.seances > 0 ? { key: 'seances', label: `${w.seances > 1 ? traduire('séances') : traduire('séance')}${w.objectif > 0 ? traduire(", objectif {0}", w.objectif) : ''}`, value: String(w.seances) } : null,
      temps_total: w.minutes > 0 ? { key: 'temps_total', label: traduire('d’entraînement'), ...duree(w.minutes) } : null,
      poids_semaine:
        masque === 'aucun'
          ? w.poidsFin
            ? { key: 'poids_semaine', label: w.poidsEcart !== null && Math.abs(w.poidsEcart) >= 0.1 ? traduire("cette semaine, {0} kg", kgSigne(w.poidsEcart)) : traduire('cette semaine'), value: nombre(w.poidsFin, 1), unit: 'kg' }
            : null
          : w.poidsEcart !== null && Math.abs(w.poidsEcart) >= 0.1 && w.poidsFin
            ? masque === 'pourcentage'
              ? { key: 'poids_semaine', label: traduire("{0} cette semaine", sensLabel(w.poidsEcart)), value: pct(w.poidsEcart, w.poidsFin - w.poidsEcart), unit: '%' }
              : { key: 'poids_semaine', label: traduire("{0} cette semaine", sensLabel(w.poidsEcart)), value: kgSigne(w.poidsEcart), unit: 'kg' }
            : null,
      serie_semaines: serieStat,
    };
    for (const k of PRIORITE_SEMAINE) push(all[k] ?? null);
    return out;
  }
  return out;
}

/** Les trois premiers chiffres disponibles (deux s'il n'y en a que deux) */
export function chiffresParDefaut(d: CarteData, masque: Masque = 'aucun'): StatKey[] {
  return chiffresDisponibles(d, masque).slice(0, 3).map((s) => s.key);
}

/**
 * Chiffres affiches : ceux choisis qui existent, dans l'ordre choisi, au plus 4.
 * Si le choix en laisse moins de 2 (donnee manquante, masquage), on complete avec les suivants disponibles.
 */
export function chiffresAffiches(d: CarteData, choix: StatKey[], masque: Masque = 'aucun'): StatValue[] {
  const dispo = chiffresDisponibles(d, masque);
  const byKey = new Map(dispo.map((s) => [s.key, s]));
  const out: StatValue[] = [];
  for (const k of choix) {
    const s = byKey.get(k);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= MAX_CHIFFRES) break;
  }
  if (out.length < MIN_CHIFFRES) {
    for (const s of dispo) {
      if (out.length >= MIN_CHIFFRES) break;
      if (!out.includes(s)) out.push(s);
    }
  }
  return out;
}

/** Ajoute ou retire un chiffre du choix, en gardant entre 2 et 4 chiffres */
export function basculerChiffre(choix: StatKey[], k: StatKey): StatKey[] {
  if (choix.includes(k)) return choix.length > MIN_CHIFFRES ? choix.filter((x) => x !== k) : choix;
  return choix.length >= MAX_CHIFFRES ? choix : [...choix, k];
}

/** Libelle des chiffres pour l'editeur */
export const NOMS_CHIFFRES: Record<StatKey, string> = {
  duree: traduire('Durée'),
  rounds: traduire('Rounds'),
  series: traduire('Séries'),
  charge: 'Charge totale',
  distance: 'Distance',
  allure: traduire('Allure'),
  fc_moy: traduire('FC moyenne'),
  fc_max: traduire('FC max'),
  calories: traduire('Calories'),
  zones: 'Zones',
  poids: 'Poids',
  ecart: traduire('Poids perdu ou pris'),
  reste: traduire('Reste'),
  objectif_pct: traduire('Objectif en %'),
  seances: traduire('Séances'),
  temps_total: traduire('Temps total'),
  poids_semaine: traduire('Poids de la semaine'),
  serie_semaines: traduire('Série de semaines'),
  exploit: 'Chiffre',
};

/**
 * Titre ecrit sur la carte. Avec le poids masque, un titre qui donnerait un poids
 * (« Sous les 85 kg », « 70 kg passés ») devient « Nouveau palier », et en pourcentage
 * aucun kilo n'apparait.
 */
export function titreCarte(d: CarteData, masque: Masque = 'aucun'): string {
  if (d.moment === 'exploit' && d.exploit) return exploitVisible(d.exploit, masque).surtitre;
  if (d.moment !== 'pesee' || masque === 'aucun') return d.titre;
  const r = d.pesee?.raison;
  if (!r) return traduire('Ma pesée');
  if (r.type === 'palier') {
    const relatif = /kg (perdus|pris)$/.test(r.texte);
    return relatif && masque === 'ecart' ? r.texte : traduire('Nouveau palier');
  }
  if (r.type === 'progres') return masque === 'ecart' ? r.texte : traduire('En progrès');
  return r.texte;
}
