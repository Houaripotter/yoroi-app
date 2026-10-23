/**
 * BALANCE 3 (14 octobre 2026) : un avertissement doux quand un bloc de l'IA ne ressemble pas a tes pesees.
 * Cas de Houari : l'IA lit 64,5 kg avec un IMC de 29,8 alors qu'il pese 89 kg : une photo mal lue.
 * Rien n'est bloque, l'app dit seulement quoi verifier.
 * Fichier pur (aucun import React Native ni base) : teste par jest (__tests__/unit/balanceDateCoherence.test.ts).
 */

/** Ecart au-dela duquel un poids semble loin des dernieres pesees */
export const ECART_MAX = 0.08;
/** Les pesees de reference : 21 jours autour de la date du bloc */
export const WINDOW_DAYS = 21;

export type WeightPoint = { date: string; weight: number; bmi?: number };

export type CoherenceWarning = {
  kind: 'ecart' | 'imc' | 'masse' | 'graisse';
  text: string;
  /** le poids de reference ou le poids que donnerait l'IMC */
  ref?: number;
};

const fr = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
const dayNum = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
};
const okNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** La pesee la plus proche de la date (dans la fenetre), la plus recente si deux sont a egale distance */
export function referenceWeight(history: WeightPoint[], date: string, windowDays: number = WINDOW_DAYS): WeightPoint | undefined {
  const t = dayNum(date);
  let best: { p: WeightPoint; gap: number } | undefined;
  for (const p of history) {
    if (!okNum(p.weight) || !p.date) continue;
    const gap = Math.abs(dayNum(p.date) - t);
    if (gap > windowDays) continue;
    if (!best || gap < best.gap || (gap === best.gap && p.date > best.p.date)) best = { p, gap };
  }
  return best?.p;
}

/** La taille en metres : le profil, sinon celle que donnent poids et IMC d'une pesee deja notee */
export function heightMeters(heightCm: number | undefined, history: WeightPoint[]): number | undefined {
  if (okNum(heightCm) && heightCm >= 100 && heightCm <= 250) return heightCm / 100;
  const withBmi = [...history].filter((p) => okNum(p.weight) && okNum(p.bmi)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!withBmi) return undefined;
  const h = Math.sqrt(withBmi.weight / (withBmi.bmi as number));
  return h >= 1.2 && h <= 2.3 ? h : undefined;
}

/**
 * Les avertissements d'un bloc. history : tes pesees deja notees ; others : les poids des autres blocs colles
 * (servent seulement si aucune pesee notee n'est assez proche). date : le jour du bloc, sinon aujourd'hui.
 */
export function checkCoherence(input: {
  date: string;
  values: Record<string, number | undefined>;
  history: WeightPoint[];
  others?: WeightPoint[];
  heightCm?: number;
}): CoherenceWarning[] {
  const out: CoherenceWarning[] = [];
  const w = input.values.poids_kg;
  if (!okNum(w)) return out;
  // 1. loin des dernieres pesees
  const fromHistory = referenceWeight(input.history, input.date);
  const ref = fromHistory ?? referenceWeight(input.others ?? [], input.date);
  if (ref && Math.abs(w - ref.weight) / ref.weight > ECART_MAX) {
    out.push({
      kind: 'ecart',
      ref: ref.weight,
      text: fromHistory
        ? `Ce poids semble loin de tes dernières pesées (${fr(ref.weight)} kg) : vérifie la photo.`
        : `Ce poids semble loin de l’autre pesée collée (${fr(ref.weight)} kg) : vérifie la photo.`,
    });
  }
  // 2. IMC et poids incompatibles pour ta taille
  const imc = input.values.imc;
  if (okNum(imc)) {
    const h = heightMeters(input.heightCm, input.history);
    if (h) {
      const expected = w / (h * h);
      if (Math.abs(imc - expected) > Math.max(1.5, expected * 0.06)) {
        const implied = imc * h * h;
        out.push({
          kind: 'imc',
          ref: Math.round(implied * 10) / 10,
          text: `L’IMC lu (${fr(imc)}) ne va pas avec ${fr(w)} kg pour ta taille (${fr(h, 2)} m) : il correspond plutôt à ${fr(implied)} kg. Vérifie la photo.`,
        });
      }
    } else {
      const implied = Math.sqrt(w / imc);
      if (implied < 1.4 || implied > 2.15) out.push({ kind: 'imc', text: `L’IMC lu (${fr(imc)}) et le poids (${fr(w)} kg) ne vont pas ensemble : vérifie la photo.` });
    }
  }
  // 3. muscle et os plus lourds que le poids
  const mus = input.values.muscle_kg;
  const os = input.values.os_kg;
  if ((okNum(mus) || okNum(os)) && (mus ?? 0) + (os ?? 0) >= w) {
    out.push({ kind: 'masse', text: `Muscle et os (${fr((mus ?? 0) + (os ?? 0))} kg) pèsent plus que le poids lu (${fr(w)} kg) : une valeur est mal lue.` });
  }
  // 4. graisse en kg et en % qui ne vont pas ensemble
  const fkg = input.values.graisse_kg;
  const fpct = input.values.graisse_pct;
  if (okNum(fkg) && okNum(fpct)) {
    const expected = (fpct / 100) * w;
    if (Math.abs(fkg - expected) > Math.max(2, expected * 0.15)) {
      out.push({ kind: 'graisse', text: `La graisse en kg (${fr(fkg)}) ne va pas avec ${fr(fpct)} % de ${fr(w)} kg : vérifie la photo.` });
    }
  }
  return out;
}
