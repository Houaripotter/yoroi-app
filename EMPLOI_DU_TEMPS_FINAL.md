# 📅 Emploi du Temps Sportif - Version Finale

## ✅ Ce qui a été changé

### Nom de l'onglet
- **Avant** : "Programme"
- **Après** : **"Emploi du Temps"**

### Design de la vue
- **Avant** : Liste verticale jour par jour
- **Après** : **Grille horizontale type emploi du temps d'école**

### Layout
- **7 colonnes** : LUN, MAR, MER, JEU, VEN, SAM, DIM (de gauche à droite)
- **3 lignes** : Matin, Après-midi, Soir
- **Scroll horizontal** : Pour voir toute la semaine

## 📱 À quoi ça ressemble

```
┌─────────────────────────────────────────────────────────┐
│ EMPLOI DU TEMPS                      [+ Ajouter]        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│        LUN      MAR      MER      JEU      VEN    SAM   │
│  ┌──────────────────────────────────────────────────┐   │
│  │Matin │   +  │   +  │ 07:30 │   +  │   +  │ 08:00│   │
│  │      │      │      │ Muscu │      │      │ JJB  │   │
│  ├──────────────────────────────────────────────────┤   │
│  │AM    │   +  │ 14:00│   +   │   +  │ 13:00│  +   │   │
│  │      │      │  JJB │       │      │ Cardio      │   │
│  ├──────────────────────────────────────────────────┤   │
│  │Soir  │ 18:00│   +  │ 19:00 │ 18:30│  +   │  +   │   │
│  │      │  JJB │      │  JJB  │ Legs │      │      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│           8 séances        ~10h cette semaine            │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Fonctionnalités

### Vue d'Ensemble
- **Tous les jours** visibles en même temps
- **Format horizontal** (comme à l'école)
- **3 créneaux** par jour : Matin / Après-midi / Soir

### Cartes de Séance
Chaque séance affiche :
- ⏰ **Heure** de début
- **Nom du club**
- **Type** de séance
- **Barre de couleur** du club (à gauche)

### Cases Vides
- Icône **+** (Plus) au centre
- Clic pour ajouter une séance à ce créneau

### Résumé
- **Nombre total** de séances
- **Heures totales** de la semaine

## 🎨 Design

### Créneaux Horaires

**Matin** : 07:00 - 12:00
- Séances matinales
- Badge "Matin"

**Après-midi** : 12:00 - 17:00
- Séances de milieu de journée
- Badge "Après-midi"

**Soir** : 17:00 - 21:00
- Séances en soirée
- Badge "Soir"

### Carte de Séance (exemple)
```
┌─────────────┐
│ ⏰ 18:00    │  ← Heure
│ Gracie Barra│  ← Club
│ Cours       │  ← Type
└─────────────┘
 ↑ Barre couleur club
```

### Dimensions
- **Colonne horaire** : 100px
- **Colonne jour** : 140px
- **Hauteur cellule** : 100px minimum
- **Espacement** : 2px

## 📂 Fichiers

### Nouveau composant
`components/planning/TimetableView.tsx`

### Modifié
- `app/(tabs)/planning.tsx` : Intégration + nom onglet
- `components/planning/index.ts` : Export du nouveau composant

## 🚀 Comment tester

1. **Lancer l'app**
   ```bash
   npx expo start
   ```

2. **Aller dans Planning**
   - Cliquer sur l'onglet **"Emploi du Temps"**

3. **Voir la grille**
   - Tous les jours de LUN à DIM
   - 3 créneaux horaires
   - Scroll horizontal si nécessaire

4. **Ajouter une séance**
   - Clic sur une case vide **+**
   - Ou bouton **"+ Ajouter"** en haut

5. **Voir une séance**
   - Clic sur une carte de séance
   - Affiche les détails (alerte temporaire)

## 📊 Avantages

### Par rapport à l'ancien

| Ancien | Nouveau |
|--------|---------|
| Liste verticale | Grille horizontale |
| Un jour à la fois | Tous les jours visibles |
| Beaucoup de scroll | Scroll horizontal uniquement |
| Pas de vue d'ensemble | Vue d'ensemble immédiate |
| Pas de créneaux | 3 créneaux clairs |

### Par rapport à la liste détaillée

| Liste détaillée | Grille emploi du temps |
|-----------------|------------------------|
| 10-20 lignes de détails | 3-4 créneaux compacts |
| Info exhaustive par séance | Info essentielle uniquement |
| Style "agenda" | Style "emploi du temps école" |
| Scroll vertical long | Scroll horizontal court |

## 🎓 Format "École"

Exactement comme un emploi du temps scolaire :
- **Colonnes** : Jours de la semaine
- **Lignes** : Créneaux horaires
- **Cases** : Cours/Séances
- **Vue globale** : Toute la semaine visible

## 💡 Cas d'usage

### Lundi Soir - JJB
```
┌──────────┐
│ ⏰ 18:00 │
│ Gracie   │
│ Barra    │
│ Cours    │
└──────────┘
```

### Mercredi Matin - Musculation
```
┌──────────┐
│ ⏰ 07:30 │
│ Basic    │
│ Fit      │
│ Muscu    │
└──────────┘
```

### Samedi Matin - JJB
```
┌──────────┐
│ ⏰ 08:00 │
│ Gracie   │
│ Barra    │
│ Cours    │
└──────────┘
```

### Case vide
```
┌──────────┐
│          │
│    +     │
│          │
└──────────┘
```
Clic → Modal d'ajout avec jour et créneau pré-remplis

## 🎯 Résultat

**Dès que l'utilisateur ouvre l'onglet "Emploi du Temps"** :

✅ Il voit **TOUS les jours** de la semaine (LUN → DIM)
✅ Il voit **3 créneaux** par jour (Matin, AM, Soir)
✅ Il voit **toutes ses séances** d'un coup d'œil
✅ Format **familier** (comme à l'école)
✅ **Compact** (pas 30 lignes, juste 3-4 créneaux)
✅ **Clair** et **intuitif**

## 📝 Notes

### Compatibilité
- ✅ Fonctionne avec les données existantes
- ✅ Hook `useWeekSchedule` pour les données
- ✅ Groupement automatique par créneau

### Design System
- ✅ Utilise `ThemeContext` (dark/light mode)
- ✅ Icônes Lucide (Clock, Plus)
- ✅ ZÉRO emoji
- ✅ Couleurs des clubs respectées

### Performance
- ✅ Scroll horizontal fluide
- ✅ Rendu optimisé
- ✅ Pas de lag

## 🔮 Améliorations futures

1. **Glisser-déposer**
   - Déplacer une séance d'un créneau à un autre

2. **Vue compacte/étendue**
   - Toggle pour voir plus de détails

3. **Semaines futures**
   - Navigation entre semaines

4. **Export PDF**
   - Exporter l'emploi du temps

---

**L'utilisateur a maintenant un VRAI emploi du temps sportif, exactement comme à l'école !** 🎓📅

**Format horizontal, tous les jours visibles, créneaux clairs, design familier.** ✨
