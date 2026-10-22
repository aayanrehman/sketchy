#!/bin/bash
# Cuts the sped-up footage clips for the 26 s cut from ../raw (captured by video/capture.ts).
# name  src  start  source-seconds  speed   → output length = source-seconds / speed
set -e
cd "$(dirname "$0")"
RAW=../raw
cut() { ffmpeg -y -loglevel error -ss "$3" -t "$4" -i "$RAW/$2" -an -vf "setpts=PTS/$5,fps=30,format=yuv420p" -c:v libx264 -crf 16 -preset medium "assets/clips/$1.mp4"; echo "$1 $(ffprobe -v error -show_entries format=duration -of csv=p=0 assets/clips/$1.mp4)"; }
cut join-host  join-host.mp4    8.0   19.2  6
cut join-phone join-phone.mp4   8.0   19.2  6
cut draft      demo-desktop.mp4 13.4  3.4   2.125
cut feedback   demo-desktop.mp4 28.7  2.0   1
cut refine     demo-desktop.mp4 33.4  2.6   2.1667
cut reveal     demo-desktop.mp4 51.5  3.6   2.25
cut hint       demo-desktop.mp4 60.4  0.8   1
cut vote       demo-desktop.mp4 74.0  2.4   3
cut erased     demo-desktop.mp4 132.0 0.6   1
cut steal      demo-desktop.mp4 236.0 3.2   3.2
cut results    demo-desktop.mp4 97.5  4.8   2
