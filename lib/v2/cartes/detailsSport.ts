/**
 * 31 octobre 2026 (cartes en 6 modeles) : ce que chaque carte montre en plus des chiffres, selon le sport.
 * Course : le trace GPS s'il existe, sinon tes kilometres, sinon le sticker du sport.
 * Musculation : tes meilleures series et le record. JJB et sports de combat : tes techniques, ta courbe cardiaque.
 * Une donnee absente ne donne aucune ligne. Logique pure, testee dans __tests__/unit/cartesSixModeles.test.ts.
 */
import type { CarteData, DonneesSeance } from './types';
import { nombre } from './chiffres';
import { chargeTexte } from '@/lib/v2/unitePoids';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

export type LigneDetail = { gauche: string; droite?: string };
export type BlocDetail = { titre: string; lignes: LigneDetail[] };

export type VisuelSport =
  | { type: 'trace'; trace: NonNullable<DonneesSeance['trace']> }
  | { type: 'splits'; splits: NonNullable<DonneesSeance['splits']> }
  | { type: 'barres'; barres: number[] }
  | { type: 'courbe'; courbe: number[] }
  | { type: 'zones'; zones: number[] }
  | { type: 'jours'; jours: boolean[] }
  | { type: 'sticker' };

const FOIS = '×';

/** 312 secondes -> 5'12 */
export function allureTexte(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}`;
}

function zonesOk(z: number[] | null | undefined): z is number[] {
  return Array.isArray(z) && z.length === 5 && z.reduce((a, b) => a + (b > 0 ? b : 0), 0) >= 60;
}

/**
 * Le visuel du sport. 'affiche' : le trace, sinon les kilometres, les zones, le sticker.
 * 'neon' : en plus les barres de tes series (musculation) et ta courbe cardiaque (combat), qui brillent.
 */
export function visuelDuSport(d: CarteData, mode: 'affiche' | 'neon' = 'affiche'): VisuelSport {
  if (d.moment === 'semaine' && d.semaine) return { type: 'jours', jours: d.semaine.jours };
  const s = d.seance;
  if (!s || d.moment !== 'seance') return { type: 'sticker' };
  if (s.trace && s.trace.points.length >= 2) return { type: 'trace', trace: s.trace };
  if (mode === 'neon') {
    if (d.famille === 'muscu' && s.barres && s.barres.length >= 2) return { type: 'barres', barres: s.barres };
    if (s.courbeFc && s.courbeFc.length >= 10) return { type: 'courbe', courbe: s.courbeFc };
  }
  if (s.splits && s.splits.length >= 2) return { type: 'splits', splits: s.splits };
  if (mode === 'neon' && s.barres && s.barres.length >= 2) return { type: 'barres', barres: s.barres };
  if (zonesOk(s.zones)) return { type: 'zones', zones: s.zones };
  return { type: 'sticker' };
}

/** Le bloc de lignes du sport : meilleures series, techniques, kilometres, sports de la semaine ; null s'il n'y a rien */
export function blocDetail(d: CarteData, u: UnitePoids = 'kg', max = 3): BlocDetail | null {
  if (max <= 0) return null;
  if (d.moment === 'semaine' && d.semaine?.sports?.length) {
    const lignes = d.semaine.sports.filter((x) => x.nom && x.n > 0).slice(0, max).map((x) => ({ gauche: sansTiret(x.nom), droite: traduirePluriel(x.n, x.n > 1, '{0} séance', '{0} séances', x.n) }));
    return lignes.length ? { titre: traduire('Tes sports'), lignes } : null;
  }
  const s = d.seance;
  if (!s || d.moment !== 'seance') return null;
  if (s.meilleures?.length) {
    const lignes = s.meilleures.filter((m) => m.nom && m.poids > 0 && m.reps > 0).slice(0, max).map((m) => ({ gauche: sansTiret(m.nom), droite: `${chargeTexte(m.poids, u)} ${FOIS} ${m.reps}` }));
    if (lignes.length) return { titre: traduire('Meilleures séries'), lignes };
  }
  if (s.techniques?.length) {
    const lignes = s.techniques.filter(Boolean).slice(0, max).map((t) => ({ gauche: sansTiret(t) }));
    if (lignes.length) return { titre: traduire('Techniques travaillées'), lignes };
  }
  if (s.splits && s.splits.length >= 2) {
    // les kilometres les plus rapides, dans l'ordre du parcours
    const vite = [...s.splits].sort((a, b) => a.secondes - b.secondes).slice(0, max).sort((a, b) => a.km - b.km);
    return { titre: traduire('Tes kilomètres les plus rapides'), lignes: vite.map((x) => ({ gauche: traduire('Kilomètre {0}', x.km), droite: `${allureTexte(x.secondes)} /km` })) };
  }
  return null;
}

/** Le record de la seance en une ligne : « Développé couché 100 kg × 5 », null sans record */
export function ligneRecord(d: CarteData, u: UnitePoids = 'kg'): string | null {
  const r = d.seance?.records?.[0];
  if (!r || !r.nom) return null;
  const autres = (d.seance?.records?.length ?? 1) - 1;
  const base = r.poids && r.reps ? `${sansTiret(r.nom)} ${chargeTexte(r.poids, u)} ${FOIS} ${r.reps}` : `${sansTiret(r.nom)}, ${r.texte}`;
  return autres > 0 ? traduirePluriel(autres, autres > 1, '{0}, et {1} autre', '{0}, et {1} autres', base, autres) : base;
}

/** Le numero du ticket : le vrai numero de la seance enregistree, null sinon (jamais invente) */
export function numeroTicket(d: CarteData): string | null {
  const [m, id] = d.cle.split(':');
  return m === 'seance' && /^\d+$/.test(id ?? '') ? String(Number(id)).padStart(4, '0') : null;
}

/** Date courte du tableau de score : « 31.10.26 », lue dans la date de la seance quand elle est connue */
export function dateCourteCarte(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : null;
}



/** Le sticker YOROI du sport de la carte (memes regles que le calendrier), la balance pour une pesee */
export type StickerCarte = 'jjb' | 'gants' | 'musculation' | 'course' | 'sport_football' | 'sport_velo' | 'sport_nage' | 'sport_raquette' | 'sport_ballon' | 'balance' | 'calendrier' | 'flamme';

export function stickerDeCarte(d: CarteData): StickerCarte {
  if (d.moment === 'pesee') return 'balance';
  if (d.moment === 'semaine') return 'calendrier';
  const id = String(d.sport ?? '').split(',')[0].trim().toLowerCase();
  if (/jjb|bjj|jiu|grappling|judo|lutte|wrestling|sambo|luta/.test(id)) return 'jjb';
  if (/boxe|box|mma|kick|muay|karate|taekwondo|savate|striking|krav/.test(id)) return 'gants';
  if (/muscu|fitness|crossfit|halt|force|powerlifting|street|hyrox/.test(id)) return 'musculation';
  if (/run|course|trail|jogging|marche|marathon/.test(id)) return 'course';
  if (/foot|soccer|futsal/.test(id)) return 'sport_football';
  if (/velo|cycl|bike|vtt|spinning/.test(id)) return 'sport_velo';
  if (/nata|swim|nage/.test(id)) return 'sport_nage';
  if (/tennis|padel|badminton|squash|ping/.test(id)) return 'sport_raquette';
  if (/basket|hand|volley|rugby/.test(id)) return 'sport_ballon';
  if (d.famille === 'combat') return 'gants';
  if (d.famille === 'muscu') return 'musculation';
  if (d.famille === 'course') return 'course';
  return 'flamme';
}
