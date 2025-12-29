# Planning : Avant / Après

## Vue Programme

### ❌ AVANT (trop simple)
```
┌─────────────────────────────────┐
│ LUNDI                           │
│ [Gracie Barra]              >   │
└─────────────────────────────────┘
```
**Problèmes** :
- On ne voit pas l'heure
- On ne voit pas le type de séance
- On ne voit pas ce qui sera travaillé
- Impossible de savoir si c'est le matin ou le soir

### ✅ APRÈS (emploi du temps PRO)
```
┌─────────────────────────────────────────┐
│ LUNDI                            [Zzz]  │
│ ┌─────────────────────────────────────┐ │
│ │ 🔴                                  │ │  ← Barre couleur club
│ │ ⏰ 18:00 - 19:30         🌆 SOIR   │ │  ← Heure + Badge moment
│ │ 🥋 Gracie Barra                    │ │  ← Club + logo
│ │ [Cours] [Sparring]                 │ │  ← Types de séance
│ │ Passage de garde                   │ │  ← Thème technique
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```
**Avantages** :
- ✅ Heure de début + durée calculée
- ✅ Badge moment (MATIN/MIDI/SOIR)
- ✅ Logo du club visible
- ✅ Types de séance en tags
- ✅ Thème technique visible
- ✅ Barre de couleur du club
- ✅ Bouton repos rapide
- ✅ Note personnalisée si présente

---

## Vue Calendrier

### ❌ AVANT (petites cases)
```
┌─────────────────────────────┐
│ LUN MAR MER JEU VEN SAM DIM │
├─────────────────────────────┤
│  1   2   3   4   5   6   7  │  ← Cases petites
│  🥋  -   🥋  -   -   🥋  -  │  ← Emoji peu visible
│                             │
│  8   9  10  11  12  13  14  │
│  -   🥋  -   🥋  -   -   -  │
└─────────────────────────────┘
```
**Problèmes** :
- Cases trop petites
- Emoji difficile à voir
- Pas d'indication d'intensité
- On ne voit pas quel club

### ✅ APRÈS (grandes cases avec intensité)
```
┌─────────────────────────────────────────┐
│ LUN  MAR  MER  JEU  VEN  SAM  DIM      │
├─────────────────────────────────────────┤
│ ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐   │
│ │ 1 ││ 2 ││ 3 ││ 4 ││ 5 ││ 6 ││ 7 │   │  ← Cases 60px
│ │🥋 ││   ││🥋 ││   ││   ││🥋💪││   │   │  ← Logos visibles
│ │   ││   ││🏋️ ││   ││   ││+1 ││   │   │  ← Badge +N
│ └───┘└───┘└───┘└───┘└───┘└───┘└───┘   │
│ VERT VERT VERT                         │  ← Fond coloré
│ léger moyen fort                       │     selon intensité
└─────────────────────────────────────────┘
```
**Avantages** :
- ✅ Cases 3x plus grandes (60px min)
- ✅ Fond coloré selon intensité :
  - 1 séance = vert léger (#22C55E10)
  - 2 séances = vert moyen (#22C55E20)
  - 3+ séances = vert fort (#22C55E30)
- ✅ Logos clubs 20x20 (au lieu de emoji)
- ✅ Badge +N si plus de 3 séances
- ✅ Bordure sur aujourd'hui
- ✅ Icône repos (lune)

---

## Modal d'ajout

### ❌ AVANT (sélection unique)
```
┌─────────────────────────────────┐
│ TYPE DE SÉANCE                  │
│ [ Cours ]  [ Sparring ]         │  ← Un seul choix
│                                 │
│ MUSCLES                         │
│ [ Pecs ]  [ Dos ]  [ Jambes ]   │  ← Un seul choix
│                                 │
│ DURÉE                           │
│ [ 30min ] [ 1h ] [ 1h30 ]       │  ← Presets fixes
└─────────────────────────────────┘
```
**Problèmes** :
- Un seul type à la fois
- Un seul muscle à la fois
- Pas de champ personnalisé
- Pas de thème technique pour JJB
- Durées fixes uniquement

### ✅ APRÈS (multi-sélection)
```
┌─────────────────────────────────────────┐
│ TYPE DE SÉANCE                          │
│ Sélectionne un ou plusieurs types       │
│ [✓ Cours ] [✓ Sparring ] [ Drilling ]   │  ← MULTI-sélection
│                                         │
│ GROUPES MUSCULAIRES                     │
│ Sélectionne un ou plusieurs muscles     │
│ [✓ Pecs ] [✓ Dos ] [ Épaules ]          │  ← MULTI-sélection
│ [ Triceps ] [ Jambes ] [+ Autre]        │  ← Bouton custom
│                                         │
│ ┌─────────────────────────┐             │
│ │ Trapèzes            [✓] │  ← Input personnalisé
│ └─────────────────────────┘             │
│                                         │
│ THÈME TECHNIQUE (optionnel)             │
│ Ce que tu vas travailler                │
│ ┌─────────────────────────────────┐     │
│ │ Passage de garde                │     │
│ └─────────────────────────────────┘     │
│ Suggestions :                           │
│ [Sweeps] [Soumissions] [Takedowns]      │
│                                         │
│ DURÉE                                   │
│ [ 30min ] [ 1h ] [ 1h30 ] [✓ Perso]    │
│ ──────────●────────── 75 min            │  ← Slider
│ 15min                           3h      │
└─────────────────────────────────────────┘
```
**Avantages** :
- ✅ MULTI-sélection muscles
- ✅ MULTI-sélection types séance
- ✅ Champ personnalisé muscles
- ✅ Thème technique (JJB/MMA)
- ✅ Suggestions rapides
- ✅ Durée personnalisée
- ✅ Détection auto du sport
- ✅ Design moderne (icônes Lucide)

---

## Résumé des améliorations

### Vue Programme
| Avant | Après |
|-------|-------|
| Nom du club uniquement | Heure + durée + club + types + détails + note |
| Pas d'heure | Badge moment (MATIN/MIDI/SOIR) |
| Pas de détails | Muscles OU thème technique visible |
| Design basique | Design professionnel avec barre couleur |

### Vue Calendrier
| Avant | Après |
|-------|-------|
| Cases ~40px | Cases 60px minimum |
| Emoji | Logos clubs 20x20 |
| Pas d'intensité | Fond coloré selon nb séances |
| Pas de +N | Badge +N si plus de 3 séances |

### Modal d'ajout
| Avant | Après |
|-------|-------|
| Sélection unique | Multi-sélection |
| Pas de custom | Champ personnalisé |
| Pas de thème | Thème technique + suggestions |
| Durées fixes | Slider personnalisé |

---

## Code réduit

### planning.tsx

**Avant** : ~1700 lignes avec code dupliqué
**Après** : ~870 lignes, code modulaire

**Exemple Vue Programme** :
```tsx
// AVANT : ~100 lignes de JSX complexe
{DAYS_FR.map((day, index) => {
  const dayProgramData = weeklyProgram[index] || [];
  const daySchedule = dayProgramData.map(...)
  // ... 50 lignes de code ...
})}

// APRÈS : Composant propre et réutilisable
<ProgrammeView
  onAddSession={handleAddSessionFromProgramme}
  onSessionPress={handleSessionPress}
  onToggleRest={handleToggleRest}
/>
```

**Exemple Vue Calendrier** :
```tsx
// AVANT : ~130 lignes de grille calendrier
<View style={styles.calendarGrid}>
  {calendarDays.map((day, index) => {
    // ... logique complexe ...
    return <TouchableOpacity>...</TouchableOpacity>
  })}
</View>

// APRÈS : Composant dédié
<EnhancedCalendarView
  currentMonth={currentMonth}
  workouts={workouts}
  clubs={clubs}
  onMonthChange={setCurrentMonth}
  onDayPress={handleDayPress}
  selectedDate={selectedDate}
/>
```

---

## Données stockées

### Base de données

**Avant** :
```sql
trainings:
  - club_id
  - sport
  - session_type       -- Un seul type
  - start_time
  - duration_minutes
  - notes
  - muscles            -- Un seul muscle (texte)
```

**Après** :
```sql
trainings:
  - club_id
  - sport
  - session_type       -- Ancien (pour compatibilité)
  - session_types      -- NOUVEAU : JSON array ["cours", "sparring"]
  - start_time
  - duration_minutes
  - notes
  - muscles            -- MODIFIÉ : JSON array ["Pecs", "Dos", "Trapèzes"]
  - technical_theme    -- NOUVEAU : "Passage de garde"
```

**Migration** : Automatique au démarrage, compatible avec anciennes données

---

## Expérience utilisateur

### Avant
1. L'utilisateur voit "Gracie Barra" sur LUNDI
2. Il clique pour voir qu'il n'y a pas d'heure
3. Il ne sait pas ce qui sera travaillé
4. Il doit se rappeler lui-même

### Après
1. L'utilisateur voit tout d'un coup d'œil :
   - 18:00 - 19:30 (SOIR)
   - Gracie Barra
   - Cours + Sparring
   - Passage de garde
2. Il sait exactement quoi, quand, et comment
3. C'est un vrai emploi du temps d'athlète PRO

---

**L'utilisateur voit maintenant son planning comme un VRAI emploi du temps professionnel !** 💪
