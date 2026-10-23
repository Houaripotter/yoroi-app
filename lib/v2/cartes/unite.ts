/**
 * Cartes a partager : l'unite de poids du reglage (18 octobre 2026, sortie 3.0.0).
 * Les cartes sont calculees en kilos (comme le stockage) ; au moment du dessin, ces fonctions
 * passent chaque charge soulevee en livres si le reglage est sur « Livres ». En kilos rien ne change.
 * Le poids du corps reste en kilos partout (la pesee se saisit en kilos).
 * Logique pure, testee dans __tests__/unit/unitePoids.test.ts.
 */
import type { CarteData, Exploit, Grand, StatValue } from './types';
import { texteEnUnitePoids, valeurKgEnUnite, versUnitePoids, type UnitePoids } from '@/lib/v2/unitePoids';
import { nombre } from './chiffres';

function grandEnUnite<G extends { value: string; unit?: string }>(g: G, u: UnitePoids): G {
  if (u === 'kg' || g.unit !== 'kg') return g;
  return { ...g, value: valeurKgEnUnite(g.value, u), unit: 'lb' };
}

/**
 * Les chiffres d'une carte : seule la charge soulevee change (« 12,5 t » ou « 850 kg » deviennent des livres).
 * Le poids du corps reste en kilos : la pesee se saisit en kilos, on ne melange pas les unites.
 */
export function statsEnUnite(stats: StatValue[], u: UnitePoids): StatValue[] {
  if (u === 'kg') return stats;
  return stats.map((s) => {
    if (s.key !== 'charge') return s;
    const n = Number(s.value.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.'));
    const kg = s.unit === 't' ? n * 1000 : s.unit === 'kg' ? n : NaN;
    if (!Number.isFinite(kg)) return s;
    return { ...s, value: nombre(Math.round(versUnitePoids(kg, 'lb')), 0), unit: 'lb', label: 'soulevées' };
  });
}

/** Un exploit tel qu'il s'affiche : record de charge et cumul soulevé en livres ; les exploits de poids du corps restent en kilos */
export function exploitEnUnite(e: Exploit, u: UnitePoids): Exploit {
  if (u === 'kg') return e;
  if (e.type === 'record_charge') {
    return {
      ...e,
      detail: e.detail === undefined ? e.detail : texteEnUnitePoids(e.detail, u),
      hero: grandEnUnite<Grand>(e.hero, u),
      avant: e.avant ? grandEnUnite<Grand>(e.avant, u) : e.avant,
    };
  }
  if (e.type === 'cumul_tonnage' && e.hero.unit === 'tonnes') {
    const t = Number(e.hero.value.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.'));
    if (!Number.isFinite(t)) return e;
    return { ...e, hero: { value: nombre(Math.round(versUnitePoids(t * 1000, 'lb')), 0), unit: 'lb' } };
  }
  return e;
}

/** Les textes de charge d'une carte (records de la seance) ; le titre (pesee) reste en kilos */
export function donneesEnUnite(d: CarteData, u: UnitePoids): CarteData {
  if (u === 'kg' || !d.seance?.records?.length) return d;
  return { ...d, seance: { ...d.seance, records: d.seance.records.map((r) => ({ ...r, texte: texteEnUnitePoids(r.texte, u) })) } };
}

/** Une charge en kilos pour le grand chiffre d'une carte : { value: '220,5', unit: 'lb' } */
export function chargeGrand(kg: number, u: UnitePoids, decimales = 1): Grand {
  return { value: nombre(versUnitePoids(kg, u), decimales), unit: u === 'lb' ? 'lb' : 'kg' };
}
