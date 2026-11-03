/**
 * Cartes a partager : les chiffres disponibles, le choix par defaut selon le sport et le masquage du poids.
 * Logique pure (testee dans __tests__/unit/cartesPartage.test.ts). Aucun chiffre n'est estime :
 * une donnee absente ou nulle ne donne aucun chiffre.
 */
import type { CarteData, Famille, Masque, StatKey, StatValue } from './types';
import { exploitVisible } from './exploits';
import { DECIMAL, LANG, traduire } from '@/lib/i18n/tr';

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
  // séparateurs de la langue de l'app (inchangés en français : espace insécable et virgule)
  const groupes = ent.replace(/\B(?=(\d{3})+(?!\d))/g, LANG === 'en' ? ',' : NBSP);
  return `${n < 0 && r !== 0 ? MOINS : ''}${groupes}${dec ? `${DECIMAL}${dec}` : ''}`;
}

/** minutes -> { value, unit } : 53 -> 53 min ; 65 -> 1h05 */
export function duree(min: number): { value: string; unit?: string } {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return { value: String(m), unit: 'min' };
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (LANG !== 'fr') return { value: r ? traduire('{0} h {1}', h, String(r).padStart(2, '0')) : traduire('{0} h', h) };
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

/**
 * Ordre de preference des chiffres d'une seance, par famille.
 * 31 octobre 2026 (cartes ou l'on voit ta tete) : les chiffres cles de chaque sport d'abord.
 * Muscu : tonnage, series, duree, meilleure serie ou record. Course : distance, allure, duree, denivele.
 * Combat : duree, rounds, soumissions, techniques. Cardio et autres : duree, distance, calories.
 * L'atelier en montre 4 au plus ; une donnee absente n'est jamais remplacee par une estimation.
 */
export const PRIORITE_SEANCE: Record<Famille, StatKey[]> = {
  muscu: ['charge', 'series', 'duree', 'meilleur', 'repetitions', 'calories', 'fc_moy', 'fc_max', 'zones', 'serie_semaines'],
  combat: ['duree', 'rounds', 'soumissions', 'techniques', 'intensite', 'fc_moy', 'calories', 'fc_max', 'zones', 'serie_semaines'],
  course: ['distance', 'allure', 'duree', 'denivele', 'calories', 'fc_moy', 'fc_max', 'zones', 'serie_semaines'],
  collectif: ['duree', 'distance', 'calories', 'fc_moy', 'fc_max', 'zones', 'serie_semaines'],
  autre: ['duree', 'distance', 'calories', 'fc_moy', 'fc_max', 'zones', 'rounds', 'series', 'charge', 'serie_semaines'],
};

/** Le cardio qui n'est pas de la course a pied (velo, rameur, natation) : duree, distance, calories, sans allure au km */
export const PRIORITE_CARDIO: StatKey[] = ['duree', 'distance', 'calories', 'denivele', 'fc_moy', 'fc_max', 'zones', 'serie_semaines'];

/** Les sports ou l'allure au kilometre a un sens */
const SPORTS_A_PIED = ['running', 'course', 'course_a_pied', 'trail', 'marche', 'randonnee', 'footing'];

/** Course a pied, trail, marche : vrai ; velo, rameur, natation : faux ; sport inconnu : vrai (comme avant) */
export function aAllure(sport: string | null | undefined): boolean {
  const id = String(sport ?? '').split(',')[0].trim().toLowerCase();
  return !id || SPORTS_A_PIED.includes(id);
}

/** L'ordre des chiffres d'une seance pour ce sport */
export function prioriteSeance(fam: Famille, sport?: string | null): StatKey[] {
  if (fam === 'course' && !aAllure(sport)) return PRIORITE_CARDIO;
  return PRIORITE_SEANCE[fam];
}

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
 * Ta meilleure serie de la seance, en kilos (l'unite du reglage s'applique au dessin) : le record s'il y en a un,
 * sinon la serie la plus lourde. null sans charge saisie.
 */
export function meilleurDe(s: { records?: { nom: string; poids?: number; reps?: number }[]; meilleures?: { nom: string; poids: number; reps: number }[] | null }): StatValue | null {
  const r = (s.records ?? []).find((x) => (x.poids ?? 0) > 0 && (x.reps ?? 0) > 0);
  if (r) return { key: 'meilleur', label: traduire('record, {0}', LANG === 'de' ? r.nom : r.nom.toLowerCase()), value: nombre(r.poids!, 1), unit: `kg × ${r.reps}` };
  const m = (s.meilleures ?? []).find((x) => x.poids > 0 && x.reps > 0);
  return m ? { key: 'meilleur', label: LANG === 'de' ? m.nom : m.nom.toLowerCase(), value: nombre(m.poids, 1), unit: `kg × ${m.reps}` } : null;
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
        const a = (fam === 'course' || fam === 'autre') && aAllure(d.sport) ? allure(s.dureeMin, s.distanceKm) : null;
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
      // 31 octobre 2026 : denivele, repetitions et intensite, seulement s'ils sont dans la seance
      denivele: (s.deniveleM ?? 0) >= 1 ? { key: 'denivele', label: traduire('dénivelé'), value: `+${nombre(s.deniveleM!, 0)}`, unit: 'm' } : null,
      repetitions: (s.repetitions ?? 0) > 0 ? { key: 'repetitions', label: traduire('répétitions'), value: nombre(s.repetitions!, 0) } : null,
      intensite: (s.intensite ?? 0) >= 1 && (s.intensite ?? 0) <= 10 ? { key: 'intensite', label: traduire('intensité'), value: String(Math.round(s.intensite!)), unit: '/10' } : null,
      // 31 octobre 2026 : ta meilleure serie (le record s'il y en a un), tes techniques et tes soumissions, seulement si saisis
      meilleur: meilleurDe(s),
      techniques: (s.techniques?.length ?? 0) > 0 ? { key: 'techniques', label: s.techniques!.length > 1 ? traduire('techniques') : traduire('technique'), value: String(s.techniques!.length) } : null,
      soumissions: (s.soumissions ?? 0) > 0 ? { key: 'soumissions', label: s.soumissions! > 1 ? traduire('soumissions') : traduire('soumission'), value: String(Math.round(s.soumissions!)) } : null,
      serie_semaines: serieStat,
      // 31 octobre 2026 : le cardio de fin de seance, seulement s'il a ete note
      pente: typeof s.penteCardio === 'number' ? { key: 'pente', label: traduire('pente moyenne'), value: nombre(s.penteCardio, 1), unit: '%' } : null,
      fc_cardio: (s.fcCardio ?? 0) > 0 ? { key: 'fc_cardio', label: traduire('FC moyenne du cardio'), value: String(Math.round(s.fcCardio!)), unit: 'bpm' } : null,
    };
    const ordre = prioriteSeance(fam, d.sport);
    for (const k of ordre) push(all[k] ?? null);
    // les chiffres hors de la liste de la famille restent proposables, a la fin
    for (const k of Object.keys(all) as StatKey[]) if (!ordre.includes(k)) push(all[k] ?? null);
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

  // 31 octobre 2026 (bibliotheque) : ton mois, ton annee ; l'ordre suit ton sport principal
  if ((d.moment === 'mois' || d.moment === 'annee') && d.periode) {
    const p = d.periode;
    const oa = p.objectifAnnee;
    const objectif: StatValue | null =
      p.type === 'annee'
        ? oa && oa.total > 0
          ? { key: 'objectif_periode', label: traduire('séances de l’objectif'), value: nombre(oa.fait, 0), unit: `/${oa.total}` }
          : null
        : p.parSemaine > 0 && p.semainesComptees > 0
          ? { key: 'objectif_periode', label: p.semainesTenues > 1 ? traduire('semaines à l’objectif') : traduire('semaine à l’objectif'), value: String(p.semainesTenues), unit: `/${p.semainesComptees}` }
          : null;
    const top = p.sports.length >= 2 ? p.sports[0] : null;
    const all: Partial<Record<StatKey, StatValue | null>> = {
      seances: p.seances > 0 ? { key: 'seances', label: p.seances > 1 ? traduire('séances') : traduire('séance'), value: nombre(p.seances, 0) } : null,
      temps_total: p.minutes > 0 ? { key: 'temps_total', label: traduire('d’entraînement'), ...duree(p.minutes) } : null,
      objectif_periode: objectif,
      distance: p.distanceKm >= 1 ? { key: 'distance', label: traduire('parcourus'), value: nombre(p.distanceKm, p.distanceKm >= 100 ? 0 : 1), unit: 'km' } : null,
      charge:
        p.tonnage >= 1
          ? p.tonnage >= 1000
            ? { key: 'charge', label: traduire('soulevées'), value: nombre(p.tonnage / 1000, p.tonnage >= 100000 ? 0 : 1), unit: 't' }
            : { key: 'charge', label: traduire('soulevés'), value: nombre(p.tonnage, 0), unit: 'kg' }
          : null,
      rounds: p.rounds > 0 ? { key: 'rounds', label: p.rounds > 1 ? 'rounds' : 'round', value: nombre(p.rounds, 0) } : null,
      jours_actifs: p.joursActifs > 0 ? { key: 'jours_actifs', label: p.joursActifs > 1 ? traduire('jours actifs') : traduire('jour actif'), value: String(p.joursActifs) } : null,
      sport_top: top ? { key: 'sport_top', label: traduire('en {0}', LANG === 'de' ? top.nom : top.nom.toLowerCase()), value: String(top.n) } : null,
      serie_semaines: serieStat,
    };
    const fam = d.famille ?? 'autre';
    const sport: StatKey[] = fam === 'muscu' ? ['charge', 'distance', 'rounds'] : fam === 'combat' ? ['rounds', 'distance', 'charge'] : ['distance', 'charge', 'rounds'];
    for (const k of ['seances', 'temps_total', 'objectif_periode', ...sport, 'jours_actifs', 'sport_top', 'serie_semaines'] as StatKey[]) push(all[k] ?? null);
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

/**
 * Les premiers chiffres disponibles : trois par defaut (deux s'il n'y en a que deux).
 * 31 octobre 2026 : l'atelier en demande quatre (le chiffre enorme et 3 stats, comme les maquettes).
 */
export function chiffresParDefaut(d: CarteData, masque: Masque = 'aucun', n = 3): StatKey[] {
  return chiffresDisponibles(d, masque).slice(0, Math.max(MIN_CHIFFRES, Math.min(MAX_CHIFFRES, n))).map((s) => s.key);
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
  denivele: traduire('Dénivelé'),
  repetitions: traduire('Répétitions'),
  intensite: traduire('Intensité'),
  jours_actifs: traduire('Jours actifs'),
  objectif_periode: traduire('Objectif'),
  sport_top: traduire('Sport principal'),
  meilleur: traduire('Meilleure série'),
  techniques: traduire('Techniques'),
  soumissions: traduire('Soumissions'),
  exploit: 'Chiffre',
  pente: traduire('Pente moyenne'),
  fc_cardio: traduire('FC moyenne du cardio'),
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
