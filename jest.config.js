module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|date-fns|moti|@motify|react-native-reanimated|react-native-gesture-handler|react-native-draggable-flatlist|react-native-screens|react-native-safe-area-context|@react-native-async-storage)',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules.corrupt',
    '<rootDir>/ios_backup',
    '<rootDir>/android/build',
  ],
  watchPathIgnorePatterns: [
    'node_modules\\.corrupt',
    'ios_backup',
  ],
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
    enableSymlinks: false,
    forceNodeFilesystemAPI: true,
    throwOnModuleCollision: false,
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: '<rootDir>/__tests__/jest-environment.js',
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  // Les copies de travail (archives, worktrees) ne sont pas l'app : leurs tests ne tournent pas
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/_archive', '<rootDir>/\\.claude/', '<rootDir>/dist/', '<rootDir>/_verif/', '<rootDir>/_sauvegarde_avant_mesure/', '<rootDir>/_propositions/'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
