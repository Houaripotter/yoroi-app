# Checklist de Tests Manuels - Regression Yoroi

Tests non-automatisables necessitant un appareil physique ou une interaction UI.

---

## 1. Parcours Critique Utilisateur

### Onboarding
- [ ] Lancer l'app pour la premiere fois -> ecran d'accueil s'affiche
- [ ] Les donnees par defaut (clubs, equipement) sont presentes
- [ ] Les parametres par defaut (kg, cm) sont corrects
- [ ] Le theme sombre s'applique par defaut

### Navigation
- [ ] Onglet Accueil -> affiche le dashboard
- [ ] Onglet Planning -> affiche le calendrier
- [ ] Onglet Plus -> affiche le menu
- [ ] Retour arriere preserve le scroll sur chaque ecran
- [ ] Pas de rechargement/flash au retour sur un ecran (regle CLAUDE.md)

---

## 2. Operations CRUD par Module

### Poids / Pesees
- [ ] Ajouter une pesee manuellement
- [ ] La pesee apparait dans l'historique
- [ ] Modifier une pesee existante
- [ ] Supprimer une pesee
- [ ] Les graphiques se mettent a jour

### Entrainements
- [ ] Ajouter un entrainement (JJB, musculation, course, etc.)
- [ ] L'entrainement apparait dans le journal
- [ ] La date est correcte
- [ ] Supprimer un entrainement

### Hydratation
- [ ] Ajouter une entree d'hydratation (250ml, 500ml)
- [ ] Le compteur journalier se met a jour
- [ ] L'objectif recommande est correct (base sur le poids)
- [ ] Supprimer une entree

### Sommeil
- [ ] Saisir les heures de sommeil
- [ ] Les donnees s'affichent dans le tableau de bord
- [ ] Valeurs limites: 0h, 12h, 24h

### Humeur
- [ ] Enregistrer l'humeur du jour
- [ ] Verifier que l'humeur d'aujourd'hui s'affiche
- [ ] Historique des humeurs accessible

### Composition Corporelle
- [ ] Ajouter une mesure (% graisse, masse musculaire, etc.)
- [ ] L'analyse s'affiche correctement (statuts healthy/warning)
- [ ] Le badge source s'affiche si la donnee vient d'Apple Health

### Mensurations
- [ ] Ajouter des mensurations (tour de taille, bras, etc.)
- [ ] Les mensurations apparaissent dans l'historique

---

## 3. Apple Health / Health Connect

### Connexion
- [ ] Ecran Appareils Connectes accessible depuis Plus
- [ ] Bouton Connexion Apple Health fonctionne
- [ ] Les permissions sont demandees correctement
- [ ] Bouton Deconnexion fonctionne

### Synchronisation
- [ ] Sync manuelle: bouton "Synchroniser" sur l'ecran
- [ ] Auto-sync au lancement de l'app (si > 15 min)
- [ ] Les donnees synchronisees apparaissent dans l'app

### Sources Detectees (NOUVEAU)
- [ ] Les appareils connectes via Apple Health s'affichent
- [ ] Le nom de source est normalise (Withings, Garmin, etc.)
- [ ] La derniere date de sync par source est visible
- [ ] Le badge source (SourceBadge) s'affiche dans la composition corporelle

### Guides de Configuration
- [ ] Guide Withings: etapes claires et correctes
- [ ] Guide Garmin: etapes claires et correctes
- [ ] Guide Polar: etapes claires et correctes
- [ ] Guide WHOOP: etapes claires et correctes
- [ ] Guide Balances: etapes claires et correctes
- [ ] Les guides s'expandent/contractent au tap

### Matrice de Donnees
- [ ] La matrice (scroll horizontal) affiche correctement les types de donnees par marque
- [ ] Les checkmarks correspondent aux donnees reellement supportees

---

## 4. Gamification

### Points & Niveaux
- [ ] Les points augmentent apres une pesee
- [ ] Les points augmentent apres un entrainement
- [ ] Les points augmentent apres les photos
- [ ] Le niveau s'affiche correctement sur l'ecran profil
- [ ] La barre de progression est coherente

### Rangs Samourai
- [ ] Le rang actuel s'affiche (Ashigaru, Bushi, Samurai, etc.)
- [ ] Le prochain rang et les jours restants s'affichent
- [ ] La couleur du rang est correcte

### Badges
- [ ] Les badges deverrouilles s'affichent
- [ ] Un badge ne peut pas etre deverrouille deux fois
- [ ] Animation de celebration au deblocage

---

## 5. Plan Nutritionnel

- [ ] Le calcul BMR s'affiche correctement
- [ ] Le calcul TDEE varie selon le niveau d'activite
- [ ] Les objectifs (perte/maintien/prise) ajustent les calories
- [ ] Les macros (P/G/L) totalisent 100%
- [ ] La repartition des repas est logique
- [ ] Le minimum de 1200 kcal est respecte

---

## 6. Parametres

### Preferences
- [ ] Changer l'unite de poids (kg/lbs) -> s'applique partout
- [ ] Changer l'unite de mesure (cm/in) -> s'applique partout
- [ ] Changer le nom d'utilisateur -> s'affiche partout
- [ ] Changer le logo -> s'affiche sur l'ecran d'accueil

### Home Layout
- [ ] Reorganiser les sections de l'ecran d'accueil
- [ ] Masquer/afficher des sections
- [ ] Les preferences persistent apres redemarrage

---

## 7. Resilience

### Redemarrage
- [ ] Forcer la fermeture de l'app -> les donnees sont preservees
- [ ] Redemarrer l'app -> l'ecran d'accueil charge normalement
- [ ] Pas de perte de donnees apres redemarrage

### Mode Avion
- [ ] L'app fonctionne sans connexion internet
- [ ] Toutes les operations CRUD marchent hors ligne
- [ ] La sync Apple Health echoue gracieusement

### Changement de Langue
- [ ] L'app s'affiche correctement si le telephone est en anglais
- [ ] L'app s'affiche correctement si le telephone est en francais
- [ ] Les dates se formatent selon la locale

---

## 8. Performance

- [ ] L'app demarre en < 3 secondes
- [ ] Pas de lag visible au scroll dans les listes longues
- [ ] Les animations sont fluides (pas de saccade)
- [ ] La memoire ne croit pas anormalement apres navigation prolongee

---

## 9. Tests Specifiques iPhone

- [ ] iPhone SE (petit ecran): tous les elements sont visibles
- [ ] iPhone 15 Pro (grand ecran): mise en page correcte
- [ ] Mode sombre iOS: les couleurs sont coherentes
- [ ] Safe area: contenu non masque par la notch/dynamic island

---

## Resultat

| Categorie | Passes | Echecs | Notes |
|-----------|--------|--------|-------|
| Onboarding | /4 | | |
| Navigation | /5 | | |
| CRUD | /20 | | |
| Apple Health | /15 | | |
| Gamification | /8 | | |
| Nutrition | /6 | | |
| Parametres | /6 | | |
| Resilience | /6 | | |
| Performance | /4 | | |
| iPhone | /4 | | |
| **TOTAL** | **/78** | | |

Date: _______________
Testeur: _______________
Version: _______________
