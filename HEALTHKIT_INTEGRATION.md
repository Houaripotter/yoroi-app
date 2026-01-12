# Guide d'intégration HealthKit

## ✅ Configuration actuelle

### 1. Info.plist
Les permissions HealthKit sont déjà configurées :
- `NSHealthShareUsageDescription` : Lecture des données
- `NSHealthUpdateUsageDescription` : Écriture des données

### 2. Capability Xcode
- HealthKit capability ajoutée manuellement dans Xcode

### 3. Service HealthConnect
- Service complet dans `lib/healthConnect.ios.ts`
- Gestion de toutes les métriques (poids, pas, sommeil, FC, HRV, VO2 Max, etc.)

## 🎯 Utilisation

### Option A : Dans l'écran d'onboarding

Ajoute ceci dans `app/onboarding.tsx` :

```typescript
import { useHealthKit } from '@/lib/hooks/useHealthKit';

export default function OnboardingScreen() {
  const { isAvailable, connectToHealthKit } = useHealthKit();

  // Étape "Connecter Apple Santé"
  const handleHealthKitConnection = async () => {
    const connected = await connectToHealthKit();
    if (connected) {
      // Passer à l'étape suivante
    }
  };

  return (
    // Dans ton wizard d'onboarding
    <Button onPress={handleHealthKitConnection}>
      Connecter Apple Santé
    </Button>
  );
}
```

### Option B : Dans l'écran Paramètres

Ajoute ceci dans un écran de paramètres :

```typescript
import { useHealthKit } from '@/lib/hooks/useHealthKit';

export default function SettingsScreen() {
  const {
    isConnected,
    connectToHealthKit,
    disconnectHealthKit,
    syncHealthData,
  } = useHealthKit();

  return (
    <View>
      <Text>Apple Santé</Text>
      {!isConnected ? (
        <Button onPress={connectToHealthKit}>
          Connecter à Apple Santé
        </Button>
      ) : (
        <>
          <Text>✅ Connecté</Text>
          <Button onPress={syncHealthData}>
            Synchroniser
          </Button>
          <Button onPress={disconnectHealthKit}>
            Déconnecter
          </Button>
        </>
      )}
    </View>
  );
}
```

### Option C : Initialisation automatique au démarrage

Dans `app/_layout.tsx` :

```typescript
import { useHealthKit } from '@/lib/hooks/useHealthKit';

export default function RootLayout() {
  const { isInitialized } = useHealthKit(); // Auto-initialise au montage

  return (
    // Ton layout
  );
}
```

## 📊 Utilisation des données

### Lire les données

```typescript
import healthConnect from '@/lib/healthConnect.ios';

// Données du jour
const steps = await healthConnect.getTodaySteps();
const heartRate = await healthConnect.getTodayHeartRate();
const sleep = await healthConnect.getLastSleep();
const weight = await healthConnect.getLatestWeight();

// Toutes les données
const allData = await healthConnect.getAllHealthData();

// Historique
const hrvHistory = await healthConnect.getHRVHistory(7); // 7 derniers jours
const sleepHistory = await healthConnect.getSleepHistory(7);
const weightHistory = await healthConnect.getWeightHistory(30);
```

### Écrire des données

```typescript
import healthConnect from '@/lib/healthConnect.ios';

// Écrire le poids
await healthConnect.writeWeight(75.5, 'kg');

// Écrire l'hydratation
await healthConnect.writeHydration(500); // 500ml

// Écrire un workout
await healthConnect.writeWorkout({
  activityType: 'Running',
  startDate: new Date('2026-01-09T08:00:00'),
  endDate: new Date('2026-01-09T09:00:00'),
  distance: 10, // km
  calories: 600, // kcal
});
```

## 🔍 Statut et permissions

```typescript
const status = healthConnect.getSyncStatus();
console.log(status.isConnected);
console.log(status.lastSync);
console.log(status.permissions);

// Vérifier une permission spécifique
const hasWeightPermission = healthConnect.hasPermission('weight');
```

## ⚠️ Notes importantes

1. **Permissions iOS** : Apple ne permet pas de vérifier si les permissions sont accordées. Le user doit autoriser dans Réglages > Santé.

2. **Première utilisation** : Lors du premier appel à `connect()`, iOS affiche un popup natif de demande de permissions.

3. **Mode Démo** : Dans `lib/healthConnect.ios.ts`, `DEMO_MODE` est à `false`. Pour tester sans Apple Watch, mets-le à `true` temporairement.

4. **Package requis** : Assure-toi que `@kingstinct/react-native-healthkit` est bien installé dans `package.json`.

## 🎉 Résumé

Ta configuration HealthKit est **complète et prête à l'emploi** :
- ✅ Permissions Info.plist configurées
- ✅ Capability Xcode ajoutée
- ✅ Service complet avec toutes les métriques
- ✅ Hook React pour faciliter l'utilisation
- ✅ Lecture + Écriture supportées

Il te suffit maintenant d'ajouter les boutons dans ton UI pour connecter HealthKit au premier lancement ou dans les paramètres.
