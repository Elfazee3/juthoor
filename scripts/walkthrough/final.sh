#!/usr/bin/env bash
# Full take: reseed -> desktop walkthrough -> phone take -> outro -> assemble MP4.
set -e
cd "$(dirname "$0")"
DEST="/c/Users/youssefbouz/ancestry/juthoor/recordings"
mkdir -p "$DEST" final && rm -f final/*.webm
./prep.sh
MAIN="intro,public,signup,verify,dashboard,tree,tree_relatives,person360,chart,people,gedcom,finder,request_access,directories,owner_inbox,admin,owner_connections,verified_member,extras,login_tour"
node walkthrough.cjs "$MAIN" > final/desktop.log 2>&1 || true
grep -E "FLOW FAILED|VIDEO" final/desktop.log | tail -3
D=$(grep -oE "VIDEO \S+" final/desktop.log | tail -1 | awk '{print $2}')
VIEWPORT=390x844 node walkthrough.cjs mobile > final/mobile.log 2>&1 || true
M=$(grep -oE "VIDEO \S+" final/mobile.log | tail -1 | awk '{print $2}')
node walkthrough.cjs outro > final/outro.log 2>&1 || true
O=$(grep -oE "VIDEO \S+" final/outro.log | tail -1 | awk '{print $2}')
echo "segments: $D | $M | $O"
STAMP=$(date +%Y-%m-%d)
./assemble.sh "$DEST/juthoor-walkthrough-$STAMP.mp4" "$D" "$M" "$O"
# 3x-speed cut (~6 min) requested by the user
ffmpeg -hide_banner -loglevel warning -y -i "$DEST/juthoor-walkthrough-$STAMP.mp4" -vf "setpts=PTS/3" -r 25 -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart -an "$DEST/juthoor-walkthrough-$STAMP-3x.mp4"
ffprobe -v error -show_entries format=duration -of default=nw=1 "$DEST/juthoor-walkthrough-$STAMP-3x.mp4"
ls -la "$DEST"
