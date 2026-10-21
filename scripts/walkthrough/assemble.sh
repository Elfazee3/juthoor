#!/usr/bin/env bash
# Concatenate the recorded webm segments (in the order given) into one H.264 MP4.
# usage: ./assemble.sh out.mp4 seg1.webm seg2.webm ...
set -e
OUT="$1"; shift
LIST=$(mktemp)
for f in "$@"; do printf "file '%s'\n" "$(cygpath -m "$f")" >> "$LIST"; done
ffmpeg -hide_banner -loglevel warning -y -f concat -safe 0 -i "$LIST" \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
  -r 25 -c:v libx264 -preset medium -crf 20 -movflags +faststart -an "$OUT"
rm -f "$LIST"
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of default=nw=1 "$OUT"
