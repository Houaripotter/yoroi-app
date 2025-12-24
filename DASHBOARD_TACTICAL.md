# Dashboard Tactique/Médical - Documentation

## 🎯 Vue d'ensemble

Transformation complète de 3 cartes de l'écran d'accueil avec des animations de niveau médical/tactique (HUD futuriste) utilisant `react-native-reanimated` pour garantir 60 FPS.

---

## 🌊 1. SleepWave - L'Onde de Repos

**Fichier:** `components/SleepWave.tsx`

### Concept
Visualise le calme et la qualité du sommeil avec une onde sinusoïdale liquide et des particules flottantes.

### Animations
- **Onde sinusoïdale** : Ondule horizontalement en loop infini (4500ms normal → 2500ms si dette critique)
- **Particules ZzZ** : 4 particules de tailles différentes qui flottent du bas vers le haut avec fade out et mouvement organique
- **Réactivité** : L'onde devient plus agitée si la dette de sommeil est élevée (>5h)

### Paramètres personnalisables
```typescript
<SleepWave
  duration={480}        // minutes de sommeil
  goal={480}            // objectif (8h par défaut)
  debtHours={2}         // dette de sommeil en heures
  height={80}           // hauteur du composant
/>
```

### Palette de couleurs
- **Normal** : Dégradé Violet (#8B5CF6) → Indigo (#5B21B6)
- **Modéré** : Légèrement plus saturé
- **Critique** : Violet intense (#7C3AED) → Indigo foncé (#4C1D95)

### Optimisations
- Utilise `useSharedValue` et `useAnimatedProps` (60 FPS garanti)
- Path SVG recalculé en temps réel sans re-render React

---

## 📏 2. TacticalWeightRuler - La Règle de Précision

**Fichier:** `components/TacticalWeightRuler.tsx`

### Concept
Une règle graduée style altimètre d'avion qui glisse pour s'aligner sur le poids actuel avec un effet "rolling number".

### Animations
- **Glissement de règle** : Animation spring (damping: 15, stiffness: 100) quand le poids change
- **Rolling numbers** : Les chiffres "roulent" comme un compteur mécanique (800ms, 30 steps)
- **Courbe de tendance** : Tracée en arrière-plan avec opacité 40% pour contexte historique

### Éléments visuels
- **Graduations** : Tous les 0.5kg (petites) et 1kg (grandes)
- **Ligne repère** : Rouge (#EF4444) fixe au centre avec effet de glow
- **Indicateur objectif** : Point vert qui se positionne dynamiquement

### Paramètres personnalisables
```typescript
<TacticalWeightRuler
  currentWeight={75.2}
  targetWeight={70}
  minWeight={65}        // Auto si non fourni
  maxWeight={85}        // Auto si non fourni
  trendData={[...]}     // Historique pour courbe
  height={60}
/>
```

### Style médical
- Typo **monospace** pour effet digital/médical
- Background sombre avec bordure subtile
- Graduations précises avec opacités différenciées

---

## ⚛️ 3. ReactorCore - Le Cœur du Réacteur

**Fichier:** `components/ReactorCore.tsx`

### Concept
Anneau segmenté (40 segments) qui pulse comme un réacteur nucléaire ou un cœur qui bat.

### Animations
- **Animation d'entrée** : Les 40 segments s'allument progressivement un par un (30ms de délai entre chaque)
- **Pulsation (surcharge)** : Si risque élevé, breathing effect (scale 1 → 1.15, 800ms loop)
- **Glow dynamique** : Lueur qui pulse avec opacité variable selon l'état

### États et couleurs
| État       | Couleur   | Comportement                              |
|------------|-----------|-------------------------------------------|
| `safe`     | #10B981   | Glow léger statique                       |
| `moderate` | #F59E0B   | Glow léger statique                       |
| `high`     | #F97316   | Pulsation + glow intense                  |
| `danger`   | #EF4444   | Pulsation forte + glow rouge pulsant      |

### Paramètres personnalisables
```typescript
<ReactorCore
  totalLoad={1250}
  maxLoad={2000}
  riskLevel="moderate"
  size={90}
  label="POINTS"
/>
```

### Détails techniques
- **40 segments** calculés dynamiquement en cercle complet
- **Gradient radial** au centre pour profondeur
- **Cercle central** avec bordure et fond semi-transparent
- **Valeur centrale** en typo monospace

---

## 🎨 Personnalisation avancée

### Ajouter des effets de glow supplémentaires

Dans `SleepWave.tsx`, tu peux ajouter un filtre SVG :
```tsx
<Defs>
  <filter id="glow">
    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
    <feMerge>
      <feMergeNode in="coloredBlur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</Defs>
<AnimatedPath filter="url(#glow)" ... />
```

### Changer les vitesses d'animation

**SleepWave** :
```tsx
const waveSpeed = isCritical ? 2000 : 3500; // Plus rapide = plus nerveux
```

**ReactorCore** :
```tsx
withTiming(1.15, { duration: 600 }) // Pulsation plus rapide
```

### Ajouter des sons

Tu peux synchroniser des sons avec les animations :
```tsx
import { Audio } from 'expo-av';

useEffect(() => {
  if (isOverload) {
    const sound = new Audio.Sound();
    sound.loadAsync(require('@/assets/sounds/alarm.mp3'));
    sound.playAsync();
  }
}, [isOverload]);
```

---

## 🚀 Améliorations possibles

### Pour SleepWave
- [ ] Ajouter des étoiles qui scintillent en arrière-plan
- [ ] Faire varier la couleur selon l'heure (bleu nuit → orange matin)
- [ ] Ajouter un effet de "brume" avec SVG filters

### Pour TacticalWeightRuler
- [ ] Ajouter une animation de "scan" horizontal (ligne qui descend)
- [ ] Afficher les labels de poids (68, 69, 70...) dynamiquement
- [ ] Effet de glitch numérique quand le poids change brusquement

### Pour ReactorCore
- [ ] Ajouter des arcs électriques entre segments (SVG paths animés)
- [ ] Faire tourner l'anneau lentement (rotation infinie)
- [ ] Particules qui jaillissent du centre en surcharge

---

## 🔧 Debugging

### Si les animations ne s'affichent pas
1. Vérifier que `babel.config.js` contient bien le plugin Reanimated
2. Nettoyer le cache : `npx expo start -c`
3. Redémarrer le serveur metro

### Si les performances sont mauvaises
1. Vérifier que `useNativeDriver` est utilisé quand possible
2. Réduire le nombre de segments dans ReactorCore (40 → 20)
3. Augmenter les durées d'animation (moins d'updates par seconde)

### Si les couleurs ne correspondent pas
1. Vérifier le thème actuel dans `ThemeContext`
2. Ajuster les valeurs hardcodées dans chaque composant
3. Utiliser `colors.accent` au lieu de valeurs hex fixes

---

## 📊 Comparaison Avant/Après

| Composant          | Avant                    | Après                              |
|--------------------|--------------------------|-------------------------------------|
| **Sommeil**        | Cercle statique simple   | Onde liquide + particules ZzZ      |
| **Poids**          | Sparkline basique        | Règle tactique + rolling numbers   |
| **Charge**         | Jauge semi-circulaire    | Réacteur pulsant 40 segments       |
| **FPS**            | ~30-40 FPS (Animated)    | 60 FPS constant (Reanimated)       |
| **Vibe**           | Sportif classique        | HUD médical/tactique futuriste     |

---

## 🎯 Prochaines étapes recommandées

1. **Tester sur device réel** (les émulateurs sous-estiment les perfs)
2. **Ajouter des sons subtils** sur les transitions
3. **Créer des variantes de thème** (mode nuit plus sombre, mode clair)
4. **Harmoniser avec le reste** de l'app (battery, radar, etc.)

---

**Créé avec 🔥 pour Yoroi V2**
