#!/bin/bash

# Script de correction des termes genrés
# Remplace "guerrier" par des termes inclusifs

echo "🔧 Correction des termes genrés..."

# Commentaires de code : Guerrier → Complet/Athlète
find app lib components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/Mode d'\''affichage (Guerrier/Mode d'\''affichage (Complet/g' \
  -e 's/Batterie du Guerrier/Batterie Athlète/g' \
  -e 's/MODE GUERRIER/MODE COMPLET/g' \
  -e 's/Profil guerrier/Profil athlète/g' \
  -e 's/profil guerrier/profil athlète/g' \
  {} \;

# Messages utilisateur : le guerrier → tu/l'athlète
find app lib components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's/le guerrier a /tu as /g' \
  -e 's/Le guerrier a /Tu as /g' \
  -e 's/son objectif/ton objectif/g' \
  -e 's/Son objectif/Ton objectif/g' \
  -e 's/ses objectifs/tes objectifs/g' \
  -e 's/Ses objectifs/Tes objectifs/g' \
  {} \;

# Messages dans les services
find lib -type f -name "*.ts" -exec sed -i '' \
  -e 's/"Guerrier/"Athlète/g' \
  -e 's/'\''Guerrier/'\''Athlète/g' \
  -e 's/du guerrier/de l'\''athlète/g' \
  {} \;

echo "✅ Correction terminée !"
echo "📝 Fichiers modifiés : commentaires et messages utilisateur"
echo "⚠️  Variables techniques conservées (mode === 'guerrier', etc.)"
