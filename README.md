# Bosco Hub — ZUK Staff Dashboard (Next.js)

Dashboard for the reception team of Don Bosco / Kloster Benediktbeuern.
It shows the **inquiries** (Anfragen) that the **n8n** agent automatically extracts
from incoming emails, so the team can review them, assign them and turn them into
bookings.


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

## Getting started (step by step)

### 0. Install the two tools you need (once)

- **Docker Desktop** — runs the database and n8n: <https://www.docker.com/products/docker-desktop/>
  After installing, **open Docker Desktop and wait until it says "Running".**
- **Node.js** (LTS version) — runs the dashboard: <https://nodejs.org/>

You can check they are installed with:

```bash
docker --version
node --version
```

If both print a version number, you are good.

### 1. Get the code

```bash
git clone <REPO-URL>
cd Bosco_Hub
```

(If you already have the folder, just `cd` into it and run `git pull`.)

### 2. Create the settings file

The app reads its database settings from a file called `.env.local`. It is not in
git, so you create it once by copying the example:

```bash
cp .env.example .env.local
```

> On Windows PowerShell use `copy .env.example .env.local` instead.

### 3. Start the database and n8n (Docker)

```bash
cd n8n
docker compose up -d
cd ..
```

This starts two things in the background: **Postgres** (the database, on port 5434)
and **n8n** (the automation tool, on port 5678). The first time it may take a
couple of minutes while it downloads.

✅ Check: in Docker Desktop you should see two green containers, `zuk-postgres`
and `zuk-n8n`.

### 4. (Optional) Load demo data

So the dashboard isn't empty before real emails arrive, you can load sample
inquiries:

```bash
docker exec -i zuk-postgres psql -U zuk -d zuk < db/seed.sql
```

> To remove the demo data later:
> `docker exec -i zuk-postgres psql -U zuk -d zuk -c "DELETE FROM inquiries WHERE conversation_id LIKE 'demo-%';"`

### 5. Start the dashboard

```bash
npm install
npm run dev
```

`npm install` is only needed the first time (and after someone changes the
dependencies). `npm run dev` starts the dashboard.

Open **<http://localhost:3000>** in your browser — you should see the
**Team-Posteingang**.

> If the page says *"Keine Verbindung zur Datenbank"*, Docker isn't running.
> Open Docker Desktop and re-run step 3.

### To stop everything

- Stop the dashboard: press `Ctrl + C` in the terminal running `npm run dev`.
- Stop Docker: `cd n8n && docker compose down` (your data is kept).

---

### Process real emails (advanced — usually one person sets this up)

To make **real emails** flow in automatically, n8n needs three credentials (Outlook, OpenAI, Postgres) and the
workflows must be imported and activated. This is the longer part and is explained
step by step in [`n8n/README-n8n.md`](./n8n/README-n8n.md).

Short version, inside n8n (<http://localhost:5678>):

1. Create the owner account when first asked (any email + a password you remember).
2. Create the 3 credentials (see the n8n guide for details).
3. Import the two workflow files from the `n8n/` folder
   (`zuk_email_agent_prototype_v1.json` and `zuk_send_email.json`), and make sure
   each node uses your credentials.
4. **Publish** both workflows to activate them.

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


## Where do you change things? (3 places)

The project has **3 pieces** and each one is edited in a different place:

| Piece | What it is | Where you change it |
|-------|------------|---------------------|
| **Postgres** (database) | Where the data lives: `inquiries`, `staff`, `bookings`, `houses`. Both n8n and the dashboard read/write here. | With SQL: `psql` (or editing `n8n/init.sql` for a clean start). |
| **n8n** (`localhost:5678`) | The "robot" that reads Outlook emails, understands them with AI and puts them into Postgres. Runs in Docker, separate from the dashboard. | In its visual UI (drag/edit nodes) or by re-importing `n8n/zuk_email_agent_prototype_v1.json`. |
| **Dashboard** (this repo, `localhost:3000`) | The interface the team sees. | By editing the code (`app/`, `components/`, `lib/`). |


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

