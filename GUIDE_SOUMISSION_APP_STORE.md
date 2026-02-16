# Guide de Soumission App Store - YOROI 2.0

## 1. VERSIONS CONFIRMÉES

| App | Version | Build |
|-----|---------|-------|
| iOS Yoroi | 2.0 | 2 |
| Apple Watch | 1.0 | 1 |

---

## 2. CAPTURES D'ÉCRAN REQUISES

### iPhone (OBLIGATOIRE)

| Taille | Appareil Simulateur | Résolution |
|--------|---------------------|------------|
| 6.7" | **iPhone 15 Pro Max** | 1290 x 2796 px |
| 6.5" | iPhone 14 Plus / 13 Pro Max | 1284 x 2778 px |
| 5.5" | iPhone 8 Plus | 1242 x 2208 px |

> **Recommandation** : Utilise **iPhone 15 Pro Max** pour le 6.7" - c'est le plus important.

### iPad (SI TON APP SUPPORTE IPAD)

| Taille | Appareil Simulateur | Résolution |
|--------|---------------------|------------|
| 12.9" | **iPad Pro (6th gen)** | 2048 x 2732 px |
| 11" | iPad Pro 11" | 1668 x 2388 px |

### Apple Watch (OBLIGATOIRE POUR WATCH APP)

| Taille | Appareil Simulateur | Résolution |
|--------|---------------------|------------|
| Series 10 (46mm) | **Apple Watch Series 10 - 46mm** | 416 x 496 px |
| Series 10 (42mm) | Apple Watch Series 10 - 42mm | 374 x 446 px |
| Ultra 2 | Apple Watch Ultra 2 | 410 x 502 px |

> **Recommandation** : Utilise **Apple Watch Series 10 - 46mm** pour les screenshots Watch.

---

## 3. COMMENT FAIRE LES SCREENSHOTS

### Méthode 1 : Simulateur Xcode (Recommandé)

```bash
# 1. Ouvrir Xcode
open /Users/houari/Desktop/APP_Houari/yoroi_app/ios/Yoroi.xcworkspace

# 2. Sélectionner le simulateur souhaité (ex: iPhone 15 Pro Max)
# 3. Lancer l'app (Cmd + R)
# 4. Une fois l'app ouverte, faire le screenshot :
#    - Cmd + S (dans le Simulateur) → Sauvegarde sur le Bureau
```

### Méthode 2 : Sur appareil physique

1. Connecter iPhone/iPad/Watch
2. Faire `Power + Volume Up` pour screenshot
3. Transférer via AirDrop

### Screenshots à capturer (suggestion)

**iPhone (5-10 screenshots) :**
1. Écran d'accueil avec stats (pas, calories, hydratation)
2. Suivi de poids avec graphique
3. Page entraînements
4. Carnet d'entraînement (Benchmarks/Skills)
5. Page Dojo (gamification/badges)
6. Intégration Apple Health
7. Mode sombre (optionnel)

**Apple Watch (3-5 screenshots) :**
1. Écran principal avec stats
2. Complications sur cadran
3. Suivi hydratation
4. Sync avec iPhone

---

## 4. DESCRIPTIONS APP STORE

### iOS App - Description Complète

```
YOROI : Suivi Poids & Sport

Votre compagnon fitness 100% privé. Vos données restent sur votre appareil.

FONCTIONNALITÉS PRINCIPALES

• Suivi de poids intelligent
Enregistrez votre poids quotidien avec graphiques de progression. Analyse des tendances sur 7, 30, 90 jours.

• Composition corporelle
Suivez votre masse grasse, masse musculaire et IMC. Sync avec Apple Health.

• Carnet d'entraînement
Benchmarks de force (PR, 1RM), skills techniques (JJB, Boxe, MMA). Historique complet.

• Gamification motivante
Système de rangs (Ronin → Shogun), badges à débloquer, défis quotidiens.

• Intégration Apple Health
Sync automatique : poids, pas, calories, sommeil, hydratation.

• Apple Watch
App compagnon pour suivi rapide, complications personnalisées.

• 100% Offline & Privé
Aucun compte requis. Vos données ne quittent jamais votre appareil.

---

Idéal pour :
→ Pratiquants de sports de combat (JJB, Boxe, MMA)
→ Musculation et CrossFit
→ Perte ou prise de poids
→ Suivi fitness quotidien
```

### iOS App - Description Courte (Sous-titre)

```
Planning d'entraînement, Santé
```

### iOS App - Mots-clés (100 caractères max)

```
fitness,poids,musculation,jjb,boxe,mma,sport,santé,tracking,workout,gym,crossfit,nutrition,health
```

---

### Apple Watch App - Description

```
YOROI Watch - Votre poignet fitness

L'extension Apple Watch de YOROI pour un suivi instantané.

FONCTIONNALITÉS

• Stats en un coup d'œil
Poids actuel, streak, hydratation, calories brûlées.

• Complications personnalisées
Ajoutez YOROI à votre cadran favori. Timer d'entraînement, hydratation, rang actuel.

• Sync automatique
Données synchronisées avec l'app iPhone via iCloud.

• HealthKit intégré
Lit vos données santé directement depuis la montre.

Nécessite l'app YOROI sur iPhone.
```

---

## 5. QUOI DE NEUF (Version 2.0)

### Pour la mise à jour iOS 2.0

```
Nouveautés YOROI 2.0

• Apple Watch App
Nouvelle app Watch avec complications personnalisées, suivi d'hydratation et sync temps réel.

• Intégration Apple Health améliorée
Sync bidirectionnelle : hydratation, composition corporelle, calories.

• Carnet d'entraînement redessiné
Benchmarks avec historique de PRs, skills techniques avec vidéos.

• Système de gamification
Rangs japonais (Ronin → Shogun), badges, défis hebdomadaires.

• Page diagnostic santé
Vérifiez l'état de connexion Apple Health.

• Corrections de bugs
Amélioration de la stabilité et des performances.
```

### Pour Watch App 1.0 (première version)

```
Première version de YOROI Watch

• Suivi instantané au poignet
Consultez vos stats fitness sans sortir l'iPhone.

• 6 complications personnalisées
Timer, hydratation, streak, poids, rang, records.

• Sync iPhone
Données synchronisées automatiquement.

• Intégration HealthKit native
Lecture directe des données santé de la montre.
```

---

## 6. INFORMATIONS REQUISES PAR APPLE

### App iOS

| Champ | Valeur |
|-------|--------|
| Nom | YOROI : Suivi Poids & Sport |
| Sous-titre | Planning d'entraînement, Santé |
| Bundle ID | com.houari.yoroi |
| SKU | yoroi2026 |
| Apple ID | 6757306612 |
| Catégorie principale | Forme et santé |
| Catégorie secondaire | Sports |
| Âge | 4+ (pas de contenu mature) |
| Prix | Gratuit |

### Watch App

| Champ | Valeur |
|-------|--------|
| Nom | YOROI Watch |
| Bundle ID | com.houari.yoroi.watchkitapp |
| Catégorie | Forme et santé |

### Informations de contact support

| Champ | Valeur |
|-------|--------|
| Email support | yoroiapp@hotmail.com |
| URL marketing | (ton site web si tu en as un) |
| URL confidentialité | (OBLIGATOIRE - voir section 7) |

---

## 7. URL POLITIQUE DE CONFIDENTIALITÉ (OBLIGATOIRE)

Apple exige une URL de politique de confidentialité. Options :

### Option A : Page simple (recommandé)
Crée une page GitHub Pages ou Notion avec ce texte :

```markdown
# Politique de Confidentialité - YOROI

Dernière mise à jour : Janvier 2026

## Collecte de données
YOROI ne collecte AUCUNE donnée personnelle. Toutes vos informations restent stockées localement sur votre appareil.

## Données stockées localement
- Poids et mesures corporelles
- Historique d'entraînements
- Préférences utilisateur

## Apple Health
YOROI peut lire et écrire des données dans Apple Health avec votre permission. Ces données ne sont jamais envoyées à des serveurs externes.

## Contact
Pour toute question : yoroiapp@hotmail.com
```

### Option B : Utiliser une page Notion publique

---

## 8. SOUMETTRE iOS + WATCH ENSEMBLE

### Étape 1 : Archive l'app iOS (qui inclut la Watch)

```bash
# Dans Xcode :
# 1. Sélectionner scheme "Yoroi" (pas le Watch)
# 2. Destination → "Any iOS Device (arm64)"
# 3. Product → Archive (Cmd + Shift + B pour build, puis Product → Archive)
```

### Étape 2 : Distribuer vers App Store Connect

1. Dans **Organizer** (Window → Organizer)
2. Sélectionner l'archive
3. **Distribute App** → **App Store Connect** → **Upload**
4. L'archive contient automatiquement l'app Watch

### Étape 3 : Dans App Store Connect

1. Aller sur https://appstoreconnect.apple.com
2. **Mes apps** → **YOROI**
3. **Version 2.0** (déjà créée selon ton screenshot)
4. Ajouter les screenshots
5. Remplir "Quoi de neuf"
6. **Soumettre pour révision**

> **Important** : L'app Watch est automatiquement incluse avec l'app iOS. Pas besoin de soumission séparée.

---

## 9. CHECKLIST AVANT SOUMISSION

- [ ] Screenshots iPhone 6.7" (iPhone 15 Pro Max)
- [ ] Screenshots iPad 12.9" (si iPad supporté)
- [ ] Screenshots Apple Watch 46mm
- [ ] Description complète remplie
- [ ] Mots-clés ajoutés
- [ ] "Quoi de neuf" rédigé
- [ ] URL politique de confidentialité
- [ ] Email support vérifié
- [ ] Icône d'app correcte (1024x1024)
- [ ] Build uploadé via Xcode
- [ ] Testé sur appareil réel
- [ ] Pas de bugs critiques

---

## 10. DÉLAIS DE RÉVISION

- **Première soumission Watch** : 24-48h généralement
- **Mise à jour iOS** : 24h en moyenne
- **Si rejeté** : Corriger et resoumettre (délai identique)

Bonne soumission ! 🎉
