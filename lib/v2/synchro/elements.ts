/**
 * Etat de la synchro par element sur ce telephone (28 octobre 2026) : ce qui a change ici, ce qui part,
 * ce qui arrive. La fusion elle meme est dans ./fusion.ts (pure), la liste des cles dans ./cles.ts.
 *
 * Chaque cle a son etat a part (<CLE_META_PREFIXE><cle>) : empreinte, heure de modification et origine de
 * chaque element, pierres tombales des suppressions. Cet etat est propre au telephone : il ne part ni dans la
 * sauvegarde ni vers l'autre telephone.
 *
 * Les lectures puis ecritures d'une cle passent par avecVerrou (lib/v2/sauvegarde/lectureSure.ts), comme les
 * ecrans qui l'ecrivent : une saisie pendant la synchro n'est jamais ecrasee.
 * Une valeur illisible ici n'est jamais remplacee : la cle est sautee et signalee.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { avecVerrou } from '@/lib/v2/sauvegarde/lectureSure';
import logger from '@/lib/security/logger';
import { CLES_ELEMENTS, SPEC_PAR_CLE, type SpecCle, type TypeSynchro } from './cles';
import {
  aEnvoyer, decouper, empreinte, etatValide, fusionner, fusionnerAncienFormat, heureAncienFormat, recomposer, scanner,
  type EtatEnvoi, type MetaCle, type ResultatFusion,
} from './fusion';

export const CLE_META_PREFIXE = '@yoroi_peer_elements_v1:';
export const CLE_HORLOGE = '@yoroi_peer_horloge_v1';

// ─── Horloge ─────────────────────────────────────────────────────────────
// Heure qui ne recule jamais et passe toujours apres la plus haute heure recue : si l'horloge de l'autre
// telephone avance, une modification faite ici APRES avoir recu la sienne gagne quand meme.
let derniere = 0;
let horlogeLue = false;

async function lireHorloge(): Promise<void> {
  if (horlogeLue) return;
  try {
    derniere = Math.max(derniere, Number(await AsyncStorage.getItem(CLE_HORLOGE)) || 0);
  } catch { /* horloge du telephone seule */ }
  horlogeLue = true;
}

export async function heure(): Promise<number> {
  await lireHorloge();
  derniere = Math.max(Date.now(), derniere + 1);
  return derniere;
}

async function observer(u: number): Promise<void> {
  await lireHorloge();
  if (!(u > derniere)) return;
  derniere = u;
  try { await AsyncStorage.setItem(CLE_HORLOGE, String(u)); } catch { /* relue au prochain lancement */ }
}

// ─── Etat par cle ────────────────────────────────────────────────────────

async function lireMeta(cle: string): Promise<MetaCle | undefined> {
  const brut = await AsyncStorage.getItem(CLE_META_PREFIXE + cle);
  if (!brut) return undefined;
  try {
    const m = JSON.parse(brut);
    if (m && typeof m === 'object' && m.el && m.t) return m as MetaCle;
  } catch { /* etat abime : refait comme au premier passage */ }
  return undefined;
}

const ecrireMeta = (cle: string, meta: MetaCle) => AsyncStorage.setItem(CLE_META_PREFIXE + cle, JSON.stringify(meta));

async function ecrireValeur(cle: string, v: string | null): Promise<void> {
  if (v === null) await AsyncStorage.removeItem(cle);
  else await AsyncStorage.setItem(cle, v);
}

/** Detecte les changements faits ici sur une cle (appele sous verrou) */
async function scannerCle(spec: SpecCle) {
  const brut = await AsyncStorage.getItem(spec.cle);
  const avant = await lireMeta(spec.cle);
  const r = scanner(spec, brut, avant, await heure(), spec.cle, Date.now());
  if (r.change) await ecrireMeta(spec.cle, r.meta);
  return { brut, ...r };
}

// ─── Envoi ───────────────────────────────────────────────────────────────

export interface Collecte { etats: EtatEnvoi[]; compte: Partial<Record<TypeSynchro, number>>; erreurs: string[] }

/** Ce qui part vers `pair` : les elements modifies ici depuis `depuis` (heure de ce telephone) */
export async function collecter(depuis: number, pair: string): Promise<Collecte> {
  const out: Collecte = { etats: [], compte: {}, erreurs: [] };
  for (const spec of CLES_ELEMENTS) {
    if (spec.jamaisEnvoyee) continue;
    try {
      await avecVerrou(spec.cle, async () => {
        const r = await scannerCle(spec);
        const e = aEnvoyer(spec.cle, spec, r.meta, r.elements, depuis, pair);
        if (!e) return;
        out.etats.push(e);
        out.compte[spec.type] = (out.compte[spec.type] ?? 0) + e.items.length + e.tombs.length;
      });
    } catch (err) {
      out.erreurs.push(spec.cle);
      logger.warn(`[Synchro] ${spec.cle} non envoyee :`, err);
    }
  }
  return out;
}

// ─── Reception ───────────────────────────────────────────────────────────

export interface Application {
  compte: Partial<Record<TypeSynchro, number>>;
  /** elements non appliques (parent inconnu, valeur illisible) : la synchro sera reprise */
  echecs: number;
  erreurs: string[];
  /** cles changees ici */
  cles: string[];
}

/** La valeur a ete modifiee ici pendant la fusion : rien n'est ecrit, la cle sera reprise */
export class ValeurChangeePendantLaSynchro extends Error {
  constructor(cle: string) {
    super(`${cle} modifiee pendant la synchro, reprise a la prochaine`);
    this.name = 'ValeurChangeePendantLaSynchro';
  }
}

/** Ecrit la valeur fusionnee, puis l'etat avec les empreintes de ce qui a vraiment ete ecrit (pas d'echo) */
async function ecrireFusion(spec: SpecCle, brut: string | null, r: ResultatFusion): Promise<string | null> {
  const nouveau = recomposer(spec, r.elements, brut);
  // 30 octobre 2026 : un ecran qui ecrit sans passer par avecVerrou a pu changer la valeur pendant la fusion.
  // On relit juste avant d'ecrire : si elle a bouge, rien n'est ecrit (sa saisie est gardee) et la cle est
  // reprise a la prochaine synchro.
  if ((await AsyncStorage.getItem(spec.cle)) !== brut) throw new ValeurChangeePendantLaSynchro(spec.cle);
  if (nouveau !== brut) await ecrireValeur(spec.cle, nouveau);
  const ecrits = decouper(spec, nouveau, spec.cle);
  const presents = new Set<string>();
  for (const e of ecrits) {
    presents.add(e.id);
    const m = r.meta.el[e.id];
    if (m) m.h = empreinte(e.d);
  }
  for (const id of Object.keys(r.meta.el)) if (!presents.has(id)) delete r.meta.el[id];
  await ecrireMeta(spec.cle, r.meta);
  return nouveau;
}

async function apresChangement(specs: SpecCle[]): Promise<void> {
  const evenements = new Set<string>();
  for (const s of specs) for (const e of s.evenements ?? []) evenements.add(e);
  for (const e of evenements) {
    try { DeviceEventEmitter.emit(e); } catch { /* sans ecran ouvert */ }
  }
  for (const s of specs) {
    if (!s.apres) continue;
    try { await s.apres(); } catch (err) { logger.warn(`[Synchro] apres ${s.cle} :`, err); }
  }
}

const cible = (spec: SpecCle): SpecCle => (spec.recuDans ? SPEC_PAR_CLE.get(spec.recuDans) ?? spec : spec);

/** Applique les etats recus d'un telephone a jour (format par element) */
export async function appliquer(etats: unknown, source: string): Promise<Application> {
  const out: Application = { compte: {}, echecs: 0, erreurs: [], cles: [] };
  if (!Array.isArray(etats)) return out;
  const changees: SpecCle[] = [];
  for (const etat of etats) {
    if (!etatValide(etat)) { out.echecs++; continue; }
    const recu = SPEC_PAR_CLE.get(etat.k);
    // cle inconnue ici (version plus recente la bas) : ignoree sans bloquer le reste
    if (!recu || recu.jamaisEnvoyee) continue;
    const spec = cible(recu);
    try {
      await avecVerrou(spec.cle, async () => {
        const local = await scannerCle(spec);
        const r = fusionner({ elements: local.elements, meta: local.meta }, etat, source, Date.now());
        await observer(r.plusHaute);
        out.echecs += r.orphelins;
        if (!r.change) {
          if (etat.tombs.length) await ecrireMeta(spec.cle, r.meta);
          return;
        }
        await ecrireFusion(spec, local.brut, r);
        out.compte[spec.type] = (out.compte[spec.type] ?? 0) + r.appliques;
        out.cles.push(spec.cle);
        changees.push(spec);
      });
    } catch (err) {
      out.echecs++;
      out.erreurs.push(spec.cle);
      logger.warn(`[Synchro] ${spec.cle} non appliquee :`, err);
    }
  }
  await apresChangement(changees);
  return out;
}

/**
 * Ancien format : une cle entiere envoyee par un telephone pas encore a jour. Fusionnee sans rien retirer.
 * Rend la nouvelle valeur si elle a change ici, sinon undefined.
 */
export async function appliquerAncienFormat(cle: string, valeur: string | null, heureCle: string, source: string): Promise<{ valeur: string | null; appliques: number } | undefined> {
  const recu = SPEC_PAR_CLE.get(cle);
  if (!recu || !recu.ancienne) return undefined;
  const spec = cible(recu);
  let res: { valeur: string | null; appliques: number } | undefined;
  await avecVerrou(spec.cle, async () => {
    const local = await scannerCle(spec);
    const u = heureAncienFormat(heureCle);
    const r = fusionnerAncienFormat(spec, { elements: local.elements, meta: local.meta }, valeur, u, source, Date.now(), cle);
    await observer(r.plusHaute);
    if (!r.change) return;
    res = { valeur: await ecrireFusion(spec, local.brut, r), appliques: r.appliques };
  });
  if (res) await apresChangement([spec]);
  return res;
}

/** Pour les tests : oublie l'horloge en memoire */
export const __test__ = { oublierHorloge: () => { derniere = 0; horlogeLue = false; } };
