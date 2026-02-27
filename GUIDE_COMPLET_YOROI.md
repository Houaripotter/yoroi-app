# 🎯 GUIDE COMPLET YOROI - SOMMEIL, APPLE WATCH & DYNAMIC ISLAND

## 📱 PARTIE 1: DONNÉES DE SOMMEIL APPLE HEALTH

### Toutes les données disponibles dans Apple Health

Apple Health fournit ces données de sommeil (via HealthKit):

#### 1. **Phases de sommeil** (Sleep Stages)
- `HKCategoryValueSleepAnalysisAsleepUnspecified` - Sommeil général
- `HKCategoryValueSleepAnalysisAsleepCore` - Sommeil léger
- `HKCategoryValueSleepAnalysisAsleepDeep` - Sommeil profond
- `HKCategoryValueSleepAnalysisAsleepREM` - Sommeil paradoxal (REM)
- `HKCategoryValueSleepAnalysisAwake` - Éveillé
- `HKCategoryValueSleepAnalysisInBed` - Au lit (mais pas endormi)

#### 2. **Durées**
- Durée totale au lit
- Durée totale de sommeil réel
- Durée par phase (léger, profond, REM, éveillé)
- Heure de coucher
- Heure de réveil

#### 3. **Qualité du sommeil**
- Interruptions nocturnes (nombre de fois réveillé)
- Temps d'endormissement
- Efficacité du sommeil (% de temps réellement endormi vs temps au lit)

#### 4. **Données complémentaires** (si disponibles)
- Fréquence cardiaque pendant le sommeil (min/max/moyenne)
- Fréquence respiratoire
- Oxygène dans le sang (SpO2) si Apple Watch compatible
- Température du poignet (Apple Watch Series 8+)
- Niveau sonore ambiant (si activé)

#### 5. **Sources des données**
- iPhone (estimations via mouvement + usage)
- Apple Watch (données précises via capteurs)
- Apps tierces synchronisées avec Apple Santé

---

## ⌚ PARTIE 2: COMMUNICATION IPHONE ↔ APPLE WATCH

### État actuel de ton app

**Tu as déjà une Apple Watch app!**
Elle est dans `/ios/YoroiWatch Watch App/`

### Ce qui est déjà implémenté

1. **Dashboard Watch** (`DashboardView.swift`)
   - Affichage du poids actuel
   - Prochaine compétition
   - Séances cette semaine
   - Stats de progression

2. **Communication bidirectionnelle** (`WatchConnectivityProvider.tsx`)
   - Envoi de données iPhone → Apple Watch
   - Réception de données Apple Watch → iPhone
   - Synchronisation automatique

### Comment tester la communication

#### ÉTAPE 1: Vérifier que l'app Watch est installée
```bash
cd /Users/houari/Desktop/APP_Houari/yoroi_app/ios
open Yoroi.xcworkspace
```

Dans Xcode:
1. En haut à gauche, sélectionne le schéma **"Yoroi"**
2. Clique dessus → "Edit Scheme"
3. Vérifie que "YoroiWatch Watch App" est dans les targets

#### ÉTAPE 2: Build pour Apple Watch
1. Connecte ton iPhone à ton Mac
2. Mets ton Apple Watch au poignet (elle doit être appairée avec ton iPhone)
3. Dans Xcode, sélectionne comme destination: **"Mon Apple Watch"** (en haut à côté du schéma)
4. Product → Run (Cmd+R)

#### ÉTAPE 3: Tester la synchronisation
1. Lance l'app Yoroi sur ton iPhone
2. Lance l'app Yoroi sur ton Apple Watch
3. Ajoute une pesée sur l'iPhone → Regarde si ça se sync sur la Watch (quelques secondes)
4. Ajoute une séance sur l'iPhone → Vérifie le compteur sur la Watch

### Debug de la sync Watch

Si ça ne sync pas:
1. Vérifie les logs Xcode: Cherche "Watch Connectivity" dans la console
2. Ouvre l'app Watch Connectivity sur l'Apple Watch: Réglages → Général → Débogage
3. Vérifie que les deux apps sont en foreground (la sync ne marche qu'en foreground)

---

## 🏝️ PARTIE 3: DYNAMIC ISLAND - INSTALLATION COMPLÈTE

### Ce qu'est Dynamic Island

C'est la zone interactive en haut des iPhone 14 Pro+. Pendant un timer, elle affiche:
- Temps restant en temps réel
- Type d'activité (Musculation/Combat/Tabata)
- Animation pulsante

### Prérequis

- iPhone 14 Pro ou plus récent
- iOS 16.1+
- Xcode 14+

### ÉTAPES D'INSTALLATION (15-20 minutes)

#### ÉTAPE 1: Ouvrir le projet
```bash
cd /Users/houari/Desktop/APP_Houari/yoroi_app/ios
open Yoroi.xcworkspace
```

#### ÉTAPE 2: Créer la Widget Extension

1. Dans Xcode, menu **File → New → Target**
2. Cherche **"Widget Extension"**
3. Configure:
   - Product Name: `YoroiTimerWidget`
   - Team: (Ton équipe Apple Developer)
   - Include Configuration Intent: ❌ **NON**
   - Clique sur **Finish**
4. Popup "Activate YoroiTimerWidget scheme?": Clique **Cancel**

#### ÉTAPE 3: Ajouter les fichiers Swift

Les fichiers sont déjà dans `/ios/YoroiLiveActivity/`:
- `YoroiLiveActivity.swift` (Structure des données)
- `YoroiLiveActivityWidget.swift` (UI de la Live Activity)

**Actions:**
1. Clique droit sur le dossier `YoroiTimerWidget` dans Xcode
2. **Add Files to "Yoroi"**
3. Sélectionne les 2 fichiers `.swift` dans `/ios/YoroiLiveActivity/`
4. ⚠️ **IMPORTANT**: Coche **"YoroiTimerWidget" dans "Add to targets"**
5. Clique **Add**

#### ÉTAPE 4: Configurer les Capabilities

**Pour le target principal "Yoroi":**
1. Sélectionne le projet **Yoroi** (icône bleue en haut)
2. Onglet **Signing & Capabilities**
3. Target: **Yoroi**
4. Clique **+ Capability**
5. Ajoute **"Push Notifications"**
6. Ajoute **"Background Modes"** → Coche **"Remote notifications"**

**Pour le Widget "YoroiTimerWidget":**
1. Même écran, change le target vers **YoroiTimerWidget**
2. Vérifie que **Signing** est configuré (même Team que l'app principale)

#### ÉTAPE 5: Modifier Info.plist du Widget

1. Ouvre `YoroiTimerWidget/Info.plist`
2. Trouve la clé `NSExtension` → `NSExtensionPointIdentifier`
3. Change la valeur en: `com.apple.widgetkit-extension`
4. Ajoute une nouvelle clé:
   - Key: `NSSupportsLiveActivities`
   - Type: `Boolean`
   - Value: `YES`

#### ÉTAPE 6: Créer le Bundle ID

1. Va sur **developer.apple.com**
2. **Certificates, Identifiers & Profiles**
3. **Identifiers → +** (Ajouter)
4. Sélectionne **App IDs**
5. Description: `Yoroi Timer Widget`
6. Bundle ID: `com.yourcompany.yoroi.YoroiTimerWidget`
   (Remplace `com.yourcompany.yoroi` par ton Bundle ID principal + `.YoroiTimerWidget`)
7. Capabilities: Coche **Push Notifications**
8. **Continue → Register**

#### ÉTAPE 7: Créer le Provisioning Profile

1. **Profiles → +** (Ajouter)
2. **iOS App Development** (ou Distribution si pour production)
3. Sélectionne l'App ID **Yoroi Timer Widget** créé ci-dessus
4. Sélectionne ton certificat de développeur
5. Sélectionne tes devices de test
6. Nom: `Yoroi Timer Widget Development`
7. **Generate → Download**
8. Double-clique sur le fichier `.mobileprovision` téléchargé

#### ÉTAPE 8: Build et Test

1. Dans Xcode, sélectionne le schéma **Yoroi**
2. Device: **Ton iPhone physique** (Dynamic Island ne marche pas sur simulateur)
3. Product → Clean Build Folder (Cmd+Shift+K)
4. Product → Build (Cmd+B)
5. Si erreurs: Vérifie que les Bundle IDs correspondent
6. Product → Run (Cmd+R)

#### ÉTAPE 9: Tester Dynamic Island

1. Lance l'app Yoroi
2. Va dans **Timer**
3. Choisis un mode (Musculation/Combat/Tabata)
4. Appuie sur **Start**
5. Appuie sur le bouton Home → Retour à l'écran d'accueil
6. 🎉 **Dynamic Island devrait afficher le timer**

### Troubleshooting

**"Target integrity: The target 'YoroiTimerWidget' contains files from different projects"**
→ Les fichiers Swift doivent être copiés (pas linked). Supprime-les et ré-ajoute avec "Copy items if needed" coché.

**"Provisioning profile doesn't include the application-identifier entitlement"**
→ Recrée le Provisioning Profile sur developer.apple.com

**Dynamic Island ne s'affiche pas**
→ Vérifie:
- iPhone 14 Pro ou plus récent
- App en foreground quand tu lances le timer
- Logs Xcode: Cherche "LiveActivity" pour voir les erreurs

---

## 📋 PARTIE 4: VALIDATION APPLE STORE - TOUT CE DONT TU AS BESOIN

### Pourquoi Apple demande ces informations

Apple veut s'assurer que:
1. Ton app utilise réellement les fonctionnalités déclarées
2. Les utilisateurs comprennent pourquoi tu as besoin de leurs données
3. Tout est sécurisé et respecte la vie privée

### Informations obligatoires pour Apple

#### 1. **App Privacy Policy (Politique de confidentialité)**

**Pourquoi nécessaire:**
- Tu collectes des données de santé (poids, sommeil, fréquence cardiaque)
- Tu utilises des permissions sensibles (Photos, Caméra, Apple Health, Notifications)

**Ce qu'elle doit contenir:**

```markdown
# Politique de Confidentialité - Yoroi

## Données collectées

### 1. Données de santé
- Poids corporel
- Données de sommeil (durée, phases, qualité)
- Fréquence cardiaque (si disponible)
- **Utilisation:** Suivi de progression, statistiques personnelles
- **Stockage:** Local sur l'appareil uniquement (pas de serveur)
- **Partage:** Aucun partage avec des tiers

### 2. Photos
- Photos de profil
- Photos de progression
- **Utilisation:** Personnalisation et suivi visuel
- **Stockage:** Local uniquement
- **Partage:** Uniquement si l'utilisateur décide de partager

### 3. Données d'entraînement
- Séances d'entraînement
- Compétitions
- Partenaires d'entraînement
- **Utilisation:** Planification et suivi
- **Stockage:** Local (SQLite)
- **Partage:** Aucun

### 4. Notifications
- Rappels de pesée
- Rappels d'hydratation
- Citations motivationnelles
- **Utilisation:** Rappels personnalisés
- **Désactivation:** Possible dans les réglages iOS

## Sécurité

- Toutes les données restent sur l'appareil
- Pas de compte utilisateur requis
- Pas de collecte à distance
- Chiffrement iOS natif

## Droits de l'utilisateur

- Supprimer toutes les données via l'app
- Exporter les données
- Refuser les permissions (l'app continuera de fonctionner en mode limité)

## Contact

Email: tonemail@example.com
Site: https://tonsite.com
```

**Où l'héberger:**
- Sur ton site web (ex: `https://tonsite.com/privacy`)
- Ou utilise un service gratuit comme **PrivacyPolicies.com**

#### 2. **App Description & Keywords**

**Description (4000 caractères max):**

```
YOROI - TON COMPAGNON D'ENTRAÎNEMENT ULTIME

Que tu pratiques le JJB, le MMA, la musculation ou tout autre sport de combat, Yoroi est l'app tout-en-un pour suivre ta progression et atteindre tes objectifs.

🥋 POUR LES SPORTS DE COMBAT
- Timer intelligent (rounds, repos, gong)
- Suivi des techniques et sparring
- Gestion des compétitions IBJJF, CFJJB, etc.
- Catalogue d'événements sportifs
- Palmares et statistiques de combat

💪 POUR LA MUSCULATION
- Timer de repos entre séries
- Calculateur de disques (barres olympiques)
- Suivi des exercices et progression
- Graphiques de performance

📊 SUIVI COMPLET
- Poids et composition corporelle
- Sommeil (synchronisation Apple Santé)
- Hydratation
- Charge d'entraînement
- Indicateurs de santé (fréquence cardiaque, etc.)

🏆 GAMIFICATION
- Système de badges et récompenses
- Défis hebdomadaires
- Mode Ronin pour rester motivé
- Partage sur les réseaux sociaux

⌚ APPLE WATCH
- Synchronisation automatique
- Dashboard sur ta montre
- Notifications de rappel

🏝️ DYNAMIC ISLAND (iPhone 14 Pro+)
- Timer en temps réel sur Dynamic Island
- Jamais besoin de rouvrir l'app

✨ CARACTÉRISTIQUES
- 100% gratuit, sans pub
- Données stockées localement (pas de compte)
- Synchronisation Apple Health
- Mode clair/sombre
- Interface en français

Rejoins la communauté Yoroi et deviens la meilleure version de toi-même!
```

**Keywords (100 caractères max, séparés par des virgules):**
```
jjb,mma,musculation,timer,combat,pesée,sommeil,training,fitness,santé
```

#### 3. **Justifications des permissions** (App Store Connect)

Quand tu soumets l'app, Apple te demandera pourquoi tu utilises chaque permission. Voici les réponses:

**📸 Caméra (NSCameraUsageDescription)**
```
Yoroi a besoin de la caméra pour prendre des photos de progression et personnaliser ton profil.
```

**🖼️ Photos (NSPhotoLibraryUsageDescription)**
```
Yoroi a besoin d'accéder à tes photos pour définir une photo de profil et suivre ta progression visuelle.
```

**🏥 Apple Health (NSHealthShareUsageDescription / NSHealthUpdateUsageDescription)**
```
Yoroi synchronise tes données de santé (poids, sommeil, fréquence cardiaque) avec Apple Santé pour un suivi complet de ta progression.
```

**🔔 Notifications (User Notifications)**
```
Yoroi envoie des rappels personnalisés (pesée, hydratation, compétitions) et des citations motivationnelles pour t'aider à rester sur la bonne voie.
```

**🏝️ Live Activities (NSSupportsLiveActivities)**
```
Yoroi affiche le timer d'entraînement en temps réel sur Dynamic Island pour un suivi pratique sans ouvrir l'app.
```

#### 4. **Screenshots requis**

Tu dois fournir des captures d'écran pour:
- iPhone 6.7" (iPhone 14 Pro Max) - **3 à 10 screenshots**
- iPhone 6.5" (iPhone 11 Pro Max) - **3 à 10 screenshots**
- iPhone 5.5" (iPhone 8 Plus) - Optionnel

**Contenu recommandé:**
1. Écran d'accueil (Dashboard avec stats)
2. Timer en action
3. Graphiques de progression (poids/sommeil)
4. Liste des compétitions
5. Profil utilisateur avec badges

**Outils pour créer des screenshots marketing:**
- **Previewed** (previewed.app) - Gratuit
- **Shotsnapp** (shotsnapp.com) - Gratuit
- Ou screenshots directs depuis iPhone

#### 5. **App Icon**

**Requis:**
- 1024x1024 pixels
- Format PNG (pas de transparence)
- Pas de coins arrondis (Apple les ajoute automatiquement)

Ton icône actuelle (logo Yoroi doré) est parfaite!

#### 6. **Informations de contact**

- Email de support: (ton email)
- URL du site web: (optionnel mais recommandé)
- Numéro de téléphone: (optionnel)

---

## 🚀 PARTIE 5: CHECKLIST AVANT SOUMISSION

### Étape 1: Préparer les documents

- [ ] Politique de confidentialité publiée en ligne
- [ ] Description de l'app rédigée (4000 caractères max)
- [ ] Keywords choisis (100 caractères max)
- [ ] Screenshots préparés (3 minimum par taille d'écran)
- [ ] Icône 1024x1024 prête

### Étape 2: Tester l'app

- [ ] Tous les écrans s'ouvrent sans crash
- [ ] Timer fonctionne (Musculation/Combat/Tabata)
- [ ] Ajout de pesée fonctionne
- [ ] Sélection de photos fonctionne (profil, séances)
- [ ] Synchronisation Apple Santé fonctionne
- [ ] Apple Watch sync fonctionne (si tu l'as activée)
- [ ] Dynamic Island fonctionne (iPhone 14 Pro+)
- [ ] Aucun écran noir au lancement
- [ ] Notifications fonctionnent

### Étape 3: Build pour production

```bash
cd /Users/houari/Desktop/APP_Houari/yoroi_app/ios
```

Dans Xcode:
1. Sélectionne le schéma **Yoroi**
2. Device: **Any iOS Device (arm64)**
3. Product → Archive
4. Une fois l'archive créée: **Distribute App**
5. **App Store Connect**
6. **Upload**
7. Attends que le build soit "Ready to Submit" dans App Store Connect

### Étape 4: Soumettre sur App Store Connect

1. Va sur **appstoreconnect.apple.com**
2. **My Apps → + (Nouvelle app)**
3. Remplis:
   - **Nom:** Yoroi
   - **Langue principale:** Français
   - **Bundle ID:** (Celui de ton app)
   - **SKU:** yoroi-app (ou n'importe quoi d'unique)
4. **App Information:**
   - Catégorie principale: **Santé et Fitness**
   - Catégorie secondaire: **Sport** (optionnel)
   - URL de la politique de confidentialité: (ton lien)
5. **Pricing:** Gratuit
6. **Version Information:**
   - Colle la description
   - Ajoute les keywords
   - Upload les screenshots
   - Upload l'icône 1024x1024
7. **Build:** Sélectionne le build uploadé
8. **Rating (Évaluation d'âge):**
   - Réponds aux questions honnêtement
   - Probablement **4+** (Tout public)
9. **Submit for Review**

### Étape 5: Répondre aux questions de review

Apple va probablement demander:

**"Pourquoi avez-vous besoin d'accéder à Apple Health?"**
→ "Yoroi synchronise les données de poids et de sommeil depuis Apple Santé pour fournir un suivi complet de la progression de l'utilisateur. Les données restent locales et ne sont jamais envoyées à un serveur."

**"Comment utilisez-vous les photos?"**
→ "Les utilisateurs peuvent ajouter une photo de profil et des photos de progression. Toutes les photos restent sur l'appareil de l'utilisateur."

**"Votre app nécessite-t-elle un compte?"**
→ "Non, Yoroi fonctionne 100% hors ligne. Aucun compte n'est requis."

---

## ⚠️ ERREURS COMMUNES À ÉVITER

### 1. Bundle ID incorrect
Vérifie que le Bundle ID dans Xcode matche celui sur developer.apple.com

### 2. Provisioning Profile expiré
Recrée-le sur developer.apple.com si ça fait plus d'un an

### 3. Permissions manquantes dans Info.plist
Vérifie que TOUTES les permissions sont déclarées avec des messages clairs

### 4. Crash au premier lancement
Teste TOUJOURS sur un vrai iPhone (pas juste le simulateur)

### 5. App trop lourde
Si l'app fait plus de 150 MB, Apple va demander pourquoi. Optimise les images et assets.

---

## 📞 SUPPORT

Si tu es bloqué:
1. Vérifie les logs Xcode (très importants!)
2. Teste sur un vrai iPhone physique
3. Relis ce guide étape par étape

**Tu peux le faire!** 💪 Yoroi est presque prête pour l'App Store!
