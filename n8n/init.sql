-- ============================================================
-- ZUK Booking Agent - Database schema (v1)
-- ============================================================
-- Runs automatically the first time the Postgres container starts.
-- If you change this file later, you must reset the database:
--   docker compose down -v
--   docker compose up -d
-- The -v flag deletes the volume so the script runs again.

-- ----------------------------------------------------------------
-- SCHOOLS
-- Catalog of schools and contacts known to the system. Empty in v1.
-- v2 will populate this from historical data so the workflow can
-- recognise returning customers (the "Frau Baggi" case in the
-- interview transcript).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    primary_email   TEXT,
    primary_contact TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, primary_email)
);

CREATE INDEX IF NOT EXISTS idx_schools_email ON schools (primary_email);

-- ----------------------------------------------------------------
-- HOUSES + ROOMS
-- Physical capacity of the two ZUK houses. Empty in v1.
-- v2 will use these tables for the availability check before the
-- workflow generates a draft.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS houses (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS rooms (
    id              SERIAL PRIMARY KEY,
    house_id        INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    floor           INTEGER,
    capacity        INTEGER NOT NULL,
    has_bathroom    BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    UNIQUE (house_id, label)
);

-- ----------------------------------------------------------------
-- INQUIRIES
-- The central table for v1. Every booking request extracted from an
-- email lands here. One incoming email may produce several rows
-- (one per request found by the LLM).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
    id                       SERIAL PRIMARY KEY,
    received_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tracker_status           TEXT NOT NULL,
    responsible_area         TEXT,
    customer_email           TEXT,
    original_subject         TEXT,
    conversation_id          TEXT,
    school_name              TEXT,
    contact_person           TEXT,
    program_type             TEXT,
    house                    TEXT,
    date_range               TEXT,
    number_of_people         TEXT,
    grade_level              TEXT,
    special_requirements     TEXT,
    board_type               TEXT,   -- Verpflegung (Frühstück/Halbpension/Vollpension/Selbstversorgung/Keine)
    missing_fields           TEXT,
    contains_sensitive_data  BOOLEAN DEFAULT FALSE,
    sensitive_data_note      TEXT,
    school_id                INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Columns used by the Next.js dashboard (Bosco_Hub):
    channel                  TEXT NOT NULL DEFAULT 'email',  -- 'email' | 'phone'
    email_type               TEXT NOT NULL DEFAULT 'booking', -- 'booking' (Buchungsanfrage) | 'other' (sonstige Mail)
    assigned_to              TEXT,                            -- team member assigned in the dashboard
    summary                  TEXT,                            -- the agent's summary for the staff
    raw_body                 TEXT,                            -- original email text (for the "source" panel)
    confirmation_sent_at     TIMESTAMPTZ                      -- when the customer confirmation was sent
);

-- Für bestehende Datenbanken (CREATE TABLE läuft nur beim ersten Start).
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS email_type TEXT NOT NULL DEFAULT 'booking';
-- Verpflegung: kann in der Anfrage fehlen (NULL), wird im Dashboard nachgetragen.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS board_type TEXT;
-- Telefonie: Twilio CallSid (Verknüpfung zur Aufnahme) + URL der Aufnahme.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS call_sid TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS recording_url TEXT;
CREATE INDEX IF NOT EXISTS idx_inquiries_call_sid ON inquiries (call_sid);

CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries (tracker_status);
CREATE INDEX IF NOT EXISTS idx_inquiries_received   ON inquiries (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_school     ON inquiries (school_name);
CREATE INDEX IF NOT EXISTS idx_inquiries_emailtype  ON inquiries (email_type);

-- ----------------------------------------------------------------
-- BOOKINGS
-- Confirmed reservations, linked to an inquiry and to a school.
-- Empty in v1. Created here so the schema is stable from the start.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id              SERIAL PRIMARY KEY,
    inquiry_id      INTEGER REFERENCES inquiries(id) ON DELETE SET NULL,
    school_id       INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    house_id        INTEGER REFERENCES houses(id) ON DELETE SET NULL,
    -- Dates may be empty: the AI sometimes gives the range as free text
    -- (e.g. "Mitte Oktober"). We store the original text and the concrete
    -- dates when they can be parsed.
    start_date      DATE,
    end_date        DATE,
    date_range_text TEXT,
    number_of_people INTEGER,
    group_label     TEXT,
    contact_person  TEXT,
    program_type    TEXT,
    board_type      TEXT,   -- Verpflegung (aus der Anfrage übernommen → Küchenplan)
    status          TEXT NOT NULL DEFAULT 'reserved',
    contract_sent   BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_house ON bookings (house_id);

-- ----------------------------------------------------------------
-- STAFF
-- Reception team. It used to be hardcoded in the dashboard's lib/team.js;
-- now it lives here so it can be edited without touching code.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
    key        TEXT PRIMARY KEY,           -- short identifier, e.g. 'vanessa'
    name       TEXT NOT NULL,
    short      TEXT NOT NULL,              -- initials for the avatar
    area       TEXT,                       -- area they handle (used to suggest assignment)
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Seed data: the two ZUK houses and the initial team.
-- ----------------------------------------------------------------
INSERT INTO houses (name, description) VALUES
    ('Bildungszentrum', 'Bildungs-/Seminarhaus mit Übernachtung (vormals Jugendherberge)'),
    ('Gästehaus', 'Gästehaus mit Zimmern (vormals Aktionszentrum)'),
    ('Zeltplatz', 'Zeltplatz mit 4 Gruppenzelten (outdoor / Sommer)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO staff (key, name, short, area) VALUES
    ('vanessa', 'Vanessa Berger', 'VB', 'Bildungszentrum'),
    ('andrea',  'Andrea Sturm',   'AS', 'Gästehaus'),
    ('steffi',  'Steffi Lang',    'SL', 'Seminare & Web')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------
-- NOTES
-- Team-Notizen: Übergabe pro Vorgang ("angerufen, wartet auf Zahlen") und
-- zugleich schulbezogenes Wissen ("reine Mädchenklasse"). Eine Notiz hängt an
-- einem Inquiry UND trägt den Schulnamen, damit sie bei Wiederkehrern derselben
-- Schule wieder auftaucht.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
    id          SERIAL PRIMARY KEY,
    inquiry_id  INTEGER REFERENCES inquiries(id) ON DELETE SET NULL,
    school_name TEXT,
    author      TEXT,                      -- staff key
    body        TEXT NOT NULL,
    pinned      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_inquiry ON notes (inquiry_id);
CREATE INDEX IF NOT EXISTS idx_notes_school  ON notes (school_name);

-- ----------------------------------------------------------------
-- Vertrags-Status je Buchung (für die Verträge-Section: Entwurf →
-- versendet → bestätigt, mit Frist relativ zum Aufenthalt).
-- ----------------------------------------------------------------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contract_status  TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contract_sent_at TIMESTAMPTZ;
-- Verpflegung der Buchung (aus der Anfrage übernommen → Küchenplan).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS board_type TEXT;
-- Angepasster Vertragstext (NULL = aus Buchungsdaten generieren, sonst der
-- im Dashboard bearbeitete und gespeicherte Entwurf).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contract_text    TEXT;

-- ----------------------------------------------------------------
-- Referenten-Skills: welche Formate eine Person betreuen kann
-- (Interview: "spezielle Schulung für Floss/Hütte", "5 Referenten parallel").
-- ----------------------------------------------------------------
ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills TEXT;  -- kommasepariert
UPDATE staff SET skills='schullandheim,sommerfreizeit,orientierung' WHERE key='vanessa' AND skills IS NULL;
UPDATE staff SET skills='orientierung,besinnung,umwelt'             WHERE key='andrea'  AND skills IS NULL;
UPDATE staff SET skills='seminar,gruppenleiter,orientierung'        WHERE key='steffi'  AND skills IS NULL;

-- ----------------------------------------------------------------
-- Vorbereitungs-Aufgaben je Buchung (Timeline T-8/T-4/T-2/T-1):
-- abgeleitete Standardaufgaben, hier nur der Erledigt-Status.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_tasks (
    id         SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    task_key   TEXT NOT NULL,
    done       BOOLEAN NOT NULL DEFAULT FALSE,
    done_at    TIMESTAMPTZ,
    done_by    TEXT,
    UNIQUE (booking_id, task_key)
);
