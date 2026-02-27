#!/bin/bash

# ============================================
# YOROI - RÉPARATION RAPIDE DU BUILD
# Solution au problème du build nocturne
# ============================================

echo "========================================="
echo "🔧 YOROI - RÉPARATION BUILD"
echo "========================================="
echo ""

echo "⚠️  ATTENTION: Ce script va supprimer le dossier ios/ et le recréer."
echo "    Tous les fichiers iOS seront régénérés from scratch."
echo ""
read -p "Continuer ? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Annulé"
    exit 1
fi

cd "/Users/houari/Desktop/APP_Houari/yoroi_app" || exit 1

# Étape 1: Retour au commit du 23 janvier
echo ""
echo "📍 Étape 1/5: Retour au commit du 23 janvier..."
git reset --hard 9c016b62
if [ $? -eq 0 ]; then
  echo "✅ Version 23 janvier restaurée"
else
  echo "❌ Erreur git reset"
  exit 1
fi

# Étape 2: Suppression COMPLÈTE du dossier ios
echo ""
echo "🗑️  Étape 2/5: Suppression complète de ios/..."
echo "    (peut prendre 2-3 minutes à cause des fichiers corrompus)"
rm -rf ios
# Vérifier que c'est bien supprimé
if [ -d "ios" ]; then
  echo "⚠️  Suppression lente, forçage avec find..."
  find ios -type f -delete
  find ios -depth -type d -delete
fi
echo "✅ ios/ supprimé"

# Étape 3: Recréation du projet iOS avec Expo
echo ""
echo "🏗️  Étape 3/5: Recréation projet iOS avec Expo..."
npx expo prebuild --platform ios --clean > /tmp/expo-prebuild.log 2>&1
if [ -d "ios" ]; then
  echo "✅ Projet iOS recréé"
else
  echo "❌ Erreur prebuild (voir /tmp/expo-prebuild.log)"
  exit 1
fi

# Étape 4: Création du bundle JavaScript
echo ""
echo "📦 Étape 4/5: Création bundle JavaScript..."
npx expo export:embed --platform ios --entry-file node_modules/expo-router/entry --bundle-output ios/main.jsbundle > /tmp/expo-bundle.log 2>&1
if [ -f "ios/main.jsbundle" ]; then
  BUNDLE_SIZE=$(ls -lh ios/main.jsbundle | awk '{print $5}')
  echo "✅ Bundle créé: $BUNDLE_SIZE"
else
  echo "❌ Erreur bundle (voir /tmp/expo-bundle.log)"
  exit 1
fi

# Étape 5: Ouverture dans Xcode
echo ""
echo "🎯 Étape 5/5: Ouverture dans Xcode..."
echo ""
echo "========================================="
echo "✅ RÉPARATION TERMINÉE !"
echo "========================================="
echo ""
echo "Xcode va s'ouvrir dans 3 secondes..."
echo "Dans Xcode:"
echo "  1. Brancher l'iPhone en USB"
echo "  2. Sélectionner ton iPhone comme destination"
echo "  3. Product → Clean Build Folder (Cmd+Shift+K)"
echo "  4. Product → Run (Cmd+R)"
echo ""
sleep 3
open ios/Yoroi.xcworkspace
