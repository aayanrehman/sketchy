# Prepared demo artwork

The eight WebP images in `art/` were generated with ChatGPT's built-in ImageGen tool for this project, then cropped from an eight-panel contact sheet and compressed to 512 × 512 WebP. They are project assets, not external stock images. All eight total approximately 215 KB.

The prompt requested four cat stickers (three DJs and one chef) and four frog stickers (three guitarists and one drummer), bold purple ink outlines, an ivory background, pastel colors, no text, and matching square compositions. The first three variants belong to the real prompt and the fourth to the decoy. `scripts/build-demo-content.mjs` authors corresponding rough vector sketches and illustrative scores.

These are prepared sample art and scores, not outputs recorded from this app's live OpenAI image-edit + judge endpoints. The demo labels bot scores as examples. To replace them with real measured recordings, use `/studio` with an API key and save each slot. The image-edit instruction must remain identical for all players and must never contain their game prompt.
