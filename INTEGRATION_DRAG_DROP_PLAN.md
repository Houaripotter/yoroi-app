# Plan d'Intégration - Drag & Drop iOS-like

## Problème actuel

Le fichier `app/(tabs)/index.tsx` fait 1400+ lignes avec:
- 15 sections hardcodées en JSX
- Logique complexe (mode guerrier vs essentiel)
- Beaucoup de state et effets imbriqués
- Refonte complète = risque élevé de bugs

## Solution Proposée: Approche Progressive

### Phase 1: Préparer les sections (ACTUEL)

**Créer un mapping des sections:**
```typescript
// hooks/useSectionRenderers.tsx
export const useSectionRenderers = (props) => {
  return {
    header: () => <HeaderSection {...props} />,
    stats_compact: () => <StatsCompactSection {...props} />,
    weight_hydration: () => <WeightHydrationSection {...props} />,
    // ... etc pour toutes les sections
  };
};
```

**Avantages:**
- Modularité: chaque section devient un composant
- Réutilisable
- Plus facile à tester
- Pas de changement de logique

### Phase 2: Wrapper de sections

**Wrapper chaque section existante:**
```typescript
// Dans index.tsx
import { SectionWrapper } from '@/components/home/SectionWrapper';

// Avant:
{isSectionVisible('header') && (
  <View style={styles.header}>
    {/* ... */}
  </View>
)}

// Après:
<SectionWrapper sectionId="header" editMode={editMode}>
  {isSectionVisible('header') && (
    <View style={styles.header}>
      {/* ... */}
    </View>
  )}
</SectionWrapper>
```

### Phase 3: Mode Édition

**Ajouter le système de drag & drop:**

```typescript
// État de mode édition
const [editMode, setEditMode] = useState(false);
const [editableSections, setEditableSections] = useState<HomeSection[]>([]);

// Fonction pour collecter les sections et activer le mode édition
const activateEditMode = () => {
  setEditMode(true);
  // Transformer les sections en liste draggable
  const visibleSections = homeSections.filter(s => s.visible);
  setEditableSections(visibleSections);
};

// En mode édition, afficher le DraggableHomeList
if (editMode) {
  return (
    <DraggableHomeList
      sections={editableSections}
      onSectionsChange={setEditableSections}
      renderSection={(section) => {
        const renderer = sectionRenderers[section.id];
        return renderer ? renderer() : null;
      }}
    />
  );
}

// Sinon, afficher normalement
return (
  <ScrollView>
    {/* Contenu normal actuel */}
  </ScrollView>
);
```

## Approche Alternative: Plus Simple

### Option 1: Drag & Drop dans un écran séparé

**Avantage:** Zéro risque pour l'accueil actuel
**Inconvénient:** Pas de drag & drop directement sur l'accueil

1. Garder l'accueil comme il est
2. Améliorer l'écran `/customize-home` avec drag & drop complet
3. Ajouter un bouton "Réorganiser" dans le header de l'accueil

### Option 2: Drag & Drop progressif par couches

**Phase 1:**
- Implémenter drag & drop pour les 5 sections principales seulement
- Laisser les autres sections fixes

**Phase 2:**
- Étendre progressivement aux autres sections

## Recommandation

**Option recommandée:** Drag & Drop dans écran séparé + Aperçu live

```
Accueil                    Personnaliser
┌───────────┐             ┌───────────┐
│ Header    │             │ ≡ Header  │ ← Drag handle
│           │             │           │
│ Stats     │  [Bouton]   │ ≡ Stats   │ ← Appui long pour drag
│           │   ──────>   │           │
│ Poids     │   "Edit"    │ ≡ Poids   │
│           │             │           │
└───────────┘             └───────────┘
                          [Sauvegarde auto]
```

**Avantages:**
- Pas de refonte de l'accueil
- Système de drag & drop complet
- Sauvegarde automatique
- Preview en temps réel si on ajoute un panneau de preview

## Prochaines Étapes

1. **Décision:** Quelle approche choisir?
2. **Extraction:** Créer les composants de sections
3. **Intégration:** Ajouter le drag & drop
4. **Tests:** Vérifier sur émulateur
5. **Polish:** Animations et feedback haptique

## Fichiers Créés

- ✅ `components/DraggableHomeList.tsx` - Système de drag & drop iOS-like
- ✅ `components/home/SectionWrapper.tsx` - Wrapper avec animations
- ✅ `app/customize-home.tsx` - Écran de personnalisation simplifié (masquer/afficher)

## Fichiers à Créer

- ⏳ `hooks/useSectionRenderers.tsx` - Renderers de sections modulaires
- ⏳ `components/home/sections/*.tsx` - Composants de sections individuelles
- ⏳ Mise à jour de `app/(tabs)/index.tsx` avec le système
