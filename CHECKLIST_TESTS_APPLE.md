# CHECKLIST DE TESTS MANUELS - APPLE HEALTH & WATCH

> Date de creation: 27 Janvier 2026
> Version: Suite aux corrections de la session QA

---

## PRE-REQUIS

Avant de commencer les tests:

- [ ] iPhone avec iOS 15+
- [ ] Apple Watch jumelee (optionnel pour tests Watch)
- [ ] App YOROI installee sur iPhone
- [ ] App YOROI Watch installee sur Watch
- [ ] Donnees existantes dans Apple Sante (pas, sommeil, poids)
- [ ] Build fresh: `cd ios && pod install && npx expo run:ios`

---

# PARTIE 1: TESTS APPLE HEALTH

## Test 1.1: Verification des permissions

**Objectif**: Verifier que YOROI demande les bonnes permissions HealthKit

📱 **Sur ton iPhone:**

1. Va dans **Reglages > Sante > Acces aux donnees et appareils**
2. Cherche **YOROI** dans la liste
3. Appuie sur YOROI

**ATTENDU:**
- Liste des permissions en lecture:
  - Pas
  - Calories actives
  - Sommeil
  - Frequence cardiaque
  - Poids
  - Eau
  - Distance marche/course
  - Et autres...
- Liste des permissions en ecriture:
  - Poids
  - Eau
  - Entrainements

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Toutes les permissions sont listees |
| ❌ ECHEC | YOROI n'apparait pas OU liste vide |

---

## Test 1.2: Lecture des PAS

**Objectif**: Verifier que les pas affiches viennent d'Apple Health

📱 **Etape 1 - Verifier les donnees source:**
1. Ouvre l'app **Sante** (Apple)
2. Va dans **Parcourir > Activite > Pas**
3. Note le nombre de pas aujourd'hui: `_______ pas`

📱 **Etape 2 - Verifier dans YOROI:**
1. Ouvre **YOROI**
2. Va sur l'**onglet Accueil**
3. Regarde le widget "Pas"
4. Note le nombre affiche: `_______ pas`

**ATTENDU:** Les deux chiffres doivent etre identiques (ou tres proches)

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Chiffres identiques |
| ⚠️ ATTENTION | Difference < 100 pas (delai de sync) |
| ❌ ECHEC | Chiffres tres differents ou 0 dans YOROI |

---

## Test 1.3: Lecture des CALORIES

**Objectif**: Verifier que les calories viennent d'Apple Health (pas une estimation)

📱 **Etape 1 - Verifier les donnees source:**
1. Ouvre l'app **Sante** (Apple)
2. Va dans **Parcourir > Activite > Energie active**
3. Note les calories aujourd'hui: `_______ kcal`

📱 **Etape 2 - Verifier dans YOROI:**
1. Ouvre **YOROI**
2. Va sur l'**onglet Accueil**
3. Regarde le widget "kcal"
4. Note le nombre affiche: `_______ kcal`

**ATTENDU:**
- Les calories YOROI = Calories Apple Health + Calories entrainements YOROI
- Si tu n'as pas fait d'entrainement dans YOROI, les chiffres doivent etre identiques

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Chiffres coherents avec Apple Health |
| ❌ ECHEC | Chiffre = pas × 0.04 (ancienne estimation) |

**Comment verifier si c'est l'estimation:**
- Si 5000 pas → 200 kcal exactement = ESTIMATION (bug)
- Si 5000 pas → 287 kcal (chiffre Apple Health) = CORRECT

---

## Test 1.4: Lecture du SOMMEIL

**Objectif**: Verifier que le sommeil vient d'Apple Health

📱 **Etape 1 - Verifier les donnees source:**
1. Ouvre l'app **Sante** (Apple)
2. Va dans **Parcourir > Sommeil**
3. Note les heures de sommeil de la nuit derniere: `___h ___min`

📱 **Etape 2 - Verifier dans YOROI:**
1. Ouvre **YOROI**
2. Va sur l'**onglet Accueil**
3. Regarde le widget "Sommeil"
4. Note le nombre affiche: `___h`

**ATTENDU:** Les heures doivent correspondre (arrondi possible)

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Heures correspondantes |
| ⚠️ ATTENTION | Difference < 30min (arrondis) |
| ❌ ECHEC | 0h ou donnees d'il y a plusieurs jours |

---

## Test 1.5: Lecture du POIDS

**Objectif**: Verifier que le poids vient de la base locale (sync HealthKit optionnel)

📱 **Etape 1:**
1. Ouvre **YOROI**
2. Va dans **Plus > Ajouter un poids**
3. Entre un poids specifique: **77.7 kg**
4. Sauvegarde

📱 **Etape 2:**
1. Retourne sur l'**Accueil**
2. Verifie le widget poids

**ATTENDU:** Le poids affiche doit etre 77.7 kg

📱 **Etape 3 - Verifier dans Apple Sante:**
1. Ouvre l'app **Sante**
2. Va dans **Parcourir > Mensurations > Poids**
3. Verifie si 77.7 kg apparait

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Poids correct dans YOROI ET dans Apple Sante |
| ⚠️ PARTIEL | Poids correct dans YOROI mais pas dans Apple Sante |
| ❌ ECHEC | Poids incorrect dans YOROI |

---

## Test 1.6: HYDRATATION bidirectionnelle

**Objectif**: Verifier que l'eau est lue ET ecrite dans Apple Health

### Test 1.6a: Ecriture vers Apple Health

📱 **Etape 1:**
1. Ouvre **YOROI > Accueil**
2. Clique sur le widget Hydratation
3. Ajoute **250 ml** d'eau
4. Note l'heure: `__:__`

📱 **Etape 2:**
1. Ouvre l'app **Sante**
2. Va dans **Parcourir > Nutrition > Eau**
3. Regarde les donnees du jour

**ATTENDU:** Une entree de 250 ml (ou 0.25 L) doit apparaitre

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | 250 ml visible dans Apple Sante |
| ❌ ECHEC | Rien dans Apple Sante |

### Test 1.6b: Lecture depuis Apple Health

📱 **Etape 1:**
1. Ouvre l'app **Sante**
2. Va dans **Parcourir > Nutrition > Eau > Ajouter des donnees**
3. Ajoute **500 ml** manuellement
4. Sauvegarde

📱 **Etape 2:**
1. Ferme YOROI completement (swipe up)
2. Reouvre YOROI
3. Regarde le widget Hydratation

**ATTENDU:** L'hydratation doit inclure les 500 ml ajoutes dans Sante

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Total inclut les 500 ml |
| ❌ ECHEC | Total inchange |

---

## Test 1.7: COMPOSITION CORPORELLE

**Objectif**: Verifier la sync du body fat avec Apple Health

📱 **Etape 1:**
1. Ouvre **YOROI > Stats > Composition**
2. Ajoute une composition avec **Body Fat = 18.5%**
3. Sauvegarde

📱 **Etape 2:**
1. Ouvre l'app **Sante**
2. Va dans **Parcourir > Mensurations > Pourcentage de graisse**
3. Verifie si 18.5% apparait

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | 18.5% visible dans Apple Sante |
| ❌ ECHEC | Rien dans Apple Sante |

---

## Test 1.8: Page de DIAGNOSTIC

**Objectif**: Verifier que la page diagnostic fonctionne

📱 **Etapes:**
1. Ouvre **YOROI > Plus > Diagnostic Sante**
2. Clique sur **"Lancer le Diagnostic"**
3. Attends le resultat

**ATTENDU:**
- Section HealthKit: Statut vert si connecte
- Donnees recentes: Pas, poids, sommeil affiches
- Erreurs: Liste vide ou erreurs explicites
- Recommandations: Conseils si problemes

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Diagnostic complete avec donnees |
| ⚠️ ATTENTION | Diagnostic complete mais erreurs listees |
| ❌ ECHEC | Crash ou page blanche |

---

# PARTIE 2: TESTS APPLE WATCH

## Test 2.1: Module natif charge

**Objectif**: Verifier que le bridge WatchConnectivity est charge

📱 **Etapes:**
1. Ouvre **YOROI > Plus > Debug Apple Watch**
2. Regarde la section "Module Natif"

**ATTENDU:**
- WatchConnectivityBridge: **Charge** (avec icone verte)

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Module "Charge" |
| ❌ ECHEC | Module "NON CHARGE" |

**Si ECHEC:**
- Rebuild l'app: `cd ios && pod install && npx expo run:ios`
- Verifie que WatchConnectivityBridge.swift est dans le projet Xcode

---

## Test 2.2: Watch disponible

**Objectif**: Verifier que l'iPhone detecte la Watch

📱 **Pre-requis:**
- Apple Watch jumelee avec l'iPhone
- App YOROI Watch installee (via Watch app)

📱 **Etapes:**
1. Ouvre **YOROI > Plus > Debug Apple Watch**
2. Regarde "Watch disponible"

**ATTENDU:**
- Watch disponible: **Oui** (icone Wifi verte)

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | "Oui" |
| ❌ ECHEC | "Non" |

**Si ECHEC:**
1. Verifie que la Watch est jumelee (Reglages > Bluetooth)
2. Ouvre l'app Watch sur iPhone
3. Verifie que YOROI Watch est installee
4. Ouvre YOROI Watch au moins une fois

---

## Test 2.3: Watch a portee (Reachable)

**Objectif**: Verifier la communication temps reel

📱⌚ **Etapes:**
1. Rapproche ta Watch de ton iPhone (< 1 metre)
2. Active Bluetooth sur les deux
3. Ouvre YOROI sur iPhone
4. Ouvre YOROI Watch sur la Watch
5. Sur iPhone, va dans **Plus > Debug Apple Watch**
6. Regarde "Watch a portee"

**ATTENDU:**
- Watch a portee: **Oui** (icone eclair verte)

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | "Oui" |
| ⚠️ ATTENTION | "Non" mais Watch disponible (hors portee) |
| ❌ ECHEC | "Non" et Watch non disponible |

---

## Test 2.4: Sync TEST

**Objectif**: Verifier l'envoi de donnees de test vers la Watch

📱 **Etapes:**
1. Ouvre **YOROI > Plus > Debug Apple Watch**
2. Clique sur **"Sync Test"**
3. Attends le resultat dans les logs

**ATTENDU:**
- Log: "Sync reussie!" ou "Sync mise en queue"
- Si Watch reachable: Succes immediat
- Si Watch hors portee: Mise en queue

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | "Sync reussie!" dans les logs |
| ⚠️ ATTENTION | "Sync mise en queue" (Watch hors portee) |
| ❌ ECHEC | Erreur dans les logs |

---

## Test 2.5: Sync du PROFIL

**Objectif**: Verifier que le nom/avatar arrive sur la Watch

📱 **Etape 1:**
1. Ouvre **YOROI > Plus > Profil**
2. Verifie ton nom: `__________`
3. Verifie ton avatar: `__________`

⌚ **Etape 2:**
1. Ouvre **YOROI Watch**
2. Regarde l'ecran principal

**ATTENDU:**
- Ton nom doit apparaitre
- Ton avatar doit correspondre

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Nom et avatar corrects |
| ⚠️ PARTIEL | Nom correct mais avatar different |
| ❌ ECHEC | "Guerrier" ou avatar par defaut |

---

## Test 2.6: Sync du POIDS

**Objectif**: Verifier que le poids se synchronise vers la Watch

📱 **Etape 1:**
1. Ouvre **YOROI > Plus > Ajouter poids**
2. Entre **82.3 kg** (un chiffre specifique)
3. Sauvegarde
4. Attends 5 secondes

⌚ **Etape 2:**
1. Ouvre **YOROI Watch**
2. Va dans la section Poids

**ATTENDU:**
- Le poids 82.3 kg doit apparaitre

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | 82.3 kg affiche |
| ⚠️ ATTENTION | Ancien poids (attendre + longtemps) |
| ❌ ECHEC | 0 kg ou pas de donnees |

---

## Test 2.7: Sync de l'HYDRATATION

**Objectif**: Verifier que l'eau se synchronise vers la Watch

📱 **Etape 1:**
1. Ouvre **YOROI > Accueil**
2. Note l'hydratation actuelle: `_____ ml`
3. Ajoute **250 ml** d'eau
4. Nouveau total attendu: `_____ ml`

⌚ **Etape 2:**
1. Ouvre **YOROI Watch**
2. Regarde le widget Hydratation

**ATTENDU:**
- Le nouveau total doit apparaitre sur la Watch

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Total correct sur Watch |
| ❌ ECHEC | Ancien total ou 0 ml |

---

## Test 2.8: Queue de messages

**Objectif**: Verifier que la queue fonctionne quand Watch hors portee

📱 **Etape 1:**
1. Eteins le Bluetooth sur ta Watch (ou eloigne-la)
2. Sur iPhone, va dans **Plus > Debug Apple Watch**
3. Verifie que "Watch a portee" = Non
4. Clique sur **"Sync Test"**

**ATTENDU:**
- Log: "Sync mise en queue"
- "Messages en queue": 1

📱 **Etape 2:**
1. Reactive le Bluetooth / rapproche la Watch
2. Attends que "Watch a portee" = Oui
3. La queue devrait se traiter automatiquement

**ATTENDU:**
- "Messages en queue": 0
- Log: "Item envoye avec succes"

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Queue se vide automatiquement |
| ⚠️ ATTENTION | Queue reste, mais "Traiter Queue" fonctionne |
| ❌ ECHEC | Queue ne se vide jamais |

---

## Test 2.9: Donnees Watch → iPhone

**Objectif**: Verifier que les donnees de la Watch remontent vers l'iPhone

⌚ **Etape 1:**
1. Sur **YOROI Watch**, ajoute de l'eau (bouton +)
2. Ou ajoute un poids

📱 **Etape 2:**
1. Sur iPhone, va dans **Plus > Debug Apple Watch**
2. Regarde les logs

**ATTENDU:**
- Log: "Donnees recues de la Watch: ..."

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | Donnees recues dans les logs |
| ❌ ECHEC | Aucune donnee recue |

---

# PARTIE 3: TESTS DE REGRESSION

## Test 3.1: Pas de crash au demarrage

📱 **Etapes:**
1. Force quit YOROI
2. Reouvre YOROI
3. Attends 5 secondes

**ATTENDU:**
- L'app s'ouvre sans crash
- L'ecran d'accueil s'affiche

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | App fonctionnelle |
| ❌ ECHEC | Crash ou ecran blanc |

---

## Test 3.2: Performance de l'accueil

📱 **Etapes:**
1. Ouvre YOROI
2. Chronometre le temps avant affichage complet

**ATTENDU:**
- Affichage complet en < 3 secondes

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | < 3 secondes |
| ⚠️ ATTENTION | 3-5 secondes |
| ❌ ECHEC | > 5 secondes ou freeze |

---

## Test 3.3: Mode hors ligne

📱 **Etapes:**
1. Active le mode Avion
2. Ouvre YOROI
3. Navigue dans l'app

**ATTENDU:**
- L'app fonctionne avec les donnees locales
- Pas de crash
- Messages d'erreur clairs si besoin de connexion

| Resultat | Status |
|----------|--------|
| ✅ SUCCES | App fonctionnelle hors ligne |
| ❌ ECHEC | Crash ou freeze |

---

# RESUME DES RESULTATS

## Apple Health

| Test | Description | Resultat |
|------|-------------|----------|
| 1.1 | Permissions | ⬜ |
| 1.2 | Pas | ⬜ |
| 1.3 | Calories | ⬜ |
| 1.4 | Sommeil | ⬜ |
| 1.5 | Poids | ⬜ |
| 1.6a | Hydratation ecriture | ⬜ |
| 1.6b | Hydratation lecture | ⬜ |
| 1.7 | Composition corporelle | ⬜ |
| 1.8 | Page diagnostic | ⬜ |

## Apple Watch

| Test | Description | Resultat |
|------|-------------|----------|
| 2.1 | Module natif | ⬜ |
| 2.2 | Watch disponible | ⬜ |
| 2.3 | Watch reachable | ⬜ |
| 2.4 | Sync test | ⬜ |
| 2.5 | Sync profil | ⬜ |
| 2.6 | Sync poids | ⬜ |
| 2.7 | Sync hydratation | ⬜ |
| 2.8 | Queue messages | ⬜ |
| 2.9 | Watch → iPhone | ⬜ |

## Regression

| Test | Description | Resultat |
|------|-------------|----------|
| 3.1 | Pas de crash | ⬜ |
| 3.2 | Performance | ⬜ |
| 3.3 | Mode hors ligne | ⬜ |

---

**Legende:**
- ✅ = Succes
- ⚠️ = Attention (fonctionne partiellement)
- ❌ = Echec
- ⬜ = Non teste

---

**Date des tests:** ____________
**Testeur:** ____________
**Version app:** ____________
**Version iOS:** ____________
**Modele iPhone:** ____________
**Modele Watch:** ____________
