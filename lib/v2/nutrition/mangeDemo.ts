/**
 * « Mangé aujourd'hui » : données de démonstration pour la copie web (?demo=1). Chiffres fictifs.
 * Jamais utilisées dans l'app : seul lireRepas.web.ts les appelle. Un doublon MyFitnessPal est glissé
 * exprès (le petit déjeuner du jour écrit deux fois) pour vérifier qu'il n'est compté qu'une fois.
 */
import { cleJour, moinsJour } from './mange';
import type { EntreeRepas } from './mange';

export function estDemoWeb(): boolean {
  try {
    return typeof window !== 'undefined' && String((window as any).location?.search || '').includes('demo=1');
  } catch {
    return false;
  }
}

export function demoRepas(maintenant = new Date()): EntreeRepas[] {
  const auj = cleJour(maintenant);
  // calories et protéines par jour, du plus ancien (6 jours avant) à aujourd'hui ; null : jour non noté
  const jours: ([number, number, number, number] | null)[] = [
    [2380, 152, 250, 78],
    [2210, 138, 231, 74],
    null,
    [2460, 161, 262, 81],
    [2050, 129, 210, 69],
    [2290, 147, 240, 76],
    [2150, 140, 222, 72],
  ];
  const out: EntreeRepas[] = [];
  const src = { source: 'MyFitnessPal', sourceId: 'com.myfitnesspal.mfp' };
  jours.forEach((j, i) => {
    if (!j) return;
    const date = moinsJour(auj, 6 - i);
    // trois repas : 25 %, 40 %, 35 %
    const parts: [string, number][] = [['08:00', 0.25], ['12:30', 0.4], ['19:30', 0.35]];
    let reste = [...j];
    parts.forEach(([h, p], k) => {
      const debut = new Date(`${date}T${h}:00`).toISOString();
      const id = `demo-${date}-${k}`;
      const dernier = k === parts.length - 1;
      // le dernier repas prend le reste : le total du jour tombe juste
      const part = j.map((v, n) => (dernier ? Math.round(reste[n] * 10) / 10 : n === 0 ? Math.round(v * p) : Math.round(v * p * 10) / 10));
      reste = reste.map((v, n) => v - part[n]);
      (['kcal', 'proteines', 'glucides', 'lipides'] as const).forEach((type, n) => {
        out.push({ type, valeur: part[n], debut, source: src.source, sourceId: src.sourceId, id: `${id}-${n === 0 ? 'k' : n}` });
      });
    });
  });
  // le doublon connu : le petit déjeuner du jour réécrit à l'identique, sans identifiant
  const pdj = out.find((e) => e.id === `demo-${auj}-0-k`);
  if (pdj) out.push({ ...pdj, id: null });
  return out;
}
