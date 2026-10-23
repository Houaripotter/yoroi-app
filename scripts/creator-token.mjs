#!/usr/bin/env node
/**
 * Jeton createur YOROI.
 *
 * Le Studio createur ne s'ouvre plus avec un code a 4 chiffres : il s'ouvre avec un jeton
 * signe en Ed25519. L'app ne contient que la cle PUBLIQUE (lib/v2/creator/creatorToken.ts).
 * Sans la cle privee, rangee dans _private/creator-keys/ (exclue de git, des builds EAS
 * et du bundle Metro), personne ne peut fabriquer un jeton valide.
 *
 *   node scripts/creator-token.mjs init                      cree la paire de cles (refuse d'ecraser)
 *   node scripts/creator-token.mjs pubkey                    affiche la cle publique a coller dans l'app
 *   node scripts/creator-token.mjs sign [etiquette] [jours]  ecrit un jeton dans _private/creator-token-<etiquette>.txt
 *
 * Le jeton n'est JAMAIS affiche : seuls le chemin du fichier et la date d'expiration le sont.
 * Si la cle privee est perdue : refais une paire (deplace l'ancien dossier a la main),
 * remplace la cle publique dans l'app au prochain build ; les anciens jetons ne marchent plus.
 */
import { ed25519 } from '@noble/curves/ed25519';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_DIR = path.join(ROOT, '_private');
const KEY_DIR = path.join(PRIVATE_DIR, 'creator-keys');
const PRIV = path.join(KEY_DIR, 'private.key');
const PUB = path.join(KEY_DIR, 'public.key');

const b64u = (bytes) => Buffer.from(bytes).toString('base64url');
const fromB64u = (s) => new Uint8Array(Buffer.from(s, 'base64url'));

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function init() {
  if (fs.existsSync(PRIV) || fs.existsSync(PUB)) {
    fail(`Une paire existe deja dans ${KEY_DIR}. Rien n'a ete ecrase. Deplace ce dossier a la main si tu veux vraiment en refaire une.`);
  }
  fs.mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
  const priv = ed25519.utils.randomPrivateKey();
  const pub = ed25519.getPublicKey(priv);
  fs.writeFileSync(PRIV, b64u(priv), { mode: 0o600, flag: 'wx' });
  fs.writeFileSync(PUB, b64u(pub), { mode: 0o644, flag: 'wx' });
  console.log(`Paire creee dans ${KEY_DIR}`);
  console.log('Cle publique a coller dans lib/v2/creator/creatorToken.ts :');
  console.log(b64u(pub));
}

function pubkey() {
  if (!fs.existsSync(PUB)) fail('Aucune cle. Lance : node scripts/creator-token.mjs init');
  console.log(fs.readFileSync(PUB, 'utf8').trim());
}

function sign(label = 'iphone', daysArg = '365') {
  if (!/^[a-z0-9_-]{1,32}$/i.test(label)) fail('Etiquette invalide : lettres, chiffres, - et _ seulement (32 au plus).');
  const days = Number(daysArg);
  if (!Number.isFinite(days) || days < 1 || days > 3650) fail('Nombre de jours invalide (de 1 a 3650).');
  if (!fs.existsSync(PRIV)) fail('Aucune cle. Lance : node scripts/creator-token.mjs init');
  const priv = fromB64u(fs.readFileSync(PRIV, 'utf8').trim());
  const now = Math.floor(Date.now() / 1000);
  const payload = { v: 1, sub: label, iat: now, exp: now + Math.round(days * 86400) };
  const body = b64u(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64u(ed25519.sign(new TextEncoder().encode(body), priv));
  const out = path.join(PRIVATE_DIR, `creator-token-${label}.txt`);
  fs.mkdirSync(PRIVATE_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(out, `${body}.${sig}\n`, { mode: 0o600 });
  console.log(`Jeton ecrit dans ${out}`);
  console.log(`Expire le ${new Date(payload.exp * 1000).toLocaleDateString('fr-FR')} (${days} jours).`);
  console.log('Copie le contenu du fichier sur ton telephone, puis Reglages, appui long sur le numero de version.');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'init') init();
else if (cmd === 'pubkey') pubkey();
else if (cmd === 'sign') sign(rest[0], rest[1]);
else {
  console.log('Usage :');
  console.log('  node scripts/creator-token.mjs init');
  console.log('  node scripts/creator-token.mjs pubkey');
  console.log('  node scripts/creator-token.mjs sign [etiquette] [jours]');
}
