#!/usr/bin/env bash
# Detourage des avatars YOROI : fond blanc -> PNG transparent (meme taille de canevas).
# Usage :
#   ~/tools/detourer.sh ENTREE SORTIE [--exclude 'motif/relatif/*' ...]
#   ENTREE / SORTIE : un fichier .png, ou un dossier (recursif, arborescence reproduite, themes/ ignore).
# Premier lancement : cree le venv et telecharge le modele isnet-anime (~176 Mo) dans ~/tools/models.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -x "$DIR/venv/bin/python" ]; then
  python3 -m venv "$DIR/venv"
  "$DIR/venv/bin/pip" install -q onnxruntime scipy pillow numpy
fi
if [ ! -s "$DIR/models/isnet-anime.onnx" ]; then
  mkdir -p "$DIR/models"
  curl -sSL -C - -o "$DIR/models/isnet-anime.onnx" \
    https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx
fi
exec "$DIR/venv/bin/python" "$DIR/detourer.py" "$@" 2> >(grep -v cpuid >&2)
