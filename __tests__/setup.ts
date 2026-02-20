/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================
// JEST GLOBAL SETUP - Mocks for native modules
// ============================================
// All mock factories use require() inside to avoid out-of-scope variable errors.

// --- expo-haptics ---
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// --- expo-linear-gradient ---
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => React.createElement(View, props, props.children),
  };
});

// --- expo-blur ---
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: (props: any) => React.createElement(View, props, props.children),
  };
});

// --- expo-router ---
jest.mock('expo-router', () => {
  const { View } = require('react-native');
  return {
    useRouter: () => ({
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
      canGoBack: () => false,
    }),
    useLocalSearchParams: () => ({}),
    useSegments: () => [],
    Link: View,
    Stack: { Screen: View },
    Tabs: { Screen: View },
  };
});

// --- @react-native-async-storage ---
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
  },
}));

// --- react-native-reanimated ---
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// --- react-native-gesture-handler ---
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    GestureHandlerRootView: (props: any) => React.createElement(RN.View, props, props.children),
    PanGestureHandler: RN.View,
    TapGestureHandler: RN.View,
    State: {},
    Directions: {},
    gestureHandlerRootHOC: (component: any) => component,
    Swipeable: RN.View,
    DrawerLayout: RN.View,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    TouchableOpacity: RN.TouchableOpacity,
  };
});

// --- react-native-draggable-flatlist ---
jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { FlatList, View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => React.createElement(FlatList, props),
    ScaleDecorator: (props: any) => React.createElement(View, props, props.children),
    ShadowDecorator: (props: any) => React.createElement(View, props, props.children),
    OpacityDecorator: (props: any) => React.createElement(View, props, props.children),
  };
});

// --- expo-crypto ---
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-1234'),
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

// --- expo-splash-screen ---
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// --- expo-status-bar ---
jest.mock('expo-status-bar', () => {
  const { View } = require('react-native');
  return { StatusBar: View };
});

// --- expo-font ---
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(),
}));

// --- react-native-svg ---
jest.mock('react-native-svg', () => {
  const React = require('react');
  const createMockComponent = (name: string) => {
    const Component = (props: any) => React.createElement(name, props, props.children);
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    default: createMockComponent('Svg'),
    Svg: createMockComponent('Svg'),
    Circle: createMockComponent('Circle'),
    Ellipse: createMockComponent('Ellipse'),
    G: createMockComponent('G'),
    Text: createMockComponent('SvgText'),
    TSpan: createMockComponent('TSpan'),
    TextPath: createMockComponent('TextPath'),
    Path: createMockComponent('Path'),
    Polygon: createMockComponent('Polygon'),
    Polyline: createMockComponent('Polyline'),
    Line: createMockComponent('Line'),
    Rect: createMockComponent('Rect'),
    Use: createMockComponent('Use'),
    Image: createMockComponent('SvgImage'),
    Symbol: createMockComponent('Symbol'),
    Defs: createMockComponent('Defs'),
    LinearGradient: createMockComponent('LinearGradient'),
    RadialGradient: createMockComponent('RadialGradient'),
    Stop: createMockComponent('Stop'),
    ClipPath: createMockComponent('ClipPath'),
    Pattern: createMockComponent('Pattern'),
    Mask: createMockComponent('Mask'),
  };
});

// --- @/lib/security/logger ---
jest.mock('@/lib/security/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// --- @/lib/DevModeContext ---
jest.mock('@/lib/DevModeContext', () => ({
  useDevMode: () => ({
    isDevMode: false,
    isPro: true,
    tapCount: 0,
    showCodeInput: true,
    handleSecretTap: jest.fn(),
    setShowCodeInput: jest.fn(),
    verifyCode: jest.fn(() => Promise.resolve(false)),
    disableDevMode: jest.fn(),
  }),
  DevModeProvider: ({ children }: any) => children,
}));

// --- @/constants/themes ---
jest.mock('@/constants/themes', () => {
  const mockColors = {
    accent: '#0ABAB5',
    accentMuted: 'rgba(10, 186, 181, 0.15)',
    background: '#1A1A1E',
    backgroundCard: '#242429',
    backgroundElevated: '#2E2E35',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0B0',
    textMuted: '#6B6B80',
    border: '#38383F',
  };
  const mockTheme = { colors: mockColors, name: 'volt_dark' };
  return {
    themes: { volt_dark: mockTheme },
    themeColors: [{ key: 'volt', label: 'Volt', color: '#C8FF00' }],
    getTheme: () => mockTheme,
    defaultThemeColor: 'volt',
    defaultThemeMode: 'dark',
    GRADIENTS: {},
    ThemeColor: {},
    ThemeMode: {},
  };
});

// --- @/constants/appTheme ---
jest.mock('@/constants/appTheme', () => ({
  COLORS: {
    accent: '#0ABAB5',
    background: '#1A1A1E',
    backgroundCard: '#242429',
  },
  SPACING: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
  RADIUS: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
  FONT: {
    size: { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 24 },
  },
  TIFFANY: {
    accent: '#0ABAB5',
    background: '#1A1A1E',
    backgroundCard: '#242429',
    backgroundElevated: '#2E2E35',
  },
}));

// --- expo-sqlite ---
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
  openDatabaseAsync: jest.fn(),
}));

// --- expo-notifications ---
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

// --- react-native Modal (fix Platform.OS undefined in RN 0.81) ---
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockModal = (props: any) => {
    if (!props.visible) return null;
    return React.createElement(View, { testID: 'modal', ...props }, props.children);
  };
  MockModal.displayName = 'Modal';
  return {
    __esModule: true,
    default: MockModal,
  };
});

// --- Silence console.warn in tests ---
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated') || args[0].includes('NativeModule'))
  ) {
    return;
  }
  originalWarn(...args);
};
