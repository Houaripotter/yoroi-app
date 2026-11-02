/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : les 10 familles de cartes, leurs couleurs et leurs chiffres.
 * Couleurs, icones et libelles : _propositions/cartes_v10_2026-11-02/html/fam.js (PAL et F). Les chiffres viennent
 * des vraies donnees de la carte (types.ts) : un chiffre absent disparait, rien n'est estime.
 * Les kcal ne viennent que de seance.calories, deja filtrees par kcalPourCarte (donneesEnPlus.ts) : 0 les cache.
 *
 * 1 Seance de musculation (compositions A, B, C), 2 Record, 3 Course, 4 JJB (et sports de combat), 5 Marche,
 * 6 Avant apres, 7 Muscles, 8 Semaine, 9 Serie, 10 Annee.
 * Les autres cartes (pesee, mois, la plupart des exploits) restent sur l'ancien moteur : famillesPour rend [].
 */
import { traduire } from '@/lib/i18n/tr';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { allure, duree, MOINS, nombre } from '../chiffres';
import { exploitEnUnite } from '../unite';
import type { CarteData, CompositionId, FamilleMoteur, Masque } from '../types';
import { APLUS_ACTIF } from './analysePhoto';

export type { CompositionId, FamilleMoteur };

/** Les icones au trait (components/yoroi/v2/cartes/moteur/Icones.tsx) */
export type IconeId =
  | 'musculation' | 'course' | 'jjb' | 'boxe' | 'mma' | 'marche' | 'cardio' | 'pesee' | 'record' | 'serie' | 'semaine' | 'annee'
  | 'muscles' | 'avant_apres' | 'duree' | 'distance' | 'allure' | 'vitesse' | 'pente' | 'zone2' | 'kcal' | 'series' | 'kilos'
  | 'rounds' | 'intensite' | 'ceinture' | 'objectif' | 'photo' | 'partager';

export type Palette = {
  /** degrade du fond : trois couleurs (cinq pour la semaine) */
  g: string[];
  /** couleur profonde (unites, icones des chiffres) */
  deep: string;
  /** couleur foncee de la bande et du degrade sur photo, en r, g, b */
  fonce: [number, number, number];
  gold?: boolean;
};

export const PALETTES: Record<'muscu' | 'course' | 'jjb' | 'marche' | 'pesee' | 'record' | 'semaine' | 'serie' | 'annee', Palette> = {
  muscu: { g: ['#3D9BFF', '#0A6FE8', '#0A3FB0'], deep: '#0A5BC4', fonce: [6, 26, 61] },
  course: { g: ['#7FDCF5', '#16B8DE', '#0784B8'], deep: '#06688E', fonce: [4, 40, 58] },
  jjb: { g: ['#9473FF', '#6E3DF5', '#3F1BB8'], deep: '#4F25D6', fonce: [27, 13, 77] },
  marche: { g: ['#2CC9B0', '#1DB866', '#0B8A55'], deep: '#0E7A42', fonce: [5, 48, 30] },
  pesee: { g: ['#FFA43D', '#FF7417', '#E8481A'], deep: '#C24A06', fonce: [61, 22, 4] },
  record: { g: ['#3A2D16', '#17120A', '#0B0906'], deep: '#8A6018', fonce: [11, 9, 6], gold: true },
  semaine: { g: ['#18B4E0', '#2F7BF0', '#7348F2', '#D9468E', '#F27A2A'], deep: '#4F25D6', fonce: [20, 11, 61] },
  serie: { g: ['#FF9A3C', '#F25A1E', '#B8251E'], deep: '#B83C0A', fonce: [61, 18, 4] },
  annee: { g: ['#2A3672', '#1F1650', '#0E0B22'], deep: '#8A6018', fonce: [14, 11, 34] },
};

/** Le degrade or des records et de l'annee (5 arrets) */
export const OR: { offset: number; c: string }[] = [
  { offset: 0, c: '#FBE7B0' }, { offset: 0.35, c: '#E2B65C' }, { offset: 0.62, c: '#B8862F' }, { offset: 0.8, c: '#F3D58E' }, { offset: 1, c: '#A8781F' },
];

/** Couleur de chaque sport dans la semaine */
export const COULEUR_SPORT: Partial<Record<IconeId, string>> = { musculation: '#0A84FF', course: '#16C7E8', jjb: '#7C4DFF', boxe: '#E32E38', mma: '#E32E38', marche: '#22C55E', cardio: '#16C7E8' };

export type Stat = { ic: IconeId; v: string; u?: string; l: string };

export type EtatJour = 'seance' | 'repos' | 'inconnu';
export type JourCarte = { sport: IconeId | null; minutes: number; statut: EtatJour };

export type Visuel = 'trace' | 'piste' | 'kimono' | 'tapis' | 'courbe' | 'muscles' | 'semaine' | 'anneau' | 'points' | 'annee' | 'barre';

export type ContenuCarte = {
  famille: FamilleMoteur;
  pal: Palette;
  ic: IconeId;
  /** texte de la pastille */
  sport: string;
  /** libelle au-dessus du chiffre (avec photo) */
  lib: string;
  /** libelle sans photo, s'il change */
  libSans?: string;
  hero: { v: string; u?: string };
  stats: Stat[];
  /** record : ancien, nouveau, gagne */
  duel?: { l: string; v: string; u?: string }[];
  visuel: Visuel;
  /** course et marche : tout le corps est protege */
  corps?: boolean;
  /** le chiffre est dessine dans le visuel (anneau du record, points de la serie) */
  heroDansVisuel?: boolean;
  /** dessins : trace GPS (0 a 1), ceinture, pente, zone 2, poids, jours, muscles, annee, barres */
  trace?: { points: [number, number][]; ratio: number } | null;
  distanceKm?: number;
  ceinture?: { libelle: string; couleur: string } | null;
  pente?: number | null;
  zone2?: boolean;
  poids?: { avant: string; apres: string; unite: string } | null;
  jours?: JourCarte[];
  zones?: ZoneId[];
  groupes?: { nom: string; series: number }[];
  annee?: string;
  /** nombre de points de l'anneau de la serie */
  points?: number;
  barres?: number[];
  /** composition B de la musculation : le mot de l'unite en grand (TONNES) */
  motUnite?: string;
  /** composition C : tuiles et titre */
  titreC?: string;
  tuilesC?: Stat[];
  /** surtitre (record : « Nouveau record », serie : « Série en cours ») */
  sur?: string;
};

// ============================================
// LE SPORT D'UNE SEANCE
// ============================================

const sans = (s: string | null | undefined) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** L'icone d'un sport, d'apres son id ou son nom (les noms de la semaine sont traduits : mots-cles de plusieurs langues) */
export function iconeDuSport(nom: string | null | undefined): IconeId {
  const n = sans(nom);
  if (/jiu|jjb|bjj|grappling|luta|lutte|judo|wrestl/.test(n)) return 'jjb';
  if (/mma|free fight/.test(n)) return 'mma';
  if (/box|muay|kick|thai|savate|karate|taekwondo|combat/.test(n)) return 'boxe';
  if (/march|walk|rando|hike|caminh|camina|wandel|gehen|tapis|treadmill/.test(n)) return 'marche';
  if (/cours|run|footing|jogg|trail|carrera|corsa|lauf|hardlop|corrida/.test(n)) return 'course';
  if (/velo|bike|cycl|natation|swim|rame|row|elliptique|cardio/.test(n)) return 'cardio';
  return 'musculation';
}

function estMarche(d: CarteData): boolean {
  return iconeDuSport(d.sport) === 'marche' || iconeDuSport(d.titre) === 'marche';
}

// ============================================
// QUELLES FAMILLES, QUELLES COMPOSITIONS
// ============================================

const RECORDS = ['record_charge', 'record_distance', 'record_allure', 'record_rounds'];

/** Les familles du nouveau moteur pour cette carte, la premiere par defaut ; [] : l'ancien moteur la dessine */
export function famillesPour(d: CarteData | null | undefined): FamilleMoteur[] {
  if (!d) return [];
  const serie = (d.serie?.jours ?? 0) > 0;
  switch (d.moment) {
    case 'seance': {
      const s = d.seance;
      if (!s) return [];
      if (d.famille === 'muscu') return s.muscles?.groupes?.length ? ['muscu', 'muscles'] : ['muscu'];
      if (d.famille === 'course') return [estMarche(d) ? 'marche' : 'course'];
      if (d.famille === 'combat') return ['jjb'];
      return [];
    }
    case 'semaine':
      return d.semaine ? (serie ? ['semaine', 'serie'] : ['semaine']) : [];
    case 'avant_apres':
      return d.avantApres ? ['transfo'] : [];
    case 'annee':
      return d.periode ? ['annee'] : [];
    case 'exploit': {
      const t = d.exploit?.type;
      if (!t) return [];
      if (RECORDS.includes(t)) return ['record'];
      if (t === 'bilan_annee') return ['annee'];
      if (t === 'serie_semaines') return serie ? ['serie'] : [];
      return [];
    }
    default:
      return [];
  }
}

/** Les familles qui acceptent ta photo (composition A) */
const AVEC_PHOTO: FamilleMoteur[] = ['muscu', 'record', 'course', 'jjb', 'marche', 'transfo', 'annee'];

/** Les compositions proposees : A (ta photo plein cadre) si la famille l'accepte, B (le dessin), C (les donnees, musculation) */
export function compositionsPour(d: CarteData, famille: FamilleMoteur): CompositionId[] {
  const out: CompositionId[] = [];
  if (AVEC_PHOTO.includes(famille)) out.push('A');
  // A+ : desactive tant que la mesure Apple n'a pas parle (analysePhoto.ts)
  if (APLUS_ACTIF && famille === 'muscu') out.push('Aplus');
  out.push('B');
  if (famille === 'muscu' && (d.seance?.barres?.length ?? 0) > 0) out.push('C');
  return out;
}

/** La composition dessinee : celle choisie si elle existe (jamais A+), sinon B ; A sans photo devient B */
export function compositionEffective(d: CarteData, famille: FamilleMoteur, voulue: CompositionId | null | undefined, aPhoto: boolean): CompositionId {
  const liste = compositionsPour(d, famille).filter((c) => c !== 'Aplus');
  const photoPossible = famille === 'transfo' ? !!d.avantApres?.avant?.uri && !!d.avantApres?.apres?.uri : aPhoto;
  if (voulue && voulue !== 'Aplus' && liste.includes(voulue) && (voulue !== 'A' || photoPossible)) return voulue;
  return famille === 'transfo' && photoPossible ? 'A' : 'B';
}

// ============================================
// LES CHIFFRES DE CHAQUE FAMILLE
// ============================================

function tonnes(kg: number, u: UnitePoids): { v: string; u: string } {
  if (u === 'lb') return { v: nombre(Math.round(versUnitePoids(kg, 'lb')), 0), u: 'lb' };
  return kg >= 1000 ? { v: nombre(kg / 1000, 1), u: 't' } : { v: nombre(kg, 0), u: 'kg' };
}

function dureeStat(min: number, l = traduire('Durée')): Stat | null {
  if (!(min > 0)) return null;
  const x = duree(min);
  return { ic: 'duree', v: x.value, u: x.unit, l };
}

const COULEURS_CEINTURE: Record<string, string> = {
  blanche: '#F4F5F8', jaune: '#F5C518', orange: '#F28C28', verte: '#2E9E4F', bleue: '#2563EB', violette: '#7C3AED', marron: '#7A4A26', rouge: '#D62828', noire: '#16181F',
};

function nombreDe(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[\s  ]/g, '').replace(MOINS, '-').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const premiereMaj = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Le contenu d'une carte pour une famille ; null si les donnees ne suffisent pas */
export function contenuDe(d: CarteData, famille: FamilleMoteur, u: UnitePoids = 'kg', masque: Masque = 'aucun'): ContenuCarte | null {
  const s = d.seance;
  const nomSport = d.sport || d.titre;
  switch (famille) {
    case 'muscu': {
      if (!s) return null;
      const t = s.tonnage > 0 ? tonnes(s.tonnage, u) : null;
      const series: Stat | null = s.series > 0 ? { ic: 'series', v: String(s.series), l: traduire('Séries') } : null;
      const hero = t ? { v: t.v, u: t.u } : (() => { const x = duree(s.dureeMin); return { v: x.value, u: x.unit }; })();
      const stats = [series, t ? dureeStat(s.dureeMin) : null].filter(Boolean) as Stat[];
      const tuilesC = [series, dureeStat(s.dureeMin), s.meilleures?.length ? { ic: 'musculation' as IconeId, v: String(s.meilleures.length), l: traduire('Exercices') } : null].filter(Boolean) as Stat[];
      return {
        famille, pal: PALETTES.muscu, ic: 'musculation', sport: traduire('Musculation'),
        lib: t ? traduire('Kilos soulevés') : traduire('Durée'), hero, stats, visuel: 'barre',
        motUnite: t ? (t.u === 't' ? traduire('TONNES') : t.u === 'lb' ? traduire('LIVRES') : traduire('KILOS')) : undefined,
        barres: s.barres ?? undefined, titreC: d.titre && sans(d.titre) !== 'musculation' ? d.titre : traduire('Ta séance'), tuilesC,
      };
    }
    case 'muscles': {
      const g = s?.muscles?.groupes ?? [];
      if (!s || !g.length) return null;
      const total = g.reduce((a, x) => a + x.series, 0);
      return {
        famille, pal: PALETTES.muscu, ic: 'muscles', sport: traduire('Muscles travaillés'), lib: traduire('Séries de travail'),
        hero: { v: String(total), u: traduire('séries') },
        stats: g.slice(0, 3).map((x) => ({ ic: 'series' as IconeId, v: String(x.series), l: traduire(premiereMaj(x.nom)) })),
        visuel: 'muscles', zones: s.muscles?.zones ?? [], groupes: g.slice(0, 3).map((x) => ({ nom: traduire(premiereMaj(x.nom)), series: x.series })),
      };
    }
    case 'course': {
      if (!s) return null;
      const km = s.distanceKm > 0;
      const al = km ? allure(s.dureeMin, s.distanceKm) : null;
      const hero = km ? { v: nombre(s.distanceKm, s.distanceKm >= 100 ? 0 : 1), u: 'km' } : (() => { const x = duree(s.dureeMin); return { v: x.value, u: x.unit }; })();
      const stats = [km ? dureeStat(s.dureeMin) : null, al ? { ic: 'allure' as IconeId, v: al, u: '/km', l: traduire('Allure') } : null, s.calories > 0 ? { ic: 'kcal' as IconeId, v: nombre(s.calories, 0), u: 'kcal', l: traduire('Kcal mesurées') } : null].filter(Boolean) as Stat[];
      return {
        famille, pal: PALETTES.course, ic: 'course', sport: nomSport || traduire('Course à pied'), lib: km ? traduire('Distance') : traduire('Durée'),
        hero, stats, visuel: s.trace?.points?.length ? 'trace' : 'piste', corps: true, trace: s.trace ?? null, distanceKm: s.distanceKm,
      };
    }
    case 'jjb': {
      if (!s) return null;
      const ic = iconeDuSport(nomSport);
      const x = duree(s.dureeMin);
      const c = d.ceintureJjb;
      const nomC = c ? traduire(`Ceinture ${c.ceinture}`) : null;
      const ceinture = c && ic === 'jjb' ? { libelle: c.degres > 0 ? traduire('{0}, {1} degrés', nomC, c.degres) : nomC!, couleur: COULEURS_CEINTURE[c.ceinture] ?? '#2563EB' } : null;
      const stats = [
        s.rounds > 0 ? { ic: 'rounds' as IconeId, v: String(s.rounds), l: traduire('Rounds') } : null,
        ceinture ? { ic: 'ceinture' as IconeId, v: premiereMaj(traduire(c!.ceinture)), l: c!.degres > 0 ? traduire('Ceinture, {0} degrés', c!.degres) : traduire('Ceinture') } : null,
        !ceinture && s.intensite ? { ic: 'intensite' as IconeId, v: String(s.intensite), u: '/10', l: traduire('Intensité') } : null,
      ].filter(Boolean) as Stat[];
      return {
        famille, pal: PALETTES.jjb, ic: ic === 'jjb' || ic === 'boxe' || ic === 'mma' ? ic : 'jjb', sport: nomSport || traduire('Jiu-jitsu brésilien'),
        lib: ic === 'jjb' ? traduire('Sur le tatami') : traduire('Durée'), hero: { v: x.value, u: x.unit }, stats, visuel: 'kimono', ceinture,
      };
    }
    case 'marche': {
      if (!s) return null;
      const x = duree(s.dureeMin);
      const vit = s.vitesseCardio && s.vitesseCardio > 0 ? s.vitesseCardio : s.distanceKm > 0 && s.dureeMin > 0 ? s.distanceKm / (s.dureeMin / 60) : 0;
      const stats = [
        s.penteCardio && s.penteCardio > 0 ? { ic: 'pente' as IconeId, v: nombre(s.penteCardio, 1), u: '%', l: traduire('Pente') } : null,
        vit > 0 ? { ic: 'vitesse' as IconeId, v: nombre(vit, 1), u: 'km/h', l: traduire('Vitesse') } : null,
        s.enZone2 ? { ic: 'zone2' as IconeId, v: traduire('Zone 2'), l: traduire('Tenue') } : null,
      ].filter(Boolean) as Stat[];
      return {
        famille, pal: PALETTES.marche, ic: 'marche', sport: nomSport || traduire('Marche inclinée'), lib: nomSport || traduire('Marche'),
        hero: { v: x.value, u: x.unit }, stats, visuel: 'tapis', corps: true, pente: s.penteCardio ?? null, zone2: !!s.enZone2,
      };
    }
    case 'transfo': {
      const a = d.avantApres;
      if (!a) return null;
      const pa = a.avant.poids, pb = a.apres.poids;
      const ecart = pa != null && pb != null ? pb - pa : null;
      const conv = (kg: number) => versUnitePoids(kg, u);
      const unite = u === 'lb' ? 'lb' : 'kg';
      const signe = (x: number) => (x > 0 ? '+' : x < 0 ? MOINS : '');
      // masquage du poids : jamais de poids absolu ; en pourcentage, l'ecart rapporte au poids de depart
      const hero = ecart == null
        ? { v: String(a.jours), u: traduire('jours') }
        : masque === 'pourcentage' && pa
          ? { v: `${signe(ecart)}${nombre(Math.abs((ecart / pa) * 100), 1)}`, u: '%' }
          : { v: `${signe(ecart)}${nombre(Math.abs(conv(ecart)), 1)}`, u: unite };
      return {
        famille, pal: PALETTES.pesee, ic: 'avant_apres', sport: traduire('Avant et après'), lib: traduire('Entre tes deux photos'), hero,
        stats: ecart != null && a.jours > 0 ? [{ ic: 'duree', v: String(a.jours), u: traduire('jours'), l: traduire('Entre les photos') }] : [],
        visuel: 'courbe', poids: pa != null && pb != null && masque === 'aucun' ? { avant: nombre(conv(pa), 1), apres: nombre(conv(pb), 1), unite } : null,
      };
    }
    case 'semaine': {
      const w = d.semaine;
      if (!w) return null;
      const t = w.minutes > 0 ? duree(w.minutes) : null;
      const k = w.kilos && w.kilos > 0 ? tonnes(w.kilos, u) : null;
      const stats = [
        t ? { ic: 'duree' as IconeId, v: t.value, u: t.unit, l: traduire('Temps total') } : null,
        k ? { ic: 'kilos' as IconeId, v: k.v, u: k.u, l: traduire('Kilos soulevés') } : null,
        w.objectif > 0 ? { ic: 'objectif' as IconeId, v: String(w.seances), u: traduire('sur {0}', w.objectif), l: traduire('Objectif') } : null,
      ].filter(Boolean) as Stat[];
      const jours: JourCarte[] = w.jours.map((fait, i) => {
        const p = w.parJour?.[i];
        const statut: EtatJour = p?.statut ?? (fait ? 'seance' : 'repos');
        return { sport: statut === 'seance' ? iconeDuSport(p?.sports?.[0] ?? null) : null, minutes: Math.max(0, p?.minutes ?? 0), statut };
      });
      return {
        famille, pal: PALETTES.semaine, ic: 'semaine', sport: traduire('Ma semaine'), lib: d.sousTitre,
        hero: { v: String(w.seances), u: w.seances > 1 ? traduire('séances') : traduire('séance') }, stats, visuel: 'semaine', jours,
      };
    }
    case 'serie': {
      const x = d.serie;
      if (!x?.jours) return null;
      const stats = [
        x.recordJours ? { ic: 'serie' as IconeId, v: String(x.recordJours), u: traduire('jours'), l: traduire('Record de jours') } : null,
        x.recordSemaines ? { ic: 'semaine' as IconeId, v: String(x.recordSemaines), u: traduire('semaines'), l: traduire('Record de semaines') } : null,
      ].filter(Boolean) as Stat[];
      return {
        famille, pal: PALETTES.serie, ic: 'serie', sport: traduire('Ma série'), lib: traduire('Série en cours'), sur: traduire('Jours d’affilée'),
        hero: { v: String(x.jours) }, stats, visuel: 'points', heroDansVisuel: true, points: Math.max(7, Math.min(60, x.jours)),
      };
    }
    case 'record': {
      if (!d.exploit) return null;
      const e = exploitEnUnite(d.exploit, u);
      const nv = nombreDe(e.hero.value), av = nombreDe(e.avant?.value);
      const gagne = nv != null && av != null ? nv - av : null;
      const duel = e.avant
        ? [
            { l: traduire('Ancien record'), v: e.avant.value, u: e.avant.unit },
            { l: traduire('Nouveau'), v: e.hero.value, u: e.hero.unit },
            ...(gagne != null && gagne !== 0 && d.exploit.type !== 'record_allure' ? [{ l: traduire('Gagné'), v: `${gagne > 0 ? '+' : MOINS}${nombre(Math.abs(gagne), Math.abs(gagne) < 10 && gagne % 1 !== 0 ? 1 : 0)}`, u: e.hero.unit }] : []),
          ]
        : undefined;
      return {
        famille, pal: PALETTES.record, ic: 'record', sport: traduire('Record personnel'), lib: `${e.surtitre}, ${e.accroche}`, libSans: e.accroche,
        sur: e.surtitre, hero: { v: e.hero.value, u: e.hero.unit }, stats: [], duel, visuel: 'anneau', heroDansVisuel: true,
      };
    }
    case 'annee': {
      const p = d.periode;
      if (p) {
        const k = p.tonnage > 0 ? tonnes(p.tonnage, u) : null;
        const stats = [
          p.minutes > 0 ? { ic: 'duree' as IconeId, v: nombre(Math.round(p.minutes / 60), 0), u: 'h', l: traduire('Entraînement') } : null,
          k ? { ic: 'kilos' as IconeId, v: k.v, u: k.u, l: traduire('Kilos soulevés') } : p.distanceKm > 0 ? { ic: 'distance' as IconeId, v: nombre(p.distanceKm, 0), u: 'km', l: traduire('Parcourus') } : null,
          p.records ? { ic: 'record' as IconeId, v: String(p.records), l: traduire('Records battus') } : null,
        ].filter(Boolean) as Stat[];
        return {
          famille, pal: PALETTES.annee, ic: 'annee', sport: traduire('Bilan annuel'), lib: traduire('Mon année {0}', p.ref), libSans: traduire('Séances, toutes disciplines'),
          hero: { v: nombre(p.seances, 0), u: p.seances > 1 ? traduire('séances') : traduire('séance') }, stats, visuel: 'annee', annee: p.ref,
        };
      }
      const e = d.exploit;
      if (!e) return null;
      const an = e.date.slice(0, 4);
      return {
        famille, pal: PALETTES.annee, ic: 'annee', sport: traduire('Bilan annuel'), lib: traduire('Mon année {0}', an), libSans: traduire('Séances, toutes disciplines'),
        hero: { v: e.hero.value, u: e.hero.unit }, stats: (e.cotes ?? []).slice(0, 3).map((c) => ({ ic: 'objectif' as IconeId, v: c.value, u: c.unit, l: premiereMaj(c.label) })),
        visuel: 'annee', annee: an,
      };
    }
    default:
      return null;
  }
}
