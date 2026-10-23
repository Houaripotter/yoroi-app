/**
 * Genere la page web de la politique de confidentialite a partir de data/politiqueConfidentialite.json,
 * la meme source que l'ecran de l'app. Une seule source, aucune divergence.
 *
 * Usage :
 *   node scripts/politique-html.mjs            sans la section mesure d'audience
 *   node scripts/politique-html.mjs --mesure   avec la section (quand Firebase et Sentry sont en ligne)
 * Sortie : site/politique-confidentialite.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = JSON.parse(readFileSync(join(racine, 'data/politiqueConfidentialite.json'), 'utf8'));
const avecMesure = process.argv.includes('--mesure');

const echap = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lien = (s) => echap(s)
  .replace(/yoroiapp@hotmail\.com/g, '<a href="mailto:yoroiapp@hotmail.com">yoroiapp@hotmail.com</a>')
  .replace(/\b(revenuecat\.com|open-meteo\.com|cnil\.fr)\b/g, '<a href="https://$1">$1</a>');

function langue(code, titre, maj) {
  const sections = P[code].filter((s) => !s.siMesure || avecMesure);
  const corps = sections.map((s, i) => {
    const puces = s.lignes.filter((l) => l.startsWith('• '));
    const textes = s.lignes.filter((l) => !l.startsWith('• '));
    const avant = textes.map((t) => `<p>${lien(t)}</p>`).join('\n');
    const liste = puces.length ? `<ul>\n${puces.map((p) => `<li>${lien(p.slice(2))}</li>`).join('\n')}\n</ul>` : '';
    return `<section><h2>${i + 1}. ${echap(s.titre)}</h2>\n${avant}\n${liste}</section>`;
  }).join('\n');
  return `<article lang="${code}" id="${code}"><h1>${titre}</h1><p class="maj">${maj} : ${P.miseAJour[code]}</p>\n${corps}</article>`;
}

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YOROI, politique de confidentialité</title>
<style>
  :root { --fond: #F2F1EC; --encre: #1D2029; --doux: #4A4E5A; --accent: #2C4A84; --carte: #FFFFFF; --ligne: #E2DFD8; }
  @media (prefers-color-scheme: dark) { :root { --fond: #14161C; --encre: #ECEAE4; --doux: #B4B6BE; --accent: #8FA8DC; --carte: #1D2029; --ligne: #2C2F38; } }
  body { margin: 0; background: var(--fond); color: var(--encre); font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 16px 64px; }
  nav { display: flex; gap: 12px; margin-bottom: 24px; }
  nav a { color: var(--accent); font-weight: 700; text-decoration: none; }
  h1 { font-size: 30px; line-height: 1.2; margin: 0 0 4px; }
  .maj { color: var(--doux); margin: 0 0 24px; }
  section { background: var(--carte); border: 1px solid var(--ligne); border-radius: 18px; padding: 18px 20px; margin: 0 0 14px; }
  h2 { font-size: 19px; margin: 0 0 8px; }
  p, li { color: var(--doux); }
  ul { padding-left: 20px; margin: 8px 0 0; }
  a { color: var(--accent); }
  article + article { margin-top: 56px; }
</style>
</head>
<body>
<main>
<nav><a href="#fr">Français</a><a href="#en">English</a></nav>
${langue('fr', 'Politique de confidentialité de YOROI', 'Dernière mise à jour')}
${langue('en', 'YOROI privacy policy', 'Last updated')}
</main>
</body>
</html>
`;

mkdirSync(join(racine, 'site'), { recursive: true });
writeFileSync(join(racine, 'site/politique-confidentialite.html'), html);
console.log(`site/politique-confidentialite.html ecrit${avecMesure ? ', avec la section mesure' : ''}`);
