#!/bin/bash

# ============================================
# YOROI - BUILD AUTOMATIQUE NOCTURNE
# Version stable 23/01 19h34 (8.5/10)
# ============================================

LOG_FILE="/tmp/yoroi-build-$(date +%Y%m%d-%H%M%S).log"
PHONE_ID="00008120-000A58540CBB401E"
PROJECT_DIR="/Users/houari/Desktop/APP_Houari/yoroi_app"

echo "========================================" | tee -a "$LOG_FILE"
echo "🌙 YOROI - BUILD NOCTURNE AUTOMATIQUE" | tee -a "$LOG_FILE"
echo "Début: $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

cd "$PROJECT_DIR" || exit 1

# ============================================
# ÉTAPE 1: Retour à la version stable
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "📍 ÉTAPE 1/7: Retour version stable 19h34..." | tee -a "$LOG_FILE"
git reset --hard 9c016b62 >> "$LOG_FILE" 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Version stable restaurée" | tee -a "$LOG_FILE"
else
  echo "❌ ERREUR: Impossible de restaurer la version" | tee -a "$LOG_FILE"
  exit 1
fi

# ============================================
# ÉTAPE 2: Nettoyage complet iOS
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "🧹 ÉTAPE 2/7: Nettoyage complet iOS..." | tee -a "$LOG_FILE"
rm -rf ios/Pods ios/Podfile.lock ios/build >> "$LOG_FILE" 2>&1
rm -rf ~/Library/Developer/Xcode/DerivedData/Yoroi-* >> "$LOG_FILE" 2>&1
echo "✅ Nettoyage terminé" | tee -a "$LOG_FILE"

# ============================================
# ÉTAPE 3: Création du bundle JavaScript
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "📦 ÉTAPE 3/7: Création bundle JavaScript..." | tee -a "$LOG_FILE"
npx expo export:embed --platform ios --entry-file node_modules/expo-router/entry --bundle-output ios/main.jsbundle >> "$LOG_FILE" 2>&1
if [ -f "ios/main.jsbundle" ]; then
  BUNDLE_SIZE=$(ls -lh ios/main.jsbundle | awk '{print $5}')
  echo "✅ Bundle créé: $BUNDLE_SIZE" | tee -a "$LOG_FILE"
else
  echo "❌ ERREUR: Bundle non créé" | tee -a "$LOG_FILE"
  exit 1
fi

# ============================================
# ÉTAPE 4: Installation CocoaPods
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "🔧 ÉTAPE 4/7: Installation CocoaPods..." | tee -a "$LOG_FILE"
cd ios || exit 1
pod install >> "$LOG_FILE" 2>&1
POD_EXIT=$?

if [ $POD_EXIT -eq 0 ] || grep -q "Pod installation complete" "$LOG_FILE"; then
  POD_COUNT=$(ls -1 Pods | wc -l)
  echo "✅ Pods installés: $POD_COUNT pods" | tee -a "$LOG_FILE"
else
  echo "⚠️  WARNING: Pod install a des warnings mais continue..." | tee -a "$LOG_FILE"
fi

cd ..

# ============================================
# ÉTAPE 5: Compilation Release
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "🔨 ÉTAPE 5/7: Compilation Release (peut prendre 10-15 min)..." | tee -a "$LOG_FILE"
echo "Début compilation: $(date)" >> "$LOG_FILE"

cd ios || exit 1
xcodebuild -workspace Yoroi.xcworkspace \
  -scheme Yoroi \
  -configuration Release \
  -destination "platform=iOS,id=$PHONE_ID" \
  clean build >> "$LOG_FILE" 2>&1

BUILD_EXIT=$?
echo "Fin compilation: $(date)" >> "$LOG_FILE"

if [ $BUILD_EXIT -eq 0 ]; then
  echo "✅ Compilation réussie!" | tee -a "$LOG_FILE"
else
  echo "❌ ERREUR: Compilation échouée (code: $BUILD_EXIT)" | tee -a "$LOG_FILE"
  echo "Vérifiez les erreurs dans: $LOG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

cd ..

# ============================================
# ÉTAPE 6: Vérification de l'app
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "🔍 ÉTAPE 6/7: Vérification app compilée..." | tee -a "$LOG_FILE"

APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/Yoroi-*/Build/Products/Release-iphoneos -name "Yoroi.app" -type d 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo "❌ ERREUR: App non trouvée" | tee -a "$LOG_FILE"
  exit 1
fi

if [ -f "$APP_PATH/Yoroi" ]; then
  APP_SIZE=$(ls -lh "$APP_PATH/Yoroi" | awk '{print $5}')
  echo "✅ App trouvée: $APP_SIZE" | tee -a "$LOG_FILE"
  echo "    Path: $APP_PATH" | tee -a "$LOG_FILE"
else
  echo "❌ ERREUR: Exécutable manquant" | tee -a "$LOG_FILE"
  exit 1
fi

# ============================================
# ÉTAPE 7: Installation sur iPhone
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "📱 ÉTAPE 7/7: Installation sur iPhone..." | tee -a "$LOG_FILE"

xcrun devicectl device install app --device "$PHONE_ID" "$APP_PATH" >> "$LOG_FILE" 2>&1
INSTALL_EXIT=$?

if [ $INSTALL_EXIT -eq 0 ]; then
  echo "✅ App installée avec succès!" | tee -a "$LOG_FILE"
else
  echo "❌ ERREUR: Installation échouée (code: $INSTALL_EXIT)" | tee -a "$LOG_FILE"
fi

# ============================================
# RÉSUMÉ FINAL
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "🎯 RÉSUMÉ FINAL" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
echo "Fin: $(date)" | tee -a "$LOG_FILE"
echo "Log complet: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ $INSTALL_EXIT -eq 0 ]; then
  echo "✅ ✅ ✅ SUCCÈS TOTAL ✅ ✅ ✅" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
  echo "L'app Yoroi (version stable 8.5/10) est installée!" | tee -a "$LOG_FILE"
  echo "Vous pouvez:" | tee -a "$LOG_FILE"
  echo "  • Tester Apple Health" | tee -a "$LOG_FILE"
  echo "  • Tester Dynamic Island" | tee -a "$LOG_FILE"
  echo "  • Tester toutes les fonctionnalités" | tee -a "$LOG_FILE"
else
  echo "⚠️  BUILD RÉUSSI mais installation échouée" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
  echo "L'app est compilée mais pas installée." | tee -a "$LOG_FILE"
  echo "Ouvrez Xcode demain et cliquez Play pour installer." | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# Afficher le log final en gros pour qu'il le voie au réveil
cat << 'EOF'

███████╗██╗███╗   ██╗██╗
██╔════╝██║████╗  ██║██║
█████╗  ██║██╔██╗ ██║██║
██╔══╝  ██║██║╚██╗██║╚═╝
██║     ██║██║ ╚████║██╗
╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝

EOF

echo "📋 Consultez le log complet: $LOG_FILE"
echo ""
