# live-call

The phone side of Bosco Hub. See the architecture in
[`../CALL-TRANSCRIPTION.md`](../CALL-TRANSCRIPTION.md).

The microservice (`server.js`) has three WebSocket paths:

| Path | Who connects | Audio | Transcript goes to |
|------|--------------|-------|--------------------|
| `/` | Browser mic | PCM 24 kHz | back to the same browser |
| `/twilio` | Twilio Media Streams | µ-law 8 kHz | broadcast to `/watch` dashboards |
| `/watch` | Operator dashboard | — | receives the Twilio call transcript |

All paths use **OpenAI Realtime** (`gpt-realtime-whisper`). OpenAI accepts g711 µ-law
directly (`format: audio/pcmu`), so Twilio audio is **not** transcoded.

## Phases

- **Phase 1 (demo)** — fixed script. Endpoint `app/api/live-call/stream`.
- **Phase 3a (file)** — Whisper + gpt-4o on a real audio file. `app/api/live-call/transcribe`.
- **Phase 3b-i (live mic)** — browser mic → this service → OpenAI. **Done.**
- **Phase 3b-ii (Twilio)** — real phone calls. **Code ready; needs a Twilio account.**

## Try 3a (file) / 3b-i (mic)

1. `OPENAI_API_KEY` in `.env.local` (not committed).
2. Start the service: `cd live-call && npm install && npm start` → `ws://localhost:8787`.
3. In `/llamada`: **„Echte Aufnahme"** transcribes a file from `samples/`;
   **„Live (Mikrofon)"** transcribes your mic in real time.

Audio files in `samples/` are git-ignored.

## Phase 3b-ii — Twilio (real calls)

The code is ready (`/twilio` + `/watch` paths). To go live you need a Twilio account.

1. **Twilio account + a phone number** (choose the **EU region** for DSGVO).
2. The microservice must be reachable at `wss://live.boscohub.duckdns.org/twilio`
   (already deployed in production via Caddy).
3. Point the number's **"A call comes in"** to a TwiML Bin with:
   ```xml
   <Response>
     <Start>
       <Stream url="wss://live.boscohub.duckdns.org/twilio" />
     </Start>
     <Dial>+49…NÚMERO_DEL_OPERADOR</Dial>
   </Response>
   ```
   - `<Start><Stream>` forks the call audio to the microservice (does not interfere
     with the call).
   - `<Dial>` rings the operator's phone — they answer normally.
4. The operator opens `/llamada` → **„Telefon (Twilio)"** (subscribes to `/watch`)
   and sees the live transcript + extracted fields as the call happens.

To go to production for real, forward Don Bosco's number to the Twilio number
(call forwarding). Diarization (Mitarbeiter/Anrufer) can be done per channel later.

> Current limitation: `/watch` broadcasts to **all** connected dashboards (fine for
> a pilot). Routing each call to the specific operator who answered is a later step.

## Cost note

Whisper ≈ $0.006 / audio-minute; gpt-4o extraction is a few cents per call.
Twilio adds per-minute voice charges. Realtime transcription is billed by OpenAI.
