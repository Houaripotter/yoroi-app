const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclure du bundle JS les dossiers inutiles en production
const blockListEntries = [
  // Tests Jest
  /\/__tests__\/.*/,
  // Scripts Python / scrapers
  /\/scrapers\/.*/,
  // Migrations SQL Supabase
  /\/supabase\/.*/,
  // Fichiers Markdown
  /.*\.md$/,
  // Fichiers Python
  /.*\.py$/,
  // Cache Python
  /\/__pycache__\/.*/,
];

const existing = config.resolver.blockList;
config.resolver.blockList = existing
  ? [...(Array.isArray(existing) ? existing : [existing]), ...blockListEntries]
  : blockListEntries;

module.exports = config;
