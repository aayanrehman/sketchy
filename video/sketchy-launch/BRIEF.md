---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Sketchy is a real, free party game where you get better at AI prompting while hunting an imposter"
destination: handshake-submission
aspect: 1920x1080
language: en
length: 85s
angle: show-it-as-is demo, sold to contest judges
audience: Handshake x OpenAI "AI Skills Studio" judges (Execution, Creativity, Usefulness, Polish)
---

## Intent

Launch/demo video for Sketchy's contest submission. In 60–90 s a judge should understand the game,
see it is real and playable, and see why it's valuable. Make each contest requirement visible:
live public URL, room codes, no login/installs, phone or laptop, replayable, multiplayer.

## Customizations

- Real footage captured from https://sketchy-blue.vercel.app (video/capture.ts): solo demo for gameplay,
  host screen + phone for the room-code join, home page. No invented features or fake UI.
- Motion-graphic explainers only where footage can't show it, styled like the game (pastel sky, thick ink
  outlines, Fredoka, mascot images from client/public/mascot/).
- Burned-in captions for every line (no voice-over); light lofi bed = the game's own procedural music, recorded from the live site.
- Deliverables: 1920x1080 master, 1080x1920 vertical cut, 1200x630 cover still.

## Notes

- Truthful: solo-demo bots use pre-made prompts and example scores; the player's own prompts are live AI.
- Domain: sketchy-blue.vercel.app (custom domain not set up yet; one variable to swap).
