# 🔓 MODE CRÉATEUR - YOROI

## Code Secret : **2412**

Le Mode Créateur permet au développeur (toi) de tester TOUTES les fonctionnalités Premium sans restrictions.

---

## 🚀 Comment l'activer ?

### Méthode 1 : Via les Réglages (Recommandé)

1. Ouvrir l'app YOROI
2. Aller dans **Réglages** (icône ⚙️)
3. Descendre tout en bas
4. **Taper 5 fois** sur "Version 1.0.0"
5. Une modal apparaît avec un champ de saisie
6. Entrer le code : **2412**
7. Appuyer sur "Valider"
8. ✅ Mode Créateur activé !

### Méthode 2 : Alternative

Tu peux aussi ajouter un tap secret dans n'importe quel écran en important `useDevMode` :

```typescript
import { useDevMode } from '@/lib/DevModeContext';

const MyScreen = () => {
  const { handleSecretTap } = useDevMode();

  return (
    <TouchableOpacity onPress={handleSecretTap}>
      <Image source={require('@/assets/logo.png')} />
    </TouchableOpacity>
  );
};
```

---

## 🎁 Qu'est-ce qui est débloqué ?

Quand le Mode Créateur est actif (`isDevMode === true`) :

| Fonctionnalité | Normal | Mode Créateur |
|----------------|--------|---------------|
| **Packs d'Avatars** | 3 packs gratuits (samurai, boxer, pack_femmes) | **TOUS les 16 packs débloqués** |
| **Customisation Avatar** | Débloqués par achievements | **Tous cadres, fonds et effets** |
| **Thèmes** | 2 thèmes gratuits (Classic, Tiffany) | **TOUS les 10 thèmes** |
| **Icônes d'app (Logos)** | 3 logos gratuits | **TOUS les 7 logos** |
| **Export PDF** | Payant | **GRATUIT** |
| **Statistiques avancées** | Payantes | **GRATUITES** |
| **Fonctionnalités Pro** | Payantes | **TOUTES GRATUITES** |

### 📦 Les 16 Packs d'Avatars

**GRATUITS (3 packs) :**
- ⚔️ Samouraï - 0 XP
- 🥊 Boxeur - 0 XP
- 👩‍🦰 Guerrière (pack_femmes) - 0 XP

**ARTS MARTIAUX - Premium (6 packs) :**
- 🥋 Judoka - 1000 XP
- 🥊 Karatéka - 2000 XP
- 🥷 Ninja - 3000 XP
- 🥊 Fighter MMA - 4000 XP
- 🤼 Lutteur - 5000 XP
- 🌙 Ronin - 6000 XP

**LÉGENDES - Premium (3 packs) :**
- 👑 Shogun - 5000 XP
- ⚜️ Empereur - 7500 XP
- 🏆 Champion - 10000 XP + achievement

**SPÉCIAUX - Premium (4 packs) :**
- 👹 Oni - 12000 XP
- 👻 Fantôme - 15000 XP
- ⚔️ Guerrier Ultime (pack_combat) - 20000 XP + achievement
- 🦍 Monstre (pack_monstres) - 25000 XP

Avec le Mode Créateur **TOUS ces packs sont débloqués instantanément** !

---

## 💻 Comment utiliser isPro dans le code ?

### Exemple 1 : Débloquer des avatars

```typescript
import { useDevMode } from '@/lib/DevModeContext';

const AvatarSelector = () => {
  const { isPro } = useDevMode();

  const avatarPacks = [
    { id: 'samurai', name: 'Samouraï', isFree: true },
    { id: 'ninja', name: 'Ninja', isFree: false }, // Premium
    { id: 'ronin', name: 'Ronin', isFree: false }, // Premium
  ];

  return (
    <View>
      {avatarPacks.map(pack => {
        const isUnlocked = isPro || pack.isFree;

        return (
          <TouchableOpacity
            key={pack.id}
            disabled={!isUnlocked}
            style={!isUnlocked && styles.locked}
          >
            <Text>{pack.name}</Text>
            {!isUnlocked && <Text>🔒 Premium</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
```

### Exemple 2 : Débloquer des thèmes

```typescript
import { useDevMode } from '@/lib/DevModeContext';

const ThemeSelector = () => {
  const { isPro } = useDevMode();

  const themes = [
    { id: 'dark', name: 'Sombre', isFree: true },
    { id: 'gold', name: 'Or', isFree: false }, // Premium
  ];

  const handleThemePress = (theme) => {
    const isUnlocked = isPro || theme.isFree;

    if (!isUnlocked) {
      Alert.alert('🔒 Premium', 'Ce thème nécessite la version Premium');
      return;
    }

    applyTheme(theme.id);
  };

  return (
    <View>
      {themes.map(theme => (
        <TouchableOpacity key={theme.id} onPress={() => handleThemePress(theme)}>
          <Text>{theme.name}</Text>
          {!(isPro || theme.isFree) && <Text>🔒</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### Exemple 3 : Débloquer une fonctionnalité

```typescript
import { useDevMode } from '@/lib/DevModeContext';

const StatsScreen = () => {
  const { isPro } = useDevMode();

  const handleExportPDF = () => {
    if (!isPro) {
      Alert.alert(
        '🔒 Fonctionnalité Premium',
        'L\'export PDF est réservé aux utilisateurs Premium.\n\nMode Créateur : Tapez 5 fois sur "Version 1.0.0" dans les Réglages et entrez le code 2412.'
      );
      return;
    }

    // Export PDF
    exportToPDF();
  };

  return (
    <View>
      <TouchableOpacity onPress={handleExportPDF}>
        <Text>Exporter en PDF</Text>
        {!isPro && <Text>🔒 Premium</Text>}
      </TouchableOpacity>
    </View>
  );
};
```

---

## 🔧 Fonctions disponibles

### `useDevMode()`

Hook React qui expose :

```typescript
const {
  isDevMode,      // boolean: true si le mode créateur est actif
  isPro,          // boolean: alias de isDevMode (pour la compatibilité)
  tapCount,       // number: compteur de taps secrets
  showCodeInput,  // boolean: affiche la modal de saisie
  handleSecretTap, // function: déclenche le compteur de taps
  setShowCodeInput, // function: contrôle la modal
  verifyCode,     // function: vérifie le code entré
  disableDevMode, // function: désactive le mode créateur
} = useDevMode();
```

### Exemple d'utilisation complète

```typescript
import { useDevMode } from '@/lib/DevModeContext';

const MyComponent = () => {
  const { isDevMode, isPro, disableDevMode } = useDevMode();

  if (isDevMode) {
    console.log('🛠️ Mode Créateur actif - Tout est débloqué !');
  }

  return (
    <View>
      {/* Badge visible uniquement en mode créateur */}
      {isDevMode && (
        <View style={styles.devBadge}>
          <Text>🛠️ Mode Créateur</Text>
          <TouchableOpacity onPress={disableDevMode}>
            <Text>Désactiver</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contenu Premium débloqué */}
      {isPro ? (
        <Text>✅ Accès Premium activé</Text>
      ) : (
        <Text>🔒 Contenu Premium verrouillé</Text>
      )}
    </View>
  );
};
```

---

## 📱 Badge Mode Créateur

Quand le Mode Créateur est actif, un badge **"🛠️ Mode Créateur Activé"** apparaît en bas de l'écran Réglages.

Tu peux cliquer dessus pour :
- Voir le statut
- Désactiver le mode

---

## 🔒 Désactivation

Pour désactiver le Mode Créateur :

1. Aller dans **Réglages**
2. Descendre en bas
3. Cliquer sur le badge **"🛠️ Mode Créateur Activé"**
4. Confirmer la désactivation

Le mode peut aussi être désactivé programmatiquement :

```typescript
const { disableDevMode } = useDevMode();
await disableDevMode();
```

---

## 💾 Persistance

Le Mode Créateur est **persistant** :
- Stocké dans AsyncStorage
- Reste actif après fermeture de l'app
- Reste actif après redémarrage

Pour le réinitialiser complètement :
```bash
# iOS Simulator
xcrun simctl get_app_container booted com.yourapp.yoroi data
# Puis supprimer le fichier AsyncStorage
```

---

## 🎯 Checklist d'implémentation

- [x] Créer `DevModeContext.tsx`
- [x] Créer `DevCodeModal.tsx`
- [x] Intégrer `DevModeProvider` dans `_layout.tsx`
- [x] Ajouter le tap secret dans `settings.tsx`
- [x] Ajouter le badge Mode Créateur dans `settings.tsx`
- [x] Utiliser `isPro` dans les composants qui nécessitent du contenu Premium
  - [x] **ThemeSelector** - Débloquer les 8 thèmes Premium
  - [x] **Avatar Customization** - Débloquer tous les éléments (cadres, fonds, effets)
  - [x] **Avatar Gallery** - Débloquer les 16 packs d'avatars
  - [x] **Logo Selection** - Débloquer les logos Premium

---

## 🚨 Important

**Ne JAMAIS commit le code 2412 dans un dépôt public !**

Pour la version de production :
1. Changer le code dans `DevModeContext.tsx`
2. Ou désactiver complètement le mode créateur
3. Ou utiliser une variable d'environnement

```typescript
const DEV_CODE = __DEV__ ? '2412' : process.env.CREATOR_CODE;
```

---

## 📚 Exemples d'utilisation dans l'app

### Avatar Customization
```typescript
// app/avatar-customization.tsx
const { isPro } = useDevMode();
const canUseAvatar = isPro || pack.isFree;
```

### Theme Selection
```typescript
// components/ThemeSelector.tsx
const { isPro } = useDevMode();
const canUseTheme = isPro || theme.isFree;
```

### App Icon Selection
```typescript
// app/logo-selection.tsx
const { isPro } = useDevMode();
const canChangeIcon = isPro || !icon.isPremium;
```

### Avatar Packs Gallery
```typescript
// app/avatar-gallery.tsx
import { useDevMode } from '@/lib/DevModeContext';
import { avatarGalleryService } from '@/lib/avatarGalleryService';

const AvatarGallery = () => {
  const { isPro } = useDevMode();
  const [userXP, setUserXP] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);

  // Vérifier si un pack est débloqué
  const isUnlocked = avatarGalleryService.isPackUnlocked(
    pack.id,
    userXP,
    unlockedAchievements,
    isPro  // 🔓 Débloque TOUS les packs si Mode Créateur
  );

  // Obtenir tous les packs débloqués
  const unlockedPacks = avatarGalleryService.getUnlockedPacks(
    userXP,
    unlockedAchievements,
    isPro
  );

  // En Mode Créateur : 16/16 packs débloqués !
};
```

---

*Mode Créateur YOROI - Code: 2412*
