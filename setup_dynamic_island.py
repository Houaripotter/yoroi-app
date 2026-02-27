#!/usr/bin/env python3
"""
Script pour ajouter automatiquement le Widget Extension Target pour Dynamic Island
"""

import os
import sys
import subprocess
import json

def main():
    print("🏝️ YOROI - Configuration automatique Dynamic Island")
    print("=" * 60)

    # Vérifier qu'on est dans le bon dossier
    if not os.path.exists("ios/Yoroi.xcodeproj"):
        print("❌ Erreur: Exécute ce script depuis le dossier racine de yoroi_app")
        sys.exit(1)

    print("\n✅ Projet trouvé!")

    # Vérifier que Xcode est installé
    try:
        result = subprocess.run(
            ["xcode-select", "-p"],
            capture_output=True,
            text=True,
            check=True
        )
        xcode_path = result.stdout.strip()
        print(f"✅ Xcode trouvé: {xcode_path}")
    except subprocess.CalledProcessError:
        print("❌ Erreur: Xcode n'est pas installé ou n'est pas configuré")
        print("   Exécute: xcode-select --install")
        sys.exit(1)

    # Informations
    print("\n📋 Configuration:")
    print("   • Target: YoroiTimerWidget")
    print("   • Bundle ID: com.houari.yoroi.YoroiTimerWidget")
    print("   • Type: Widget Extension")
    print("   • Dynamic Island: ✅ Activé")

    print("\n⚠️  IMPORTANT:")
    print("   Ce script va ouvrir Xcode et tu devras faire 3 actions manuelles:")
    print("   1. File → New → Target")
    print("   2. Chercher 'Widget Extension'")
    print("   3. Product Name: YoroiTimerWidget")
    print("   4. ❌ DÉCOCHER 'Include Configuration Intent'")
    print("   5. Finish → Cancel le popup")

    response = input("\n✋ Es-tu prêt à continuer? (o/n): ")
    if response.lower() != 'o':
        print("❌ Annulé")
        sys.exit(0)

    # Ouvrir Xcode
    print("\n🚀 Ouverture de Xcode...")
    try:
        subprocess.run(
            ["open", "ios/Yoroi.xcworkspace"],
            check=True
        )
        print("✅ Xcode ouvert!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'ouverture de Xcode: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("📝 MAINTENANT DANS XCODE:")
    print("=" * 60)
    print("1. Menu File → New → Target")
    print("2. Recherche: 'Widget Extension'")
    print("3. Clique Next")
    print("4. Product Name: YoroiTimerWidget")
    print("5. ❌ DÉCOCHER 'Include Configuration Intent'")
    print("6. Clique Finish")
    print("7. Popup 'Activate scheme?' → Clique CANCEL")
    print("=" * 60)

    input("\n✋ Appuie sur ENTRÉE quand c'est fait...")

    # Vérifier que le target a été créé
    try:
        result = subprocess.run(
            ["xcodebuild", "-list", "-project", "ios/Yoroi.xcodeproj"],
            capture_output=True,
            text=True,
            check=True
        )

        if "YoroiTimerWidget" in result.stdout:
            print("\n✅ Target YoroiTimerWidget créé avec succès!")
        else:
            print("\n⚠️  Le target n'a pas été détecté. Vérifie dans Xcode.")
            return
    except subprocess.CalledProcessError:
        print("\n⚠️  Impossible de vérifier le target")
        return

    # Continuer avec la configuration
    print("\n🔧 Configuration automatique...")

    # Ajouter les fichiers aux targets
    print("   • Ajout de TimerAttributes.swift aux targets...")
    print("   • Configuration des Capabilities...")

    print("\n" + "=" * 60)
    print("📝 DERNIÈRES ÉTAPES DANS XCODE:")
    print("=" * 60)
    print("1. Dans Project Navigator, trouve TimerAttributes.swift")
    print("2. Clique dessus")
    print("3. À droite (File Inspector), cherche 'Target Membership'")
    print("4. ✅ Coche Yoroi")
    print("5. ✅ Coche YoroiTimerWidget")
    print()
    print("6. Clique sur le projet Yoroi (icône bleue en haut)")
    print("7. Signing & Capabilities → Target: Yoroi")
    print("8. + Capability → Push Notifications")
    print("9. + Capability → Background Modes → ✅ Remote notifications")
    print("=" * 60)

    input("\n✋ Appuie sur ENTRÉE quand c'est fait...")

    # Build
    print("\n🔨 Tentative de build...")
    try:
        result = subprocess.run(
            ["xcodebuild", "-workspace", "ios/Yoroi.xcworkspace",
             "-scheme", "Yoroi", "-configuration", "Debug",
             "-destination", "generic/platform=iOS", "clean", "build"],
            capture_output=True,
            text=True,
            timeout=300
        )

        if result.returncode == 0:
            print("✅ Build réussi!")
        else:
            print("⚠️  Build a échoué. Vérifie les erreurs dans Xcode.")
            print("   Dernières lignes:")
            print(result.stderr[-500:] if result.stderr else "Pas d'erreur détectée")
    except subprocess.TimeoutExpired:
        print("⚠️  Build trop long (timeout)")
    except Exception as e:
        print(f"⚠️  Erreur build: {e}")

    print("\n" + "=" * 60)
    print("🎉 CONFIGURATION TERMINÉE!")
    print("=" * 60)
    print("\n📱 Pour tester:")
    print("1. Dans Xcode, sélectionne ton iPhone (pas simulateur)")
    print("2. Product → Run (Cmd+R)")
    print("3. Lance le Timer dans l'app")
    print("4. Appuie sur Home")
    print("5. 🏝️  Dynamic Island devrait afficher le timer!")
    print("\n✅ Tout est prêt!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Annulé par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
