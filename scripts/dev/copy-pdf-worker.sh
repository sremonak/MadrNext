#!/usr/bin/env bash
# Copies the pdf.js worker into public/vendor for the SecurePdfViewer.
# (Gitignored — run after npm install, or `npm run vendor:copy`.)
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p public/vendor
SRC=""
for c in node_modules/pdfjs-dist/build/pdf.worker.min.mjs node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs node_modules/pdfjs-dist/build/pdf.worker.min.js; do
  [ -f "$c" ] && SRC="$c" && break
done
if [ -z "$SRC" ]; then
  echo "ERROR: pdf.worker not found in node_modules/pdfjs-dist" >&2
  exit 1
fi
cp "$SRC" public/vendor/pdf.worker.min.mjs
echo "copied $SRC → public/vendor/pdf.worker.min.mjs"
