/**
 * Photos de forme (vague 39) : poses, dates lisibles, ecarts de poids et de duree,
 * choix par defaut de la paire avant et apres.
 */
import type { Photo } from '@/lib/storage';
import { dateOf, daysDiff, num } from '@/lib/v2/progres/format';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type Pose = 'face' | 'profil' | 'dos';

export const POSES: { value: Pose; label: string }[] = [
  { value: 'face', label: 'Face' },
  { value: 'profil', label: traduire('Profil') },
  { value: 'dos', label: 'Dos' },
];

export function poseLabel(p: Pose | null | undefined): string {
  return POSES.find((x) => x.value === p)?.label ?? '';
}

/** La pose enregistree, sinon devinee dans la note d'une ancienne photo (« face », « profil », « dos ») */
export function poseOf(p: Photo): Pose | null {
  if (p.pose) return p.pose;
  const n = (p.notes ?? '').toLowerCase();
  const hits = (['face', 'profil', 'dos'] as Pose[]).filter((k) => new RegExp(`(^|[^a-zà-ÿ])${k}([^a-zà-ÿ]|$)`).test(n));
  return hits.length === 1 ? hits[0] : null;
}

const MOIS = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const MOIS_LONG = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

/** « 3 mars », avec l'annee seulement si ce n'est pas l'annee en cours */
export function dateCourte(iso: string): string {
  const d = dateOf(iso);
  const j = d.getDate() === 1 ? '1er' : String(d.getDate());
  return `${j} ${MOIS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;
}

/** « 3 mars 2026 » */
export function dateComplete(iso: string): string {
  const d = dateOf(iso);
  return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function kg(v: number): string {
  return `${num(v, 1, false)} kg`;
}

/** « 12 jours », « 5 semaines », « 7 mois », « 1 an et 2 mois » ; 0 donne « le même jour » */
export function dureeTexte(days: number): string {
  const d = Math.abs(days);
  if (d === 0) return traduire('le même jour');
  if (d === 1) return traduire('1 jour');
  if (d < 21) return traduire("{0} jours", d);
  if (d < 63) return traduire("{0} semaines", Math.round(d / 7));
  const mois = Math.round(d / 30.44);
  if (mois < 12) return traduire("{0} mois", mois);
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  return traduirePluriel(ans, ans > 1, "{0} an{1}", "{0} ans{1}", ans, reste ? ` et ${reste} mois` : '');
}

/** Ecart de poids signe, signe moins typographique : « −6,3 kg », « +1,2 kg », « 0,0 kg » */
export function ecartTexte(diff: number): string {
  const s = Math.abs(diff) < 0.05 ? '' : diff > 0 ? '+' : '−';
  return `${s}${num(Math.abs(diff), 1, false)} kg`;
}

export function ecartLibelle(diff: number): string {
  if (Math.abs(diff) < 0.05) return traduire('même poids sur les deux');
  return diff < 0 ? traduire('de poids en moins') : traduire('de poids en plus');
}

export function trierAnciennesDabord(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.created_at < b.created_at ? -1 : 1));
}

/**
 * Paire par defaut : la plus ancienne et la plus recente de la meme pose.
 * Sans filtre, on prend la pose qui couvre la plus longue periode (a egalite, celle qui a le plus de photos),
 * et sinon toutes les photos.
 */
export function paireParDefaut(asc: Photo[], filtre: Pose | null): [Photo, Photo] | null {
  const pool = filtre ? asc.filter((p) => poseOf(p) === filtre) : asc;
  if (!filtre) {
    let best: Photo[] | null = null;
    let bestSpan = -1;
    (['face', 'profil', 'dos'] as Pose[]).forEach((k) => {
      const l = asc.filter((p) => poseOf(p) === k);
      if (l.length < 2) return;
      const span = daysDiff(l[0].date.slice(0, 10), l[l.length - 1].date.slice(0, 10));
      if (span > bestSpan || (span === bestSpan && best && l.length > best.length)) {
        best = l;
        bestSpan = span;
      }
    });
    const all = asc.length >= 2 ? daysDiff(asc[0].date.slice(0, 10), asc[asc.length - 1].date.slice(0, 10)) : -1;
    if (best && bestSpan >= 0 && (bestSpan > 0 || all === 0)) {
      const l = best as Photo[];
      return [l[0], l[l.length - 1]];
    }
  }
  if (pool.length < 2) return null;
  return [pool[0], pool[pool.length - 1]];
}

/** Derniere photo d'une pose (pour le fantome de la camera) */
export function dernierePose(photos: Photo[], pose: Pose | null): Photo | null {
  const asc = trierAnciennesDabord(photos);
  const l = pose ? asc.filter((p) => poseOf(p) === pose) : asc;
  return l.length ? l[l.length - 1] : null;
}
