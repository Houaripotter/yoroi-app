#!/usr/bin/env python3
"""
Script pour enlever le fond en damier des avatars PNG
Nécessite: pip install Pillow rembg

Alternative sans rembg (moins précis):
pip install Pillow
"""

import os
from PIL import Image
import sys

def remove_checkerboard_simple(image_path, output_path):
    """
    Méthode simple: rendre semi-transparent les zones claires
    (Moins précis mais ne nécessite pas rembg)
    """
    img = Image.open(image_path).convert("RGBA")
    data = img.getdata()

    new_data = []
    for item in data:
        # Si le pixel est très clair (proche du blanc/gris clair du damier)
        # et pas trop coloré, le rendre transparent
        r, g, b, a = item
        avg = (r + g + b) / 3
        color_variance = max(abs(r-avg), abs(g-avg), abs(b-avg))

        # Si c'est un pixel clair et peu coloré (probablement du fond)
        if avg > 200 and color_variance < 30:
            new_data.append((r, g, b, 0))  # Transparent
        else:
            new_data.append(item)  # Garder tel quel

    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"✓ Traité: {os.path.basename(output_path)}")

def remove_background_rembg(image_path, output_path):
    """
    Méthode précise avec rembg (nécessite: pip install rembg)
    """
    try:
        from rembg import remove
        with open(image_path, 'rb') as input_file:
            input_data = input_file.read()
        output_data = remove(input_data)
        with open(output_path, 'wb') as output_file:
            output_file.write(output_data)
        print(f"✓ Traité avec rembg: {os.path.basename(output_path)}")
        return True
    except ImportError:
        return False

def process_avatars(base_dir, use_rembg=False):
    """
    Traite tous les avatars dans le dossier assets/avatars
    """
    avatars_dir = os.path.join(base_dir, 'assets', 'avatars')

    if not os.path.exists(avatars_dir):
        print(f"❌ Dossier introuvable: {avatars_dir}")
        return

    packs = ['samurai', 'ninja']
    genders = ['male', 'female']

    total = 0
    for pack in packs:
        for gender in genders:
            folder = os.path.join(avatars_dir, pack, gender)
            if not os.path.exists(folder):
                print(f"⚠️  Dossier ignoré: {folder}")
                continue

            for filename in os.listdir(folder):
                if filename.endswith('.png') and not filename.startswith('.'):
                    input_path = os.path.join(folder, filename)
                    output_path = input_path  # Remplace l'original

                    # Backup de l'original
                    backup_path = input_path.replace('.png', '_backup.png')
                    if not os.path.exists(backup_path):
                        import shutil
                        shutil.copy2(input_path, backup_path)
                        print(f"💾 Backup: {os.path.basename(backup_path)}")

                    # Traiter l'image
                    if use_rembg:
                        success = remove_background_rembg(input_path, output_path)
                        if not success:
                            print("⚠️  rembg non disponible, utilisation méthode simple")
                            remove_checkerboard_simple(input_path, output_path)
                    else:
                        remove_checkerboard_simple(input_path, output_path)

                    total += 1

    print(f"\n✅ {total} images traitées!")
    print("💡 Les originaux sont sauvegardés avec le suffixe _backup.png")

if __name__ == "__main__":
    # Déterminer le dossier de base
    script_dir = os.path.dirname(os.path.abspath(__file__))

    print("🎨 Suppression du fond en damier des avatars")
    print("=" * 50)

    # Demander la méthode
    print("\nMéthodes disponibles:")
    print("1. Simple (Pillow uniquement) - Moins précis")
    print("2. Avancé (rembg) - Plus précis, nécessite: pip install rembg")

    choice = input("\nChoisir la méthode (1 ou 2, défaut=1): ").strip()
    use_rembg = choice == "2"

    if use_rembg:
        print("\n⚠️  Assurez-vous d'avoir installé rembg:")
        print("   pip install rembg")
        input("Appuyez sur Entrée pour continuer...")

    print(f"\n🚀 Traitement en cours...\n")
    process_avatars(script_dir, use_rembg=use_rembg)
    print("\n✨ Terminé! Vérifiez les images dans l'app.")
