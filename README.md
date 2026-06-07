# Bosco Hub — ZUK Staff Dashboard (Next.js)

Dashboard for the reception team of Don Bosco / Kloster Benediktbeuern.
It shows the **inquiries** (Anfragen) that the **n8n** agent automatically extracts
from incoming emails, so the team can review them, assign them and turn them into
bookings.

> Built from the design prototype (folder `design-reference/`), ported to Next.js
> while keeping **exactly the same UI**.

## How it all fits together (the n8n connection)

```
   Outlook (emails)
        │
        ▼
   ┌─────────────┐   AI extraction     ┌──────────────┐   read/write    ┌────────────────┐
   │    n8n      │ ──────────────────▶ │  Postgres    │ ◀────────────── │  Dashboard     │
   │  workflow   │   INSERT inquiries  │  (inquiries  │                 │  Next.js       │
   │             │                     │   table)     │   this repo     │  (Bosco_Hub)   │
   └─────────────┘                     └──────────────┘                 └────────────────┘
```

The **`inquiries` table in Postgres is the meeting point**: n8n writes what it
extracts from each email, and this dashboard reads from the same table and writes
back (assignments, field edits, "booking created" status).

The n8n workflow, the `docker-compose` and the `init.sql` live in the
[`n8n/`](./n8n) folder of this same repo.

## Requirements

- Node.js 18+ (tested with Node 25)
- Docker Desktop (for Postgres + n8n)

## Run locally

**1. Start Postgres (and n8n) — from the workflow folder:**

```bash
cd n8n
docker compose up -d
```

Postgres listens on `localhost:5434`, n8n on `localhost:5678`.

**2. (Optional) demo data, to see the dashboard populated without real emails:**

```bash
PGPASSWORD=zuk_prototype_2026 psql -h localhost -p 5434 -U zuk -d zuk -f db/seed.sql
```

> The dashboard normally fills itself with whatever n8n extracts from emails.
> This seed is only for demos. To remove it:
> `DELETE FROM inquiries WHERE conversation_id LIKE 'demo-%';`

**3. Install dependencies and start the dashboard:**

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The database connection lives in `.env.local` (`DATABASE_URL`). If you change the
docker credentials, update that file.

## Structure

```
app/
  page.js                  Main page — the Team-Posteingang (reads Postgres)
  inquiry/[id]/page.js     Detail of one inquiry (or "split" view if the email had several)
  buchungen/page.js        "Buchungen / Hausmanager" view (bookings grouped by house)
  api/inquiries/route.js                   GET list of inquiries
  api/inquiries/[id]/route.js              GET one / PATCH (assign, edit field)
  api/inquiries/[id]/booking/route.js      POST create a real booking in `bookings`
  api/inquiries/[id]/confirmation/route.js POST customer confirmation (→ n8n webhook)
  globals.css              Styles (copied verbatim from the prototype)
  layout.js                Root layout + fonts
components/
  Inbox.js, Detail.js, SplitDetail.js   The inquiry screens (client components)
  BookingsView.js          Bookings list grouped by house (Hausmanager)
  ConfirmationPanel.js     Editable draft + send confirmation to the customer
  Header.js, AssignControl.js, UserSwitcher.js
  ui.js, icons.js          Base components ported from shared.jsx
lib/
  db.js                    Postgres connection pool
  inquiries.js             Queries + DB row → UI shape mapping + create booking
  bookings.js              Reads bookings for the Buchungen view
  confirmation.js          Builds the confirmation draft (template)
  staff.js                 Team (`staff` table) and current user (cookie)
  team.js                  Area colors and the "suggested person" rule
db/
  seed.sql                 Demo data (the German sample inquiries)
n8n/
  docker-compose.yml       Starts Postgres (5434) + n8n (5678). name: zuk_proto
  init.sql                 Database schema
  zuk_email_agent_prototype_v1.json   The importable n8n workflow (email → Postgres)
  zuk_send_email.json      Small workflow: webhook → Outlook send (customer confirmation)
  README-n8n.md            Detailed n8n guide (Outlook/OpenAI/Postgres credentials)
design-reference/          The original prototype (HTML/JSX) — reference only
```

## How a piece of data flows

1. n8n receives an email, the AI extracts the fields and `INSERT`s into `inquiries`
   (with `tracker_status` = `ready_for_review` or `needs_info`).
2. The dashboard reads those rows in `app/page.js` (Server Component) → `lib/inquiries.js`.
3. Each row is translated into the "shape" the components expect (`rowToItem`).
4. The team assigns / edits / creates a booking → `PATCH`/`POST /api/inquiries/:id` → `UPDATE`/`INSERT` in Postgres.

## Columns added to `inquiries` for the dashboard

On top of n8n's original schema we added (already reflected in `init.sql`):

| column                 | purpose |
|------------------------|---------|
| `channel`              | `'email'` or `'phone'` (color rail in the inbox) |
| `assigned_to`          | team member assigned from the dashboard |
| `summary`              | the agent's summary for the staff |
| `raw_body`             | original email text (detail "source" panel) |
| `confirmation_sent_at` | when the customer confirmation was sent |

The n8n workflow (`zuk_email_agent_prototype_v1.json`) already fills `channel`,
`summary` and `raw_body` in its INSERT nodes.

## Where do you change things? (3 places)

The project has **3 pieces** and each one is edited in a different place:

| Piece | What it is | Where you change it |
|-------|------------|---------------------|
| **Postgres** (database) | Where the data lives: `inquiries`, `staff`, `bookings`, `houses`. Both n8n and the dashboard read/write here. | With SQL: `psql` (or editing `n8n/init.sql` for a clean start). |
| **n8n** (`localhost:5678`) | The "robot" that reads Outlook emails, understands them with AI and puts them into Postgres. Runs in Docker, separate from the dashboard. | In its visual UI (drag/edit nodes) or by re-importing `n8n/zuk_email_agent_prototype_v1.json`. |
| **Dashboard** (this repo, `localhost:3000`) | The interface the team sees. | By editing the code (`app/`, `components/`, `lib/`). |

Examples:

- **Add/edit a team member** → SQL on the `staff` table:
  ```bash
  PGPASSWORD=zuk_prototype_2026 psql -h localhost -p 5434 -U zuk -d zuk \
    -c "INSERT INTO staff (key,name,short,area) VALUES ('mara','Mara Vogel','MV','Seminare & Web');"
  ```
- **Change how the AI understands emails** → "Extract Booking Requests" node in n8n.
- **Change the look/behavior of the dashboard** → code in `components/`.

## Customer confirmation (how it works)

The confirmation back to the customer is **human-in-the-loop**: the dashboard
pre-fills a German draft, the staff reviews/edits it and clicks send. The email is
sent through n8n (which already has the Outlook connection):

```
Dashboard ("Senden") → POST /api/inquiries/:id/confirmation
   → n8n webhook /webhook/zuk-send-email (workflow "ZUK - Send Confirmation Email")
   → Outlook sends to the customer
```

The `ZUK - Send Confirmation Email` workflow must be **Published (active)** in n8n
for the webhook to exist. Its URL base is configured via `N8N_BASE_URL` in `.env.local`.

## Next steps (v2)

- Real availability check against `rooms` / `bookings` (the "Platz frei / eng / voll"
  verdicts in the split view).
- Call transcription (Whisper) → same `inquiries` table with `channel = 'phone'`.
- AI-written "Rückfrage" (follow-up asking for missing data) — this is where the AI
  adds more value than in the formulaic confirmation.
- Booking status lifecycle (Anfrage → bestätigt → Vertrag → bezahlt).
- Real team login (today the current user is a simple switcher, see `lib/staff.js`).
