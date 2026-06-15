# live-call

The phone side of Bosco Hub. See the architecture in
[`../CALL-TRANSCRIPTION.md`](../CALL-TRANSCRIPTION.md).

## Where things are now

- **Phase 1 (demo)** — a fixed script. Endpoint `app/api/live-call/stream`.
- **Phase 3a (real AI on a file)** — Whisper + gpt-4o-mini on a real audio file.
  Endpoint `app/api/live-call/transcribe`, logic in `lib/transcribe.js`.
  **← you are here.**
- **Phase 3b (live)** — this folder will hold the standalone Node service that
  streams audio from Twilio to a streaming STT (Deepgram) in real time. Not built
  yet.

## Try Phase 3a (real transcription)

1. Add your OpenAI key to `.env.local` (it is **not** committed):
   ```
   OPENAI_API_KEY=sk-...
   ```
2. Drop a German (or English) audio file into `live-call/samples/`, e.g.
   `anruf.mp3` (mp3, wav, m4a, ogg, webm…).
3. Start the dashboard (`npm run dev`), open **/llamada** and click
   **„Echte Aufnahme"**. Whisper transcribes the file, gpt-4o-mini extracts the
   fields, and the screen shows the real transcript with live highlighting.

Audio files in `samples/` are git-ignored (they can be large or contain real
data). Only `.gitignore` is tracked.

## Cost note

Whisper ≈ $0.006 / audio-minute; the gpt-4o-mini extraction is a few cents.
A 5-minute call costs roughly 3–4 cents.
