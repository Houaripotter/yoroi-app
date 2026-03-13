# YOROI - Guide de Développement

## Langue de communication

**TOUJOURS répondre en français.** L'utilisateur ne comprend pas l'anglais. Toutes les explications, résumés, questions et messages doivent être rédigés en français, sans exception.

---

## Convention d'affichage des historiques horizontaux

### Ordre des données dans les ScrollView horizontaux

**TOUJOURS** afficher le résultat le plus récent à GAUCHE (premier élément) et les plus anciens vers la DROITE (scroll vers la droite).

```typescript
// BON — données triées DESC (newest first = leftmost)
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {allData.slice(0, 20).map((entry, index) => (
    // allData[0] = plus récent → s'affiche à gauche
    <View key={entry.id}>{/* ... */}</View>
  ))}
</ScrollView>

// MAUVAIS — données triées ASC (newest last = rightmost)
<ScrollView horizontal>
  {allData.reverse().map(...)}  // mettra le plus récent à droite
</ScrollView>
```

**Règle** : Si les données sont triées DESC (newest first depuis la DB), ne pas les inverser pour l'affichage horizontal. Si elles sont ASC, utiliser `.slice().reverse()` pour que le plus récent soit index 0 (gauche).

---

## Règles Importantes pour une UX Fluide

### 1. NE PAS utiliser `useFocusEffect` pour charger les données

**MAUVAIS** - Cause un rechargement à chaque retour sur l'écran :
```typescript
useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
```

**BON** - Charge une seule fois au montage :
```typescript
useEffect(() => { loadData(); }, []);
```

### 2. NE PAS reset les animations au focus

**MAUVAIS** - L'animation repart de zéro à chaque retour :
```typescript
useFocusEffect(
  useCallback(() => {
    setAnimationValue(0);
    // ... animate to target
  }, [])
);
```

**BON** - Garder l'état de l'animation, n'animer que si la valeur change :
```typescript
const hasAnimated = useRef(false);
useEffect(() => {
  if (hasAnimated.current) return;
  // ... animate
  hasAnimated.current = true;
}, [targetValue]);
```

### 3. NE PAS forcer de re-render au focus

**MAUVAIS** :
```typescript
useFocusEffect(
  useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [])
);
```

**BON** - Seulement au montage :
```typescript
useEffect(() => {
  setRefreshTrigger(prev => prev + 1);
}, []);
```

### 4. Quand utiliser `useFocusEffect` ?

Utilisez `useFocusEffect` UNIQUEMENT pour :
- Démarrer/arrêter des timers ou subscriptions
- Mettre en pause/reprendre des médias
- Mise à jour de la barre de statut

```typescript
// BON usage - timer qui doit s'arrêter quand on quitte
useFocusEffect(
  useCallback(() => {
    const timer = setInterval(() => {...}, 1000);
    return () => clearInterval(timer); // Cleanup au blur
  }, [])
);
```

### 5. Préservation du scroll

Le scroll est automatiquement préservé si :
- Vous ne rechargez pas les données au focus
- Vous ne forcez pas de re-render

NE PAS ajouter de code de restauration de scroll - ça cause des bugs visuels.

---

## Fichiers corrigés (25+ fichiers)

### App (tabs)
- `app/(tabs)/index.tsx` - ✅ Corrigé
- `app/(tabs)/planning.tsx` - ✅ Corrigé

### App (screens)
- `app/sleep.tsx` - ✅ Corrigé
- `app/energy.tsx` - ✅ Corrigé
- `app/challenges.tsx` - ✅ Corrigé
- `app/weekly-report.tsx` - ✅ Corrigé
- `app/profile.tsx` - ✅ Corrigé
- `app/training-journal.tsx` - ✅ Corrigé
- `app/photos.tsx` - ✅ Corrigé
- `app/fasting.tsx` - ✅ Corrigé
- `app/history.tsx` - ✅ Corrigé
- `app/records.tsx` - ✅ Corrigé
- `app/body-composition.tsx` - ✅ Corrigé
- `app/measurements.tsx` - ✅ Corrigé
- `app/health-metrics.tsx` - ✅ Corrigé
- `app/nutrition-plan.tsx` - ✅ Corrigé
- `app/palmares.tsx` - ✅ Corrigé
- `app/clubs.tsx` - ✅ Corrigé
- `app/competitions.tsx` - ✅ Corrigé
- `app/sport.tsx` - ✅ Corrigé
- `app/transformation.tsx` - ✅ Corrigé
- `app/badges.tsx` - ✅ Corrigé
- `app/training-goals.tsx` - ✅ Corrigé
- `app/activity-history.tsx` - ✅ Corrigé
- `app/infirmary.tsx` - ✅ Corrigé
- `app/avatar-customization.tsx` - ✅ Corrigé
- `app/composition-detail.tsx` - ✅ Corrigé
- `app/injury-detail.tsx` - ✅ Corrigé
- `app/add-training.tsx` - ✅ Corrigé

### Components
- `components/BadgesScreen.tsx` - ✅ Corrigé
- `components/YearlyCounter.tsx` - ✅ Corrigé
- `components/SmartRemindersSettings.tsx` - ✅ Corrigé

---

## Résumé

> **Règle d'or** : `useEffect` pour charger les données, `useFocusEffect` uniquement pour les effets secondaires qui nécessitent un cleanup au blur.

---

## HealthKit — Problèmes connus et solutions

### Pourquoi les données Apple Health ne s'affichaient pas

**Cause racine** : `@kingstinct/react-native-healthkit` v13 (Nitro Modules) échoue silencieusement à enregistrer les permissions de **LECTURE** HealthKit sur iOS 26+. La méthode `HealthKit.requestAuthorization({ toRead, toShare })` ne lance pas d'erreur mais iOS n'accorde pas les permissions. Résultat : l'app ne lit que ses propres données.

**Solution appliquée** : Module Swift natif `YoroiHealthKitModule` (`ios/Yoroi/YoroiHealthKitModule.swift`) qui appelle `HKHealthStore().requestAuthorization` directement, en bypassant Nitro :
- `requestWorkoutReadAuth` — workouts + routes GPS seulement
- `requestAllHealthPermissions` — TOUS les types santé (27 types : poids, pas, FC, sommeil, calories, VO2max...)
- `connect()` dans `healthConnect.ios.ts` appelle `requestAllHealthPermissionsNative()` en premier

**NE JAMAIS revenir à Nitro seul pour les permissions** — utiliser toujours le module Swift natif.

### Reset complet des données (pour tests)

Si l'onboarding ne s'affiche pas après suppression de l'app :
1. Supprimer l'app de l'iPhone
2. `Réglages` > `Santé` > `Accès aux données et appareils` > `Yoroi` > **Supprimer toutes les données**
3. Xcode : `Product` > `Clean Build Folder` (Shift+Cmd+K)
4. Build & Run

Raison : `app/index.tsx` vérifie SQLite si AsyncStorage est vide — si un profil existe en DB, il saute l'onboarding. Clean Build Folder efface le cache y compris la DB.

### FC (fréquence cardiaque) dans les séances

`averageHeartRate` et `maxHeartRate` ne sont PAS des propriétés directes de `HKWorkout`. Il faut appeler `workout.getStatistic('heartRate', 'count/min')` sur le `WorkoutProxy` Nitro. Implémenté dans `mapRawWorkouts()` dans `healthConnect.ios.ts`.
