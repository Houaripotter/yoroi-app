/**
 * Bilan : donnees de demonstration pour la copie web (?demo=1). Chiffres fictifs, memes formes que les vrais.
 * Jamais utilisees dans l'app : la page de bilan lit tes vraies donnees (./charger.ts).
 */
import type { CarteData } from '@/lib/v2/cartes/types';
import { bilanCorps, bilanSeance, moinsJours } from './texte';
import type { BilanCorps, BilanSeance, PeseeJ } from './texte';
import { resumerRepas } from '@/lib/v2/nutrition/mange';
import { demoRepas } from '@/lib/v2/nutrition/mangeDemo';
import { traduire } from '@/lib/i18n/tr';

const JOUR = '2026-10-16';

function serieDemo(): PeseeJ[] {
  const out: PeseeJ[] = [];
  let trend = 0;
  const bruit = [0.3, -0.2, 0.4, -0.1, 0.2, -0.4, 0.1, 0.3, -0.3, 0, 0.2, -0.2, 0.4, -0.1, 0.1, -0.3, 0.2, 0.3, -0.2, 0.1, -0.1, 0.2, -0.3, 0.1, 0.2, -0.2, 0, 0.3];
  for (let i = 0; i < 46; i++) {
    if (i % 3 === 1 && i < 40) continue;
    const date = moinsJours(JOUR, 45 - i);
    const value = Math.round((84.9 - i * 0.075 + bruit[i % bruit.length]) * 10) / 10;
    trend = out.length ? trend + 0.2 * (value - trend) : value;
    out.push({ date, value, trend: Math.round(trend * 100) / 100 });
  }
  return out;
}

export function demoBilanCorps(origine: 'pesee' | 'mensurations' | 'composition' = 'pesee', variante?: string): BilanCorps {
  const pesees = serieDemo();
  const last = pesees[pesees.length - 1];
  const avant = pesees[pesees.length - 2];
  if (variante === 'bruit') last.value = Math.round((avant.value - 0.3) * 10) / 10;
  return bilanCorps({
    date: JOUR,
    pesees,
    compo: [
      { date: '2026-10-02', weight: 82.6, fat: 21.4, muscleKg: 61.6, water: 54.2, bone: 3.2, visceral: 9 },
      { date: JOUR, weight: last.value, fat: 20.6, muscleKg: 61.8, water: 54.8, bone: 3.2, visceral: 8 },
    ],
    mesures: [
      { date: '2026-10-01', valeurs: { waist: 88.5, navel: 91, hips: 101, chest: 104, arm: 36.5 } },
      { date: JOUR, valeurs: { waist: 87, navel: 90, hips: 100.5, chest: 104.5, arm: 37 } },
    ],
    objectif: { depart: { date: '2026-09-01', poids: 84.9 }, cap: 78, mode: 'perte' },
    ligne: { ton: 'vert', texte: traduire('Sur ton rythme prévu, à 0,2 kg près') },
    prevision: traduire('À ton rythme actuel, tu passes sous 78 kg vers le 9 janv.'),
    bruit: 0.25,
    origine,
    repas: (() => {
      const r = resumerRepas(demoRepas(new Date(`${JOUR}T20:00:00`)), JOUR, 'Apple Santé');
      return r?.moyenne ? { ...r.moyenne, app: r.app } : null;
    })(),
  });
}

export function demoBilanSeance(): BilanSeance {
  return bilanSeance({
    seance: { id: 1, date: JOUR, sport: 'jjb', nomSport: 'Jiu jitsu brésilien', dureeMin: 95, intensite: 8, fcMoy: 142, fcMax: 178, calories: 820, rounds: 8, zones: [300, 900, 1500, 1800, 600] },
    precedente: { id: 0, date: '2026-10-13', sport: 'jjb', nomSport: 'Jiu jitsu brésilien', dureeMin: 80, intensite: 7, fcMoy: 138, rounds: 6 },
    compteurs: { jour: 1, semaine: 3, mois: 12, annee: 178, total: 412 },
    objectifSemaine: 4,
    annee: { fait: 178, total: 208, ecart: 15 },
    records: [traduire('record de rounds, 8 rounds')],
    techniques: { liste: [traduire('Juji gatame'), 'Triangle', 'Omoplata'], appris: true },
    regularite: { semainesActives: 4, sur: 4, serie: 0, joursDepuis: 3 },
  });
}

export function demoCarteBilan(type: 'corps' | 'seance'): CarteData {
  const e = type === 'corps' ? demoBilanCorps().carte! : demoBilanSeance().carte!;
  return { moment: 'exploit', titre: e.surtitre, sousTitre: traduire('Vendredi 16 octobre'), exploit: e, sport: type === 'seance' ? 'jjb' : null, source: { type: 'bilan', ref: `${type}:demo` }, cle: `exploit:demo:bilan_${type}` };
}
