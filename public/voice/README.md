# Truth.OS House · Voice assets (ElevenLabs)

## Workflow

1. Open **`speech-prompts.html`** in a browser (or visit `/voice/speech-prompts.html` on the site).
2. Open **`SPEECH_PROMPTS.txt`** to copy scripts into ElevenLabs.
3. Use **`card_*.svg`** as teleprompter images (exact text) while recording or cloning.
4. Export each block as **`NN_id.mp3`** (e.g. `01_welcome.mp3`).
5. Drop finished files into `public/audio/house/` (or tell the agent the path) so they can be wired to stations.

## Suggested delivery

- Warm Black male mid-baritone  
- Intimate, sincere, not theatrical  
- Slight gravel OK · pause at periods  

Regenerate scripts after lore changes:

```bash
node scripts/build-voice-prompts.mjs
```
