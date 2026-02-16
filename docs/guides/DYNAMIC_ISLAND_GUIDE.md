# Guide d'intégration Dynamic Island

## ✅ Configuration actuelle

### 1. Widget Extension créée
- Target `YoroiWidget` présente dans Xcode
- Bundle configuré dans `YoroiWidgetBundle.swift`
- Live Activity créée dans `YoroiWidgetLiveActivity.swift`

### 2. Info.plist configuré
- `NSSupportsLiveActivities` = `true` dans l'app principale

### 3. Module Natif créé
- `YoroiLiveActivityManager.swift` - Bridge Swift
- `YoroiLiveActivityManager.m` - Bridge Objective-C
- `lib/liveActivityManager.ts` - Interface TypeScript
- `lib/hooks/useLiveActivity.ts` - Hook React

## 📋 Étapes de finalisation dans Xcode

### 1. Ajouter les fichiers Swift au projet

Dans Xcode, fais glisser ces fichiers dans le projet :
- `ios/Yoroi/YoroiLiveActivityManager.swift`
- `ios/Yoroi/YoroiLiveActivityManager.m`

**IMPORTANT** : Coche bien "Add to targets: Yoroi" (PAS YoroiWidget)

### 2. Configurer le Bridging Header

Si Xcode te demande de créer un Bridging Header, accepte.

### 3. Vérifier la Target Membership

Pour `YoroiWidgetLiveActivity.swift`, vérifie que :
- ✅ Target "YoroiWidget" est cochée
- ❌ Target "Yoroi" n'est PAS cochée

Pour `YoroiLiveActivityManager.swift` et `.m`, vérifie que :
- ✅ Target "Yoroi" est cochée
- ❌ Target "YoroiWidget" n'est PAS cochée

### 4. Build Settings

Dans Xcode > Target "Yoroi" > Build Settings, vérifie :
- **Swift Compiler - General** > **Objective-C Bridging Header** : `Yoroi/Yoroi-Bridging-Header.h`

### 5. App Groups (pour partager des données entre l'app et le widget)

**App principale (Yoroi)** :
1. Target Yoroi > Signing & Capabilities
2. Ajouter "App Groups"
3. Créer un groupe : `group.com.houari.yoroi`

**Widget Extension (YoroiWidget)** :
1. Target YoroiWidget > Signing & Capabilities
2. Ajouter "App Groups"
3. Sélectionner le même groupe : `group.com.houari.yoroi`

## 🎯 Utilisation dans React Native

### Exemple 1 : Timer d'entraînement simple

```typescript
import { useLiveActivity } from '@/lib/hooks/useLiveActivity';
import { Button } from 'react-native';

export default function TrainingScreen() {
  const {
    isAvailable,
    isRunning,
    startActivity,
    stopActivity,
    elapsedSeconds,
  } = useLiveActivity();

  if (!isAvailable) {
    return <Text>Dynamic Island non disponible</Text>;
  }

  return (
    <View>
      <Text>{formatTime(elapsedSeconds)}</Text>

      {!isRunning ? (
        <Button
          title="Démarrer l'entraînement"
          onPress={() => startActivity('Course')}
        />
      ) : (
        <Button
          title="Terminer"
          onPress={stopActivity}
        />
      )}
    </View>
  );
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

### Exemple 2 : Avec mise à jour de la fréquence cardiaque

```typescript
import { useLiveActivity } from '@/lib/hooks/useLiveActivity';
import healthConnect from '@/lib/healthConnect.ios';

export default function TrainingWithHR() {
  const {
    isRunning,
    startActivity,
    stopActivity,
    updateHeartRate,
    elapsedSeconds,
  } = useLiveActivity();

  // Mettre à jour la FC toutes les 5 secondes
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(async () => {
      const hrData = await healthConnect.getTodayHeartRate();
      if (hrData?.current) {
        await updateHeartRate(hrData.current);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isRunning, updateHeartRate]);

  return (
    // Votre UI
  );
}
```

### Exemple 3 : Contrôle manuel complet

```typescript
import { useLiveActivityManual } from '@/lib/hooks/useLiveActivity';

export default function ManualControlScreen() {
  const { isAvailable, isRunning, start, update, stop } = useLiveActivityManual();
  const [seconds, setSeconds] = useState(0);

  const handleStart = async () => {
    await start({
      activityName: 'Musculation',
      elapsedSeconds: 0,
      isRunning: true,
      heartRate: 120,
    });
  };

  const handleUpdate = async () => {
    await update({
      elapsedSeconds: seconds,
      heartRate: 145,
    });
  };

  const handleStop = async () => {
    await stop();
  };

  return (
    // Votre UI avec contrôle total
  );
}
```

## 🎨 Design de la Dynamic Island

### États affichés

1. **Compact Leading** (gauche de la pilule) :
   - Icône verte si en cours
   - Icône orange si en pause

2. **Compact Trailing** (droite de la pilule) :
   - Timer au format MM:SS

3. **Minimal** (vue ultra-compacte) :
   - Juste l'icône

4. **Expanded** (appui long sur la Dynamic Island) :
   - Nom de l'activité + statut (en haut à gauche)
   - Fréquence cardiaque (en haut à droite)
   - Timer large au centre (HH:MM:SS)
   - Indicateur de progression si en cours

5. **Lock Screen** :
   - UI complète avec toutes les informations

## 🔧 Personnalisation

### Modifier les couleurs

Dans `YoroiWidgetLiveActivity.swift`, modifie :
- `.keylineTint(.green)` - Couleur de la bordure
- `.activityBackgroundTint(Color.black.opacity(0.8))` - Fond de la bannière

### Modifier les icônes

Remplace les `Image(systemName:)` par tes propres icônes.

### Ajouter d'autres données

Dans `YoroiWidgetAttributes.ContentState`, ajoute :
```swift
var distance: Double?      // Distance parcourue
var calories: Int?         // Calories brûlées
var pace: String?          // Allure
```

Puis mets à jour depuis React Native :
```typescript
await update({
  distance: 5.2,
  calories: 420,
  pace: "5:30",
});
```

## ⚠️ Notes importantes

1. **iOS 16.1+ requis** : Les Live Activities ne fonctionnent que sur iOS 16.1 et supérieur.

2. **iPhone 14 Pro et supérieur** : La Dynamic Island n'est disponible que sur ces modèles. Sur les autres iPhones, la Live Activity s'affiche comme une bannière.

3. **Durée maximale** : Les Live Activities peuvent durer jusqu'à 8 heures par défaut.

4. **Permission utilisateur** : L'utilisateur peut désactiver les Live Activities dans Réglages > Notifications.

5. **Test en simulateur** : Le simulateur supporte les Live Activities mais pas la Dynamic Island.

6. **Background updates** : Les mises à jour continuent même si l'app est en arrière-plan.

## 🚀 Prochaines étapes

1. Intégrer le hook `useLiveActivity` dans ton écran d'entraînement actif
2. Connecter avec HealthKit pour la fréquence cardiaque en temps réel
3. Ajouter des notifications de fin d'entraînement
4. Personnaliser les couleurs selon le type d'activité

## 🎉 Résumé

Tout est prêt pour utiliser Dynamic Island dans Yoroi :
- ✅ Extension Widget créée et configurée
- ✅ Live Activity avec Timer fonctionnel
- ✅ Module natif React Native opérationnel
- ✅ Hook React facile à utiliser
- ✅ Support de la fréquence cardiaque

Il te suffit maintenant d'ajouter les fichiers Swift au projet dans Xcode et d'utiliser le hook `useLiveActivity` dans ton UI.
