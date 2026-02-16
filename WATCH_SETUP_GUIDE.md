# 🔗 GUIDE D'INTÉGRATION - WatchConnectivity YOROI

Guide complet pour configurer la communication iPhone ↔ Apple Watch dans l'app YOROI.

---

## 📋 TABLE DES MATIÈRES

1. [Fichiers Créés](#fichiers-créés)
2. [Configuration Xcode](#configuration-xcode)
3. [Installation](#installation)
4. [Intégration React Native](#intégration-react-native)
5. [Tests](#tests)
6. [Dépannage](#dépannage)

---

## 1️⃣ FICHIERS CRÉÉS

### Côté iOS Native (Swift)
```
ios/
├── WatchConnectivityBridge.swift   ✅ Créé - Module natif principal
├── WatchConnectivityBridge.m       ✅ Créé - Bridge Objective-C
└── YoroiWatch Watch App/
    └── Services/
        └── WatchConnectivityManager.swift  ✅ Créé - Manager côté Watch
```

### Côté React Native (TypeScript)
```
lib/
└── watchConnectivity.ios.ts        ✅ Créé - Wrapper TypeScript

WATCH_CONNECTIVITY_EXAMPLES.tsx     ✅ Créé - Exemples d'utilisation
WATCH_SETUP_GUIDE.md               ✅ Ce fichier
```

---

## 2️⃣ CONFIGURATION XCODE

### Étape 1: Ajouter les fichiers au projet Xcode

1. **Ouvrir Xcode:**
   ```bash
   cd ios
   open Yoroi.xcworkspace
   ```

2. **Ajouter WatchConnectivityBridge.swift:**
   - Clic droit sur le dossier `Yoroi` dans Xcode
   - `Add Files to "Yoroi"...`
   - Sélectionner `WatchConnectivityBridge.swift`
   - ✅ Cocher "Copy items if needed"
   - ✅ Cocher "Create groups"
   - ✅ Target: **Yoroi** (iPhone app, PAS la Watch app)

3. **Ajouter WatchConnectivityBridge.m:**
   - Répéter pour `WatchConnectivityBridge.m`
   - ✅ Target: **Yoroi** (iPhone app)

4. **Vérifier le Bridging Header:**
   - Si Xcode demande de créer un Bridging Header, dire **OUI**
   - Si déjà existant, vérifier qu'il contient:
     ```objc
     // Yoroi-Bridging-Header.h
     #import <React/RCTBridgeModule.h>
     #import <React/RCTEventEmitter.h>
     ```

### Étape 2: Configurer les Capabilities

1. **iPhone App (Yoroi target):**
   - Sélectionner le target `Yoroi`
   - Onglet "Signing & Capabilities"
   - Cliquer "+ Capability"
   - Ajouter **"Background Modes"**
     - ✅ Cocher "Uses Bluetooth LE accessories"
   - (WatchConnectivity utilise Bluetooth pour communiquer)

2. **Watch App (YoroiWatch Watch App target):**
   - Déjà configuré avec WatchConnectivity dans les fichiers précédents

### Étape 3: Vérifier les Entitlements

**iPhone: `ios/Yoroi/Yoroi.entitlements`**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Vos entitlements existants -->
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.yourcompany.yoroi</string>
    </array>
</dict>
</plist>
```

**Watch: `ios/YoroiWatch Watch App/YoroiWatch Watch App.entitlements`**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.yourcompany.yoroi</string>
    </array>
</dict>
</plist>
```

⚠️ **IMPORTANT:** Remplacer `group.com.yourcompany.yoroi` par votre vrai App Group ID.

---

## 3️⃣ INSTALLATION

### Étape 1: Rebuild l'app iOS

```bash
# Nettoyer le build
cd ios
rm -rf build
pod install

# Rebuild
cd ..
npx expo run:ios
```

### Étape 2: Vérifier que le module est chargé

Ajouter dans `app/_layout.tsx` (temporaire pour test):

```typescript
import { useEffect } from 'react';
import { WatchConnectivity } from '@/lib/watchConnectivity.ios';

export default function RootLayout() {
  useEffect(() => {
    const checkWatch = async () => {
      try {
        const available = await WatchConnectivity.isWatchAvailable();
        console.log('✅ WatchConnectivity loaded!');
        console.log('Watch available:', available);
      } catch (error) {
        console.error('❌ WatchConnectivity error:', error);
      }
    };

    checkWatch();
  }, []);

  return (
    // Votre layout existant
  );
}
```

### Étape 3: Tester sur appareil réel

⚠️ **WatchConnectivity NE FONCTIONNE PAS sur simulateur!**

Il faut:
- iPhone physique avec iOS 17+
- Apple Watch appairée avec watchOS 10+
- App installée sur les 2 appareils

---

## 4️⃣ INTÉGRATION REACT NATIVE

### Option A: Provider Global (Recommandé)

**1. Créer `lib/WatchConnectivityProvider.tsx`:**

```typescript
import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { WatchConnectivity } from '@/lib/watchConnectivity.ios';

interface WatchContextType {
  isWatchAvailable: boolean;
  isWatchReachable: boolean;
  syncWeight: (weight: number) => Promise<void>;
  syncHydration: (waterIntake: number) => Promise<void>;
  syncWorkout: (workout: any) => Promise<void>;
  lastError: string | null;
}

const WatchContext = createContext<WatchContextType | null>(null);

export function WatchConnectivityProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReachable, setIsReachable] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Check availability
    WatchConnectivity.isWatchAvailable().then(setIsAvailable);
    WatchConnectivity.isWatchReachable().then(setIsReachable);

    // Listen to reachability changes
    const reachabilityListener = WatchConnectivity.onReachabilityChanged((status) => {
      setIsReachable(status.isReachable);
      setIsAvailable(status.isPaired && status.isWatchAppInstalled);

      if (status.isReachable) {
        console.log('✅ Watch connected - syncing data...');
        syncAllDataToWatch();
      }
    });

    // Listen to Watch messages
    const messageListener = WatchConnectivity.onMessageReceived((message) => {
      console.log('📩 Message from Watch:', message);
      handleWatchMessage(message);
    });

    // Listen to errors
    const errorListener = WatchConnectivity.onError((error) => {
      setLastError(error.error);
      setTimeout(() => setLastError(null), 5000);
    });

    return () => {
      reachabilityListener.remove();
      messageListener.remove();
      errorListener.remove();
    };
  }, []);

  const handleWatchMessage = (message: any) => {
    // Handle different message types
    if (message.workoutCompleted) {
      // Save workout from Watch
    }
    if (message.weightUpdate) {
      // Update weight from Watch
    }
  };

  const syncAllDataToWatch = async () => {
    // Implement your sync logic
  };

  const syncWeight = async (weight: number) => {
    if (!isAvailable) return;
    try {
      await WatchConnectivity.sendWeightUpdate(weight);
    } catch (error) {
      console.error('Error syncing weight:', error);
      throw error;
    }
  };

  const syncHydration = async (waterIntake: number) => {
    if (!isAvailable) return;
    try {
      await WatchConnectivity.sendHydrationUpdate(waterIntake);
    } catch (error) {
      console.error('Error syncing hydration:', error);
      throw error;
    }
  };

  const syncWorkout = async (workout: any) => {
    if (!isAvailable) return;
    try {
      await WatchConnectivity.sendWorkoutSession(workout);
    } catch (error) {
      console.error('Error syncing workout:', error);
      throw error;
    }
  };

  return (
    <WatchContext.Provider
      value={{
        isWatchAvailable: isAvailable,
        isWatchReachable: isReachable,
        syncWeight,
        syncHydration,
        syncWorkout,
        lastError,
      }}
    >
      {children}
    </WatchContext.Provider>
  );
}

export function useWatch() {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error('useWatch must be used within WatchConnectivityProvider');
  }
  return context;
}
```

**2. Wrapper l'app dans `app/_layout.tsx`:**

```typescript
import { WatchConnectivityProvider } from '@/lib/WatchConnectivityProvider';

export default function RootLayout() {
  return (
    <WatchConnectivityProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Autres screens */}
      </Stack>
    </WatchConnectivityProvider>
  );
}
```

**3. Utiliser dans vos composants:**

```typescript
import { useWatch } from '@/lib/WatchConnectivityProvider';

function WeightScreen() {
  const { isWatchAvailable, syncWeight } = useWatch();

  const handleSaveWeight = async (weight: number) => {
    // Save locally
    await AsyncStorage.setItem('currentWeight', weight.toString());

    // Sync to Watch
    if (isWatchAvailable) {
      await syncWeight(weight);
    }
  };

  return (
    // Your UI
  );
}
```

### Option B: Hook Direct (Plus simple mais moins centralisé)

```typescript
import { useWatchConnectivity } from '@/lib/watchConnectivity.ios';

function MyComponent() {
  const { isAvailable, sendWeight } = useWatchConnectivity();

  const save = async (weight: number) => {
    if (isAvailable) {
      await sendWeight(weight);
    }
  };
}
```

---

## 5️⃣ TESTS

### Test 1: Vérifier la connexion

```typescript
const testConnection = async () => {
  const available = await WatchConnectivity.isWatchAvailable();
  const reachable = await WatchConnectivity.isWatchReachable();

  console.log('Watch paired:', available);
  console.log('Watch reachable:', reachable);
};
```

**Résultats attendus:**
- ✅ `available: true` si Watch appairée et app installée
- ✅ `reachable: true` si Watch à portée Bluetooth

### Test 2: Envoyer des données

```typescript
const testSendData = async () => {
  try {
    await WatchConnectivity.updateApplicationContext({
      weight: 78.5,
      waterIntake: 1500,
      test: true,
    });
    console.log('✅ Data sent successfully');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
```

**Vérification:**
- Ouvrir l'app Watch
- Vérifier dans les logs Xcode (côté Watch):
  ```
  📦 Application context received from iPhone: ["weight", "waterIntake", "test"]
  ```

### Test 3: Recevoir des données

**Sur la Watch (Xcode logs):**
```swift
// Dans un bouton de test sur la Watch
WatchConnectivityManager.shared.sendToiPhone(
    ["testMessage": "Hello from Watch"],
    forKey: "test"
)
```

**Sur l'iPhone (Console React Native):**
```
📩 Message from Watch: {testMessage: "Hello from Watch"}
```

---

## 6️⃣ DÉPANNAGE

### Problème 1: "Module WatchConnectivityBridge not found"

**Solutions:**
1. Vérifier que `WatchConnectivityBridge.swift` et `.m` sont dans le projet Xcode
2. Clean build: `cd ios && rm -rf build && pod install`
3. Vérifier le Bridging Header existe
4. Rebuild: `npx expo run:ios`

### Problème 2: "Watch not available" alors qu'elle est appairée

**Solutions:**
1. Vérifier que l'app Watch est bien installée sur la Watch
2. Vérifier les Entitlements (App Groups)
3. Redémarrer les deux appareils
4. Désappairer/réappairer la Watch (last resort)

### Problème 3: Messages not received

**Solutions:**
1. Vérifier que les listeners sont bien ajoutés:
   ```typescript
   useEffect(() => {
     const listener = WatchConnectivity.onMessageReceived((msg) => {
       console.log('Message:', msg);
     });
     return () => listener.remove();
   }, []);
   ```

2. Vérifier les logs Xcode (côté Watch et iPhone)
3. Tester avec `updateApplicationContext` au lieu de `sendMessage`

### Problème 4: Build errors

**"No such module 'WatchConnectivity'"**
- C'est normal dans l'éditeur - le module existe seulement sur device iOS
- Ignorer si le build réussit

**"Undefined symbols for architecture"**
- Vérifier que les fichiers Swift sont dans le bon target
- Clean + Rebuild

---

## 7️⃣ BONNES PRATIQUES

### ✅ À FAIRE:

1. **Toujours vérifier availability:**
   ```typescript
   if (await WatchConnectivity.isWatchAvailable()) {
     // Send data
   }
   ```

2. **Gérer les erreurs:**
   ```typescript
   try {
     await WatchConnectivity.sendToWatch(data);
   } catch (error) {
     // Continue without Watch sync
   }
   ```

3. **Utiliser `updateApplicationContext` pour données importantes:**
   - Persiste même si Watch pas reachable
   - Sync automatique quand Watch revient à portée

4. **Logger les sync pour debug:**
   ```typescript
   console.log('✅ Synced to Watch:', data);
   ```

### ❌ À ÉVITER:

1. **Ne pas bloquer l'UI si Watch pas disponible**
2. **Ne pas spammer de messages** (limite: ~50/heure)
3. **Ne pas envoyer de gros fichiers** (max 256KB par message)
4. **Ne pas assumer que la Watch est toujours connected**

---

## 8️⃣ ARCHITECTURE FINALE

```
┌─────────────────────────────────────┐
│                                     │
│      React Native (iPhone)          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ watchConnectivity.ios.ts    │   │
│  │ (TypeScript Wrapper)        │   │
│  └──────────┬──────────────────┘   │
│             │                       │
│  ┌──────────▼──────────────────┐   │
│  │ WatchConnectivityBridge.m   │   │
│  │ (Objective-C Bridge)        │   │
│  └──────────┬──────────────────┘   │
│             │                       │
│  ┌──────────▼──────────────────┐   │
│  │ WatchConnectivityBridge     │   │
│  │ .swift (Native Module)      │   │
│  └──────────┬──────────────────┘   │
│             │                       │
└─────────────┼───────────────────────┘
              │
              │ WCSession (iOS Framework)
              │
┌─────────────▼───────────────────────┐
│                                     │
│       Apple Watch (watchOS)         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ WatchConnectivityManager    │   │
│  │ .swift (Watch-side Manager) │   │
│  └─────────────────────────────┘   │
│                                     │
│  SwiftUI Views receive data         │
│                                     │
└─────────────────────────────────────┘
```

---

## 9️⃣ PROCHAINES ÉTAPES

1. ✅ Intégrer WatchConnectivityProvider dans `_layout.tsx`
2. ✅ Ajouter sync dans les fonctions de sauvegarde (poids, hydratation, workouts)
3. ✅ Tester sur appareils réels (iPhone + Watch physiques)
4. ✅ Implémenter les handlers de messages de la Watch vers l'iPhone
5. ✅ Ajouter un indicateur de statut Watch dans l'UI (optionnel)

---

## 📚 RESSOURCES

- [Apple WatchConnectivity Documentation](https://developer.apple.com/documentation/watchconnectivity)
- [React Native Modules Guide](https://reactnative.dev/docs/native-modules-ios)
- Fichier d'exemples: `WATCH_CONNECTIVITY_EXAMPLES.tsx`

---

**✅ Bridge complet créé! L'app iPhone peut maintenant communiquer avec l'Apple Watch.**

Si tu as des questions ou des problèmes, vérifie la section Dépannage ci-dessus.
