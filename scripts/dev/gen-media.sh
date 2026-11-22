#!/usr/bin/env bash
# Generates sample HLS lesson videos for local/dev environments.
# Requires ffmpeg (resolved via the imageio-ffmpeg Python package on hosts
# without a system ffmpeg, else uses system ffmpeg).
set -euo pipefail

cd "$(dirname "$0")/../.."

STORAGE_DIR="${STORAGE_DIR:-./storage}"
mkdir -p "$STORAGE_DIR/videos"

FF="${FF:-}"
if [ -z "$FF" ]; then
  if command -v ffmpeg >/dev/null 2>&1; then
    FF="ffmpeg"
  else
    FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())" 2>/dev/null || true)
  fi
fi
if [ -z "$FF" ]; then
  echo "ERROR: ffmpeg not found. Install system ffmpeg or: pip install imageio-ffmpeg" >&2
  exit 1
fi
echo "Using ffmpeg: $FF"
FONT="$(pwd)/src/fonts/HindSiliguri-Regular.ttf"

gen() {
  local id="$1" c1="$2" c2="$3" label="$4"
  local out="$STORAGE_DIR/videos/$id"
  mkdir -p "$out"
  echo "→ $id ($label)"
  "$FF" -y -hide_banner -loglevel error \
    -f lavfi -i "gradients=s=640x360:d=30:c0=$c1:c1=$c2:speed=0.04" \
    -f lavfi -i "sine=frequency=210:duration=30" \
    -vf "drawtext=fontfile=$FONT:text='$label':fontcolor=white@0.92:fontsize=34:x=(w-text_w)/2:y=(h-text_h)/2,drawtext=fontfile=$FONT:text='MadrNext · ডেমো লেসন':fontcolor=white@0.55:fontsize=15:x=24:y=h-38" \
    -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -preset veryfast -g 48 -keyint_min 48 -sc_threshold 0 \
    -c:a aac -b:a 32k -shortest \
    -hls_time 6 -hls_list_size 0 -hls_flags independent_segments \
    -hls_segment_filename "$out/seg%d.ts" \
    "$out/master.m3u8"
}

gen sample-1 0x0e2a2b 0x0c5b53 "আল কুরআন ও তাজবীদ — পাঠ ১"
gen sample-2 0x123c35 0x1d5e50 "গণিত — দ্বিঘাত সমীকরণ"
gen sample-3 0x14283c 0x0c5b53 "আল হাদিস — ব্যাখ্যা পর্ব"

echo "HLS videos generated ✓"
