# ZUK Email Booking Agent

## Folder contents

- `docker-compose.yml`: launches n8n and Postgres with one command.
- `init.sql`: database schema (inquiries, schools, houses, rooms, bookings). Runs
  once on the first Postgres startup.
- `zuk_email_agent_prototype_v1.json`: the importable n8n workflow.
- `README.md`: this file.

## Step 1: Start n8n and Postgres locally

Requires Docker Desktop installed.

From inside this folder, run:

```
docker compose up -d
```

This starts two containers, `zuk-postgres` and `zuk-n8n`. The Postgres container
runs `init.sql` automatically on the first start, creating the schema and seeding
the two houses. n8n waits until Postgres is healthy before starting.

Open http://localhost:5678 in your browser. Basic auth: `zuk` / `zuk_prototype_2026`.
Create the local owner account when prompted.

To stop: `docker compose down`. Data persists in named volumes (`postgres_data`,
`n8n_data`). To fully reset including the database, use `docker compose down -v`.

## Step 2: Import the workflow

In n8n, menu top-right -> Import from File -> select `zuk_email_agent_prototype_v1.json`.

## Step 3: Create credentials

Three credentials are required.

### 3a. Postgres

In n8n: Credentials -> New -> Postgres. Fill in:

- Host: `postgres` (this is the service name in docker-compose, not localhost)
- Database: `zuk`
- User: `zuk`
- Password: `zuk_prototype_2026`
- Port: `5432`
- SSL: disable

Click Save. n8n will test the connection automatically.

Open both `Insert: Ready for Review` and `Insert: Needs Info` nodes and select
this credential.

### 3b. OpenAI

In n8n: Credentials -> New -> OpenAI. Paste your API key from
https://platform.openai.com/api-keys. Assign to the `OpenAI Chat Model` node.

The workflow uses `gpt-4o-mini` by default. To switch to `gpt-4o`, open the
node and change the model from the dropdown. No reimport needed.

### 3c. Microsoft Outlook OAuth2

This is the longest setup, around ten minutes the first time.

1. Go to https://entra.microsoft.com signed in with the project's outlook.com
   account. You need an Entra directory; if you do not have one, sign up for the
   free Azure tier at https://azure.microsoft.com/free (no charges, only used to
   create the tenant).
2. Identity -> Applications -> App registrations -> New registration.
3. Name: `n8n-zuk-prototype`. Account types: `Accounts in any organizational
   directory and personal Microsoft accounts`. Redirect URI: `Web`, value
   `http://localhost:5678/rest/oauth2-credential/callback`. Register.
4. Copy the Application (client) ID from the Overview page.
5. Certificates and secrets -> New client secret. Copy the Value immediately
   (it only shows once).
6. API permissions -> Add permission -> Microsoft Graph -> Delegated. Add
   `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `offline_access`. Keep `User.Read`.
7. In n8n: Credentials -> New -> Microsoft Outlook OAuth2. Paste client ID and
   client secret. Click Sign in with Microsoft, authorize with the
   outlook.com account.
8. Assign to the trigger and both draft nodes.

## Step 4: Test

Send a test email to the connected Outlook inbox. The most useful
test cases:

- One email with two or three booking requests at once (the "Frau Baggi"
  pattern from the interview).
- One email with missing information (no date, no number of people).
- One email mentioning allergies or a named person's health condition (tests
  the sensitive data flag).

Trigger the workflow with Execute Workflow while the trigger is in test mode,
or activate it with the toggle in the top right.

Confirm that drafts appear in Outlook's Drafts folder and rows appear in the
`inquiries` table. To inspect the database:

```
docker exec -it zuk-postgres psql -U zuk -d zuk -c "SELECT id, tracker_status, school_name, date_range FROM inquiries ORDER BY id DESC LIMIT 10;"
```

## Database schema

Created by `init.sql` on first startup. Five tables:

- `inquiries` (used by v1): every booking request extracted from an email.
- `schools` (v2): catalog of returning schools, for the lookup case.
- `houses` (v2, seeded with the two ZUK buildings): physical houses.
- `rooms` (v2): individual rooms per house, for the availability check.
- `bookings` (v2): confirmed reservations, linked to inquiries and schools.

Only `inquiries` is written to in v1. The others exist so the schema is stable
when you build availability check, school lookup, and the dashboard next.

To change the schema: edit `init.sql`, then run `docker compose down -v && docker compose up -d` to recreate the volume. This deletes existing data.

## Notes and known caveats

- Outlook field names may vary slightly between n8n versions. Run the trigger
  once and adjust the Normalize Email Fields node if needed.
- The prototype uses `bodyPreview` (short) for speed. Switch to `body.content`
  in Normalize Email Fields if you need full HTML body.
- Split Requests assumes the parsed result lives under `output`. Run Extract
  once and adjust `fieldToSplitOut` if your version differs.
- OpenAI model temperature is 0 for consistent extraction.

## Why this stack matches the project plan

- n8n: orchestrates the workflow with native AI Agent and Outlook nodes, runs
  self-hosted via Docker (GDPR aligned).
- Postgres: shared state for inquiries today, full booking model for the
  dashboard and availability check next.
- OpenAI GPT-4o-mini: low cost per email, capable enough for structured
  German extraction. Upgrade to GPT-4o at the click of a dropdown if quality
  needs justify it.
- Outlook API: the inbox channel the customer already uses. Same code path
  for personal and tenant accounts.

## Next steps (not in v1)

- Availability check against the rooms and bookings tables, before the draft
  is created.
- Seasonal logic (Orientierungstage Oct-May, Schullandheim summer May-Oct).
- LLM-written drafts in German instead of static templates.
- School lookup against the schools table for returning customers.
- Call transcription branch: Whisper transcribes audio, feeds into the same
  extraction node. Inquiries from calls live in the same `inquiries` table,
  enabling context linking with email inquiries from the same school.
- Next.js Staff Dashboard reading from `inquiries` and writing approvals back.
