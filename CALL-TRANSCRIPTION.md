# Live Call Transcription — Architecture

How we add **phone calls** to Bosco Hub. Today the system turns **emails** into
`inquiries` (via n8n). This adds a second source: a phone call is transcribed in
real time, the key information is highlighted, and — after a human approves — it
lands in the **same `inquiries` table** as a call (`channel = 'phone'`).

This is the "Analyze" row of the project plan (STT + NER + Phone Transcription +
Customer Lookup → *Human Approval: validate extracted data*), and it feeds the
"Decide & Reason" suggestions (capacity, bedroom logic, program fit).

> What the client asked for (interviews, Apr–May 2026): *"transcribing it and in
> the system, taking the important information you need, like highlighting it...
> the phone call, somebody is on the phone on the left, transcription in real time
> and the analyzing... and suggests."* The human still answers the phone — the AI
> only **listens, transcribes and highlights**. It does **not** answer calls.


## Where it fits (the big picture)

```
   Email  ─► n8n ─────────┐
                          │  INSERT
                          ▼
                   ┌──────────────┐        ┌────────────────┐
                   │  Postgres    │ ◀────► │  Dashboard     │
                   │  inquiries   │        │  Next.js       │
                   └──────────────┘        └────────────────┘
                          ▲  INSERT (channel='phone')
                          │
   Phone  ─► live-call microservice (NEW) ─┘
```

The **`inquiries` table stays the meeting point.** A finished call ends exactly
where an email ends: one row in `inquiries`. The dashboard, the booking flow and
the confirmation flow do not need to change — for them a call looks like an email.

What is new is everything that happens **during** the call, handled by a new
service (`live-call/`). n8n is **not** involved live (it does request/response, not
audio streams); it keeps doing the email side.


## Production flow (the goal)

The team answers on their **normal phone**. The transcription appears on the
dashboard **by itself** — they never type into the dashboard to talk.

```
1. Customer dials the Don Bosco number
        │   (number is FORWARDED to Twilio, or ported to Twilio)
        ▼
2. Twilio (acts as an invisible bridge)
        ├─ 3a. Calls the operator's real phone  → it rings, they answer & talk
        │                                          as always
        └─ 3b. Copies the call audio (both sides) → WebSocket → live-call service
                                                          │
                                                          ▼
4. live-call:  audio → STT (German) → NER + structured extraction
                                                          │  SSE
                                                          ▼
5. Dashboard "Live call" screen: transcription + key fields fill in live
        │
        ▼
6. On hang-up → INSERT into `inquiries` (channel='phone')
```

**The key condition:** the call must pass through a bridge (Twilio) even though the
operator answers on their own phone. That bridge is what lets us copy the audio.
Two ways to get there:

| Option | What it means | Notes |
|--------|---------------|-------|
| **Call forwarding** | The current Don Bosco line is set to "forward to this Twilio number". Customer-facing number does not change. | Fastest. Coordinated with their telecom provider. |
| **Number porting** | The Don Bosco number is managed by Twilio. | More definitive, more paperwork. |

Either way the operator notices nothing different: their phone rings and they
answer like today.


## Demo flow (what we build first)

For the prototype we avoid touching Don Bosco's real line. The operator answers
**inside the dashboard** using a **softphone** (a phone made of software — like
WhatsApp/Teams calls — here the Twilio Voice SDK in the browser):

```
Customer ─► Twilio number (new, real) ─► softphone in the dashboard
                                              │  (audio is already here)
                                              ▼
                                   STT → NER + extraction → live UI
```

Why start here:
- A new Twilio number is **real** and works in minutes — no porting, no risk to
  their line.
- It shows the full experience end-to-end for the presentation.
- The logic (STT + highlighting + `inquiries`) is **identical** to production; only
  *where the audio comes from* changes. Moving to the production flow does not mean
  rewriting it.


## The live screen — transcription + highlighting

The screen the client described: transcript on the left, key data on the right.

```
┌──────────────────────────────────────────────────────────┐
│  Live call                                                 │
│ ┌──────────────────────────┬─────────────────────────────┐│
│ │ Transcript (streaming)   │ Key data (fills in live)    ││
│ │ ...words appear as they  │ Schule:     Realschule …     ││
│ │ are spoken, key entities │ Kontakt:    Frau …           ││
│ │ are underlined live...   │ Zeitraum:   15.–17.02        ││
│ │                          │ Personen:   27 + 2 Lehrer    ││
│ │                          │ Jahrgang:   8. Klasse        ││
│ │                          │ Programm:   Orientierungstage││
│ │                          │ Haus:       Aktionszentrum   ││
│ │                          │ ⚠ sensibel: 1 Allergie       ││
│ │                          │ 💡 Frei in dieser Woche      ││
│ └──────────────────────────┴─────────────────────────────┘│
│            [ Anfrage anlegen ]   ← human approval          │
└──────────────────────────────────────────────────────────┘
```

Highlighting uses **two mechanisms at once** (different speeds):

1. **Live NER (low latency)** — underlines entities inside the transcript as they
   are spoken: dates, numbers, proper names, program. This is the "lights up while
   they talk" effect.
2. **Structured extraction (every few seconds)** — fills the right-hand card with
   the fields. Reuses the **same fields the email extractor already produces**.

The entities are exactly the `inquiries` columns:
`school_name`, `contact_person`, `date_range`, `number_of_people`, `grade_level`,
`program_type`, `house`, `special_requirements`.

Live helpers (feed the "Decide & Reason" phase):
- **Customer Lookup** — is this school already in `bookings`? Show past stays.
- **Suggestion** — is the house free for those dates? Which house fits the program?

### How highlighting works (under the hood)

The STT does not return plain text — it returns text **with per-word timestamps**,
and each chunk is marked *interim* (grey, may still change) or *final* (stable).
When a chunk turns final, we analyse it and mark the entities. Two layers, at
different speeds:

1. **Live underline (instant)** — a cheap pass over each final sentence catches the
   "obvious" things without waiting for the LLM: dates and numbers via patterns
   (regex) + names/program via a light NER. This is the "lights up while they talk"
   effect.
2. **Field card (every few seconds)** — the fast LLM reads the accumulated text and
   returns, per field, the **normalised value and the exact quote** it came from.
   We locate that quote in the transcript (`indexOf`) and highlight it, linked to
   the field.

**Example.** The operator says: *"vom **fünfzehnten bis siebzehnten Februar** möchte
sie kommen mit **27 Schülern und zwei Lehrern**"* (Realschule Bruckmühl,
Orientierungstage). The analyser returns spans:

```json
[
  { "quote": "fünfzehnten bis siebzehnten Februar", "type": "date_range",       "value": "15.–17.02", "confidence": 0.97 },
  { "quote": "27 Schülern",                          "type": "number_of_people", "value": "27",        "confidence": 0.95 },
  { "quote": "zwei Lehrern",                          "type": "number_of_people", "value": "+2 Lehrer", "confidence": 0.9  },
  { "quote": "Realschule Bruckmühl",                  "type": "school_name",      "value": "Realschule Bruckmühl" },
  { "quote": "Orientierungstage",                     "type": "program_type",     "value": "Orientierungstage" }
]
```

Design details that matter:

- **Entity types = `inquiries` columns**: `date_range`, `number_of_people`,
  `grade_level`, `school_name`, `contact_person`, `program_type`, `house`,
  `special_requirements`. Each gets its own colour.
- **Sensitive data** (allergies/health) is a separate type: highlighted in red and
  **blurred** by default until the operator clicks — respects the DSGVO section.
- **Confidence**: low-confidence spans render dotted; the operator confirms with a
  click and the value becomes the "official" field value.
- **Bidirectional**: hovering a field in the card highlights its quote in the
  transcript, and vice-versa. This is what makes it feel like a co-pilot and not a
  text dump.
- **React render**: the transcript is a list of segments; we keep annotations
  `{segmentId, charStart, charEnd, type, fieldKey}` and wrap those ranges in
  `<mark class="ent ent--date">`. CSS per type. Cheap to paint.

### Languages — German and English

Mostly **German**, but **not only**: the interviews mention international groups and
European volunteers, and one of the two interviews was held in English. So the
design assumes **de + en**:

- **STT with language detection** — the call is transcribed in whichever language is
  spoken, no manual switch.
- **Transcript in the original language** — the left side shows what was actually
  said (German or English).
- **Fields normalised to German** — even for an English call, the right-hand card
  and what we store in `inquiries` stay in German, to match the emails and the
  German UI. The extraction LLM does this naturally.
- **Mixed language in one call** (de/en code-switching) — handled, with slightly
  lower accuracy on the mixed sentences. Accepted as an edge case, not a target.


## Data protection (DSGVO) — built in, not added later

The interviews stress this: health/allergy data is a **special category** (Art. 9)
— *"if it gets public, we have a problem."* So:

- **Transcript only, audio discarded.** We do not store the recording.
- **Consent notice** at the start of the call ("Dieses Gespräch wird …").
- **Data minimisation:** for allergies the staff said they normally only need *the
  number* ("how many have a gluten allergy"), not names. The live extractor keeps
  the **count** and sets `contains_sensitive_data = true`; if a name + condition is
  dictated, it is **masked** on screen and access-restricted. This reuses the
  existing `contains_sensitive_data` column.
- **EU processing:** in the Twilio bridge the audio passes through Twilio (US-based).
  For DSGVO we must force Twilio's **EU region** (Frankfurt/Ireland) and an STT with
  EU processing. This is a decision to close with the client before production. If
  it is a legal blocker, the alternative is an **EU VoIP PBX with SIPREC** (forks
  the audio without going through the US) — depends on the telephony they adopt.


## What gets added to the repo

| Piece | Change |
|-------|--------|
| **`live-call/`** (new) | Node microservice: WebSocket for audio ↔ STT, NER + incremental extraction, pushes to the dashboard over SSE. Mockable without API keys for early development. |
| **Dashboard** | New screen `app/llamada/page.js` (live console) + an SSE endpoint. The key-data card reuses styles from `components/Detail.js`. On approval → INSERT into `inquiries`. |
| **Postgres** | Optional `customer_phone TEXT` (to call back). Sensitive handling already covered by `contains_sensitive_data`. |
| **`docker-compose.prod.yml`** | Add the `live-call` service. |
| **`Caddyfile`** | A WebSocket/SSE proxy block to the `live-call` service. |
| **n8n** | No change live. Still receives the final INSERT path. |


## External services

| Service | Role | Note |
|---------|------|------|
| **Twilio** | Phone bridge + Media Streams (live audio) + Voice SDK (demo softphone) | Use the **EU region** for DSGVO. |
| **STT (streaming)** | Speech → text, live, German + English (auto-detect) | Deepgram or OpenAI realtime/transcribe, with language detection. |
| **Extraction model** | NER + structured fields | A fast model (the project already uses `gpt-4o-mini` in n8n); keep it cheap because it runs often. |


## Phased plan

| Phase | Telephony | Goal |
|-------|-----------|------|
| **1 · Prototype/demo** | New Twilio number + softphone in the dashboard | Live transcription + highlighting + suggestions + human approval → `inquiries`. This is what we present. |
| **2 · Production** | Forward/port the real Don Bosco number to Twilio (or softphone app for the secretariat) | Same logic, real calls on their own phones. |
| **Complement** | Voicemail ("mobile box") → near-live transcription | For after-hours calls that hit the mailbox — the client said these could be processed automatically. |


## Open decisions (to confirm with the client)

1. **Telephony today** — what system does the secretariat use to take calls
   (mobile, VoIP/PBX, landline)? This decides forwarding vs porting vs SIPREC.
2. **DSGVO routing** — is Twilio EU region acceptable, or do they require audio to
   never leave an EU provider (→ SIPREC on an EU PBX)?
3. **Which screen shows which call** — with 5 people, route the live transcript to
   the operator who answered (Twilio knows the target), or a shared "call in
   progress" view.
