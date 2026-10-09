/**
 * Preload script to break circular dependency issues in Expo/Metro module loading.
 * These modules use `module.exports = X` (replacement style) and get cached as `{}`
 * when they're first required inside a circular dependency chain.
 * By loading them here (before the chain starts), they're in cache as complete modules.
 */
'use strict';

const moduleNames = [
  'ws',
  'gensync',
  'metro-config',
  '@expo/metro/metro',
  '@expo/metro/metro-config',
  'resolve-workspace-root',
];

for (const name of moduleNames) {
  try {
    require(name);
  } catch (e) {
    // Ignore errors — some modules may not be resolvable in all contexts
  }
}
