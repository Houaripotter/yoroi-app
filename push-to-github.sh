#!/bin/bash

# 🚀 Script pour pousser YOROI sur GitHub
# Usage: ./push-to-github.sh "Ton message de commit"

echo "📦 Ajout de tous les fichiers..."
git add .

if [ -z "$1" ]; then
  COMMIT_MSG="✨ Mise à jour YOROI - $(date +'%Y-%m-%d %H:%M')"
else
  COMMIT_MSG="$1"
fi

echo "💾 Création du commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "🚀 Poussage sur GitHub..."
git push origin v2-offline

echo "✅ Terminé !"

