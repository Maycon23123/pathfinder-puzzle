#!/usr/bin/env bash
# Gera dist/pathfinder-puzzle-netlify.zip com o conteúdo de www/ na RAIZ do zip,
# pronto para arrastar em https://app.netlify.com/drop
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/pathfinder-puzzle-netlify.zip
(cd www && zip -qr ../dist/pathfinder-puzzle-netlify.zip . -x "*.DS_Store")
echo "Gerado: dist/pathfinder-puzzle-netlify.zip"
