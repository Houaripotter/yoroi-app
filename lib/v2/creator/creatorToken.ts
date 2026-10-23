/**
 * Jeton createur YOROI : verification hors ligne d'un jeton signe en Ed25519.
 *
 * L'app ne contient que la cle PUBLIQUE ci-dessous. Fabriquer un jeton valide demande
 * la cle privee, rangee dans _private/creator-keys/ sur l'ordinateur de Houari
 * (exclue de git, des builds EAS et du bundle Metro). Lire le code de l'app ne donne
 * donc aucun moyen d'ouvrir le Studio, et la force brute ne sert a rien.
 *
 * Format : <payload base64url>.<signature base64url>, la signature porte sur le texte
 * du payload. Payload : { v: 1, sub, iat, exp } (secondes).
 * Generer un jeton : node scripts/creator-token.mjs sign [etiquette] [jours]
 */
import { ed25519 } from '@noble/curves/ed25519';
import { traduire } from '@/lib/i18n/tr';

/** Cle publique Ed25519 (base64url). Se remplace en refaisant une paire avec le script. */
export const CREATOR_PUBLIC_KEY = 'nE70thmOlDyI1CLbTHHH9A9tDxyWrHECClhMjM_mvg4';

export interface CreatorTokenPayload {
  v: 1;
  /** etiquette du jeton (par exemple iphone) */
  sub: string;
  /** emis le, en secondes */
  iat: number;
  /** expire le, en secondes */
  exp: number;
}

export type TokenRefus = 'format' | 'signature' | 'version' | 'contenu' | 'futur' | 'expire';

export type TokenCheck = { valid: true; payload: CreatorTokenPayload } | { valid: false; reason: TokenRefus };

/** Tolerance d'horloge pour la date d'emission (le telephone peut retarder un peu) */
const SKEW_S = 10 * 60;
/** Duree de vie maximale acceptee : 10 ans */
const MAX_LIFE_S = 3650 * 86400;
const MAX_LEN = 1024;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Decodeur base64url strict, sans Buffer (absent de Hermes). null si un caractere est invalide. */
function fromBase64Url(input: string): Uint8Array | null {
  if (!input || input.length % 4 === 1) return null;
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < input.length; i += 1) {
    const v = B64.indexOf(input[i]);
    if (v < 0) return null;
    buffer = ((buffer << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Le payload est du JSON ASCII (cles et valeurs simples) : tout octet hors ASCII est refuse. */
function ascii(bytes: Uint8Array): string | null {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] > 0x7e || bytes[i] < 0x20) return null;
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

let cachedPub: Uint8Array | null = null;

/**
 * Verifie un jeton. Ne leve jamais : toute anomalie renvoie valid: false avec la raison.
 * now est en millisecondes (Date.now() par defaut).
 */
export function verifyCreatorToken(raw: unknown, now: number = Date.now()): TokenCheck {
  try {
    if (typeof raw !== 'string') return { valid: false, reason: 'format' };
    const token = raw.replace(/\s+/g, '');
    if (!token || token.length > MAX_LEN) return { valid: false, reason: 'format' };
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return { valid: false, reason: 'format' };
    const [bodyPart, sigPart] = parts;

    const sig = fromBase64Url(sigPart);
    const bodyBytes = fromBase64Url(bodyPart);
    if (!cachedPub) cachedPub = fromBase64Url(CREATOR_PUBLIC_KEY);
    const pub = cachedPub;
    if (!sig || sig.length !== 64 || !bodyBytes || !pub || pub.length !== 32) return { valid: false, reason: 'format' };

    // la signature d'abord : rien du contenu n'est lu tant qu'elle n'est pas prouvee
    if (!ed25519.verify(sig, asciiBytes(bodyPart), pub)) return { valid: false, reason: 'signature' };

    const text = ascii(bodyBytes);
    if (!text) return { valid: false, reason: 'contenu' };
    const p = JSON.parse(text) as Partial<CreatorTokenPayload> | null;
    if (!p || typeof p !== 'object') return { valid: false, reason: 'contenu' };
    if (p.v !== 1) return { valid: false, reason: 'version' };
    if (typeof p.sub !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(p.sub)) return { valid: false, reason: 'contenu' };
    if (typeof p.iat !== 'number' || typeof p.exp !== 'number' || !Number.isFinite(p.iat) || !Number.isFinite(p.exp)) return { valid: false, reason: 'contenu' };
    if (p.exp <= p.iat || p.exp - p.iat > MAX_LIFE_S) return { valid: false, reason: 'contenu' };
    const nowS = now / 1000;
    if (p.iat > nowS + SKEW_S) return { valid: false, reason: 'futur' };
    if (p.exp <= nowS) return { valid: false, reason: 'expire' };

    return { valid: true, payload: { v: 1, sub: p.sub, iat: p.iat, exp: p.exp } };
  } catch {
    return { valid: false, reason: 'format' };
  }
}

/** Message court a montrer quand un jeton est refuse. */
export function tokenErrorMessage(reason: TokenRefus): string {
  switch (reason) {
    case 'expire':
      return 'Ce jeton a expiré. Génère-en un nouveau sur ton ordinateur.';
    case 'futur':
      return 'Ce jeton n’est pas encore valable. Vérifie la date de ton téléphone.';
    case 'version':
      return 'Ce jeton vient d’une autre version. Génère-en un nouveau.';
    case 'signature':
    case 'contenu':
      return 'Ce jeton n’est pas valide.';
    default:
      return traduire('Jeton illisible. Colle-le en entier, sans rien ajouter.');
  }
}
