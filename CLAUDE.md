# YOROI - Guide de Développement

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
