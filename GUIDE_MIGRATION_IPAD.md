# 📱 Guide de Migration iPad - YOROI

## ✅ Ce qui a été fait

### 1. Système Responsive Créé
- ✅ Fichier `/constants/responsive.ts` avec toutes les fonctions utilitaires
- ✅ Détection automatique iPad vs iPhone
- ✅ Fonctions `scale()`, `scaleModerate()`, `scaleVertical()`
- ✅ Constantes responsive pré-calculées
- ✅ **NEW:** `getHistoryDays()` - 3 jours sur iPhone, 7 sur iPad
- ✅ **NEW:** `getChartDataPoints()` - Adapte le nombre de points dans les graphiques

### 2. Constantes de Design Adaptées
- ✅ `/constants/design.ts` - Toutes les constantes (SPACING, RADIUS, TYPOGRAPHY, TAB_BAR) utilisent maintenant le système responsive

### 3. Composants Critiques Adaptés
- ✅ `/components/Avatar.tsx` - Toutes les tailles sont responsive
- ✅ `/components/cards/WeightLottieCard.tsx` - Carte + graphique 7 jours sur iPad

### 4. **Graphiques Adaptés** 🎯
- ✅ `/components/stats/WeightStats.tsx` - Sparkline 7 jours sur iPad
- ✅ `/components/stats/PerformanceStats.tsx` - Historique 7 jours sur iPad
- ✅ `/components/stats/CompositionStats.tsx` - Historique adapté

---

## 🔧 Comment Adapter un Composant

### Pattern de Migration

**AVANT :**
```tsx
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  icon: {
    width: 32,
    height: 32,
  },
});
```

**APRÈS :**
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { scale, scaleModerate } from '@/constants/responsive';

const styles = StyleSheet.create({
  container: {
    padding: scale(16),        // Padding/Margin/Width/Height
    borderRadius: scale(12),   // Border radius
  },
  title: {
    fontSize: scaleModerate(24, 0.4),  // Texte avec scaling modéré
    marginBottom: scale(8),
  },
  icon: {
    width: scale(32),
    height: scale(32),
  },
});
```

### Règles de Scaling

| Type de valeur | Fonction à utiliser | Exemple |
|----------------|---------------------|---------|
| `padding`, `margin` | `scale()` | `padding: scale(16)` |
| `width`, `height` | `scale()` | `width: scale(100)` |
| `borderRadius` | `scale()` | `borderRadius: scale(12)` |
| `fontSize` | `scaleModerate(X, 0.3-0.5)` | `fontSize: scaleModerate(16, 0.3)` |
| `gap`, `spacing` | `scale()` | `gap: scale(8)` |
| `shadowRadius` | `scale()` | `shadowRadius: scale(10)` |
| `borderWidth` | `scale()` | `borderWidth: scale(2)` |
| **Historique graphique** | `getHistoryDays()` | `data.slice(-getHistoryDays())` |
| **Points de données** | `getChartDataPoints()` | `getChartDataPoints('mini')` |

### Facteur de Scaling Modéré

Pour `scaleModerate(size, factor)` :
- **0.3** : Pour les petits textes (< 14px)
- **0.4** : Pour les textes moyens (16-24px)
- **0.5** : Pour les gros titres (> 28px)

---

## 📋 Liste des Fichiers à Adapter

### Priorité HAUTE (Très visibles)
1. `/app/(tabs)/index.tsx` - Écran d'accueil
2. `/app/(tabs)/stats.tsx` - Statistiques
3. `/app/(tabs)/planning.tsx` - Planning
4. `/app/(tabs)/more.tsx` - Plus
5. `/app/(tabs)/add.tsx` - Ajout

### Priorité MOYENNE (Composants réutilisables)
6. `/components/cards/HydrationLottieCard.tsx`
7. `/components/cards/SleepLottieCard.tsx`
8. `/components/cards/ChargeLottieCard.tsx`
9. `/components/AvatarDisplay.tsx`
10. `/components/RanksModal.tsx`
11. `/components/PerformanceRadar.tsx`

### Priorité BASSE (Écrans secondaires)
- Tous les autres écrans dans `/app/`
- Composants de détail
- Modales et popups

---

## 🎯 Utilisation des Constantes Existantes

Au lieu de valeurs en dur, utilise les constantes déjà adaptées :

```tsx
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/design';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,           // Au lieu de padding: 16
    borderRadius: RADIUS.xl,       // Au lieu de borderRadius: 24
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,  // Au lieu de fontSize: 20
  },
});
```

---

## 🔍 Trouver les Valeurs à Adapter

### Commande de recherche
```bash
# Trouver tous les fontSize en dur dans un fichier
grep -n "fontSize: [0-9]" chemin/fichier.tsx

# Trouver tous les padding/margin en dur
grep -n "padding\|margin: [0-9]" chemin/fichier.tsx
```

### Valeurs à chercher
- `fontSize: <nombre>`
- `padding: <nombre>`
- `margin: <nombre>`
- `width: <nombre>`
- `height: <nombre>`
- `borderRadius: <nombre>`
- `gap: <nombre>`

---

## 🧪 Tester sur iPad

### Lancer sur iPad Simulator
```bash
# Ouvrir le simulateur iPad
npx expo run:ios --device "iPad Pro (12.9-inch)"

# Ou choisir manuellement le device dans Xcode
```

### Vérifier
1. Les textes sont lisibles (pas trop petits)
2. Les espacements sont cohérents
3. Les cartes ne sont pas écrasées
4. Les icônes ont une bonne taille
5. La navigation est facile

---

## 💡 Astuces

### 1. Utiliser deviceValue pour des cas spécifiques
```tsx
import { deviceValue } from '@/constants/responsive';

const columns = deviceValue(2, 3); // 2 pour iPhone, 3 pour iPad
```

### 2. Utiliser deviceStyle pour des styles différents
```tsx
import { deviceStyle } from '@/constants/responsive';

const containerStyle = deviceStyle(
  { flexDirection: 'column' },  // iPhone
  { flexDirection: 'row' }      // iPad
);
```

### 3. Grille responsive
```tsx
import { getGridColumns, getGridItemWidth } from '@/constants/responsive';

const columns = getGridColumns(); // 2 sur iPhone, 3 sur iPad
const itemWidth = getGridItemWidth(); // Largeur calculée automatiquement
```

### 4. Graphiques adaptatifs 🎯
```tsx
import { getHistoryDays, getChartDataPoints } from '@/constants/responsive';

// Pour les historiques/sparklines
const historyDays = getHistoryDays(); // 3 sur iPhone, 7 sur iPad
const recentData = data.slice(-historyDays);

// Pour les graphiques
const dataPoints = getChartDataPoints('mini'); // 3 sur iPhone, 7 sur iPad
// Type: 'mini' (3/7), 'medium' (5/10), 'large' (7/14)
```

---

## 📊 Statistiques du Projet

- **Total de fichiers TSX** : 283
- **Fichiers avec valeurs en dur** : 262
- **Occurrences totales** : 4925
- **Fichiers déjà adaptés** : 7 ✅
  - `responsive.ts` (nouveau)
  - `design.ts` (modifié)
  - `Avatar.tsx` (modifié)
  - `WeightLottieCard.tsx` (modifié)
  - `WeightStats.tsx` (modifié)
  - `PerformanceStats.tsx` (modifié)
  - `CompositionStats.tsx` (modifié)

---

## 🚀 Stratégie Progressive

### Phase 1 : Fondations (✅ FAIT)
- Système responsive
- Constantes adaptées
- Composants exemples

### Phase 2 : Écrans Principaux (À FAIRE)
- Adapter les 5 tabs
- Tester sur iPad
- Ajuster si nécessaire

### Phase 3 : Composants (À FAIRE)
- Adapter les cartes
- Adapter les modales
- Adapter les composants réutilisables

### Phase 4 : Finitions (À FAIRE)
- Écrans secondaires
- Edge cases
- Polissage

---

## ❓ FAQ

### "Est-ce que je dois TOUT adapter ?"
Non ! Adapte d'abord ce qui est le plus visible (écrans principaux, composants utilisés partout). Le reste peut attendre.

### "L'app crash après adaptation"
Vérifie que tu as bien importé `scale` et `scaleModerate` :
```tsx
import { scale, scaleModerate } from '@/constants/responsive';
```

### "Les proportions sont bizarres sur iPad"
Essaye d'ajuster le facteur de `scaleModerate()` :
- Trop petit ? Augmente le facteur (0.3 → 0.4)
- Trop gros ? Diminue le facteur (0.5 → 0.3)

### "Je veux des layouts différents iPad/iPhone"
Utilise `deviceStyle()` ou `isIPad()` :
```tsx
import { isIPad } from '@/constants/responsive';

const MyComponent = () => {
  const columns = isIPad() ? 3 : 2;

  return (
    <FlatList
      numColumns={columns}
      // ...
    />
  );
};
```

---

## 🎓 Exemples de Migration

### Exemple 1 : Card Simple
```tsx
// AVANT
const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});

// APRÈS
import { scale, scaleModerate } from '@/constants/responsive';

const styles = StyleSheet.create({
  card: {
    padding: scale(16),
    borderRadius: scale(12),
    marginBottom: scale(12),
  },
  title: {
    fontSize: scaleModerate(18, 0.3),
    fontWeight: '700',
  },
});
```

### Exemple 2 : Layout avec Grille
```tsx
// AVANT
<View style={{ flexDirection: 'row', gap: 12 }}>
  <View style={{ width: 100, height: 100 }} />
  <View style={{ width: 100, height: 100 }} />
</View>

// APRÈS
import { scale, getGridItemWidth } from '@/constants/responsive';

<View style={{ flexDirection: 'row', gap: scale(12) }}>
  <View style={{ width: getGridItemWidth(), height: scale(100) }} />
  <View style={{ width: getGridItemWidth(), height: scale(100) }} />
</View>
```

### Exemple 3 : Graphique Adaptatif
```tsx
// AVANT
const sparklineData = data.slice(-3).map(entry => ({
  value: entry.weight
}));

// APRÈS
import { getHistoryDays } from '@/constants/responsive';

const historyDays = getHistoryDays(); // 3 sur iPhone, 7 sur iPad
const sparklineData = data.slice(-historyDays).map(entry => ({
  value: entry.weight
}));
```

---

**Dernière mise à jour** : 28 décembre 2025
**Status** : Phase 1 complétée ✅ + Graphiques adaptés ✅
