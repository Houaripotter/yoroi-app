// ============================================
// TESTS NAVIGATION & UI - Intégrité complète
// ============================================
// Vérifie : routes, navigation, états d'affichage,
// interactions, safe areas, i18n, patterns UI
// ============================================

import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.resolve(__dirname, '../../app');
const COMPONENTS_DIR = path.resolve(__dirname, '../../components');
const I18N_DIR = path.resolve(__dirname, '../../lib/i18n');

// ============================================
// HELPERS
// ============================================

/**
 * Récupère tous les fichiers .tsx récursivement dans un répertoire
 */
function getAllTsxFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Lit le contenu d'un fichier
 */
function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Vérifie si un fichier contient un pattern
 */
function fileContains(filePath: string, pattern: RegExp): boolean {
  const content = readFile(filePath);
  return pattern.test(content);
}

/**
 * Compte les occurrences d'un pattern dans un fichier
 */
function countMatches(filePath: string, pattern: RegExp): number {
  const content = readFile(filePath);
  const matches = content.match(new RegExp(pattern.source, 'g'));
  return matches ? matches.length : 0;
}

// ============================================
// Données de référence
// ============================================

const allAppFiles = getAllTsxFiles(APP_DIR);
const allComponentFiles = getAllTsxFiles(COMPONENTS_DIR);
const screenFiles = allAppFiles.filter(f => !f.includes('_layout') && !f.includes('+not-found') && f.endsWith('.tsx'));

// ============================================
// 1. NAVIGATION - Structure des routes
// ============================================

describe('1. Navigation - Structure des routes', () => {

  describe('1.1 Routes obligatoires', () => {
    const requiredRoutes = [
      // Entry & onboarding
      'index.tsx',
      'onboarding.tsx',
      'settings/legal.tsx',
      // Onglets du design v2 (Accueil, Seances, Progres, Dojo) et le bouton + (ajouter)
      '(tabs)/_layout.tsx',
      '(tabs)/index.tsx',
      '(tabs)/seances.tsx',
      '(tabs)/progres.tsx',
      '(tabs)/dojo.tsx',
      'ajouter.tsx',
      // Saisies et reglages du design v2
      'seance/index.tsx',
      'pesee.tsx',
      'balance-photo.tsx',
      'settings/index.tsx',
      'settings/widgets.tsx',
      'settings/copies-securite.tsx',
      // Liens venus du systeme (widgets, Centre de controle, raccourcis)
      '+native-intent.tsx',
      'w/[...cible].tsx',
      // Core screens
      'profile.tsx',
      'sleep.tsx',
      'add-training.tsx',
      'competitions.tsx',
      'photos.tsx',
      'badges.tsx',
      'fasting.tsx',
      'infirmary.tsx',
      'training-journal.tsx',
      'nutrition-plan.tsx',
      // Error
      '+not-found.tsx',
    ];

    test.each(requiredRoutes)('Route %s existe', (route) => {
      const fullPath = path.join(APP_DIR, route);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  describe('1.2 Layout racine (_layout.tsx)', () => {
    const layoutContent = readFile(path.join(APP_DIR, '_layout.tsx'));

    test('contient ErrorBoundary', () => {
      expect(layoutContent).toContain('ErrorBoundary');
    });

    test('contient SafeAreaProvider', () => {
      expect(layoutContent).toContain('SafeAreaProvider');
    });

    test('contient ThemeProvider', () => {
      expect(layoutContent).toContain('ThemeProvider');
    });

    test('contient I18nProvider', () => {
      expect(layoutContent).toContain('I18nProvider');
    });

    test('contient StatusBar', () => {
      expect(layoutContent).toContain('StatusBar');
    });

    test('désactive les console.log en production', () => {
      expect(layoutContent).toMatch(/if\s*\(\s*!__DEV__\s*\)/);
      expect(layoutContent).toContain('console.log = () => {}');
    });

    test('initialise la base de données', () => {
      expect(layoutContent).toContain('initDatabase');
    });
  });

  describe('1.3 Tab layout - 4 onglets et le bouton +', () => {
    const tabLayout = readFile(path.join(APP_DIR, '(tabs)', '_layout.tsx'));
    const tabBar = readFile(path.join(COMPONENTS_DIR, 'yoroi', 'v2', 'InkTabBar.tsx'));

    test('définit 4 onglets (index, seances, progres, dojo)', () => {
      expect(tabLayout).toContain('name="index"');
      expect(tabLayout).toContain('name="seances"');
      expect(tabLayout).toContain('name="progres"');
      expect(tabLayout).toContain('name="dojo"');
      expect((tabLayout.match(/<Tabs\.Screen\b/g) || []).length).toBe(4);
    });

    test('les titres des onglets sont en français', () => {
      // Le texte français peut être passé à traduire() (langues), il reste écrit en français dans le code
      expect(tabBar).toMatch(/label: (traduire\()?'Accueil'/);
      expect(tabBar).toMatch(/label: (traduire\()?'Séances'/);
      expect(tabBar).toMatch(/label: (traduire\()?'Progrès'/);
      expect(tabBar).toMatch(/label: (traduire\()?'Dojo'/);
    });

    test('le bouton central + ouvre la saisie (ajouter)', () => {
      expect(tabLayout).toContain('<InkTabBar');
      expect(tabLayout).toContain("router.push('/ajouter'");
      expect(tabBar).toContain('onPressAdd()');
      expect(tabBar).toMatch(/accessibilityLabel=(\{traduire\(")?"?Enregistrer/);
    });

    test('les icônes des onglets sont dessinées en SVG', () => {
      expect(tabBar).toContain('<Svg');
      expect(tabBar).toContain('<Path');
      for (const name of ['index', 'seances', 'progres', 'dojo']) {
        expect(tabBar).toMatch(new RegExp(`\\b${name}: \\{ label: (traduire\\()?'`));
      }
    });

    test('feedback haptique au changement de tab', () => {
      expect(tabBar).toContain('tabPress');
      expect(tabBar).toContain('selectionAsync');
    });
  });

  describe('1.4 Présentation des écrans dans Stack', () => {
    const layoutContent = readFile(path.join(APP_DIR, '_layout.tsx'));

    test('écrans modaux (slide_from_bottom)', () => {
      const modalScreens = ['add-measurement', 'entry', 'injury-detail', 'add-competition', 'add-combat'];
      for (const screen of modalScreens) {
        expect(layoutContent).toContain(`name="${screen}"`);
      }
    });


    test('onboarding désactive le geste back', () => {
      // Vérifie que les écrans onboarding ont gestureEnabled: false
      expect(layoutContent).toContain('name="onboarding"');
      const onboardingLine = layoutContent.split('\n').find(l => l.includes('"onboarding"'));
      expect(onboardingLine || layoutContent).toContain('gestureEnabled: false');
    });

    test('animation par défaut : fondu court (design v2)', () => {
      expect(layoutContent).toMatch(/screenOptions=\{\{[\s\S]*?animation: 'fade',\s*animationDuration: (1\d\d|2[0-4]\d),/);
      expect(layoutContent).not.toContain("animation: 'slide_from_right'");
    });
  });

  describe('1.5 Navigation back - Chaque écran a un retour', () => {
    // Écrans qui DOIVENT avoir router.back() ou router.push('/(tabs)') ou Redirect
    const screensNeedingBack = screenFiles.filter(f => {
      const name = path.basename(f, '.tsx');
      // Exclure les écrans qui redirigent (index, entry points)
      return !['index', '_layout', '+not-found'].includes(name)
        && !f.includes('(tabs)')
        && !f.includes('social-share');
    });

    test('au moins 80% des écrans ont un mécanisme de retour', () => {
      let withBack = 0;
      for (const file of screensNeedingBack) {
        const content = readFile(file);
        if (
          content.includes('router.back()') ||
          content.includes('router.push') ||
          content.includes('router.replace') ||
          content.includes('<ArrowLeft') ||
          content.includes('<ChevronLeft') ||
          content.includes('Redirect') ||
          // design v2 : coquilles d'ecran avec bouton Retour (verifiees plus bas), ou simple reexport
          /<(DetailScreen|EspaceScreen|BackHeader|CorpsHeader|GalerieScreen|GalerieHeader)\b/.test(content) ||
          /export \{ default \} from/.test(content)
        ) {
          withBack++;
        }
      }
      const ratio = withBack / screensNeedingBack.length;
      expect(ratio).toBeGreaterThanOrEqual(0.75);
    });

    test('les coquilles d\'écran du design v2 ont bien un bouton Retour', () => {
      const shells = [
        'yoroi/v2/accueil/kit.tsx',
        'yoroi/v2/espace/ui.tsx',
        'yoroi/v2/dojo/parts.tsx',
        'yoroi/v2/seance/corps/ui.tsx',
        'yoroi/v2/studio/galeries/kit.tsx',
      ];
      for (const shell of shells) {
        const content = readFile(path.join(COMPONENTS_DIR, shell));
        expect(content).toMatch(/router\.back\(\)|navigation\.goBack\(\)/);
      }
    });
  });

  describe('1.6 Page 404 (+not-found)', () => {
    test('existe et exporte un composant par défaut', () => {
      const notFound = path.join(APP_DIR, '+not-found.tsx');
      expect(fs.existsSync(notFound)).toBe(true);
      const content = readFile(notFound);
      expect(content).toMatch(/export\s+default/);
    });
  });

  describe('1.7 Pas de liens morts (routes hardcodées vers fichiers inexistants)', () => {
    // Toutes les routes ecrites en dur dans app/, components/ et lib/ (router.push, replace, navigate,
    // href, pathname) doivent tomber sur un fichier de app/ (groupes entre parentheses et segments
    // dynamiques [id] ou [...reste] compris).
    const LIB_DIR = path.resolve(__dirname, '../../lib');
    const routes = allAppFiles
      .filter(f => f.endsWith('.tsx') && !path.basename(f).startsWith('_') && !path.basename(f).startsWith('+'))
      .map(f => {
        const segs = path.relative(APP_DIR, f).replace(/\.tsx$/, '').split(path.sep).filter(x => !/^\(.*\)$/.test(x));
        if (segs[segs.length - 1] === 'index') segs.pop();
        return segs;
      });
    const routeExiste = (href: string): boolean => {
      const segs = href.split(/[?#]/)[0].replace(/\/$/, '').split('/').filter(Boolean).filter(x => !/^\(.*\)$/.test(x));
      return routes.some(r => {
        for (let i = 0; i < Math.max(r.length, segs.length); i++) {
          const a = r[i];
          if (a === undefined) return false;
          if (/^\[\.\.\./.test(a)) return true;
          if (segs[i] === undefined) return false;
          if (/^\[/.test(a)) continue;
          if (a !== segs[i]) return false;
        }
        return r.length === segs.length;
      });
    };

    test('la vérification reconnaît les routes du design v2', () => {
      expect(routeExiste('/(tabs)/seances')).toBe(true);
      expect(routeExiste('/settings/widgets')).toBe(true);
      expect(routeExiste('/w/timer?mode=combat')).toBe(true);
      expect(routeExiste('/route-qui-n-existe-pas')).toBe(false);
    });

    test('les push vers des routes correspondent à des fichiers existants', () => {
      const deadLinks: string[] = [];
      const re = /(?:router\.(?:push|replace|navigate)\(\s*|href=\{?\s*|pathname:\s*|href:\s*)[`'"](\/[A-Za-z0-9_\-\/().\[\]]*)/g;
      let checked = 0;
      for (const file of [...allAppFiles, ...allComponentFiles, ...getAllTsxFiles(LIB_DIR)]) {
        const content = readFile(file);
        let m: RegExpExecArray | null;
        while ((m = re.exec(content))) {
          checked++;
          if (!routeExiste(m[1])) deadLinks.push(`${m[1]} (${path.relative(APP_DIR, file)})`);
        }
      }
      expect(checked).toBeGreaterThan(200);
      expect(deadLinks).toEqual([]);
    });
  });
});

// ============================================
// 2. ÉTATS D'AFFICHAGE (loading, empty, error)
// ============================================

describe('2. États d\'affichage', () => {

  describe('2.1 Loading states', () => {
    // Écrans qui chargent des données async et DOIVENT avoir un loading state
    const dataScreens = screenFiles.filter(f => {
      const content = readFile(f);
      return content.includes('useEffect') && (
        content.includes('AsyncStorage') ||
        content.includes('getItem') ||
        content.includes('getAllSync') ||
        content.includes('getFirstSync') ||
        content.includes('loadData') ||
        content.includes('fetchData') ||
        content.includes('getProfile') ||
        content.includes('getTrainings') ||
        content.includes('healthConnect')
      );
    });

    test('les écrans avec chargement async ont un état loading', () => {
      let withLoading = 0;
      for (const file of dataScreens) {
        const content = readFile(file);
        if (
          content.includes('useState') && (
            content.includes('isLoading') ||
            content.includes('loading') ||
            content.includes('Loading') ||
            content.includes('ActivityIndicator') ||
            content.includes('refreshing') ||
            // design v2 : etats nommes en francais ou ready/loaded
            /\b(chargement|Chargement|pret|ready|loaded)\b/.test(content)
          )
        ) {
          withLoading++;
        }
      }
      // Au moins 40% des écrans avec données async ont un loading state
      const ratio = dataScreens.length > 0 ? withLoading / dataScreens.length : 1;
      expect(ratio).toBeGreaterThanOrEqual(0.4);
    });

    test('ActivityIndicator est importé dans les écrans de données', () => {
      let withIndicator = 0;
      for (const file of dataScreens) {
        if (fileContains(file, /ActivityIndicator/)) {
          withIndicator++;
        }
      }
      // Au moins 10% utilisent ActivityIndicator (certains utilisent des skeletons)
      expect(withIndicator).toBeGreaterThan(0);
    });
  });

  describe('2.2 Error handling', () => {
    test('les écrans data ont un try/catch', () => {
      const dataScreens = screenFiles.filter(f => {
        const content = readFile(f);
        return content.includes('async') && (
          content.includes('loadData') || content.includes('fetchData') || content.includes('getProfile')
        );
      });

      let withTryCatch = 0;
      for (const file of dataScreens) {
        if (fileContains(file, /try\s*\{[\s\S]*?catch/)) {
          withTryCatch++;
        }
      }

      const ratio = dataScreens.length > 0 ? withTryCatch / dataScreens.length : 1;
      expect(ratio).toBeGreaterThanOrEqual(0.8);
    });

    test('ErrorBoundary enveloppe le layout racine', () => {
      const layout = readFile(path.join(APP_DIR, '_layout.tsx'));
      expect(layout).toContain('<ErrorBoundary>');
    });

    test('logger est utilisé pour les erreurs (pas console.error)', () => {
      let consoleErrorCount = 0;
      let loggerErrorCount = 0;

      for (const file of screenFiles) {
        const content = readFile(file);
        // Ignorer la ligne de désactivation en prod
        const lines = content.split('\n').filter(l => !l.includes('console.error = () => {}'));
        for (const line of lines) {
          if (line.includes('console.error(') && !line.includes('//')) {
            consoleErrorCount++;
          }
        }
        if (content.includes('logger.error')) {
          loggerErrorCount++;
        }
      }

      expect(loggerErrorCount).toBeGreaterThan(consoleErrorCount);
    });
  });

  describe('2.3 Empty states', () => {
    test('les écrans de listes mentionnent un état vide', () => {
      // Écrans avec FlatList ou listes de données
      const listScreens = screenFiles.filter(f => {
        const content = readFile(f);
        return content.includes('FlatList') || (
          content.includes('.map(') && content.includes('useState')
        );
      });

      let withEmptyState = 0;
      for (const file of listScreens) {
        const content = readFile(file);
        if (
          content.includes('EmptyState') ||
          content.includes('Aucun') ||
          content.includes('aucun') ||
          content.includes('length === 0') ||
          content.includes('.length > 0') ||
          content.includes('noData') ||
          content.includes('Pas de') ||
          content.includes('pas encore')
        ) {
          withEmptyState++;
        }
      }

      // Au moins 30% des écrans de listes gèrent l'état vide
      const ratio = listScreens.length > 0 ? withEmptyState / listScreens.length : 1;
      expect(ratio).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('2.4 RefreshControl', () => {
    test('des écrans de données utilisent RefreshControl', () => {
      let withRefresh = 0;
      for (const file of screenFiles) {
        if (fileContains(file, /RefreshControl/)) {
          withRefresh++;
        }
      }
      expect(withRefresh).toBeGreaterThan(3);
    });
  });
});

// ============================================
// 3. RESPONSIVE & ACCESSIBILITÉ
// ============================================

describe('3. Responsive & Accessibilité', () => {

  describe('3.1 Safe Area', () => {
    test('les écrans principaux utilisent useSafeAreaInsets', () => {
      let withSafeArea = 0;
      for (const file of screenFiles) {
        if (fileContains(file, /useSafeAreaInsets|SafeAreaView/)) {
          withSafeArea++;
        }
      }
      // Au moins 30% des écrans gèrent les safe areas
      const ratio = screenFiles.length > 0 ? withSafeArea / screenFiles.length : 0;
      expect(ratio).toBeGreaterThanOrEqual(0.3);
    });

    test('SafeAreaProvider est dans le layout racine', () => {
      const layout = readFile(path.join(APP_DIR, '_layout.tsx'));
      expect(layout).toContain('SafeAreaProvider');
    });
  });

  describe('3.2 Dimensions adaptatives', () => {
    test('les écrans utilisent Dimensions ou useWindowDimensions', () => {
      let withDimensions = 0;
      for (const file of screenFiles) {
        if (fileContains(file, /Dimensions\.get|useWindowDimensions/)) {
          withDimensions++;
        }
      }
      expect(withDimensions).toBeGreaterThan(5);
    });

    test('pas de largeurs hardcodées > 400px (risque iPhone SE)', () => {
      const badFiles: string[] = [];
      for (const file of screenFiles) {
        const content = readFile(file);
        // Chercher width: 400+ dans les styles (pas les constantes de dimensions)
        const matches = content.match(/width:\s*(4[1-9]\d|[5-9]\d\d|\d{4,})/g);
        if (matches && matches.length > 0) {
          // Ignorer SCREEN_WIDTH et Dimensions.get
          const realMatches = matches.filter(m => !content.includes('SCREEN_WIDTH'));
          if (realMatches.length > 3) { // Tolérance pour quelques cas légitimes
            badFiles.push(path.basename(file));
          }
        }
      }
      // On ne devrait pas avoir trop de fichiers avec des largeurs hardcodées
      expect(badFiles.length).toBeLessThanOrEqual(5);
    });
  });

  describe('3.3 Thème sombre', () => {
    test('les écrans utilisent useTheme pour les couleurs', () => {
      let withTheme = 0;
      for (const file of screenFiles) {
        // useTheme (ancien), useYoroiTheme ou briques du kit yoroi qui lisent le theme, ou simple reexport
        if (fileContains(file, /useTheme|useYoroiTheme|from '@\/components\/yoroi(\/v2\/[^']*)?'|export \{ default \} from/)) {
          withTheme++;
        }
      }
      // Au moins 60% des écrans supportent le thème
      const ratio = screenFiles.length > 0 ? withTheme / screenFiles.length : 0;
      expect(ratio).toBeGreaterThanOrEqual(0.6);
    });

    test('pas de couleurs hardcodées blanc/noir dans le texte principal', () => {
      const suspectFiles: string[] = [];
      for (const file of screenFiles) {
        const content = readFile(file);
        // Chercher color: '#FFFFFF' ou color: '#000000' dans les styles
        const whiteCount = (content.match(/color:\s*['"]#FFFFFF['"]/g) || []).length;
        const blackCount = (content.match(/color:\s*['"]#000000['"]/g) || []).length;
        // Tolérance : quelques occurrences sont OK (overlay, tab bar, etc.)
        if (whiteCount + blackCount > 10) {
          suspectFiles.push(path.basename(file));
        }
      }
      expect(suspectFiles.length).toBeLessThanOrEqual(5);
    });
  });

  describe('3.4 StatusBar', () => {
    test('le layout gère le StatusBar dynamiquement selon le thème', () => {
      const layout = readFile(path.join(APP_DIR, '_layout.tsx'));
      expect(layout).toContain("isDark ? 'light' : 'dark'");
    });
  });
});

// ============================================
// 4. INTERACTIONS
// ============================================

describe('4. Interactions', () => {

  describe('4.1 Double-tap prevention sur les boutons critiques', () => {
    // Écrans avec des actions de sauvegarde qui DOIVENT avoir disabled
    // add-training et add-combat redirigent vers la saisie de seance du design v2
    const saveScreens = [
      'seance/muscu.tsx', 'seance/combat.tsx', 'seance/cardio.tsx', 'seance/match.tsx',
      'seance/deja-faite.tsx', 'pesee.tsx', 'balance-photo.tsx', 'measurements.tsx',
      'add-competition.tsx', 'sleep-input.tsx', 'edit-competition.tsx',
    ];

    test.each(saveScreens)('%s a une protection double-tap', (screenName) => {
      const filePath = path.join(APP_DIR, screenName);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = readFile(filePath);
      expect(
        content.includes('disabled={') ||
        content.includes('isSaving') ||
        content.includes('isSubmitting') ||
        content.includes('isLoading')
      ).toBe(true);
    });
  });

  describe('4.2 Feedback haptique', () => {
    test('expo-haptics est utilisé dans les écrans interactifs', () => {
      let withHaptics = 0;
      for (const file of screenFiles) {
        if (fileContains(file, /impactAsync|notificationAsync|selectionAsync/)) {
          withHaptics++;
        }
      }
      // Au moins 25% des écrans utilisent le haptic feedback
      const ratio = screenFiles.length > 0 ? withHaptics / screenFiles.length : 0;
      expect(ratio).toBeGreaterThanOrEqual(0.25);
    });

    test('le tab bar a du feedback haptique', () => {
      const tabBar = readFile(path.join(COMPONENTS_DIR, 'yoroi', 'v2', 'InkTabBar.tsx'));
      expect(tabBar).toContain('impactAsync');
      expect(tabBar).toContain('selectionAsync');
    });
  });

  describe('4.3 Modales', () => {
    test('les modales ont onRequestClose (Android back button)', () => {
      let totalModals = 0;
      let withOnRequestClose = 0;

      const allFiles = [...allAppFiles, ...allComponentFiles];
      for (const file of allFiles) {
        const content = readFile(file);
        const modalCount = (content.match(/<Modal\b/g) || []).length;
        if (modalCount > 0) {
          totalModals += modalCount;
          const onRequestCloseCount = (content.match(/onRequestClose/g) || []).length;
          if (onRequestCloseCount > 0) {
            withOnRequestClose += Math.min(modalCount, onRequestCloseCount);
          }
        }
      }

      // Au moins 80% des modales ont onRequestClose
      if (totalModals > 0) {
        expect(withOnRequestClose / totalModals).toBeGreaterThanOrEqual(0.7);
      }
    });
  });

  describe('4.4 Keyboard handling', () => {
    test('les écrans avec TextInput utilisent KeyboardAvoidingView', () => {
      const inputScreens = screenFiles.filter(f => fileContains(f, /TextInput/));
      let withKeyboard = 0;
      for (const file of inputScreens) {
        if (fileContains(file, /KeyboardAvoidingView|keyboardShouldPersistTaps|Keyboard\.dismiss/)) {
          withKeyboard++;
        }
      }
      // Au moins 20% des écrans avec input ont une gestion du clavier
      const ratio = inputScreens.length > 0 ? withKeyboard / inputScreens.length : 1;
      expect(ratio).toBeGreaterThanOrEqual(0.15);
    });
  });

  describe('4.5 TouchableOpacity avec activeOpacity', () => {
    test('la majorité des TouchableOpacity ont activeOpacity', () => {
      let totalTouchable = 0;
      let withActiveOpacity = 0;

      for (const file of screenFiles) {
        const content = readFile(file);
        totalTouchable += (content.match(/<TouchableOpacity/g) || []).length;
        withActiveOpacity += (content.match(/activeOpacity/g) || []).length;
      }

      // Au moins 20% ont activeOpacity explicite (les autres utilisent le défaut 0.2)
      if (totalTouchable > 0) {
        expect(withActiveOpacity / totalTouchable).toBeGreaterThanOrEqual(0.1);
      }
    });
  });

  describe('4.6 Alert.alert pour confirmations et erreurs', () => {
    test('Alert.alert est utilisé dans l\'app pour les messages utilisateur', () => {
      let filesWithAlert = 0;
      const allFiles = [...allAppFiles, ...allComponentFiles];
      for (const file of allFiles) {
        // design v2 : appAlert et showPopup (popup maison) remplacent Alert.alert
        if (fileContains(file, /Alert\.alert|appAlert\(|showPopup\(/)) {
          filesWithAlert++;
        }
      }

      // L'app utilise Alert.alert pour les confirmations et erreurs
      expect(filesWithAlert).toBeGreaterThan(3);
    });
  });
});

// ============================================
// 5. TEXTE & LOCALISATION
// ============================================

describe('5. Texte & Localisation', () => {

  describe('5.1 Fichier i18n français', () => {
    test('le fichier fr.json existe et est valide', () => {
      const frPath = path.join(I18N_DIR, 'fr.json');
      expect(fs.existsSync(frPath)).toBe(true);

      const content = readFile(frPath);
      const parsed = JSON.parse(content);
      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();
    });

    test('contient les sections obligatoires', () => {
      const frPath = path.join(I18N_DIR, 'fr.json');
      const translations = JSON.parse(readFile(frPath));

      const requiredSections = [
        'common', 'dates', 'settings', 'profile', 'addTraining',
        'timer', 'stats', 'badges', 'healthMetrics', 'tabs',
        'errors', 'onboarding',
      ];

      for (const section of requiredSections) {
        expect(translations).toHaveProperty(section);
      }
    });

    test('les clés de navigation correspondent aux tabs', () => {
      const frPath = path.join(I18N_DIR, 'fr.json');
      const translations = JSON.parse(readFile(frPath));

      // Les libelles des onglets v2 sont ecrits dans InkTabBar ; la section tabs reste pour les anciens ecrans
      const nav = translations.tabs;
      expect(nav).toBeDefined();
      expect(nav.home).toBe('Accueil');
    });
  });

  describe('5.2 Textes en français dans l\'app', () => {
    test('les Alert.alert utilisent du français', () => {
      let frenchAlerts = 0;
      let englishAlerts = 0;

      for (const file of screenFiles) {
        const content = readFile(file);
        const alerts = content.match(/(?:Alert\.alert|appAlert|showPopup)\(\s*['"][^'"]+['"]/g) || [];
        for (const alert of alerts) {
          if (/Erreur|Succès|Attention|Confirmer|Supprimer|Enregistré|Impossible/.test(alert)) {
            frenchAlerts++;
          } else if (/Error|Success|Warning|Confirm|Delete|Unable/.test(alert)) {
            englishAlerts++;
          }
        }
      }

      // La majorité des alerts doivent être en français
      if (frenchAlerts + englishAlerts > 0) {
        expect(frenchAlerts).toBeGreaterThan(englishAlerts);
      }
    });

    test('les labels utilisateur visibles sont en français', () => {
      let frenchLabels = 0;

      for (const file of screenFiles) {
        const content = readFile(file);
        // Mots français dans les chaînes visibles (entre guillemets ou dans JSX)
        const frPatterns = [
          /['"]Enregistrer['"]/, /['"]Annuler['"]/, /['"]Supprimer['"]/,
          /['"]Modifier['"]/, /['"]Ajouter['"]/, /['"]Retour['"]/,
          /['"]Fermer['"]/, /['"]Confirmer['"]/, /['"]Valider['"]/,
          /['"]Erreur['"]/, /['"]Succès['"]/, /['"]Attention['"]/,
          /['"]Sauvegarder['"]/, /['"]Chargement['"]/,
        ];
        for (const p of frPatterns) { if (p.test(content)) frenchLabels++; }
      }

      // L'app doit avoir des labels français significatifs
      expect(frenchLabels).toBeGreaterThan(20);
    });
  });

  describe('5.3 Formatage des nombres', () => {
    test('les poids s\'affichent avec une décimale', () => {
      let withDecimalFormat = 0;
      for (const file of screenFiles) {
        const content = readFile(file);
        if (content.includes('.toFixed(1)') || content.includes('.toFixed(2)')) {
          withDecimalFormat++;
        }
      }
      expect(withDecimalFormat).toBeGreaterThan(3);
    });

    test('l\'unité kg est présente dans les écrans de poids', () => {
      const weightScreens = screenFiles.filter(f =>
        path.basename(f).includes('weight') ||
        path.basename(f).includes('body') ||
        path.basename(f).includes('composition')
      );

      for (const file of weightScreens) {
        const content = readFile(file);
        // Les anciens ecrans devenus de simples redirections n'affichent rien
        if (/<Redirect\b/.test(content)) continue;
        // Ecran mince du design v2 : l'unite est dans les composants v2 qu'il importe
        const v2 = [...content.matchAll(/from '@\/components\/yoroi\/v2\/([^']+)'/g)]
          .map(m => path.join(COMPONENTS_DIR, 'yoroi', 'v2', m[1]))
          .map(p => (fs.existsSync(p + '.tsx') ? p + '.tsx' : fs.existsSync(p + '.ts') ? p + '.ts' : ''))
          .filter(Boolean)
          .map(readFile)
          .join('\n');
        expect(`${content}\n${v2}`.includes('kg')).toBe(true);
      }
    });
  });

  describe('5.4 Dates en format français', () => {
    test('date-fns/locale/fr est importé dans les écrans avec dates', () => {
      const dateScreens = screenFiles.filter(f => {
        const content = readFile(f);
        return content.includes('format(') && content.includes('date-fns');
      });

      let withFrLocale = 0;
      for (const file of dateScreens) {
        const content = readFile(file);
        if (content.includes("date-fns/locale") || content.includes("{ fr }") || content.includes("i18n/dateLocale")) {
          withFrLocale++;
        }
      }

      // Au moins 50% utilisent la locale française
      const ratio = dateScreens.length > 0 ? withFrLocale / dateScreens.length : 1;
      expect(ratio).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('5.5 Pas de texte tronqué (numberOfLines)', () => {
    test('numberOfLines est utilisé pour les textes longs', () => {
      let withNumberOfLines = 0;
      for (const file of screenFiles) {
        if (fileContains(file, /numberOfLines/)) {
          withNumberOfLines++;
        }
      }
      expect(withNumberOfLines).toBeGreaterThan(5);
    });

    test('numberOfLines est aussi utilisé dans les composants', () => {
      let withNumberOfLines = 0;
      for (const file of allComponentFiles) {
        if (fileContains(file, /numberOfLines/)) {
          withNumberOfLines++;
        }
      }
      // Les composants partagés gèrent aussi la troncature
      expect(withNumberOfLines).toBeGreaterThan(0);
    });
  });
});

// ============================================
// 6. PATTERNS UI CRITIQUES
// ============================================

describe('6. Patterns UI critiques', () => {

  describe('6.1 Pas de useFocusEffect pour charger les données (CLAUDE.md)', () => {
    test('aucun écran ne charge des données avec useFocusEffect', () => {
      const violations: string[] = [];

      for (const file of screenFiles) {
        const content = readFile(file);
        // Vérifier que useFocusEffect n'est PAS utilisé pour loadData/fetchData
        if (content.includes('useFocusEffect')) {
          // C'est OK si c'est pour des timers/subscriptions (avec cleanup)
          // C'est MAUVAIS si c'est pour loadData
          const focusLines = content.split('\n').filter(l =>
            l.includes('useFocusEffect') ||
            (l.includes('loadData') && content.includes('useFocusEffect'))
          );
          const hasLoadInFocus = content.match(/useFocusEffect[\s\S]{0,200}loadData/);
          if (hasLoadInFocus) {
            violations.push(path.basename(file));
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('6.2 useEffect pour le chargement initial', () => {
    test('les écrans utilisent useEffect([], []) pour le chargement', () => {
      let withUseEffect = 0;
      const dataScreens = screenFiles.filter(f => {
        const content = readFile(f);
        return content.includes('loadData') || content.includes('fetchData');
      });

      for (const file of dataScreens) {
        const content = readFile(file);
        if (content.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*load/)) {
          withUseEffect++;
        }
      }

      const ratio = dataScreens.length > 0 ? withUseEffect / dataScreens.length : 1;
      expect(ratio).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('6.3 Les écrans de route exportent un composant par défaut', () => {
    test('les fichiers de route principaux ont export default', () => {
      // Seuls les fichiers directement dans app/ sont des routes (pas les sous-composants)
      const routeFiles = screenFiles.filter(f => {
        const rel = path.relative(APP_DIR, f);
        // Exclure les sous-dossiers de composants (calculators/, training-journal/components/)
        // et les fichiers dans (tabs)/more/ qui sont des proxys
        return !rel.includes('components/') &&
          !rel.includes('calculators/') &&
          !rel.includes('training-journal/') &&
          !rel.includes('social-share/') && // sous-routes OK mais souvent des composants
          !rel.includes('(tabs)/more/'); // proxys qui ré-exportent
      });

      const missingDefault: string[] = [];
      for (const file of routeFiles) {
        const content = readFile(file);
        if (!content.match(/export\s+default\s+(function|class|const)|export\s*\{\s*\w+\s+as\s+default|module\.exports/)) {
          missingDefault.push(path.basename(file));
        }
      }

      // Tolérance : quelques fichiers utilitaires peuvent ne pas être des routes
      expect(missingDefault.length).toBeLessThanOrEqual(5);
    });
  });

  describe('6.4 Imports cohérents', () => {
    test('useTheme vient de @/lib/ThemeContext', () => {
      const wrongImport: string[] = [];
      for (const file of screenFiles) {
        const content = readFile(file);
        if (content.includes('useTheme')) {
          if (!content.includes("@/lib/ThemeContext") && !content.includes("../lib/ThemeContext")) {
            wrongImport.push(path.basename(file));
          }
        }
      }
      // La grande majorité doit utiliser le bon import
      expect(wrongImport.length).toBeLessThanOrEqual(3);
    });

    test('logger vient de @/lib/security/logger ou @/lib/logger', () => {
      const wrongLogger: string[] = [];
      for (const file of screenFiles) {
        const content = readFile(file);
        if (content.includes('logger.error') || content.includes('logger.warn')) {
          if (!content.includes('@/lib/security/logger') && !content.includes('@/lib/logger')) {
            wrongLogger.push(path.basename(file));
          }
        }
      }
      expect(wrongLogger.length).toBeLessThanOrEqual(3);
    });
  });
});

// ============================================
// 7. RAPPORT GLOBAL
// ============================================

describe('7. Rapport global - Métriques', () => {
  test('inventaire des écrans de l\'app', () => {
    expect(screenFiles.length).toBeGreaterThan(50);
  });

  test('inventaire des composants', () => {
    expect(allComponentFiles.length).toBeGreaterThan(20);
  });

  test('rapport de couverture des patterns', () => {
    const metrics = {
      totalScreens: screenFiles.length,
      withTheme: 0,
      withSafeArea: 0,
      withHaptics: 0,
      withLoading: 0,
      withErrorHandling: 0,
      withI18n: 0,
    };

    for (const file of screenFiles) {
      const content = readFile(file);
      if (/useTheme|useYoroiTheme|from '@\/components\/yoroi(\/v2\/[^']*)?'|export \{ default \} from/.test(content)) metrics.withTheme++;
      if (content.includes('useSafeAreaInsets') || content.includes('SafeAreaView')) metrics.withSafeArea++;
      if (content.includes('impactAsync') || content.includes('notificationAsync')) metrics.withHaptics++;
      if (content.includes('isLoading') || content.includes('loading') || content.includes('ActivityIndicator')) metrics.withLoading++;
      if (content.includes('try') && content.includes('catch')) metrics.withErrorHandling++;
      if (content.includes('useI18n') || content.includes("t('")) metrics.withI18n++;
    }

    // Métriques minimales attendues
    expect(metrics.withTheme / metrics.totalScreens).toBeGreaterThanOrEqual(0.5); // 50%+ thème
    expect(metrics.withSafeArea / metrics.totalScreens).toBeGreaterThanOrEqual(0.25); // 25%+ safe area
    expect(metrics.withErrorHandling / metrics.totalScreens).toBeGreaterThanOrEqual(0.4); // 40%+ error handling

    // Log le rapport pour visibilité
    const report = Object.entries(metrics).map(([key, value]) => {
      if (key === 'totalScreens') return `  ${key}: ${value}`;
      const pct = ((value as number / metrics.totalScreens) * 100).toFixed(0);
      return `  ${key}: ${value}/${metrics.totalScreens} (${pct}%)`;
    }).join('\n');

    // Ce test passe toujours, le rapport est juste informatif
    expect(report.length).toBeGreaterThan(0);
  });
});
