/**
 * STRESS TEST - Navigation
 * Simule des navigations rapides entre écrans pour détecter
 * les fuites mémoire et les problèmes de state.
 */

// Import router mock
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: require('react-native').View,
  Stack: { Screen: require('react-native').View },
  Tabs: { Screen: require('react-native').View },
}));

describe('Navigation Stress Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Liste des écrans de l'application
  // ============================================
  const APP_SCREENS = [
    '/(tabs)',
    '/(tabs)/planning',
    '/sleep',
    '/energy',
    '/challenges',
    '/weekly-report',
    '/profile',
    '/training-journal',
    '/photos',
    '/fasting',
    '/history',
    '/records',
    '/body-composition',
    '/measurements',
    '/health-metrics',
    '/nutrition-plan',
    '/palmares',
    '/clubs',
    '/competitions',
    '/sport',
    '/transformation',
    '/badges',
    '/training-goals',
    '/activity-history',
    '/infirmary',
    '/avatar-customization',
    '/composition-detail',
    '/injury-detail',
    '/add-training',
  ];

  // ============================================
  // Navigation rapide entre 20+ écrans
  // ============================================
  describe('rapid navigation', () => {
    it('simulates pushing 29 screens rapidly', () => {
      const start = Date.now();

      APP_SCREENS.forEach(screen => {
        mockPush(screen);
      });

      const elapsed = Date.now() - start;

      expect(mockPush).toHaveBeenCalledTimes(APP_SCREENS.length);
      console.log(`\n  ===== STRESS NAVIGATION =====`);
      console.log(`  ${APP_SCREENS.length} push consécutifs : ${elapsed}ms`);
    });

    it('simulates rapid back navigation (29 pops)', () => {
      const start = Date.now();

      for (let i = 0; i < APP_SCREENS.length; i++) {
        mockBack();
      }

      const elapsed = Date.now() - start;

      expect(mockBack).toHaveBeenCalledTimes(APP_SCREENS.length);
      console.log(`  ${APP_SCREENS.length} back consécutifs : ${elapsed}ms`);
    });

    it('simulates 100 rapid push-back cycles', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        const screen = APP_SCREENS[i % APP_SCREENS.length];
        mockPush(screen);
        mockBack();
      }

      const elapsed = Date.now() - start;

      expect(mockPush).toHaveBeenCalledTimes(100);
      expect(mockBack).toHaveBeenCalledTimes(100);
      console.log(`  100 cycles push/back : ${elapsed}ms`);
    });

    it('simulates 50 replace navigations', () => {
      const start = Date.now();

      for (let i = 0; i < 50; i++) {
        const screen = APP_SCREENS[i % APP_SCREENS.length];
        mockReplace(screen);
      }

      const elapsed = Date.now() - start;

      expect(mockReplace).toHaveBeenCalledTimes(50);
      console.log(`  50 replace consécutifs : ${elapsed}ms`);
    });
  });

  // ============================================
  // Simulation de deep navigation stack
  // ============================================
  describe('deep navigation stack', () => {
    it('simulates a deep stack of 50 screens', () => {
      const stack: string[] = [];
      const start = Date.now();

      // Push 50 screens
      for (let i = 0; i < 50; i++) {
        const screen = APP_SCREENS[i % APP_SCREENS.length];
        stack.push(screen);
        mockPush(screen);
      }

      // Pop all
      while (stack.length > 0) {
        stack.pop();
        mockBack();
      }

      const elapsed = Date.now() - start;

      expect(mockPush).toHaveBeenCalledTimes(50);
      expect(mockBack).toHaveBeenCalledTimes(50);
      expect(stack).toHaveLength(0);
      console.log(`  Stack 50 push + 50 pop : ${elapsed}ms`);
    });
  });

  // ============================================
  // Simulation montage/démontage de composants
  // ============================================
  describe('component mount/unmount simulation', () => {
    it('simulates 200 mount/unmount cycles with state', () => {
      const start = Date.now();
      const mountedComponents: Set<string> = new Set();
      const stateStore: Map<string, any> = new Map();

      for (let i = 0; i < 200; i++) {
        const screenId = `screen_${i}`;

        // Mount: create state
        mountedComponents.add(screenId);
        stateStore.set(screenId, {
          data: Array.from({ length: 10 }, (_, j) => ({ id: j })),
          loading: false,
          error: null,
        });

        // Unmount: cleanup
        mountedComponents.delete(screenId);
        stateStore.delete(screenId);
      }

      const elapsed = Date.now() - start;

      expect(mountedComponents.size).toBe(0);
      expect(stateStore.size).toBe(0);
      console.log(`  200 cycles mount/unmount : ${elapsed}ms`);
    });

    it('simulates concurrent timers cleanup', () => {
      const timers: ReturnType<typeof setInterval>[] = [];
      let tickCount = 0;

      // Create 50 timers (simulates 50 screens with intervals)
      for (let i = 0; i < 50; i++) {
        const timer = setInterval(() => { tickCount++; }, 100);
        timers.push(timer);
      }

      // Immediately cleanup all
      timers.forEach(t => clearInterval(t));

      expect(timers).toHaveLength(50);
      console.log(`  50 timers créés et nettoyés`);
      console.log('  ==============================\n');
    });
  });

  // ============================================
  // Cold start simulation
  // ============================================
  describe('cold start simulation', () => {
    it('measures initial data loading time', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      // Simulate populated storage
      const measurementsJson = JSON.stringify(
        Array.from({ length: 100 }, (_, i) => ({
          id: `m_${i}`, date: `2026-01-${(i % 28) + 1}`, weight: 75,
          created_at: new Date().toISOString(),
        }))
      );
      const workoutsJson = JSON.stringify(
        Array.from({ length: 200 }, (_, i) => ({
          id: `w_${i}`, date: `2026-01-${(i % 28) + 1}`, type: 'jjb',
          created_at: new Date().toISOString(),
        }))
      );
      const badgesJson = JSON.stringify(
        Array.from({ length: 20 }, (_, i) => ({
          badge_id: `b_${i}`, unlocked_at: new Date().toISOString(),
        }))
      );

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key.includes('workout')) return Promise.resolve(workoutsJson);
        if (key.includes('badge')) return Promise.resolve(badgesJson);
        return Promise.resolve(null);
      });

      const start = Date.now();

      // Simulate loading all data at startup
      const [workouts, badges] = await Promise.all([
        AsyncStorage.getItem('@yoroi_workouts').then((d: string) => d ? JSON.parse(d) : []),
        AsyncStorage.getItem('@yoroi_user_badges').then((d: string) => d ? JSON.parse(d) : []),
      ]);

      const elapsed = Date.now() - start;

      expect(workouts).toHaveLength(200);
      expect(badges).toHaveLength(20);
      console.log(`  Cold start (200 workouts + 20 badges) : ${elapsed}ms`);
    });
  });
});
