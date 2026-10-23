/**
 * Appairage et enveloppe chiffree de la synchro iPhone et iPad (13 octobre 2026).
 *
 * Probleme corrige : la synchro locale acceptait automatiquement n'importe quel appareil YOROI a proximite et lui
 * envoyait toutes les donnees (pesees, mensurations, seances). Le module natif diffuse chaque message a TOUS les
 * appareils connectes : signer ne suffit pas, il faut chiffrer.
 *
 * Regles :
 *  1. Un appareil n'echange des donnees qu'avec un appareil appaire par un code a 6 chiffres, affiche sur l'un et
 *     tape sur l'autre, valable 2 minutes.
 *  2. A l'appairage, l'appareil qui affiche le code tire une cle de 32 octets au hasard et l'envoie, masquee par le
 *     code, a l'appareil qui a prouve connaitre le code.
 *  3. Ensuite, chaque message est chiffre (AES-256-CBC, IV aleatoire) et authentifie (HMAC-SHA256 sur l'IV et le
 *     texte chiffre) avec la cle de la paire. Un appareil non appaire recoit des octets illisibles et les ignore.
 *
 * Risque residuel connu : pendant les 2 minutes de l'appairage, un appareil malveillant connecte qui capterait
 * l'echange pourrait retrouver le code par force brute (1 million de possibilites). Hors de cette fenetre, rien.
 *
 * Logique pure : pas de stockage, pas de React. Le hasard est injecte (expo-crypto dans l'app, node dans les tests).
 * Teste dans __tests__/unit/appairage.test.ts.
 */
import CryptoJS from 'crypto-js';

export type Aleatoire = (n: number) => Uint8Array;

/** Duree de validite d'un code d'appairage */
export const DUREE_CODE_MS = 2 * 60 * 1000;

const versWordArray = (b: Uint8Array) => {
  const words: number[] = [];
  for (let i = 0; i < b.length; i += 4) {
    words.push(((b[i] ?? 0) << 24) | ((b[i + 1] ?? 0) << 16) | ((b[i + 2] ?? 0) << 8) | (b[i + 3] ?? 0));
  }
  return CryptoJS.lib.WordArray.create(words, b.length);
};

const hex = (b: Uint8Array) => CryptoJS.enc.Hex.stringify(versWordArray(b));

const hmac = (cleHex: string, texte: string) => CryptoJS.HmacSHA256(texte, CryptoJS.enc.Hex.parse(cleHex)).toString(CryptoJS.enc.Hex);

/** Comparaison a temps constant de deux chaines hexadecimales */
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Cle derivee du code a 6 chiffres, pour prouver qu'on le connait */
const cleDuCode = (code: string) => CryptoJS.SHA256(`yoroi-appairage|${code}`).toString(CryptoJS.enc.Hex);

/** Code a 6 chiffres, de 000000 a 999999 */
export function genererCode(aleatoire: Aleatoire): string {
  const b = aleatoire(4);
  const n = (((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3]) % 1_000_000;
  return String(n).padStart(6, '0');
}

export function codeValide(code: string): boolean {
  return /^\d{6}$/.test(code);
}

// ---------------------------------------------------------------------------
// Appairage
// ---------------------------------------------------------------------------

export type DemandeAppairage = { type: 'PAIR_REQUEST'; from: string; device: string; nonce: string; preuve: string };
export type AcceptationAppairage = { type: 'PAIR_ACCEPT'; from: string; to: string; device: string; cleMasquee: string; preuve: string };

/** Appareil qui a tape le code : demande l'appairage */
export function creerDemande(code: string, from: string, device: string, aleatoire: Aleatoire): DemandeAppairage {
  const nonce = hex(aleatoire(16));
  return { type: 'PAIR_REQUEST', from, device, nonce, preuve: hmac(cleDuCode(code), `req|${from}|${nonce}`) };
}

export function demandeValide(code: string, d: DemandeAppairage): boolean {
  if (!d || typeof d.from !== 'string' || typeof d.nonce !== 'string' || typeof d.preuve !== 'string') return false;
  return egal(hmac(cleDuCode(code), `req|${d.from}|${d.nonce}`), d.preuve);
}

/** Masque de 32 octets tire du code et de la demande, pour transporter la cle de la paire */
const masque = (code: string, d: DemandeAppairage) => hmac(cleDuCode(code), `masque|${d.from}|${d.nonce}`);

function xorHex(a: string, b: string): string {
  let out = '';
  for (let i = 0; i < a.length; i += 2) {
    out += (parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16)).toString(16).padStart(2, '0');
  }
  return out;
}

/** Appareil qui affiche le code : accepte, tire la cle de la paire et la renvoie masquee */
export function creerAcceptation(
  code: string,
  demande: DemandeAppairage,
  from: string,
  device: string,
  aleatoire: Aleatoire,
): { message: AcceptationAppairage; cle: string } {
  const cle = hex(aleatoire(32));
  const cleMasquee = xorHex(cle, masque(code, demande));
  const preuve = hmac(cleDuCode(code), `acc|${from}|${demande.from}|${cleMasquee}`);
  return { message: { type: 'PAIR_ACCEPT', from, to: demande.from, device, cleMasquee, preuve }, cle };
}

/** Appareil qui a tape le code : verifie l'acceptation et recupere la cle de la paire, sinon null */
export function lireAcceptation(code: string, demande: DemandeAppairage, a: AcceptationAppairage): string | null {
  if (!a || a.to !== demande.from || typeof a.cleMasquee !== 'string' || a.cleMasquee.length !== 64) return null;
  if (!egal(hmac(cleDuCode(code), `acc|${a.from}|${a.to}|${a.cleMasquee}`), a.preuve)) return null;
  return xorHex(a.cleMasquee, masque(code, demande));
}

// ---------------------------------------------------------------------------
// Enveloppe chiffree
// ---------------------------------------------------------------------------

export type Enveloppe = { type: 'SEALED'; from: string; to: string; iv: string; ct: string; mac: string };

/** Derive deux cles distinctes (chiffrement, authentification) de la cle de la paire */
const cles = (cleHex: string) => ({
  chiffre: CryptoJS.HmacSHA256('chiffrement', CryptoJS.enc.Hex.parse(cleHex)),
  auth: CryptoJS.HmacSHA256('authentification', CryptoJS.enc.Hex.parse(cleHex)).toString(CryptoJS.enc.Hex),
});

export function sceller(cleHex: string, from: string, to: string, texte: string, aleatoire: Aleatoire): Enveloppe {
  const k = cles(cleHex);
  const iv = versWordArray(aleatoire(16));
  const ct = CryptoJS.AES.encrypt(texte, k.chiffre, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).ciphertext.toString(CryptoJS.enc.Base64);
  const ivHex = iv.toString(CryptoJS.enc.Hex);
  return { type: 'SEALED', from, to, iv: ivHex, ct, mac: hmac(k.auth, `${from}|${to}|${ivHex}|${ct}`) };
}

/** Texte en clair si l'enveloppe est authentique et destinee a cette cle, sinon null */
export function ouvrir(cleHex: string, e: Enveloppe): string | null {
  try {
    const k = cles(cleHex);
    if (!egal(hmac(k.auth, `${e.from}|${e.to}|${e.iv}|${e.ct}`), e.mac)) return null;
    const clair = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(e.ct) }),
      k.chiffre,
      { iv: CryptoJS.enc.Hex.parse(e.iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    ).toString(CryptoJS.enc.Utf8);
    return clair || null;
  } catch {
    return null;
  }
}
