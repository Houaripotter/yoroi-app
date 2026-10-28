/**
 * Tes pratiques (28 octobre 2026, demande de Houari) : tu peux pratiquer plusieurs sports en meme temps,
 * chacun avec SON club (JJB dans un club, judo dans un autre, musculation dans une salle...) et, si le sport
 * a des ceintures, ta ceinture et tes degres (ou tes dans) dans ce sport.
 *
 * Ou c'est range :
 * - les clubs restent dans la table SQLite clubs (nom, sport, logo) : les seances, Ton mois et le calendrier
 *   continuent de les lire comme avant ;
 * - la liste des pratiques est dans AsyncStorage, cle @yoroi_pratiques : { v: 1, pratiques, ignores }.
 *   Chaque pratique pointe vers son club (clubId) et garde une copie du nom (clubNom), pour se recaler
 *   apres une restauration sur un autre telephone (les ids SQLite y changent).
 *   ignores : les clubs que tu as retires de tes pratiques (le club n'est jamais supprime, ses seances restent).
 * - @yoroi_belt (ancienne ceinture unique) reste ecrite : c'est la ceinture de ta pratique principale,
 *   pour les ecrans qui la lisent encore (competitions, sauvegardes).
 *
 * Migration sure : tant que @yoroi_pratiques n'existe pas, la liste est calculee a partir de tes clubs
 * (un club, une pratique) et de ta ceinture de JJB (posee sur ta pratique de JJB, creee si besoin).
 * Rien n'est ecrit tant que tu ne modifies rien : la demo et les sauvegardes restent intactes.
 * Pratique principale : celle marquee principale, sinon la premiere.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { ceintureValide, gammeDe, gradePropre, type CeintureId } from './gammes';

export const CLE_PRATIQUES = '@yoroi_pratiques';
export const CLE_CEINTURE_ANCIENNE = '@yoroi_belt';
export const EVENT_PRATIQUES = 'YOROI_PRATIQUES_CHANGED';

export type Pratique = {
  id: string;
  sport: string;
  clubId?: number | null;
  clubNom?: string | null;
  ceinture?: CeintureId | null;
  /** degres (JJB) ou dan (ceinture noire de judo, karate, taekwondo) */
  degres?: number;
  principale?: boolean;
};

export type EtatPratiques = { v: 1; pratiques: Pratique[]; ignores: number[] };

/** Ce qu'il faut savoir d'un club pour la migration et le recalage */
export type ClubLeger = { id?: number; name: string; sport?: string | null; logo_uri?: string | null };

const sportPropre = (s: unknown) => String(s ?? '').split(',')[0].trim() || 'autre';
const nomPropre = (s: unknown) => String(s ?? '').trim();
const cleNom = (s: unknown) => nomPropre(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');

let compteur = 0;
export function nouvelId(): string {
  compteur += 1;
  return `p${Date.now().toString(36)}${compteur.toString(36)}`;
}

/** Une pratique lue (stockage, sauvegarde) remise au propre : sport, ceinture valable pour ce sport, grade borne */
export function pratiquePropre(x: unknown): Pratique | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const sport = sportPropre(o.sport);
  const g = gammeDe(sport);
  const c = ceintureValide(o.ceinture);
  const ceinture = g && c && g.ceintures.includes(c) ? c : null;
  const clubId = typeof o.clubId === 'number' && Number.isFinite(o.clubId) ? o.clubId : null;
  return {
    id: typeof o.id === 'string' && o.id ? o.id : nouvelId(),
    sport,
    clubId,
    clubNom: nomPropre(o.clubNom) || null,
    ceinture,
    degres: ceinture ? gradePropre(sport, ceinture, o.degres) : 0,
    principale: o.principale === true,
  };
}

/** Une seule pratique principale : celle marquee, sinon la premiere */
export function unePrincipale(list: Pratique[]): Pratique[] {
  if (!list.length) return list;
  const i = Math.max(0, list.findIndex((p) => p.principale));
  return list.map((p, k) => ({ ...p, principale: k === i }));
}

export function principale(list: Pratique[]): Pratique | null {
  return list.find((p) => p.principale) ?? list[0] ?? null;
}

/** La pratique dont on montre la ceinture en haut du profil : la principale si elle a une ceinture, sinon la premiere qui en a une */
export function pratiqueACeinture(list: Pratique[]): Pratique | null {
  const p = principale(list);
  if (p?.ceinture) return p;
  return list.find((x) => !!x.ceinture) ?? null;
}

/**
 * Migration depuis l'ancien modele : un club par sport possible, une seule ceinture (celle du JJB).
 * - chaque club devient une pratique (dans l'ordre de creation) ;
 * - la ceinture va sur la pratique de JJB ; sans elle, sur la premiere pratique dont la gamme a cette couleur ;
 *   sinon une pratique est creee (ton sport de combat favori s'il a cette couleur, sinon le JJB) ;
 * - principale : celle qui porte la ceinture, sinon le club que montrait l'ancien profil (le premier par nom).
 */
export function migrer(o: { clubs: ClubLeger[]; ceinture?: string | null; sportCombatFavori?: string | null }): Pratique[] {
  const clubs = [...(o.clubs ?? [])].filter((c) => c && nomPropre(c.name)).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const list: Pratique[] = clubs.map((c) => ({
    id: c.id != null ? `club${c.id}` : nouvelId(),
    sport: sportPropre(c.sport),
    clubId: c.id ?? null,
    clubNom: nomPropre(c.name),
    ceinture: null,
    degres: 0,
    principale: false,
  }));
  const belt = ceintureValide(o.ceinture);
  let porteuse = -1;
  if (belt) {
    porteuse = list.findIndex((p) => p.sport === 'jjb' && gammeDe('jjb')!.ceintures.includes(belt));
    if (porteuse < 0) porteuse = list.findIndex((p) => !!gammeDe(p.sport)?.ceintures.includes(belt));
    if (porteuse < 0) {
      const fav = sportPropre(o.sportCombatFavori);
      const sport = gammeDe(fav)?.ceintures.includes(belt) ? fav : gammeDe('jjb')!.ceintures.includes(belt) ? 'jjb' : null;
      if (sport) {
        list.push({ id: nouvelId(), sport, clubId: null, clubNom: null, ceinture: null, degres: 0, principale: false });
        porteuse = list.length - 1;
      }
    }
    if (porteuse >= 0) {
      const p = list[porteuse];
      list[porteuse] = { ...p, ceinture: belt, degres: gradePropre(p.sport, belt, undefined) };
    }
  }
  let i = porteuse;
  if (i < 0 && clubs.length) {
    // l'ancien profil montrait le premier club par ordre alphabetique (getClubs trie par nom)
    const premier = [...clubs].sort((a, b) => nomPropre(a.name).localeCompare(nomPropre(b.name)))[0];
    i = list.findIndex((p) => p.clubId === (premier.id ?? null));
  }
  return list.map((p, k) => ({ ...p, principale: k === Math.max(0, i) }));
}

/**
 * La liste a afficher : celle enregistree (recalee sur les clubs d'aujourd'hui) ou, sans liste enregistree,
 * celle de la migration. Les clubs ajoutes ailleurs (Calendrier et clubs) et pas encore dans la liste s'y ajoutent,
 * sauf ceux que tu as retires.
 */
export function reconcilier(o: { etat: EtatPratiques | null; clubs: ClubLeger[]; ceinture?: string | null; sportCombatFavori?: string | null }): EtatPratiques & { migre: boolean } {
  const clubs = (o.clubs ?? []).filter((c) => c && c.id != null && nomPropre(c.name));
  if (!o.etat) return { v: 1, pratiques: migrer(o), ignores: [], migre: true };
  const ignores = (o.etat.ignores ?? []).filter((n) => typeof n === 'number');
  const pris = new Set<number>();
  const pratiques = (o.etat.pratiques ?? [])
    .map(pratiquePropre)
    .filter((p): p is Pratique => !!p)
    .map((p) => {
      const parId = p.clubId != null ? clubs.find((c) => c.id === p.clubId) : undefined;
      // meme id et meme nom (ou pas de nom garde) : c'est bien ce club
      if (parId && (!p.clubNom || cleNom(parId.name) === cleNom(p.clubNom) || !clubs.some((c) => cleNom(c.name) === cleNom(p.clubNom)))) {
        pris.add(parId.id!);
        return { ...p, clubNom: nomPropre(parId.name) };
      }
      // ids changes (restauration sur un autre telephone) : on retrouve le club par son nom, de preference du meme sport
      if (p.clubNom) {
        const meme = clubs.filter((c) => cleNom(c.name) === cleNom(p.clubNom) && !pris.has(c.id!));
        const c = meme.find((x) => sportPropre(x.sport) === p.sport) ?? meme[0];
        if (c) {
          pris.add(c.id!);
          return { ...p, clubId: c.id!, clubNom: nomPropre(c.name) };
        }
      }
      // club supprime ailleurs : la pratique et le nom restent, sans lien
      return { ...p, clubId: null };
    });
  for (const c of clubs) {
    if (pris.has(c.id!) || ignores.includes(c.id!)) continue;
    if (pratiques.some((p) => p.clubId === c.id)) continue;
    pratiques.push({ id: `club${c.id}`, sport: sportPropre(c.sport), clubId: c.id!, clubNom: nomPropre(c.name), ceinture: null, degres: 0, principale: false });
  }
  return { v: 1, pratiques: unePrincipale(pratiques), ignores, migre: false };
}

// ============ operations sur la liste (pures) ============

export function choisirCeinture(list: Pratique[], id: string, ceinture: CeintureId): Pratique[] {
  return list.map((p) => {
    if (p.id !== id) return p;
    const g = gammeDe(p.sport);
    if (!g || !g.ceintures.includes(ceinture)) return p;
    // une nouvelle ceinture repart du premier grade (0 degre, 1er dan) ; la meme garde le sien
    const degres = p.ceinture === ceinture ? gradePropre(p.sport, ceinture, p.degres) : gradePropre(p.sport, ceinture, undefined);
    return { ...p, ceinture, degres };
  });
}

export function choisirGrade(list: Pratique[], id: string, n: number): Pratique[] {
  return list.map((p) => (p.id === id && p.ceinture ? { ...p, degres: gradePropre(p.sport, p.ceinture, n) } : p));
}

export function rendrePrincipale(list: Pratique[], id: string): Pratique[] {
  if (!list.some((p) => p.id === id)) return list;
  return list.map((p) => ({ ...p, principale: p.id === id }));
}

export function ajouterPratique(list: Pratique[], sport: string, club?: { id?: number | null; nom?: string | null }): { list: Pratique[]; id: string } {
  const id = nouvelId();
  const p: Pratique = { id, sport: sportPropre(sport), clubId: club?.id ?? null, clubNom: nomPropre(club?.nom) || null, ceinture: null, degres: 0, principale: list.length === 0 };
  return { list: unePrincipale([...list, p]), id };
}

/** Retire une pratique ; son club est garde (seances intactes) mais ne revient plus tout seul dans la liste */
export function retirerPratique(etat: EtatPratiques, id: string): EtatPratiques {
  const p = etat.pratiques.find((x) => x.id === id);
  if (!p) return etat;
  const reste = etat.pratiques.filter((x) => x.id !== id);
  const encore = p.clubId != null && reste.some((x) => x.clubId === p.clubId);
  const ignores = p.clubId != null && !encore && !etat.ignores.includes(p.clubId) ? [...etat.ignores, p.clubId] : etat.ignores;
  return { v: 1, pratiques: unePrincipale(reste.map((x) => ({ ...x, principale: x.principale && x.id !== id }))), ignores };
}

export function lierClub(etat: EtatPratiques, id: string, club: { id: number | null; nom: string | null }): EtatPratiques {
  return {
    v: 1,
    pratiques: etat.pratiques.map((p) => (p.id === id ? { ...p, clubId: club.id, clubNom: nomPropre(club.nom) || null } : p)),
    // un club relie a nouveau n'est plus mis de cote
    ignores: club.id != null ? etat.ignores.filter((n) => n !== club.id) : etat.ignores,
  };
}

// ============ stockage ============

function lireEtat(raw: string | null): EtatPratiques | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (Array.isArray(o)) return { v: 1, pratiques: o, ignores: [] };
    if (o && typeof o === 'object' && Array.isArray(o.pratiques)) return { v: 1, pratiques: o.pratiques, ignores: Array.isArray(o.ignores) ? o.ignores : [] };
  } catch {
    // valeur abimee : on repart de la migration, rien n'est ecrase tant que tu ne modifies rien
  }
  return null;
}

/** Tes pratiques, a partir de tes clubs (getClubs) : migration a la volee si rien n'est encore enregistre */
export async function lirePratiques(clubs: ClubLeger[], sportCombatFavori?: string | null): Promise<EtatPratiques & { migre: boolean }> {
  let raw: string | null = null;
  let belt: string | null = null;
  try {
    [raw, belt] = await Promise.all([AsyncStorage.getItem(CLE_PRATIQUES), AsyncStorage.getItem(CLE_CEINTURE_ANCIENNE)]);
  } catch {
    // lecture impossible : la migration a partir des clubs
  }
  return reconcilier({ etat: lireEtat(raw), clubs, ceinture: belt, sportCombatFavori });
}

/** Enregistre la liste et tient a jour l'ancienne ceinture unique (celle de ta pratique principale) */
export async function ecrirePratiques(etat: EtatPratiques): Promise<void> {
  const propre: EtatPratiques = { v: 1, pratiques: unePrincipale(etat.pratiques.map((p) => pratiquePropre(p)!).filter(Boolean)), ignores: etat.ignores };
  await AsyncStorage.setItem(CLE_PRATIQUES, JSON.stringify(propre));
  const porte = pratiqueACeinture(propre.pratiques);
  if (porte?.ceinture) await AsyncStorage.setItem(CLE_CEINTURE_ANCIENNE, porte.ceinture).catch(() => {});
  DeviceEventEmitter.emit(EVENT_PRATIQUES);
}

// ============ synchronisation entre tes telephones (lib/peerSyncService.ts) ============
// 28 octobre 2026 : la cle @yoroi_pratiques passe par la meme synchro que tes autres reglages (la plus recente gagne,
// cle par cle). Les ids des clubs ne valent que sur un telephone (la table clubs est synchronisee, mais chaque
// telephone donne ses propres numeros) : comme a la restauration, les clubs se retrouvent par leur nom.

/**
 * Ce qui part vers ton autre telephone : ta liste telle quelle, plus le nom des clubs que tu as retires (ignoresNoms),
 * leurs ids n'ayant pas de sens la bas. Champ en plus, facultatif : le format reste v 1. Valeur illisible : envoyee telle quelle.
 */
export function pratiquesPourEnvoi(raw: string | null, clubs: ClubLeger[]): string | null {
  if (raw == null) return raw;
  const e = lireEtat(raw);
  if (!e) return raw;
  const ignoresNoms = e.ignores.map((id) => nomPropre(clubs.find((c) => c.id === id)?.name)).filter(Boolean);
  return JSON.stringify({ v: 1, pratiques: e.pratiques, ignores: e.ignores, ignoresNoms });
}

/**
 * Ce qui arrive de ton autre telephone, recale sur les clubs de CE telephone : chaque pratique retrouve son club par
 * son nom (de preference du meme sport), sinon elle garde le nom sans lien (le club peut arriver plus tard, la lecture
 * le recale alors) ; les clubs retires sont retrouves par leur nom. null : valeur illisible ou format inconnu (une
 * version plus recente que v 1) : rien n'est applique, ta liste de ce telephone reste.
 */
export function pratiquesRecues(raw: string, clubs: ClubLeger[]): string | null {
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (o && typeof o === 'object' && !Array.isArray(o) && 'v' in o && (o as { v?: unknown }).v !== 1) return null;
  const e = lireEtat(raw);
  if (!e) return null;
  const locaux = (clubs ?? []).filter((c) => c && c.id != null && nomPropre(c.name));
  const pris = new Set<number>();
  const pratiques = e.pratiques
    .map(pratiquePropre)
    .filter((p): p is Pratique => !!p)
    .map((p) => {
      if (!p.clubNom) return { ...p, clubId: null };
      const meme = locaux.filter((c) => cleNom(c.name) === cleNom(p.clubNom) && !pris.has(c.id!));
      const c = meme.find((x) => sportPropre(x.sport) === p.sport) ?? meme[0];
      if (c) {
        pris.add(c.id!);
        return { ...p, clubId: c.id!, clubNom: nomPropre(c.name) };
      }
      return { ...p, clubId: null };
    });
  const brut = o && typeof o === 'object' ? (o as { ignoresNoms?: unknown }).ignoresNoms : null;
  const noms = new Set((Array.isArray(brut) ? brut : []).map(cleNom).filter(Boolean));
  const ignores = locaux.filter((c) => noms.has(cleNom(c.name)) && !pratiques.some((p) => p.clubId === c.id)).map((c) => c.id!);
  return JSON.stringify({ v: 1, pratiques: unePrincipale(pratiques), ignores });
}
