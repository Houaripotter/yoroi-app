/**
 * Contenu de notification aux types stricts (1er novembre 2026).
 * Houari, en Debug sur iPhone : plantage _CFAssertMismatchedTypeID (un objet CoreFoundation du mauvais type passe
 * a une fonction du systeme) au retour au premier plan, juste apres la creation du module ExpoNotificationPresenter.
 * Cause pas encore confirmee (pile d'appels a recuperer). Par precaution, tout ce que l'app donne a
 * expo-notifications passe ici : le systeme ne recoit que des chaines la ou il attend des chaines, un son connu,
 * un niveau d'interruption valide, et des donnees (userInfo) en pur JSON, cles en texte, sans undefined ni NaN.
 * Logique pure, testee (__tests__/unit/contenuNotificationSur.test.ts).
 */

/** Sons livres dans l'app iOS (ios/Yoroi, ressources de la cible Yoroi) ; tout autre nom repasse en 'default' */
export const SONS_IOS = ['wizz.mp3'] as const;
const NIVEAUX = ['passive', 'active', 'timeSensitive', 'critical'] as const;
export type NiveauInterruption = (typeof NIVEAUX)[number];

export type ContenuBrut = {
  title?: unknown;
  subtitle?: unknown;
  body?: unknown;
  sound?: unknown;
  data?: unknown;
  badge?: unknown;
  categoryIdentifier?: unknown;
  threadIdentifier?: unknown;
  interruptionLevel?: unknown;
  /** champs Android (ignores par iOS), gardes tels quels s'ils ont le bon type */
  priority?: unknown;
  vibrate?: unknown;
  channelId?: unknown;
};

export type ContenuSur = {
  title: string;
  body: string;
  subtitle?: string;
  sound: string | boolean;
  data: Record<string, unknown>;
  badge?: number;
  categoryIdentifier?: string;
  threadIdentifier?: string;
  interruptionLevel?: NiveauInterruption;
  priority?: string;
  vibrate?: number[];
  channelId?: string;
};

function texte(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

/** Valeur JSON pure : chaines, nombres finis, booleens, tableaux et objets a cles texte ; le reste est retire */
export function donneesJSON(v: unknown, profondeur = 0): unknown {
  if (profondeur > 8) return undefined;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (Array.isArray(v)) return v.map((x) => donneesJSON(x, profondeur + 1)).filter((x) => x !== undefined);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const y = donneesJSON(x, profondeur + 1);
      if (y !== undefined) o[String(k)] = y;
    }
    return o;
  }
  if (v instanceof Date && Number.isFinite(v.getTime())) return v.toISOString();
  return undefined;
}

/** Son : booleen, un des sons iOS par defaut, ou un fichier livre dans l'app ; sinon 'default' */
export function sonSur(v: unknown, os: string): string | boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v !== 'string' || v.length === 0) return 'default';
  if (v === 'default' || v === 'defaultCritical' || v === 'defaultRingtone') return v;
  if (os !== 'ios') return v;
  return (SONS_IOS as readonly string[]).includes(v) ? v : 'default';
}

export function contenuNotificationSur(brut: ContenuBrut, os: string): ContenuSur {
  const data = donneesJSON(brut.data);
  const c: ContenuSur = {
    title: texte(brut.title),
    body: texte(brut.body),
    sound: sonSur(brut.sound, os),
    data: data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {},
  };
  const sous = texte(brut.subtitle);
  if (sous) c.subtitle = sous;
  if (typeof brut.badge === 'number' && Number.isInteger(brut.badge) && brut.badge >= 0) c.badge = brut.badge;
  const cat = texte(brut.categoryIdentifier);
  if (cat) c.categoryIdentifier = cat;
  const fil = texte(brut.threadIdentifier);
  if (fil) c.threadIdentifier = fil;
  if (os === 'ios' && typeof brut.interruptionLevel === 'string' && (NIVEAUX as readonly string[]).includes(brut.interruptionLevel)) {
    c.interruptionLevel = brut.interruptionLevel as NiveauInterruption;
  }
  if (os === 'android') {
    if (typeof brut.priority === 'string') c.priority = brut.priority;
    if (Array.isArray(brut.vibrate) && brut.vibrate.every((n) => typeof n === 'number' && Number.isFinite(n))) c.vibrate = brut.vibrate as number[];
    if (typeof brut.channelId === 'string' && brut.channelId) c.channelId = brut.channelId;
  }
  return c;
}
