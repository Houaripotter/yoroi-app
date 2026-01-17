# ✅ Checklist d'intégration HealthKit + Dynamic Island

## 📦 Fichiers créés

### HealthKit
- ✅ `lib/hooks/useHealthKit.ts` - Hook React pour gérer HealthKit
- ✅ `HEALTHKIT_INTEGRATION.md` - Guide d'intégration complet

### Dynamic Island
- ✅ `ios/YoroiWidget/YoroiWidgetLiveActivity.swift` - UI Dynamic Island (modifié)
- ✅ `ios/Yoroi/YoroiLiveActivityManager.swift` - Module natif Swift
- ✅ `ios/Yoroi/YoroiLiveActivityManager.m` - Bridge Objective-C
- ✅ `lib/liveActivityManager.ts` - Interface TypeScript
- ✅ `lib/hooks/useLiveActivity.ts` - Hook React pour Live Activities
- ✅ `DYNAMIC_ISLAND_GUIDE.md` - Guide complet

### Démonstration
- ✅ `DEMO_TRAINING_SCREEN.tsx` - Écran d'exemple complet

## 🔧 Actions à faire dans Xcode

### 1. Ajouter les fichiers Swift au projet

Ouvre Xcode et fais glisser ces fichiers dans le navigateur de fichiers :

**Pour la target "Yoroi"** (app principale) :
- `ios/Yoroi/YoroiLiveActivityManager.swift`
- `ios/Yoroi/YoroiLiveActivityManager.m`

**Important** : Coche "Add to targets: Yoroi" uniquement.

### 2. Vérifier le Bridging Header

Si Xcode te demande de créer un Bridging Header, accepte.

Vérifie dans : Target Yoroi > Build Settings > Objective-C Bridging Header
- Valeur : `Yoroi/Yoroi-Bridging-Header.h`

### 3. Configurer App Groups

**Target Yoroi** :
1. Onglet "Signing & Capabilities"
2. Clic "+" > "App Groups"
3. Créer : `group.com.houari.yoroi`

**Target YoroiWidget** :
1. Onglet "Signing & Capabilities"
2. Clic "+" > "App Groups"
3. Sélectionner : `group.com.houari.yoroi`

### 4. Vérifier les Capabilities

**Target Yoroi** :
- ✅ HealthKit
- ✅ App Groups

**Target YoroiWidget** :
- ✅ App Groups

### 5. Build & Run

```bash
npm run ios
# ou
npx expo run:ios
```

## 🎯 Tests à effectuer

### Test 1 : HealthKit

1. Lance l'app sur un appareil réel (le simulateur ne supporte pas HealthKit complètement)
2. Intègre `useHealthKit` dans ton écran de settings ou d'onboarding
3. Appelle `connectToHealthKit()`
4. Vérifie que le popup iOS de permissions apparaît
5. Autorise l'accès
6. Vérifie que `isConnected` passe à `true`
7. Teste la lecture des données : `healthConnect.getTodaySteps()`

### Test 2 : Dynamic Island

1. Lance l'app sur un iPhone 14 Pro ou supérieur (ou simulateur)
2. Intègre `useLiveActivity` dans ton écran d'entraînement
3. Appelle `startActivity('Course')`
4. Vérifie que le timer apparaît dans la Dynamic Island
5. Appuie longuement sur la Dynamic Island pour voir la vue étendue
6. Vérifie que le timer se met à jour chaque seconde
7. Appelle `stopActivity()` et vérifie que la Live Activity disparaît

### Test 3 : Intégration complète

1. Utilise le composant `DEMO_TRAINING_SCREEN.tsx` comme référence
2. Connecte HealthKit
3. Démarre un entraînement
4. Vérifie que :
   - Le timer s'affiche dans la Dynamic Island
   - La FC se met à jour automatiquement
   - Les données sont synchronisées

## 📱 Utilisation dans l'app

### Dans l'onboarding (app/onboarding.tsx)

```typescript
import { useHealthKit } from '@/lib/hooks/useHealthKit';

export default function OnboardingScreen() {
  const { connectToHealthKit } = useHealthKit();

  // Dans une étape de l'onboarding
  const handleHealthKitSetup = async () => {
    const connected = await connectToHealthKit();
    if (connected) {
      // Passer à l'étape suivante
    }
  };

  return (
    <Button onPress={handleHealthKitSetup}>
      Connecter Apple Santé
    </Button>
  );
}
```

### Dans un écran d'entraînement

```typescript
import { useLiveActivity } from '@/lib/hooks/useLiveActivity';
import { useHealthKit } from '@/lib/hooks/useHealthKit';

export default function TrainingScreen() {
  const {
    isRunning,
    startActivity,
    stopActivity,
    updateHeartRate,
    elapsedSeconds,
  } = useLiveActivity();

  const { isConnected } = useHealthKit();

  // Voir DEMO_TRAINING_SCREEN.tsx pour l'implémentation complète
}
```

## 🐛 Dépannage

### Erreur : "Module 'YoroiLiveActivityManager' not found"

**Solution** :
1. Ouvre Xcode
2. Clean Build Folder (Cmd + Shift + K)
3. Rebuild (Cmd + B)

### Erreur : "HealthKit non disponible"

**Solution** :
1. Vérifie que tu testes sur un appareil réel (pas le simulateur)
2. Vérifie que la Capability HealthKit est activée dans Xcode
3. Vérifie que les clés Info.plist sont présentes

### La Dynamic Island n'apparaît pas

**Solution** :
1. Vérifie que tu es sur iOS 16.1+
2. Vérifie que `NSSupportsLiveActivities` est à `true` dans Info.plist
3. Vérifie que les App Groups sont configurés
4. Vérifie les logs dans Xcode pour voir les erreurs

### Le timer ne se met pas à jour

**Solution** :
1. Vérifie que le hook `useLiveActivity` est bien appelé
2. Vérifie les logs dans Xcode
3. Vérifie que le module natif est bien lié

## 📚 Documentation de référence

- [HealthKit Integration Guide](./HEALTHKIT_INTEGRATION.md)
- [Dynamic Island Guide](./DYNAMIC_ISLAND_GUIDE.md)
- [Demo Training Screen](./DEMO_TRAINING_SCREEN.tsx)

## 🚀 Prochaines étapes suggérées

1. **Intégrer dans l'onboarding** : Demander les permissions HealthKit au premier lancement
2. **Écran d'entraînement actif** : Ajouter le timer Dynamic Island
3. **Synchronisation automatique** : Sync HealthKit toutes les heures en arrière-plan
4. **Notifications** : Alertes de fin d'entraînement
5. **Stats avancées** : Graphiques HRV, FC au repos, etc.
6. **Export** : Permettre d'exporter les workouts vers d'autres apps

## ⚠️ Important

- **HealthKit** : Fonctionne uniquement sur appareil réel (pas simulateur complet)
- **Dynamic Island** : Visible uniquement sur iPhone 14 Pro et supérieur
- **Live Activities** : iOS 16.1+ requis
- **Permissions** : L'utilisateur doit autoriser dans Réglages iOS

## 📞 Support

Si tu rencontres des problèmes :
1. Vérifie les logs dans Xcode (Cmd + Shift + Y)
2. Vérifie que tous les fichiers sont bien ajoutés aux bonnes targets
3. Nettoie et rebuild le projet

---

**Tout est prêt ! Il ne reste plus qu'à ajouter les fichiers Swift dans Xcode et à intégrer les hooks dans ton UI.** 🎉
