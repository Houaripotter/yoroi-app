/**
 * Appairage par code, version 2 (30 octobre 2026) : SPAKE2 sur ristretto255 (@noble/curves, deja utilise par
 * lib/v2/creator/creatorToken.ts), avec confirmation des deux cotes.
 *
 * Pourquoi : la version 1 (appairage.ts) envoyait une preuve HMAC du code. Un appareil modifie, a portee pendant
 * les 2 minutes de l'appairage, pouvait capter cette preuve et retrouver le code hors ligne (1 million d'essais,
 * une seconde de calcul), puis se faire passer pour l'autre appareil.
 *
 * Avec SPAKE2, ce qui circule ne permet AUCUN essai hors ligne : chaque essai de code demande un echange en direct
 * avec l'appareil qui affiche le code, et cet appareil coupe l'appairage apres 5 essais (5 chances sur 1 million).
 *
 * Deroule :
 *  1. L'appareil qui a tape le code (S) diffuse PAIR_REQUEST : X = x.G + w.M (w tire du code).
 *  2. L'appareil qui affiche le code (D) repond PAIR_ACCEPT : Y = y.G + w.N et une preuve qu'il connait le code.
 *     Il n'enregistre RIEN a ce stade.
 *  3. S verifie la preuve de D, enregistre la paire et envoie PAIR_CONFIRM, sa propre preuve.
 *  4. D verifie la preuve de S et seulement alors enregistre la paire.
 * Les deux obtiennent la meme cle de 32 octets, qui ne circule jamais.
 *
 * Logique pure : pas de stockage, pas de React. Hasard injecte. Teste dans __tests__/unit/appairageSpake.test.ts.
 */
import CryptoJS from 'crypto-js';
import { ed25519, RistrettoPoint } from '@noble/curves/ed25519';
import type { Aleatoire } from './appairage';

export const VERSION_APPAIRAGE = 2;

type Point = InstanceType<typeof RistrettoPoint>;
const ORDRE: bigint = ed25519.CURVE.n;

const sha512Hex = (texte: string) => CryptoJS.SHA512(texte).toString(CryptoJS.enc.Hex);
const sha256Hex = (texte: string) => CryptoJS.SHA256(texte).toString(CryptoJS.enc.Hex);
const hmac = (cleHex: string, texte: string) => CryptoJS.HmacSHA256(texte, CryptoJS.enc.Hex.parse(cleHex)).toString(CryptoJS.enc.Hex);

/** Points fixes M et N, tires d'un texte public : personne ne connait leur logarithme */
const M: Point = RistrettoPoint.hashToCurve(sha512Hex('yoroi-appairage-spake2|M'));
const N: Point = RistrettoPoint.hashToCurve(sha512Hex('yoroi-appairage-spake2|N'));

const scalaire = (hex: string): bigint => {
  const n = BigInt(`0x${hex}`) % ORDRE;
  return n === BigInt(0) ? BigInt(1) : n;
};

const hexDe = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** Scalaire secret tire du code a 6 chiffres */
const w = (code: string) => scalaire(sha512Hex(`yoroi-appairage-spake2|code|${code}`));

const aleaScalaire = (aleatoire: Aleatoire) => scalaire(hexDe(aleatoire(64)));

function point(hex: unknown): Point | null {
  if (typeof hex !== 'string' || !/^[0-9a-f]{64}$/.test(hex)) return null;
  try {
    const p = RistrettoPoint.fromHex(hex);
    return p.equals(RistrettoPoint.ZERO) ? null : p;
  } catch {
    return null;
  }
}

function egal(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Cles de l'echange, tirees du secret commun et de tout ce qui a circule */
function deriver(s: string, d: string, X: string, Y: string, K: Point) {
  const base = sha256Hex(`yoroi-appairage-spake2|${s}|${d}|${X}|${Y}|${K.toHex()}`);
  return {
    preuveD: hmac(base, 'preuve affiche'),
    preuveS: hmac(base, 'preuve saisi'),
    cle: hmac(base, 'cle de la paire'),
  };
}

export type DemandeSpake = { type: 'PAIR_REQUEST'; pv: 2; from: string; device: string; X: string };
export type AcceptationSpake = { type: 'PAIR_ACCEPT'; pv: 2; from: string; to: string; device: string; X: string; Y: string; preuve: string };
export type ConfirmationSpake = { type: 'PAIR_CONFIRM'; pv: 2; from: string; to: string; preuve: string };

/** Ce que l'appareil qui tape le code garde pour lui */
export type SecretSaisi = { code: string; x: bigint; demande: DemandeSpake };

/** Ce que l'appareil qui affiche le code garde pour une demande, en attente de la confirmation */
export type EnAttenteAffiche = { s: string; device: string; X: string; reponse: AcceptationSpake; preuveS: string; cle: string };

/** 1. Appareil qui a tape le code */
export function creerDemandeSpake(code: string, from: string, device: string, aleatoire: Aleatoire): SecretSaisi {
  const x = aleaScalaire(aleatoire);
  const X = RistrettoPoint.BASE.multiply(x).add(M.multiply(w(code))).toHex();
  return { code, x, demande: { type: 'PAIR_REQUEST', pv: 2, from, device: String(device).slice(0, 60), X } };
}

export function estDemandeSpake(m: any): m is DemandeSpake {
  return !!m && m.type === 'PAIR_REQUEST' && m.pv === 2 && typeof m.from === 'string' && m.from.length > 0 && m.from.length <= 80 && point(m.X) !== null;
}

/** 2. Appareil qui affiche le code. Null si la demande est illisible. Ne prouve PAS que l'autre connait le code. */
export function repondreSpake(code: string, demande: DemandeSpake, from: string, device: string, aleatoire: Aleatoire): EnAttenteAffiche | null {
  const Xp = estDemandeSpake(demande) ? point(demande.X) : null;
  if (!Xp) return null;
  const ww = w(code);
  const y = aleaScalaire(aleatoire);
  const Y = RistrettoPoint.BASE.multiply(y).add(N.multiply(ww)).toHex();
  const base = Xp.subtract(M.multiply(ww));
  if (base.equals(RistrettoPoint.ZERO)) return null;
  const K = base.multiply(y);
  const k = deriver(demande.from, from, demande.X, Y, K);
  return {
    s: demande.from,
    device: String(demande.device || '').slice(0, 60),
    X: demande.X,
    reponse: { type: 'PAIR_ACCEPT', pv: 2, from, to: demande.from, device: String(device).slice(0, 60), X: demande.X, Y, preuve: k.preuveD },
    preuveS: k.preuveS,
    cle: k.cle,
  };
}

/** 3. Appareil qui a tape le code : la cle de la paire et la confirmation a envoyer, ou null (mauvais code, forgee) */
export function lireAcceptationSpake(secret: SecretSaisi, a: any): { cle: string; confirmation: ConfirmationSpake } | null {
  if (!a || a.type !== 'PAIR_ACCEPT' || a.pv !== 2 || a.to !== secret.demande.from || a.X !== secret.demande.X) return null;
  if (typeof a.from !== 'string' || !a.from || typeof a.preuve !== 'string') return null;
  const Yp = point(a.Y);
  if (!Yp) return null;
  const base = Yp.subtract(N.multiply(w(secret.code)));
  if (base.equals(RistrettoPoint.ZERO)) return null;
  const K = base.multiply(secret.x);
  const k = deriver(secret.demande.from, a.from, secret.demande.X, a.Y, K);
  if (!egal(k.preuveD, a.preuve)) return null;
  return { cle: k.cle, confirmation: { type: 'PAIR_CONFIRM', pv: 2, from: secret.demande.from, to: a.from, preuve: k.preuveS } };
}

/** 4. Appareil qui affiche le code : la confirmation prouve que l'autre connait le code */
export function confirmationValide(attente: EnAttenteAffiche, c: any): boolean {
  return !!c && c.type === 'PAIR_CONFIRM' && c.pv === 2 && c.from === attente.s && c.to === attente.reponse.from && egal(attente.preuveS, c.preuve);
}
