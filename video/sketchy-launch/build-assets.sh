#!/bin/sh
# Cuts the real captures in ../raw into per-beat clips + callouts. Re-run after re-capturing.
set -e
R=../raw; D=$R/demo-desktop/shots; P=$R/demo-phone/shots
cut() { # name src in out speed [w h]
  w=${6:-1920}; h=${7:-1080}
  ffmpeg -y -loglevel error -ss $3 -to $4 -i $2 -an -vf "setpts=PTS/$5,scale=$w:$h,fps=30,format=yuv420p" -c:v libx264 -crf 16 -g 30 -keyint_min 30 -preset medium -movflags +faststart assets/clips/$1.mp4
}
crop() { ffmpeg -y -loglevel error -i $2 -vf "crop=$3" assets/callouts/$1.png; }
cut join-host  $R/join-host.mp4  1.5 17.5 1.75
cut join-phone $R/join-phone.mp4 1.9 17.9 1.75 1080 2338
cut study   $R/demo-desktop.mp4 6.0 10.0 1
cut draft   $R/demo-desktop.mp4 16.5 21.5 1
cut feedback $R/demo-desktop.mp4 31.0 38.0 1
cut refine  $R/demo-desktop.mp4 37.6 44.6 1.4
cut reveal  $R/demo-desktop.mp4 48.2 54.2 1.2
cut hint    $R/demo-desktop.mp4 57.0 62.0 1
cut vote    $R/demo-desktop.mp4 70.8 73.8 1
cut unmask  $R/demo-desktop.mp4 77.0 80.0 1
cut steal   $R/demo-desktop.mp4 86.3 88.3 1
cut verdict $R/demo-desktop.mp4 93.6 101.6 1
cut bluff   $R/demo-desktop.mp4 120.4 124.4 1
cut podium  $R/demo-desktop.mp4 251.0 254.0 1
cut reel    $R/demo-desktop.mp4 262.4 264.9 1
cut share   $R/demo-desktop.mp4 267.4 269.4 1
crop feedback-card $D/010-feedback-visible.png 1372:300:1228:380
crop hint-card     $D/015-hint-visible.png 560:200:3224:816
crop pixel-draft   $D/015-hint-visible.png 156:156:2168:1108
crop verdict-head  $D/027-verdict-scrolled.png 2010:470:592:160
crop sam-card      $D/027-verdict-scrolled.png 488:660:1611:1132
# Music: the game's own procedural lofi bed, recorded from the live site.
ffmpeg -y -loglevel error -i $R/music.wav -t 86 -af "loudnorm=I=-21:TP=-2:LRA=11,afade=t=in:d=1,afade=t=out:st=83:d=3" -c:a aac -b:a 192k assets/music.m4a
# Vertical cut: the phone-sized solo demo run (its own live scores).
P2=$R/demo-phone.mp4
cut p-study   $P2 6.0 10.0 1 1080 1920
cut p-draft   $P2 16.8 21.8 1 1080 1920
cut p-feedback $P2 31.0 37.0 1 1080 1920
cut p-refine  $P2 37.3 44.3 1.4 1080 1920
cut p-reveal  $P2 46.0 52.0 1.2 1080 1920
cut p-discuss $P2 54.0 59.0 1 1080 1920
cut p-vote    $P2 70.0 73.0 1 1080 1920
cut p-unmask  $P2 78.3 81.3 1 1080 1920
cut p-steal   $P2 87.6 89.6 1 1080 1920
cut p-verdict $P2 95.5 103.5 1 1080 1920
cut p-bluff   $P2 122.0 126.0 1 1080 1920
cut p-podium  $P2 248.0 251.0 1 1080 1920
cut p-reel    $P2 258.8 260.8 1 1080 1920
cut p-share   $P2 263.6 265.6 1 1080 1920
