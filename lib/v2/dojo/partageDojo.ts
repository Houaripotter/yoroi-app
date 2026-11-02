/**
 * Le Dojo partage entre tes appareils (2 novembre 2026).
 *
 * Avant : chaque appareil tenait son propre journal d'XP. Les seances, pesees et records arrivaient bien par la
 * synchro, mais un iPad installe apres l'iPhone partait de son propre premier jour : tout ce qui etait date
 * d'avant ne comptait pas. Et les coffres ouverts, la reprise d'un ancien rang, les sceaux deja fetes restaient
 * sur l'appareil qui les avait.
 *
 * Maintenant ce fichier fabrique une copie du journal que la synchro envoie (cle CLE_DOJO_PARTAGE, une ligne par
 * element), et fusionne ce qui arrive des autres appareils :
 *  - rien n'est jamais retire (l'XP ne baisse jamais) ;
 *  - une ligne a cle fixe (pesee du jour, semaine, sceau, coffre du jour...) n'est ajoutee qu'une fois ;
 *  - les seances et les records ont une cle qui depend du numero de la seance sur chaque appareil : ils voyagent
 *    comme « la n-ieme seance de tel jour ». Un jour deja credite ici n'est jamais credite deux fois ;
 *  - une reprise d'ancien rang n'est ajoutee que si cet appareil n'en a aucune ;
 *  - premier jour du Dojo : le plus ancien ; rang deja fete : le plus haut (aucune fete en double).
 *
 * Fonctions pures, sans stockage : testees dans __tests__/unit/partageDojo.test.ts. Le branchement est dans
 * lib/v2/armure.ts (ecrirePartageDojo, appliquerPartageDojo) et lib/v2/synchro/cles.ts.
 */

export const CLE_DOJO_PARTAGE = 'yoroi_dojo_partage_v1';
export const ID_META = 'meta';

/** Une ligne du journal d'XP (meme forme que dans lib/v2/armure.ts) */
export type LigneXp = { k: string; d: string; s: string; a: number; t: string; l: string };

/** Ce que les appareils se partagent des reglages du Dojo */
export type MetaDojo = {
  departDay?: string | null;
  ancien?: boolean;
  migratedAt?: string | null;
  serieRecord?: number;
  rankSeen?: number;
  danSeen?: number;
  seals?: Record<string, string>;
  pauses?: Record<string, string>;
};

/** Element de la cle partagee : une ligne du journal, ou les reglages (k = 'meta') */
export type ElementPartage = (LigneXp & { m?: undefined }) | { k: typeof ID_META; m: MetaDojo };

/** Sources dont la cle depend du numero local de la seance */
const PAR_JOUR = new Set(['seance', 'record']);

const estLigne = (x: unknown): x is LigneXp => {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return typeof r.k === 'string' && r.k !== ID_META && typeof r.d === 'string' && typeof r.s === 'string' && typeof r.a === 'number' && r.a > 0;
};

const parJour = (lignes: LigneXp[]): Map<string, LigneXp[]> => {
  const m = new Map<string, LigneXp[]>();
  for (const r of lignes) {
    const c = `${r.s}|${r.d}`;
    const l = m.get(c) ?? [];
    l.push(r);
    m.set(c, l);
  }
  for (const l of m.values()) l.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  return m;
};

/** La copie a envoyer : les lignes (seances et records par jour), puis les reglages */
export function construirePartage(journal: LigneXp[], meta: MetaDojo): ElementPartage[] {
  const out: ElementPartage[] = [];
  const fixes = journal.filter((r) => estLigne(r) && !PAR_JOUR.has(r.s));
  for (const r of fixes) out.push({ k: r.k, d: r.d, s: r.s, a: r.a, t: r.t, l: r.l });
  const groupes = parJour(journal.filter((r) => estLigne(r) && PAR_JOUR.has(r.s)));
  for (const [c, l] of groupes) {
    l.forEach((r, i) => out.push({ k: `${c}|${i}`, d: r.d, s: r.s, a: r.a, t: r.t, l: r.l }));
  }
  out.push({
    k: ID_META,
    m: {
      departDay: meta.departDay ?? null,
      ancien: !!meta.ancien,
      migratedAt: meta.migratedAt ?? null,
      serieRecord: meta.serieRecord ?? 0,
      rankSeen: meta.rankSeen ?? 0,
      danSeen: meta.danSeen ?? 0,
      seals: meta.seals ?? {},
      pauses: meta.pauses ?? {},
    },
  });
  return out;
}

/**
 * Ce qui est ecrit dans la cle partagee : la copie de cet appareil, PLUS ce qui y est deja arrive des autres.
 * Rien ne disparait de la cle : la synchro ne laisse aucune pierre tombale qui ferait des allers retours.
 */
export function unirPartage(existant: unknown, mienne: ElementPartage[]): ElementPartage[] {
  const parId = new Map<string, ElementPartage>();
  if (Array.isArray(existant)) {
    for (const e of existant) {
      if (e && typeof e === 'object' && typeof (e as { k?: unknown }).k === 'string') parId.set((e as ElementPartage).k, e as ElementPartage);
    }
  }
  for (const e of mienne) parId.set(e.k, e);
  return [...parId.values()];
}

const minJour = (a?: string | null, b?: string | null): string | null => (a && b ? (a < b ? a : b) : a || b || null);

/**
 * Fusionne ce qui est arrive des autres appareils dans le journal et les reglages d'ici.
 * Renvoie les lignes a ajouter et les reglages fusionnes. Ne retire jamais rien.
 */
export function fusionnerPartage<M extends MetaDojo>(journal: LigneXp[], meta: M, recu: unknown): { ajout: LigneXp[]; meta: M; change: boolean } {
  const ajout: LigneXp[] = [];
  if (!Array.isArray(recu)) return { ajout, meta, change: false };
  const cles = new Set(journal.map((r) => r.k));
  const aUneReprise = journal.some((r) => r.s === 'migration');
  const compteIci = new Map<string, number>();
  for (const r of journal) if (PAR_JOUR.has(r.s)) compteIci.set(`${r.s}|${r.d}`, (compteIci.get(`${r.s}|${r.d}`) ?? 0) + 1);
  const etiquettesRecords = new Set(journal.filter((r) => r.s === 'record').map((r) => `${r.d}|${(r.l.split(',')[0] ?? '').trim().toLowerCase()}`));

  let metaRecu: MetaDojo | null = null;
  const parJourRecu: LigneXp[] = [];
  for (const e of recu) {
    if (e && typeof e === 'object' && (e as { k?: unknown }).k === ID_META) {
      const m = (e as { m?: unknown }).m;
      if (m && typeof m === 'object') metaRecu = m as MetaDojo;
      continue;
    }
    if (!estLigne(e)) continue;
    if (PAR_JOUR.has(e.s)) {
      parJourRecu.push(e);
      continue;
    }
    if (cles.has(e.k)) continue;
    // une reprise d'ancien rang : seulement si cet appareil n'en a aucune (sinon le rang serait compte deux fois)
    if (e.s === 'migration' && aUneReprise) continue;
    cles.add(e.k);
    ajout.push({ k: e.k, d: e.d, s: e.s, a: e.a, t: e.t, l: e.l });
  }
  // seances et records : seulement ce qui manque pour chaque jour
  const groupes = parJour(parJourRecu);
  for (const [c, l] of groupes) {
    const deja = compteIci.get(c) ?? 0;
    for (let i = deja; i < l.length; i += 1) {
      const r = l[i];
      if (r.s === 'record') {
        const sig = `${r.d}|${(r.l.split(',')[0] ?? '').trim().toLowerCase()}`;
        if (etiquettesRecords.has(sig)) continue;
        etiquettesRecords.add(sig);
      }
      let k = `${r.s}:p:${r.d}:${i}`;
      let n = i;
      while (cles.has(k) && n < i + 50) {
        n += 1;
        k = `${r.s}:p:${r.d}:${n}`;
      }
      cles.add(k);
      ajout.push({ k, d: r.d, s: r.s, a: r.a, t: r.t, l: r.l });
    }
  }

  let change = ajout.length > 0;
  const m: M = { ...meta };
  if (metaRecu) {
    const dep = minJour(m.departDay, metaRecu.departDay);
    if (dep !== (m.departDay ?? null)) { m.departDay = dep; change = true; }
    if (metaRecu.ancien && !m.ancien) { m.ancien = true; change = true; }
    // un appareil qui n'a jamais calcule son Dojo garde son premier calcul complet
    if (m.migratedAt && metaRecu.migratedAt && metaRecu.migratedAt < m.migratedAt) { m.migratedAt = metaRecu.migratedAt; change = true; }
    const serie = Math.max(m.serieRecord ?? 0, Number(metaRecu.serieRecord) || 0);
    if (serie !== (m.serieRecord ?? 0)) { m.serieRecord = serie; change = true; }
    const rang = Math.max(m.rankSeen ?? 0, Number(metaRecu.rankSeen) || 0);
    if (rang !== (m.rankSeen ?? 0)) { m.rankSeen = rang; change = true; }
    const dan = Math.max(m.danSeen ?? 0, Number(metaRecu.danSeen) || 0);
    if (dan !== (m.danSeen ?? 0)) { m.danSeen = dan; change = true; }
    if (metaRecu.seals && typeof metaRecu.seals === 'object') {
      const seals = { ...(m.seals ?? {}) };
      for (const [id, date] of Object.entries(metaRecu.seals)) {
        if (typeof date !== 'string') continue;
        if (!seals[id] || date < seals[id]) { seals[id] = date; change = true; }
      }
      m.seals = seals;
    }
    if (metaRecu.pauses && typeof metaRecu.pauses === 'object') {
      const pauses = { ...(m.pauses ?? {}) };
      for (const [lundi, type] of Object.entries(metaRecu.pauses)) {
        if (typeof type === 'string' && !pauses[lundi]) { pauses[lundi] = type; change = true; }
      }
      m.pauses = pauses;
    }
  }
  return { ajout, meta: m, change };
}
