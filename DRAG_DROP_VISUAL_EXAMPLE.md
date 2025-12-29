# Exemple Visuel - Mode Édition de l'Accueil

## Vue d'ensemble du mode édition

```
┌─────────────────────────────────────────────────┐
│                                    [✓ Terminer]  │ ← Bouton en haut à droite
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ ╔═══════════════════════════════════════╗ │ │
│  │ ║  [⋮] Maintenir pour déplacer         ║ │ │ ← Badge informatif
│  │ ╚═══════════════════════════════════════╝ │ │
│  │                                      [↑]  │ │ ← Bouton UP
│  │         SECTION HEADER                    │ │
│  │      (Logo + Greeting)                    │ │ ← Contenu de la section
│  │                                      [↓]  │ │ ← Bouton DOWN
│  │                                           │ │
│  │  ~ Animation de tremblement ~            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ ╔═══════════════════════════════════════╗ │ │
│  │ ║  [⋮] Maintenir pour déplacer         ║ │ │
│  │ ╚═══════════════════════════════════════╝ │ │
│  │                                      [↑]  │ │
│  │    STATS COMPACT                          │ │
│  │  🔥 Streak | ⚡ Niveau | 🏆 Rang          │ │
│  │                                      [↓]  │ │
│  │  ~ Animation de tremblement ~            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ ╔═══════════════════════════════════════╗ │ │
│  │ ║  [⋮] Maintenir pour déplacer         ║ │ │
│  │ ╚═══════════════════════════════════════╝ │ │
│  │                                      [↑]  │ │
│  │   WEIGHT & HYDRATION                      │ │
│  │  ┌────────────┐  ┌────────────┐          │ │
│  │  │   Poids    │  │ Hydratation│          │ │
│  │  └────────────┘  └────────────┘          │ │
│  │                                      [↓]  │ │
│  │  ~ Animation de tremblement ~            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ ╔═══════════════════════════════════════╗ │ │
│  │ ║  [⋮] Maintenir pour déplacer         ║ │ │
│  │ ╚═══════════════════════════════════════╝ │ │
│  │                                      [↑]  │ │
│  │      ACTIONS ROW                          │ │
│  │  [Infirmerie] [Timer] [Photo] [Lab]      │ │
│  │                                           │ │ ← Pas de bouton DOWN
│  │  ~ Animation de tremblement ~            │ │   (dernière section)
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Détails des éléments

### 1. Badge "Maintenir pour déplacer"

```
╔═══════════════════════════════════════╗
║  [⋮] Maintenir pour déplacer         ║
╚═══════════════════════════════════════╝

Position: Centré horizontalement, 8px du haut
Couleur: colors.accent + 'CC' (opacité)
Padding: 12px horizontal, 6px vertical
Border Radius: 20px
Z-Index: 10
Pointer Events: none (ne bloque pas les interactions)

Contenu:
  - Icône: GripVertical (14px, blanc)
  - Texte: "Maintenir pour déplacer" (11px, bold, blanc)
  - Gap: 6px entre icône et texte
```

### 2. Boutons UP/DOWN

```
Structure verticale:

  [↑]    ← Bouton UP

  [↓]    ← Bouton DOWN

Position: Côté droit (8px du bord)
Centrage: Vertical (50% - 40px)
Gap: 8px entre les deux boutons
Z-Index: 10

Style de chaque bouton:
  - Dimensions: 36x36px
  - Border Radius: 18px (cercle parfait)
  - Background: colors.accent
  - Icône: ChevronUp/Down (20px, blanc, strokeWidth=3)
  - Shadow:
    - Color: #000
    - Offset: (0, 2)
    - Opacity: 0.3
    - Radius: 3
    - Elevation: 5 (Android)
```

### 3. Animation de tremblement

```
Animation en boucle:
  - Rotation: -1deg → 0deg → 1deg → 0deg
  - Durée: 100ms par étape
  - Easing: Linear
  - Native Driver: true

Sequence:
  1. Rotate to 1deg   (100ms)
  2. Rotate to -1deg  (100ms)
  3. Rotate to 0deg   (100ms)
  4. Repeat infinitely
```

## Flux d'interaction détaillé

### Activation du mode édition

```
État initial (Mode Normal)
         ↓
   Appui long (800ms)
         ↓
   Feedback haptique (Heavy)
         ↓
   setEditMode(true)
         ↓
┌─────────────────────┐
│  Mode Édition ON    │
├─────────────────────┤
│ ✓ Tremblements      │
│ ✓ Badges visibles   │
│ ✓ Boutons visibles  │
│ ✓ Bouton Terminer   │
└─────────────────────┘
```

### Déplacement d'une section

```
Mode Édition activé
         ↓
   Clic sur bouton ↑ ou ↓
         ↓
   Feedback haptique (Light)
         ↓
   Validation (pas première/dernière)
         ↓
   Swap des sections
         ↓
   Mise à jour des ordres
         ↓
   setHomeSections(updatedSections)
         ↓
   Sauvegarde AsyncStorage
         ↓
   UI se met à jour automatiquement
```

### Désactivation du mode édition

```
Mode Édition activé
         ↓
   Clic sur bouton "Terminer"
         ↓
   Feedback haptique (Medium)
         ↓
   setEditMode(false)
         ↓
   Arrêt des animations de tremblement
         ↓
   Sauvegarde finale AsyncStorage
         ↓
   Retour au mode normal
```

### Navigation vers l'éditeur avancé

```
Mode Édition activé
         ↓
   Appui long (800ms) sur une section
         ↓
   Feedback haptique (Heavy)
         ↓
   router.push('/customize-home')
         ↓
┌─────────────────────┐
│  Écran Customize    │
├─────────────────────┤
│ ✓ Drag & Drop       │
│ ✓ Visibilité        │
│ ✓ Plus d'options    │
└─────────────────────┘
```

## Conditions d'affichage des boutons

### Bouton UP (↑)

```typescript
const canMoveUp = sectionIndex > 0;

Exemples:
  - Section 0 (header) → canMoveUp = false → Pas de bouton UP
  - Section 1 (stats)  → canMoveUp = true  → Bouton UP visible
  - Section 5 (défis)  → canMoveUp = true  → Bouton UP visible
```

### Bouton DOWN (↓)

```typescript
const canMoveDown = sectionIndex < homeSections.length - 1;

Exemples:
  - Section 0 (header)          → canMoveDown = true  → Bouton DOWN visible
  - Section 5 (défis)           → canMoveDown = true  → Bouton DOWN visible
  - Dernière section (battery)  → canMoveDown = false → Pas de bouton DOWN
```

## Cas particuliers

### Section avec peu de contenu

```
┌───────────────────────────────────────────┐
│ ╔═══════════════════════════════════════╗ │
│ ║  [⋮] Maintenir pour déplacer         ║ │
│ ╚═══════════════════════════════════════╝ │
│                                      [↑]  │
│    Petite Section                         │
│                                      [↓]  │
└───────────────────────────────────────────┘

Les boutons sont centrés verticalement
même si la section est petite.
```

### Section avec beaucoup de contenu

```
┌───────────────────────────────────────────┐
│ ╔═══════════════════════════════════════╗ │
│ ║  [⋮] Maintenir pour déplacer         ║ │
│ ╚═══════════════════════════════════════╝ │
│                                      [↑]  │
│    Grande Section                         │
│                                           │
│    Beaucoup de contenu...                 │
│                                           │
│    Lorem ipsum dolor sit amet...          │
│                                      [↓]  │
│                                           │
│    Encore du contenu...                   │
└───────────────────────────────────────────┘

Les boutons restent centrés verticalement
grâce à transform: translateY(-40).
```

### Première section (header)

```
┌───────────────────────────────────────────┐
│ ╔═══════════════════════════════════════╗ │
│ ║  [⋮] Maintenir pour déplacer         ║ │
│ ╚═══════════════════════════════════════╝ │
│                                           │ ← Pas de bouton UP
│         SECTION HEADER                    │
│      (Logo + Greeting)                    │
│                                      [↓]  │
└───────────────────────────────────────────┘

Seul le bouton DOWN est visible
car canMoveUp = false.
```

### Dernière section

```
┌───────────────────────────────────────────┐
│ ╔═══════════════════════════════════════╗ │
│ ║  [⋮] Maintenir pour déplacer         ║ │
│ ╚═══════════════════════════════════════╝ │
│                                      [↑]  │
│      DERNIÈRE SECTION                     │
│    (Battery + Tools)                      │
│                                           │ ← Pas de bouton DOWN
└───────────────────────────────────────────┘

Seul le bouton UP est visible
car canMoveDown = false.
```

## Couleurs et thème

### Mode Clair (Light)

```
Badge:
  - Background: #FF6B35CC (accent + opacité)
  - Texte: #FFFFFF
  - Icône: #FFFFFF

Boutons:
  - Background: #FF6B35 (accent)
  - Icône: #FFFFFF
  - Shadow: rgba(0, 0, 0, 0.3)

Bouton Terminer:
  - Background: #FF6B35 (accent)
  - Icône: #FFFFFF
```

### Mode Sombre (Dark)

```
Badge:
  - Background: #FF6B35CC (accent + opacité)
  - Texte: #FFFFFF
  - Icône: #FFFFFF

Boutons:
  - Background: #FF6B35 (accent)
  - Icône: #FFFFFF
  - Shadow: rgba(0, 0, 0, 0.5)

Bouton Terminer:
  - Background: #FF6B35 (accent)
  - Icône: #FFFFFF
```

## Performance et optimisations

### Animations optimisées
- `useNativeDriver: true` pour 60 FPS constants
- Animations sur `transform` uniquement (pas de layout)
- Aucun recalcul de dimensions

### Sauvegarde intelligente
- Sauvegarde après chaque déplacement
- Évite la perte de données
- AsyncStorage rapide

### Rendu conditionnel
- Boutons UP/DOWN rendus seulement si nécessaire
- Badge avec `pointerEvents="none"` pour performances
- Z-index optimisé pour éviter les repaints

## Accessibilité

- Boutons avec taille minimum de 36x36px (recommandé 44x44px)
- Contraste élevé (blanc sur accent)
- Feedback visuel et haptique
- Texte clair et descriptif
- Icônes universelles (↑/↓)

## Responsive

- Positions en pourcentage pour s'adapter à tous les écrans
- Transform pour centrage précis
- Gap entre boutons adaptatif
- Badge centré quelque soit la largeur
