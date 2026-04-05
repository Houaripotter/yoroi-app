#!/usr/bin/env node
// ============================================
// YOROI - Vérification des traductions manquantes
// Usage: node scripts/check-translations.js
// ============================================

const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'lib', 'i18n');

const fr = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'fr.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8'));
const ja = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'ja.json'), 'utf8'));

function flatten(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

const flatFr = flatten(fr);
const flatEn = flatten(en);
const flatJa = flatten(ja);

const frKeys = Object.keys(flatFr);
const enKeys = new Set(Object.keys(flatEn));
const jaKeys = new Set(Object.keys(flatJa));

const missingInEn = frKeys.filter(k => !enKeys.has(k));
const missingInJa = frKeys.filter(k => !jaKeys.has(k));
const extraInEn   = Object.keys(flatEn).filter(k => !flatFr.hasOwnProperty(k));

console.log('=== RAPPORT DE TRADUCTIONS YOROI ===\n');
console.log(`fr.json : ${frKeys.length} clés`);
console.log(`en.json : ${Object.keys(flatEn).length} clés`);
console.log(`ja.json : ${Object.keys(flatJa).length} clés\n`);

if (missingInEn.length === 0) {
  console.log('en.json : OK - aucune clé manquante');
} else {
  console.log(`en.json : ${missingInEn.length} clé(s) MANQUANTE(S) :`);
  missingInEn.forEach(k => console.log(`  - ${k}`));
}

console.log('');

if (missingInJa.length === 0) {
  console.log('ja.json : OK - aucune clé manquante');
} else {
  console.log(`ja.json : ${missingInJa.length} clé(s) MANQUANTE(S) :`);
  console.log('  (fallback automatique ja→en→fr pour ces clés)');
  missingInJa.slice(0, 30).forEach(k => console.log(`  - ${k}`));
  if (missingInJa.length > 30) {
    console.log(`  ... et ${missingInJa.length - 30} autres`);
  }
}

console.log('');

if (extraInEn.length === 0) {
  console.log('en.json : aucune clé en trop (non présente dans fr.json)');
} else {
  console.log(`en.json : ${extraInEn.length} clé(s) présentes dans en.json mais pas dans fr.json :`);
  extraInEn.slice(0, 20).forEach(k => console.log(`  + ${k}`));
  if (extraInEn.length > 20) {
    console.log(`  ... et ${extraInEn.length - 20} autres`);
  }
}

console.log('\n=== FIN DU RAPPORT ===');
process.exit(missingInEn.length > 0 ? 1 : 0);
