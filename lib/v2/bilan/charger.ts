/**
 * Bilan (16 octobre 2026) : lecture des vraies donnees pour la page de bilan.
 * Corps : tes pesees (avec la tendance lissee de lib/v2/weightStats), ta composition, tes mensurations,
 * ton objectif, ta ligne directrice et ton torii (memes calculs que la courbe, sans rien ecrire), ta prevision.
 * Seance : la seance, la precedente du meme sport, tes compteurs, ton objectif de la semaine et de l'annee,
 * tes records et techniques, ta regularite. Rien n'est estime ici : le texte vient de ./texte.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, getTrainingById, getTrainings, getWeights } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getSportName } from '@/lib/sports';
import { getEspace, objectifVise } from '@/lib/v2/espace';
import { toDailySeries, todayISO } from '@/lib/v2/weightStats';
import { loadComposition } from '@/lib/v2/progres/composition';
import { loadMeasures, viewValue } from '@/lib/v2/progres/measures';
import { phraseStatut } from '@/lib/v2/pesee/ligneDirectrice';
import { toriiDuJour } from '@/lib/v2/pesee/arrivee';
import type { MemoTorii, ModeLigne } from '@/lib/v2/pesee/ligneDirectrice';
import { ajuster, phrasePrevision, phraseTorii, prevoir } from '@/lib/v2/pesee/predictions';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { durationOf, setsCount, tonnage } from '@/lib/v2/trainingWeek';
import { cleTri, lundiIso, objectifAnnee, recordsDe, serieSemaines, techniquesDe, trier } from '@/lib/v2/cartes/exploits';
import type { CarteData } from '@/lib/v2/cartes/types';
import { bilanCorps, bilanSeance, dateLongue, joursEntre, MESURES, moinsJours } from './texte';
import { chargerResumeRepas } from '@/lib/v2/nutrition/useMange';
import type { BilanCorps, BilanSeance, CompoJ, MesureJ, OrigineCorps, SeanceJ } from './texte';
import { traduire } from '@/lib/i18n/tr';

const TORII_KEY = 'yoroi_torii_v1';

type Profil = { start_date?: string | null; start_weight?: number | null; target_weight?: number | null; height_cm?: number | null; weight_goal?: string | null };

async function lireTorii(): Promise<MemoTorii | null> {
  try {
    const raw = await AsyncStorage.getItem(TORII_KEY);
    const v = raw ? (JSON.parse(raw) as MemoTorii) : null;
    return v && typeof v.date === 'string' && typeof v.cle === 'string' ? v : null;
  } catch {
    return null;
  }
}

const maj = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Le bilan du corps a la date donnee (pesee, composition, mensurations) */
export async function chargerBilanCorps(date: string, origine: OrigineCorps): Promise<BilanCorps> {
  const jour = date.slice(0, 10);
  const today = todayISO();
  const [ws, profil, compoPts, mesuresPts] = await Promise.all([
    getWeights().catch(() => []),
    getProfile().catch(() => null) as Promise<Profil | null>,
    loadComposition().catch(() => []),
    loadMeasures().catch(() => []),
  ]);
  const series = toDailySeries((ws ?? []).filter((w) => w && w.weight > 0));
  const pesees = series.map((d) => ({ date: d.date, value: d.value, trend: d.trend }));

  // objectif et ligne directrice : le meme calcul que usePlanPoids, en lecture seule
  const capBrut = Number(profil?.target_weight);
  const cap = Number.isFinite(capBrut) && capBrut > 0 ? capBrut : null;
  const h = Number(profil?.height_cm);
  const heightCm = Number.isFinite(h) && h > 100 && h < 250 ? h : null;
  let depart: { date: string; poids: number } | null = null;
  let mode: ModeLigne | null = null;
  let ligneTexte: { ton: 'vert' | 'bleu' | 'orange' | 'gris'; texte: string } | null = null;
  let prevision: string | null = null;
  let toriiTexte: string | null = null;
  let bruit: number | null = null;
  try {
    if (cap != null && series.length) {
      // 17 octobre : le torii de la courbe, de la montre et du paywall (lib/v2/pesee/arrivee.ts, source unique)
      const t = toriiDuJour({ profil, series, cap, today, memo: await lireTorii(), heightCm });
      depart = t.depart;
      mode = t.mode;
      const ligne = t.ligne;
      const torii = t.torii;
      const atteint = t.atteint;
      const sansTorii = !ligne;
      const cible = [...series].reverse().find((p) => p.date <= jour);
      if (ligne && cible) {
        const ph = phraseStatut(ligne, cible.date, cible.value, torii, cible.date < today);
        ligneTexte = { ton: ph.ton, texte: maj(`${ph.avant}${ph.cle}${ph.apres}`) };
      }
      // la prevision parle d'aujourd'hui : seulement pour ta pesee la plus recente
      const derniere = series[series.length - 1];
      if (derniere && jour >= derniere.date) {
        const p = prevoir({ series: pesees, today, cap, ligne: sansTorii ? null : ligne, torii, atteint });
        if (p.ok) {
          // une prevision, dite comme telle ; le torii (la date du cap) dans la phrase suivante
          prevision = phrasePrevision(p, 'kg', traduire('À ton rythme actuel'));
          toriiTexte = phraseTorii(p);
        }
      }
    } else if (series.length) {
      const derniere = series[series.length - 1];
      if (jour >= derniere.date) {
        const p = prevoir({ series: pesees, today, cap: null });
        if (p.ok) prevision = phrasePrevision(p, 'kg', traduire('À ton rythme actuel'));
      }
    }
    bruit = ajuster(pesees, today)?.bruit ?? null;
  } catch (e) {
    logger.warn('[bilan] ligne et prevision', e);
  }

  const compo: CompoJ[] = (compoPts ?? []).map((p) => ({ date: p.date.slice(0, 10), weight: p.weight, fat: p.fat, muscleKg: p.muscleKg, muscle: p.muscle, water: p.water, bone: p.bone, visceral: p.visceral }));
  const mesures: MesureJ[] = (mesuresPts ?? []).map((m) => {
    const valeurs: MesureJ['valeurs'] = {};
    for (const f of MESURES) {
      const v = viewValue(m, f.key);
      if (v) valeurs[f.key] = Math.round(v * 10) / 10;
    }
    return { date: m.date.slice(0, 10), valeurs };
  });

  // 16 octobre (agent MANGÉ) : tes repas des 7 derniers jours, seulement pour le bilan du jour et si ton app de repas ecrit dans Sante
  let repas: { kcal: number | null; proteines: number | null; jours: number; app?: string | null } | null = null;
  if (jour === today) {
    try {
      const r = await chargerResumeRepas();
      if (r?.moyenne) repas = { ...r.moyenne, app: r.app };
    } catch (e) {
      logger.info('[bilan] repas indisponibles', e);
    }
  }

  return bilanCorps({
    date: jour,
    pesees,
    compo,
    mesures,
    objectif: cap != null ? { depart, cap, mode } : null,
    ligne: ligneTexte,
    prevision,
    torii: toriiTexte,
    bruit,
    origine,
    repas,
  });
}

// ============================================
// SEANCE
// ============================================

const jourDe = (t: Training) => String(t.date ?? '').slice(0, 10);
const premierSport = (t: Training) => String(t.sport ?? '').split(',')[0].trim();
const nomSport = (sport: string) =>
  String(sport)
    .split(',')
    .map((s) => getSportName(s.trim()))
    .filter(Boolean)
    .join(' et ');

function zonesDe(t: Training): number[] | null {
  if (!t.workout_details_json) return null;
  try {
    const d = JSON.parse(t.workout_details_json) as { heartRateZones?: { durationSeconds?: number }[] };
    const z = d.heartRateZones;
    if (!Array.isArray(z) || z.length !== 5) return null;
    return z.map((x) => Math.max(0, Number(x?.durationSeconds) || 0));
  } catch {
    return null;
  }
}

export function seanceJ(t: Training): SeanceJ {
  return {
    id: t.id ?? 0,
    date: jourDe(t),
    sport: premierSport(t),
    nomSport: nomSport(t.sport) || traduire('Séance'),
    dureeMin: durationOf(t),
    intensite: t.intensity ?? null,
    fcMoy: t.heart_rate ?? null,
    fcMax: t.max_heart_rate ?? null,
    calories: t.calories ?? null,
    distanceKm: t.distance ?? null,
    rounds: t.rounds ?? (Array.isArray(t.combat_rounds) ? t.combat_rounds.length : null),
    series: setsCount(t),
    tonnage: tonnage(t),
    zones: zonesDe(t),
  };
}

function texteRecord(e: { type: string; accroche: string; surtitre: string; hero: { value: string; unit?: string } }): string {
  const v = `${e.hero.value}${e.hero.unit ? ` ${e.hero.unit}` : ''}`;
  return e.type === 'record_charge' ? `${e.accroche}, ${v}` : `${e.surtitre.toLowerCase()}, ${v}`;
}

/** Le bilan de la seance `id` ; recues : nombre de seances arrivees d'un coup (montre) */
export async function chargerBilanSeance(id: number, opts: { recues?: number } = {}): Promise<BilanSeance | null> {
  const t = await getTrainingById(id);
  if (!t) return null;
  let tous: Training[] = [];
  try {
    tous = dedupeTrainings((await getTrainings()) ?? []);
  } catch (e) {
    logger.warn('[bilan] seances', e);
  }
  if (!tous.some((x) => x.id === id)) tous = [...tous, t];
  const tries = trier(tous);
  const idx = tries.findIndex((x) => x.id === id);
  const avant = tries.slice(0, idx);
  const jusqua = tries.slice(0, idx + 1);
  const jour = jourDe(t);
  const lundi = lundiIso(jour);
  const sport = premierSport(t);
  let w = 0;
  try {
    w = objectifVise(await getEspace());
  } catch {
    w = 0;
  }
  const compteurs = {
    jour: jusqua.filter((x) => jourDe(x) === jour).length,
    semaine: jusqua.filter((x) => lundiIso(jourDe(x)) === lundi).length,
    mois: jusqua.filter((x) => jourDe(x).slice(0, 7) === jour.slice(0, 7)).length,
    annee: jusqua.filter((x) => jourDe(x).slice(0, 4) === jour.slice(0, 4)).length,
    total: jusqua.length,
  };
  const prec = [...avant].reverse().find((x) => premierSport(x) === sport) ?? null;
  const oa = w > 0 ? objectifAnnee(tries, w, jour, cleTri(t)) : null;
  // 4 dernieres semaines (celle-ci comprise) : au moins une seance ?
  const lundis = [0, 7, 14, 21].map((n) => lundiIso(moinsJours(lundi, n)));
  const premier = tries.length ? jourDe(tries[0]) : jour;
  const sur = lundis.filter((l) => moinsJours(l, -6) >= premier).length;
  const actives = lundis.filter((l, i) => i < sur && jusqua.some((x) => lundiIso(jourDe(x)) === l)).length;
  const derniere = avant.length ? avant[avant.length - 1] : null;
  return bilanSeance({
    seance: seanceJ(t),
    precedente: prec ? seanceJ(prec) : null,
    compteurs,
    objectifSemaine: w,
    annee: oa ? { fait: oa.fait, total: oa.total, ecart: oa.ecart } : null,
    records: recordsDe(t, avant).map(texteRecord),
    techniques: techniquesDe(t),
    regularite: { semainesActives: actives, sur, serie: w > 0 && compteurs.semaine >= w ? serieSemaines(tries, lundi, w, cleTri(t)) : 0, joursDepuis: derniere ? joursEntre(jourDe(derniere), jour) : null },
    recues: opts.recues,
  });
}

// ============================================
// CARTE « BILAN » POUR L'ATELIER
// ============================================

/**
 * La carte « Bilan » pour l'atelier et la feuille : ref « corps:AAAA-MM-JJ » ou « seance:ID ».
 * C'est une carte d'exploit : meme rendu, meme masquage du poids, meme enregistrement.
 */
export async function carteBilan(ref: string): Promise<CarteData | null> {
  const [type, val] = ref.split(':');
  try {
    if (type === 'seance') {
      const b = await chargerBilanSeance(Number(val));
      if (!b?.carte) return null;
      return { moment: 'exploit', titre: b.carte.surtitre, sousTitre: b.sousTitre, exploit: b.carte, source: { type: 'bilan', ref }, cle: `exploit:bilan_seance:${val}` };
    }
    if (type === 'corps' && val) {
      const b = await chargerBilanCorps(val, 'detail');
      if (!b.carte) return null;
      return { moment: 'exploit', titre: b.carte.surtitre, sousTitre: dateLongue(val).replace(/^./, (x) => x.toUpperCase()), exploit: b.carte, source: { type: 'bilan', ref }, cle: `exploit:bilan_corps:${val}` };
    }
  } catch (e) {
    logger.warn('[bilan] carte', e);
  }
  return null;
}

/** Lien vers l'atelier de la carte « Bilan » */
export function lienCarteBilan(ref: string): string {
  const [type, val] = ref.split(':');
  return `/carte?moment=exploit&src=bilan&ref=${encodeURIComponent(ref)}&cle=${encodeURIComponent(`exploit:bilan_${type}:${val}`)}`;
}
