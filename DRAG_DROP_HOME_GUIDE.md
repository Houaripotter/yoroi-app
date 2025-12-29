# Guide - Fonctionnalité Drag & Drop de l'Accueil

## Vue d'ensemble

La fonctionnalité de réorganisation de l'écran d'accueil permet aux utilisateurs de personnaliser l'ordre des sections selon leurs préférences.

## Fonctionnement

### Mode Normal
- **Appui long (800ms)** sur n'importe quelle section → Active le mode édition
- Feedback haptique lourd lors de l'activation

### Mode Édition

Une fois en mode édition, l'utilisateur voit :

#### 1. Animations visuelles
- Toutes les sections tremblent légèrement (shake animation)
- Indique clairement que l'écran est en mode édition

#### 2. Badge informatif
- Position : Centré en haut de chaque section
- Texte : "Maintenir pour déplacer"
- Icône : GripVertical
- Couleur : Accent avec opacité (CC)
- Permet d'informer l'utilisateur qu'un appui long ouvre l'éditeur complet

#### 3. Boutons de réorganisation
- **Bouton UP (↑)** : Déplace la section vers le haut
  - Visible seulement si la section n'est pas la première
- **Bouton DOWN (↓)** : Déplace la section vers le bas
  - Visible seulement si la section n'est pas la dernière
- Position : Côté droit de chaque section, verticalement centré
- Style : Boutons circulaires avec couleur accent
- Feedback haptique léger à chaque clic

#### 4. Actions supplémentaires
- **Appui long (800ms)** sur une section → Ouvre `/customize-home` pour drag & drop complet
- **Bouton Terminer (✓)** en haut à droite → Désactive le mode édition et sauvegarde

## Implémentation technique

### Imports ajoutés
```typescript
import {
  ChevronUp,
  ChevronDown,
  GripVertical,
  // ... autres imports
} from 'lucide-react-native';
```

### Fonction `moveSection`
```typescript
const moveSection = async (sectionId: string, direction: 'up' | 'down') => {
  // 1. Feedback haptique
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // 2. Trouve l'index actuel
  const currentIndex = homeSections.findIndex(s => s.id === sectionId);

  // 3. Calcule le nouvel index
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  // 4. Swap les sections
  const newSections = [...homeSections];
  [newSections[currentIndex], newSections[newIndex]] =
    [newSections[newIndex], newSections[currentIndex]];

  // 5. Met à jour les ordres
  const updatedSections = newSections.map((section, index) => ({
    ...section,
    order: index,
  }));

  // 6. Sauvegarde automatique
  setHomeSections(updatedSections);
  await saveHomeCustomization(updatedSections);
};
```

### Fonction `wrapSectionWithAnimation` modifiée

#### Mode Normal
```typescript
if (!editMode) {
  return (
    <LongPressGestureHandler
      onHandlerStateChange={handleLongPress}
      minDurationMs={800}
    >
      <Animated.View style={animatedStyle}>
        {content}
      </Animated.View>
    </LongPressGestureHandler>
  );
}
```

#### Mode Édition
```typescript
return (
  <LongPressGestureHandler onHandlerStateChange={handleLongPressEdit} minDurationMs={800}>
    <Animated.View style={[animatedStyle, { position: 'relative' }]}>
      {content}

      {/* Badge "Maintenir pour déplacer" */}
      <View style={badgeStyle} pointerEvents="none">
        <GripVertical size={14} color="#FFFFFF" />
        <Text>Maintenir pour déplacer</Text>
      </View>

      {/* Boutons UP/DOWN */}
      <View style={buttonsContainerStyle}>
        {canMoveUp && (
          <TouchableOpacity onPress={() => moveSection(sectionId, 'up')}>
            <ChevronUp size={20} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
        )}
        {canMoveDown && (
          <TouchableOpacity onPress={() => moveSection(sectionId, 'down')}>
            <ChevronDown size={20} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  </LongPressGestureHandler>
);
```

## Flux utilisateur complet

1. **Activation**
   - L'utilisateur fait un appui long (800ms) sur une section
   - Toutes les sections commencent à trembler
   - Les badges et boutons apparaissent
   - Bouton "Terminer" apparaît en haut à droite

2. **Réorganisation rapide**
   - Cliquer sur ↑ pour monter la section
   - Cliquer sur ↓ pour descendre la section
   - Sauvegarde automatique après chaque mouvement

3. **Éditeur complet (optionnel)**
   - Appui long (800ms) sur une section → Ouvre `/customize-home`
   - Permet un drag & drop plus avancé avec plus d'options

4. **Désactivation**
   - Cliquer sur le bouton "Terminer" (✓)
   - Les sections arrêtent de trembler
   - Les badges et boutons disparaissent
   - Sauvegarde finale automatique

## Avantages de cette approche

### 1. Simplicité
- Pas besoin de bibliothèque externe complexe (DraggableFlatList)
- Code plus maintenable et compréhensible
- Moins de dépendances

### 2. Performance
- Animations natives React Native
- Pas de calculs complexes de position
- Swap simple de positions

### 3. Expérience utilisateur
- Feedback visuel clair (tremblements + badges)
- Feedback haptique à chaque interaction
- Boutons intuitifs (↑/↓)
- Sauvegarde automatique

### 4. Extensibilité
- Possibilité d'ouvrir l'éditeur complet avec appui long
- Bridge parfait vers `/customize-home` pour fonctionnalités avancées

## Points d'attention

1. **Z-Index** : Les overlays (badge + boutons) ont un z-index élevé (10) pour être au-dessus du contenu
2. **pointerEvents** : Le badge a `pointerEvents="none"` pour ne pas bloquer les interactions
3. **Transform** : Utilise `translateX` et `translateY` pour centrer les éléments
4. **Conditions** : Les boutons UP/DOWN n'apparaissent que si le mouvement est possible
5. **Sauvegarde** : Automatique après chaque déplacement pour éviter la perte de données

## Tests recommandés

1. Activer le mode édition avec un appui long
2. Déplacer des sections vers le haut et vers le bas
3. Vérifier que la première section ne peut pas monter
4. Vérifier que la dernière section ne peut pas descendre
5. Vérifier la sauvegarde après fermeture et réouverture
6. Tester l'appui long en mode édition → doit ouvrir `/customize-home`
