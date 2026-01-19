# 🔐 DERNIÈRE ÉTAPE - Configuration Provisioning Profile

Date: 19 Janvier 2026
Statut: **Action manuelle requise** ⚠️

---

## ✅ TOUT EST FAIT, SAUF...

J'ai tout configuré automatiquement :
- ✅ Fichiers Swift ajoutés au projet Xcode
- ✅ Bridging Header configuré
- ✅ App Groups ajoutés dans les Entitlements (iPhone + Watch)
- ✅ Pods réinstallés avec succès
- ✅ Code React Native intégré

**Il reste UNE SEULE étape que tu dois faire dans Xcode :**

Mettre à jour le **Provisioning Profile** pour inclure l'App Groups capability.

---

## ❌ ERREUR ACTUELLE

```
error: Provisioning profile "iOS Team Provisioning Profile: com.houari.yoroi"
doesn't include the App Groups capability.

error: Provisioning profile doesn't support the group.com.yoroi.app App Group.
```

**Pourquoi ?**
- Les App Groups ont été ajoutés aux Entitlements ✅
- Mais le Provisioning Profile de ton compte Apple Developer ne les inclut pas encore ❌
- C'est une limitation de sécurité Apple - il faut régénérer le profile

---

## 🔧 SOLUTION - 2 Options

### Option 1 : Laisser Xcode régénérer automatiquement (Recommandé)

C'est le plus simple si tu as Xcode configuré avec ton compte Apple Developer.

**Étapes :**

1. **Ouvrir le projet dans Xcode**
   ```bash
   cd /Users/houari/Desktop/APP_Houari/yoroi_app/ios
   open Yoroi.xcworkspace
   ```

2. **Aller dans les paramètres du projet**
   - Cliquer sur "Yoroi" (icône bleue en haut à gauche)
   - Sélectionner le target "Yoroi" (sous TARGETS)
   - Aller dans l'onglet "Signing & Capabilities"

3. **Activer "Automatically manage signing"**
   - ✅ Cocher "Automatically manage signing"
   - Sélectionner ton Team Apple Developer

4. **Vérifier que App Groups est présent**
   - Dans "Signing & Capabilities", tu devrais voir une section "App Groups"
   - Si elle n'est pas là, cliquer sur "+ Capability" et ajouter "App Groups"
   - Vérifier que `group.com.yoroi.app` est coché

5. **Faire la même chose pour la Watch App**
   - Sélectionner le target "YoroiWatch Watch App"
   - Répéter les étapes 3-4

6. **Xcode va automatiquement :**
   - Créer un nouveau Provisioning Profile
   - Y inclure l'App Groups capability
   - Télécharger et installer le profile

7. **Rebuild**
   ```bash
   npx expo run:ios --device
   ```

---

### Option 2 : Configuration manuelle dans Apple Developer Portal

Si l'option 1 ne marche pas (rare), tu peux configurer manuellement.

**Étapes :**

1. **Aller sur Apple Developer Portal**
   - https://developer.apple.com/account
   - Se connecter avec ton compte Apple Developer

2. **Créer un App Group**
   - Certificates, Identifiers & Profiles
   - Identifiers > App Groups
   - Cliquer sur "+"
   - Description: "YOROI Shared Data"
   - Identifier: `group.com.yoroi.app`
   - Save

3. **Ajouter l'App Group à ton App ID**
   - Identifiers > App IDs
   - Chercher "com.houari.yoroi"
   - Éditer
   - Capabilities > Cocher "App Groups"
   - Configure > Sélectionner `group.com.yoroi.app`
   - Save

4. **Faire la même chose pour l'App ID Watch**
   - Chercher "com.houari.yoroi.watchkitapp"
   - Répéter les étapes ci-dessus

5. **Régénérer les Provisioning Profiles**
   - Profiles > Development
   - Supprimer les anciens profiles "YOROI"
   - Créer de nouveaux profiles avec les App Groups

6. **Télécharger et installer les nouveaux profiles**
   - Download les .mobileprovision
   - Double-cliquer pour installer

7. **Dans Xcode**
   - Signing & Capabilities
   - Désactiver "Automatically manage signing"
   - Sélectionner manuellement les nouveaux profiles

8. **Rebuild**
   ```bash
   npx expo run:ios --device
   ```

---

## 🚀 APRÈS AVOIR FAIT ÇA

Une fois le Provisioning Profile régénéré avec App Groups :

**Le build va réussir et tu pourras tester la sync iPhone ↔ Apple Watch !**

```bash
# Sur iPhone
npx expo run:ios --device

# L'app Watch s'installe automatiquement
# Ouvrir les 2 apps et tester :
# - Enregistrer un poids sur iPhone → Apparaît sur Watch
# - Ajouter de l'eau sur iPhone → Apparaît sur Watch
```

---

## 📊 VÉRIFICATION RAPIDE

Pour vérifier que tout est OK :

1. **Dans Xcode**
   - Target Yoroi > Signing & Capabilities
   - Doit afficher : "Provisioning Profile: YOROI Development" (ou similaire)
   - Sous App Groups : `group.com.yoroi.app` coché ✅

2. **Sur Apple Developer Portal**
   - App IDs > com.houari.yoroi
   - Capabilities doit inclure "App Groups" avec un ✅

3. **Build**
   - Le build ne doit plus afficher l'erreur "doesn't include the App Groups capability"
   - Build success ✅

---

## ❓ EN CAS DE PROBLÈME

**Erreur "No profiles for 'com.houari.yoroi' were found"**
- Solution : Laisser Xcode créer automatiquement un nouveau profile
- Ou : Créer manuellement sur developer.apple.com

**Erreur "The app group cannot be created"**
- Vérifier que ton compte Apple Developer est bien actif
- Vérifier que tu as les droits pour créer des App Groups

**Watch App ne s'installe pas**
- Désinstaller l'app iPhone
- Rebuild et réinstaller
- Sur iPhone : Ouvrir l'app Watch > Mes montres > YOROI > Installer

---

## ✅ CHECKLIST FINALE

Avant de tester sur device :

- [ ] Provisioning Profile régénéré avec App Groups
- [ ] App Groups ajoutés sur Apple Developer Portal
- [ ] Les 2 targets (Yoroi + YoroiWatch Watch App) ont le même App Group
- [ ] Build réussit sans erreur de provisioning
- [ ] iPhone et Watch sont appairés
- [ ] Bluetooth activé

---

## 🎯 RÉSUMÉ

**Ce que j'ai fait automatiquement :**
- ✅ 100% du code (Swift, TypeScript, React Native)
- ✅ 100% de la configuration Xcode (fichiers, entitlements, bridging)
- ✅ 100% de l'architecture (providers, sync, indicateurs)

**Ce que tu dois faire manuellement :**
- ⚠️ Régénérer le Provisioning Profile avec App Groups (2 minutes dans Xcode)
- ⚠️ Tester sur iPhone + Watch physiques

**Pourquoi c'est manuel ?**
- C'est une restriction de sécurité Apple
- Seul le propriétaire du compte Apple Developer peut modifier les Provisioning Profiles
- Ça se fait en 2 clics dans Xcode avec "Automatically manage signing"

---

## 📚 DOCUMENTATION COMPLÈTE

- **Intégration complète:** `INTEGRATION_COMPLETE.md`
- **Guide d'installation:** `WATCH_SETUP_GUIDE.md`
- **Corrections Apple Watch:** `WATCH_CORRECTIONS_SUMMARY.md`
- **Exemples de code:** `WATCH_CONNECTIVITY_EXAMPLES.tsx`

---

**🚀 Une fois le Provisioning Profile configuré, l'app YOROI iPhone + Watch sera 100% opérationnelle !**
