#!/usr/bin/env bash
set -euo pipefail

# Generate PNG and ICO favicons from `assets/icon.svg` using ImageMagick
# Requires: `convert` (ImageMagick) or `magick` on some systems.

src="assets/icon.svg"
out_png="assets/favicon.png"
out_ico="assets/favicon.ico"

if command -v magick >/dev/null 2>&1; then
  cmd="magick"
elif command -v convert >/dev/null 2>&1; then
  cmd="convert"
else
  echo "ImageMagick not found. Install it (brew install imagemagick) and re-run this script." >&2
  exit 1
fi

mkdir -p assets
echo "Generating PNG..."
$cmd "$src" -background none -resize 64x64 "$out_png"
echo "Generating ICO..."
$cmd "$out_png" "$out_ico"
echo "Generated: $out_png, $out_ico"
