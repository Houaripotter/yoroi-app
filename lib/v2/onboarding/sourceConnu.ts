/**
 * « Où as-tu entendu parler de YOROI ? » (31 octobre 2026, demande de Houari) : ecran facultatif de l'onboarding,
 * juste apres Ta tranche d'age. Une seule reponse, prise dans une liste fermee ; rien n'est saisi au clavier.
 * Gardee dans le brouillon puis sous SOURCE_CONNU_KEY a la fin de l'onboarding (lib/v2/onboarding/save.ts).
 * Mesuree seulement par le canal consenti de utils/telemetry.ts (onboarding_choix, etape « source »).
 * Logique pure, sans dependance.
 */
export type SourceConnu =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'google'
  | 'app_store'
  | 'google_play'
  | 'ia'
  | 'snapchat'
  | 'x'
  | 'amis'
  | 'club'
  | 'autre';

export const SOURCES_CONNU: readonly SourceConnu[] = [
  'tiktok',
  'instagram',
  'youtube',
  'facebook',
  'google',
  'app_store',
  'google_play',
  'ia',
  'snapchat',
  'x',
  'amis',
  'club',
  'autre',
];

/** Cle locale de la reponse, posee a la fin de l'onboarding */
export const SOURCE_CONNU_KEY = '@yoroi_source_connu';

export function isSourceConnu(v: unknown): v is SourceConnu {
  return typeof v === 'string' && (SOURCES_CONNU as readonly string[]).includes(v);
}

/** Les choix montres : le magasin d'applications du telephone seulement (App Store sur iPhone, Google Play sur Android) */
export function sourcesPour(os: string): SourceConnu[] {
  const android = os === 'android';
  return SOURCES_CONNU.filter((s) => (s === 'app_store' ? !android : s === 'google_play' ? android : true));
}
