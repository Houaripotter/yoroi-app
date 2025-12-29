# Emploi du Temps - Design Type École 📅

## Vue Grille Horizontale (comme à l'école)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ EMPLOI DU TEMPS                                                              [+ Ajouter]       │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌──────────┬────────────┬────────────┬────────────┬────────────┬────────────┬────────────┬────────────┐
│  │          │    LUN     │    MAR     │    MER     │    JEU     │    VEN     │    SAM     │    DIM     │
│  ├──────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┤
│  │  Matin   │            │            │ ┌────────┐ │            │            │ ┌────────┐ │            │
│  │ 07:00-   │     +      │     +      │ │ 07:30  │ │     +      │     +      │ │ 08:00  │ │     +      │
│  │  12:00   │            │            │ │ Basic  │ │            │            │ │ Gracie │ │            │
│  │          │            │            │ │ Fit    │ │            │            │ │ Barra  │ │            │
│  │          │            │            │ │ Muscu  │ │            │            │ │ Cours  │ │            │
│  │          │            │            │ └────────┘ │            │            │ └────────┘ │            │
│  ├──────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┤
│  │ Après-   │            │ ┌────────┐ │            │            │ ┌────────┐ │            │            │
│  │  midi    │     +      │ │ 14:00  │ │     +      │     +      │ │ 13:00  │ │     +      │     +      │
│  │ 12:00-   │            │ │ Gracie │ │            │            │ │ Basic  │ │            │            │
│  │  17:00   │            │ │ Barra  │ │            │            │ │ Fit    │ │            │            │
│  │          │            │ │ Drill  │ │            │            │ │ Cardio │ │            │            │
│  │          │            │ └────────┘ │            │            │ └────────┘ │            │            │
│  ├──────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┤
│  │  Soir    │ ┌────────┐ │            │ ┌────────┐ │ ┌────────┐ │            │            │            │
│  │ 17:00-   │ │ 18:00  │ │     +      │ │ 19:00  │ │ │ 18:30  │ │     +      │     +      │     +      │
│  │  21:00   │ │ Gracie │ │            │ │ Gracie │ │ │ Basic  │ │            │            │            │
│  │          │ │ Barra  │ │            │ │ Barra  │ │ │ Fit    │ │            │            │            │
│  │          │ │ Cours  │ │            │ │ Spar   │ │ │ Legs   │ │            │            │            │
│  │          │ └────────┘ │            │ └────────┘ │ └────────┘ │            │            │            │
│  └──────────┴────────────┴────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘
│                                                                                                 │
│  ┌────────────────────────────────────────────────────────────────┐                           │
│  │              8 séances                 ~10h cette semaine       │                           │
│  └────────────────────────────────────────────────────────────────┘                           │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Caractéristiques

### Layout en Grille
- **7 colonnes** : Une par jour (LUN → DIM)
- **1 colonne horaire** : Créneaux (Matin, Après-midi, Soir)
- **Scroll horizontal** : Pour voir toute la semaine
- **Vue d'ensemble** : Tout visible d'un coup d'œil

### Créneaux Horaires

#### Matin (07:00 - 12:00)
- Séances matinales
- Badge horaire visible

#### Après-midi (12:00 - 17:00)
- Séances de milieu de journée
- Badge horaire visible

#### Soir (17:00 - 21:00)
- Séances en soirée
- Badge horaire visible

### Cartes de Séance (dans la grille)

Chaque carte affiche :
```
┌────────────────┐
│ ⏰ 18:00       │  ← Heure de début
│ Gracie Barra   │  ← Nom du club
│ Cours          │  ← Type principal
└────────────────┘
   ← Barre couleur club (gauche)
```

**Design compact** :
- Heure avec icône Clock
- Nom du club (1 ligne max)
- Type principal de séance
- Barre de couleur du club (bordure gauche)
- Fond avec transparence de la couleur du club

### Cases Vides
- Icône **+** (Plus) au centre
- Opacité 30%
- Cliquable pour ajouter une séance à ce créneau

### Header
- **"EMPLOI DU TEMPS"** en gras et lettres espacées
- Bouton **"+ Ajouter"** à droite
- Design minimaliste

### Résumé
- Nombre total de séances
- Heures totales de la semaine
- Card arrondie en bas

## Code Structure

### Composant Principal
`components/planning/TimetableView.tsx`

### Props
```typescript
interface TimetableViewProps {
  onAddSession: (dayId: string, timeSlot?: string) => void;
  onSessionPress: (dayId: string, sessionIndex: number) => void;
}
```

### Données
- Hook : `useWeekSchedule()`
- Groupement automatique par créneau horaire
- Détection du créneau selon l'heure de début

### Dimensions
- **Colonne horaire** : 100px
- **Colonne jour** : 140px
- **Hauteur min cellule** : 100px
- **Espacement** : 2px entre cellules

## Interaction Utilisateur

### Clic sur une séance
- Ouvre le détail de la séance
- Handler : `onSessionPress(dayId, sessionIndex)`

### Clic sur case vide (+)
- Ouvre le modal d'ajout
- Pré-remplit le jour et le créneau horaire
- Handler : `onAddSession(dayId, timeSlot)`

### Bouton Ajouter (header)
- Ouvre le modal d'ajout
- Par défaut : Lundi
- Handler : `onAddSession('lun')`

## Avantages du Design

### Vue d'Ensemble
- ✅ Tous les jours visibles en même temps
- ✅ Format horizontal familier (type emploi du temps scolaire)
- ✅ Créneaux horaires clairs

### Lisibilité
- ✅ Grille structurée
- ✅ Séparation visuelle des créneaux
- ✅ Couleurs par club

### Compacité
- ✅ 3-4 créneaux par jour (pas 30 lignes)
- ✅ Informations essentielles uniquement
- ✅ Scroll horizontal fluide

### Flexibilité
- ✅ Plusieurs séances par créneau possibles
- ✅ Cases vides = opportunité d'ajouter
- ✅ Design responsive

## Exemple Concret

### Lundi
- **Soir (18:00)** : Gracie Barra - Cours

### Mardi
- **Après-midi (14:00)** : Gracie Barra - Drilling

### Mercredi
- **Matin (07:30)** : Basic Fit - Musculation
- **Soir (19:00)** : Gracie Barra - Sparring

### Jeudi
- **Soir (18:30)** : Basic Fit - Legs

### Vendredi
- **Après-midi (13:00)** : Basic Fit - Cardio

### Samedi
- **Matin (08:00)** : Gracie Barra - Cours

### Dimanche
- Repos

**Total** : 7 séances, ~10h

## Comparaison avec l'ancien

### ❌ Ancien (liste verticale)
```
LUNDI
  Gracie Barra  >

MARDI
  -

MERCREDI
  Basic Fit  >
```
- Liste verticale
- Un jour à la fois
- Pas de vue d'ensemble
- Beaucoup de scroll

### ✅ Nouveau (grille horizontale)
```
     LUN    MAR    MER    JEU    VEN    SAM    DIM
Matin  -      -     💪     -      -     🥋     -
Soir   🥋     -     🥋    💪     -      -      -
```
- Grille horizontale
- Tous les jours visibles
- Vue d'ensemble immédiate
- Format familier (école)

## Intégration dans Planning

### Onglet renommé
- **Avant** : "Programme"
- **Après** : "Emploi du Temps"

### Import
```typescript
import { TimetableView } from '@/components/planning';
```

### Usage
```tsx
<TimetableView
  onAddSession={handleAddSessionFromProgramme}
  onSessionPress={handleSessionPress}
/>
```

### Handlers
- `handleAddSessionFromProgramme(dayId, timeSlot)` : Ajouter séance
- `handleSessionPress(dayId, sessionIndex)` : Voir détail

## Design System

### Couleurs
- Background : `colors.background`
- Cards : `colors.backgroundCard`
- Borders : `colors.border`
- Text : `colors.textPrimary`, `colors.textSecondary`
- Accent : `colors.accent`
- Club color : Couleur personnalisée du club

### Typographie
- Header : 16px, bold, letterspacing 1.5
- Day header : 13px, bold
- Time label : 12px, semibold
- Session time : 11px, semibold
- Session club : 12px, semibold
- Session type : 10px

### Espacements
- SPACING.md, SPACING.lg, SPACING.xl
- Gap entre cellules : 2px
- Padding cards : 8px

### Bordures
- RADIUS.md (8px)
- RADIUS.xl (16px)
- Border width : 1px ou 3px (club color)

## Responsive

- Scroll horizontal activé
- Largeur min par colonne respectée
- Adaptation automatique au contenu
- Fonctionne sur tous les écrans

---

**L'utilisateur a maintenant un vrai emploi du temps sportif, comme à l'école !** 🎓📅
