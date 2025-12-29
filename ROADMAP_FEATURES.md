# 🚀 Roadmap des Fonctionnalités Yoroi

Liste des 10 fonctionnalités à implémenter pour améliorer Yoroi.

## ✅ Terminé

### 1. Export iCloud Calendar
- **Statut** : ✅ Implémenté
- **Description** : Exporter les séances d'entraînement vers iCloud Calendar
- **Fichiers** :
  - `lib/calendarService.ts` - Service d'export
  - `components/planning/TimetableView.tsx` - Bouton buzzer d'export
- **Features** :
  - Création automatique du calendrier "Yoroi Training"
  - Export de séances individuelles ou multiples
  - Rappel automatique 30 minutes avant
  - Synchronisation iCloud sur tous les appareils Apple

---

## 📋 À Implémenter

### 2. 📊 Export CSV/Excel des séances
- **Priorité** : Haute
- **Complexité** : Facile
- **Temps estimé** : 2-3 heures
- **Description** :
  - Exporter toutes les séances au format CSV
  - Compatible avec Excel, Numbers, Google Sheets
  - Colonnes : Date, Club, Sport, Durée, Type, Muscles, Notes
- **Librairies nécessaires** :
  - `react-native-fs` pour écrire les fichiers
  - `react-native-share` pour partager le fichier
- **Implémentation** :
  - Créer `lib/exportService.ts`
  - Bouton dans l'onglet "Plus"
  - Format : `yoroi_seances_YYYY-MM-DD.csv`

### 3. 🔔 Notifications push
- **Priorité** : Haute
- **Complexité** : Moyenne
- **Temps estimé** : 4-5 heures
- **Description** :
  - Rappels automatiques avant les entraînements
  - Notifications de motivation quotidiennes
  - Rappels d'objectifs hebdomadaires
- **Librairies nécessaires** :
  - `expo-notifications`
- **Implémentation** :
  - Service de notifications local (pas de serveur)
  - Paramètres personnalisables (30min, 1h, 2h avant)
  - Textes de motivation aléatoires

### 4. 📸 Import photo depuis galerie
- **Priorité** : Haute
- **Complexité** : Facile
- **Temps estimé** : 2 heures
- **Description** :
  - Importer des photos avant/après depuis la galerie
  - Alternative à prendre une photo
- **Librairies nécessaires** :
  - `expo-image-picker` (déjà installé)
- **Implémentation** :
  - Ajouter bouton "Galerie" à côté de "Caméra"
  - Dans `app/transformation.tsx`

### 5. 👥 Partage de planning
- **Priorité** : Moyenne
- **Complexité** : Facile
- **Temps estimé** : 3 heures
- **Description** :
  - Partager l'emploi du temps de la semaine
  - Via Messages, WhatsApp, Email
  - Format image ou texte
- **Librairies nécessaires** :
  - `react-native-share`
  - `react-native-view-shot` pour capture d'écran
- **Implémentation** :
  - Bouton "Partager" dans l'emploi du temps
  - Génération d'une image du planning
  - Ou texte formaté

### 6. 🏆 Suivi des records
- **Priorité** : Haute
- **Complexité** : Moyenne
- **Temps estimé** : 5-6 heures
- **Description** :
  - Enregistrer et afficher les records personnels
  - Par catégorie : Poids, Temps, Répétitions, etc.
  - Historique des records battus
- **Base de données** :
  ```sql
  CREATE TABLE records (
    id INTEGER PRIMARY KEY,
    type TEXT, -- 'weight', 'time', 'reps'
    category TEXT, -- 'bench_press', '100m', etc.
    value REAL,
    unit TEXT,
    date TEXT,
    notes TEXT
  );
  ```
- **Implémentation** :
  - Nouvel écran "Records"
  - Graphiques de progression
  - Badges pour nouveaux records

### 7. 📅 Vue mensuelle du calendrier
- **Priorité** : Moyenne
- **Complexité** : Facile
- **Temps estimé** : 3-4 heures
- **Description** :
  - Afficher le calendrier par mois au lieu de semaine
  - Voir tous les entraînements du mois
  - Navigation mois précédent/suivant
- **Implémentation** :
  - Modifier `EnhancedCalendarView.tsx`
  - Toggle semaine/mois
  - Adaptation de la grille

### 8. 🎯 Objectifs hebdomadaires
- **Priorité** : Haute
- **Complexité** : Moyenne
- **Temps estimé** : 4-5 heures
- **Description** :
  - Définir un objectif de séances par semaine
  - Progression visuelle (3/5 séances)
  - Barre de progression
  - Notifications de motivation
- **Base de données** :
  ```sql
  CREATE TABLE weekly_goals (
    id INTEGER PRIMARY KEY,
    week_start TEXT,
    target_sessions INTEGER,
    completed_sessions INTEGER
  );
  ```
- **Implémentation** :
  - Widget en haut de l'onglet Planning
  - Paramètres dans "Plus"

### 9. 💪 Tracker de progression par muscle
- **Priorité** : Moyenne
- **Complexité** : Moyenne-Difficile
- **Temps estimé** : 6-8 heures
- **Description** :
  - Graphiques de progression par groupe musculaire
  - Fréquence d'entraînement par muscle
  - Radar chart des muscles travaillés
  - Identification des muscles négligés
- **Implémentation** :
  - Nouvel onglet ou section dans Stats
  - Charts par muscle group
  - Recommandations d'équilibre

### 10. ⏱️ Historique du chronomètre
- **Priorité** : Basse
- **Complexité** : Facile
- **Temps estimé** : 2-3 heures
- **Description** :
  - Sauvegarder tous les temps d'entraînement
  - Voir l'historique par séance
  - Statistiques : temps moyen, total, record
- **Base de données** :
  ```sql
  CREATE TABLE timer_history (
    id INTEGER PRIMARY KEY,
    training_id INTEGER,
    duration_seconds INTEGER,
    date TEXT,
    FOREIGN KEY(training_id) REFERENCES trainings(id)
  );
  ```
- **Implémentation** :
  - Bouton "Historique" dans le chronomètre
  - Liste des temps passés

### 11. 🌍 Carte Apple Maps des clubs
- **Priorité** : Basse
- **Complexité** : Moyenne
- **Temps estimé** : 4-5 heures
- **Description** :
  - Voir tous les clubs sur une carte
  - Navigation vers le club
  - Distance depuis position actuelle
- **Librairies nécessaires** :
  - `react-native-maps` ou `expo-location`
- **Base de données** :
  - Ajouter `latitude` et `longitude` à la table `clubs`
- **Implémentation** :
  - Nouvel écran "Carte des clubs"
  - Marqueurs colorés par sport
  - Itinéraire Apple Maps

---

## 🎯 Ordre d'implémentation recommandé

1. ✅ **Export iCloud Calendar** (Terminé)
2. **Import photo galerie** (Rapide et utile)
3. **Export CSV/Excel** (Facile et très demandé)
4. **Notifications push** (Impact utilisateur élevé)
5. **Objectifs hebdomadaires** (Gamification++)
6. **Partage de planning** (Social++)
7. **Suivi des records** (Motivation++)
8. **Vue mensuelle calendrier** (UX++)
9. **Tracker muscles** (Avancé)
10. **Historique chronomètre** (Nice to have)
11. **Carte des clubs** (Nice to have)

---

## 📊 Résumé

| Fonctionnalité | Priorité | Complexité | Temps |
|----------------|----------|------------|-------|
| iCloud Calendar | ✅ | Moyenne | ✅ Fait |
| Import photo | Haute | Facile | 2h |
| Export CSV | Haute | Facile | 3h |
| Notifications | Haute | Moyenne | 5h |
| Objectifs hebdo | Haute | Moyenne | 5h |
| Partage planning | Moyenne | Facile | 3h |
| Records | Haute | Moyenne | 6h |
| Vue mensuelle | Moyenne | Facile | 4h |
| Tracker muscles | Moyenne | Difficile | 8h |
| Historique timer | Basse | Facile | 3h |
| Carte clubs | Basse | Moyenne | 5h |

**Total estimé** : ~44 heures de développement

---

## 💡 Prochaines étapes

Choisis la fonctionnalité que tu veux implémenter en premier ! 🚀

Les plus rapides et impactantes :
- 📸 Import photo galerie (2h)
- 📊 Export CSV (3h)
- 🔔 Notifications (5h)
