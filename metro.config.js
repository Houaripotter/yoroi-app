const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable enablePackageExports to fix resolution issues with packages that have
// non-standard main fields or self-imports without exports fields
// (e.g. @expo/metro-runtime, whatwg-fetch, expo itself).
config.resolver.unstable_enablePackageExports = false;

// Fix Metro file indexing: some packages have TypeScript source or deeply nested
// files that Metro's default watchman crawl misses. Adding their source dirs as
// explicit watchFolders forces Metro to use glob-based crawl for those paths.
const reactNativePath = path.dirname(require.resolve('react-native/package.json'));
const gestureHandlerPath = path.dirname(require.resolve('react-native-gesture-handler/package.json'));
config.watchFolders = [
  ...(config.watchFolders || []),
  path.join(reactNativePath, 'src'),
  path.join(gestureHandlerPath, 'src'),
];

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
