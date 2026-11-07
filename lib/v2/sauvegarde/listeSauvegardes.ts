/**
 * Retrouver une sauvegarde sans fouiller les dossiers (7 novembre 2026, Houari : « importer une sauvegarde, c'est
 * l'enfer, il faut aller dans des endroits de fou »).
 * Les lignes de l'ecran Reglages, Donnees et sauvegardes, Retrouver une sauvegarde : les copies trouvees dans le
 * coffre iCloud de l'app (iPhone) ou dans le dossier relie (Android), sans jamais montrer le nom du fichier.
 * Chaque ligne : une date humaine (« Hier, 21 h 40 », « 3 nov., 18 h 12 »), l'appareil (« Cet iPhone »,
 * « Un autre appareil »), un petit resume quand le fichier se lit (seances, pesees, dernier poids).
 * La plus recente qui se lit est marquee ; une copie abimee (empreinte fausse, JSON coupe) est grisee, jamais remise.
 * Pur, teste dans __tests__/unit/restaurationSimple.test.ts.
 */
import { ordreRestauration, type SauvegardeICloud } from './coffreICloud';
import { traduire, traduirePluriel, LOCALE } from '@/lib/i18n/tr';

export type Appareil = 'ce' | 'autre' | 'ancien';
/** lecture : pas encore lue ; ok : entiere ; abimee : a ne pas remettre ; nuage : pas encore telechargee ; protegee : mot de passe */
export type EtatLigne = 'lecture' | 'ok' | 'abimee' | 'nuage' | 'protegee';
export type Resume = { seances: number; pesees: number; dernierPoids: number | null };
export type LigneListe = {
  /** nom du fichier : jamais affiche, sert seulement a relire la copie */
  nom: string;
  modifiedAt: number;
  appareil: Appareil;
  etat: EtatLigne;
  resume?: Resume;
  plusRecente: boolean;
};

/** Deux copies du meme appareil ecrites a moins de 2 minutes d'ecart : la meme (le fichier du jour et « derniere ») */
export const MEME_COPIE_MS = 2 * 60000;

const NOM_AUTO = /^yoroi_backup_auto_([a-z0-9]{1,12})_(?:[1-9]|derniere)\.json$/;

/** L'identifiant d'appareil dans le nom d'une copie automatique, null pour les autres noms */
export function idDuNom(nom: string): string | null {
  const m = NOM_AUTO.exec(nom);
  return m ? m[1] : null;
}

/** Cet appareil, un autre, ou une ancienne copie sans nom d'appareil (yoroi_backup_auto_1 a 3, export a la main) */
export function appareilDe(nom: string, monId: string | null): Appareil {
  const id = idDuNom(nom);
  if (!id) return 'ancien';
  return monId && id === monId ? 'ce' : 'autre';
}

/**
 * Les lignes, la plus recente d'abord. Le fichier du jour et sa copie « derniere » (meme appareil, meme moment)
 * ne font qu'une ligne.
 */
export function lignesDepuisListe(liste: SauvegardeICloud[], monId: string | null): LigneListe[] {
  const out: LigneListe[] = [];
  for (const s of ordreRestauration(liste)) {
    if (!Number.isFinite(s.modifiedAt)) continue;
    const id = idDuNom(s.name);
    const doublon = id != null && out.some((l) => idDuNom(l.nom) === id && Math.abs(l.modifiedAt - s.modifiedAt) <= MEME_COPIE_MS);
    if (doublon) continue;
    out.push({ nom: s.name, modifiedAt: s.modifiedAt, appareil: appareilDe(s.name, monId), etat: 'lecture', plusRecente: false });
  }
  return marquerPlusRecente(out);
}

/** « La plus récente » : la premiere ligne qui n'est pas abimee (liste deja triee, la plus recente d'abord) */
export function marquerPlusRecente(lignes: LigneListe[]): LigneListe[] {
  const i = lignes.findIndex((l) => l.etat !== 'abimee');
  return lignes.map((l, k) => (l.plusRecente === (k === i) ? l : { ...l, plusRecente: k === i }));
}

/** Les lignes qu'on peut toucher pour remettre la copie (une abimee reste grisee) */
export function peutRemettre(l: LigneListe): boolean {
  return l.etat !== 'abimee';
}

/** Met a jour une ligne apres sa lecture, et refait la marque « La plus récente » */
export function apresLecture(lignes: LigneListe[], nom: string, etat: EtatLigne, resume?: Resume): LigneListe[] {
  return marquerPlusRecente(lignes.map((l) => (l.nom === nom ? { ...l, etat, resume: resume ?? l.resume } : l)));
}

/** Le petit resume d'une sauvegarde lue (seances, pesees, dernier poids en kilos). null si ce n'est pas une sauvegarde. */
export function resumeDe(d: unknown): Resume | null {
  if (!d || typeof d !== 'object') return null;
  const o = d as { weights?: unknown; trainings?: unknown };
  const pesees = Array.isArray(o.weights) ? (o.weights as Array<{ weight?: unknown; date?: unknown; created_at?: unknown }>) : null;
  const seances = Array.isArray(o.trainings) ? o.trainings : null;
  if (!pesees && !seances) return null;
  let dernier: { w: number; cle: string } | null = null;
  for (const p of pesees ?? []) {
    const w = Number(p?.weight);
    if (!Number.isFinite(w) || w <= 0) continue;
    const cle = `${typeof p.date === 'string' ? p.date : ''}|${typeof p.created_at === 'string' ? p.created_at : ''}`;
    if (!dernier || cle > dernier.cle) dernier = { w, cle };
  }
  return { seances: seances?.length ?? 0, pesees: pesees?.length ?? 0, dernierPoids: dernier ? dernier.w : null };
}

const debutJour = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** « 21 h 40 » en francais, l'heure du pays sinon */
export function heureHumaine(ms: number, locale: string = LOCALE): string {
  const d = new Date(ms);
  if (locale.startsWith('fr')) return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** « Aujourd’hui, 9 h 05 », « Hier, 21 h 40 », « 3 nov., 18 h 12 » (l'annee seulement si ce n'est pas l'annee en cours) */
export function dateHumaine(ms: number, now = Date.now(), locale: string = LOCALE): string {
  const h = heureHumaine(ms, locale);
  const ecart = Math.round((debutJour(now) - debutJour(ms)) / 86400000);
  if (ecart === 0) return traduire('Aujourd’hui, {0}', h);
  if (ecart === 1) return traduire('Hier, {0}', h);
  const autreAnnee = new Date(ms).getFullYear() !== new Date(now).getFullYear();
  const jour = new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'short', ...(autreAnnee ? { year: 'numeric' } : {}) });
  return `${jour}, ${h}`;
}

/** « du 3 nov. à 18 h 12 », pour la question de confirmation */
export function dateConfirmation(ms: number, now = Date.now(), locale: string = LOCALE): string {
  const autreAnnee = new Date(ms).getFullYear() !== new Date(now).getFullYear();
  const jour = new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'long', ...(autreAnnee ? { year: 'numeric' } : {}) });
  return traduire('{0} à {1}', jour, heureHumaine(ms, locale));
}

/** « Cet iPhone », « Ce téléphone », « Un autre appareil », « Ancienne copie » */
export function libelleAppareil(a: Appareil, os: string): string {
  if (a === 'ce') return os === 'ios' ? traduire('Cet iPhone') : traduire('Ce téléphone');
  if (a === 'autre') return traduire('Un autre appareil');
  return traduire('Ancienne copie');
}

/** « 128 séances · 64 pesées · 81,4 kg » ; null tant que la copie n'est pas lue */
export function libelleResume(r: Resume | undefined, unite: 'kg' | 'lb' = 'kg', locale: string = LOCALE): string | null {
  if (!r) return null;
  const morceaux = [
    traduirePluriel(r.seances, r.seances > 1, '{0} séance', '{0} séances', r.seances),
    traduirePluriel(r.pesees, r.pesees > 1, '{0} pesée', '{0} pesées', r.pesees),
  ];
  if (r.dernierPoids != null) {
    const v = Math.round((unite === 'lb' ? r.dernierPoids * 2.20462 : r.dernierPoids) * 10) / 10;
    morceaux.push(`${v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unite}`);
  }
  return morceaux.join(' · ');
}
