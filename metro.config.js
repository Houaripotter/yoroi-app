const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watchman activé — le mode sans watchman bloque sur les projets avec beaucoup de fichiers
// (ex: lucide-react-native a 3274 icônes, le crawler JS natif deadlocke).
// config.watchman = false; // NE PAS désactiver watchman

// Forcer 1 worker (séquentiel) pour éviter le deadlock des worker threads Metro.
// Avec plusieurs workers, tous se retrouvent en attente d'un module partagé → deadlock.
// 1 worker est plus lent mais ne deadlocke jamais.
config.maxWorkers = 1;

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
  // Doublons créés par iCloud/Finder (ex: "healthConnect.ios 2.ts") — ils
  // doublent les listeners DeviceEventEmitter → banner "Import santé" qui
  // clignote + boucle YOROI_DATA_CHANGED toutes les 10s.
  /.*\s\d+\.(ts|tsx|js|jsx)$/,
  // Cles et jetons du Studio createur : jamais dans le bundle
  /[\/\\]_private[\/\\].*/,
];

const existing = config.resolver.blockList;
config.resolver.blockList = existing
  ? [...(Array.isArray(existing) ? existing : [existing]), ...blockListEntries]
  : blockListEntries;

// Rediriger lucide-react-native vers le barrel optimisé (233 icônes au lieu de 3274).
// lucide-react-native v0.544.0 utilise le champ "react-native" → ESM → 3274 fichiers
// individuels → Metro deadlocke avec les worker threads. Ce resolver charge seulement
// les icônes réellement utilisées dans l'app.
const lucideOptimizedPath = path.resolve(__dirname, 'lib/lucide-optimized.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lucide-react-native') {
    return { filePath: lucideOptimizedPath, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
