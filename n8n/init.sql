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
    missing_fields           TEXT,
    contains_sensitive_data  BOOLEAN DEFAULT FALSE,
    sensitive_data_note      TEXT,
    school_id                INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Columnas usadas por el dashboard Next.js (Bosco_Hub):
    channel                  TEXT NOT NULL DEFAULT 'email',  -- 'email' | 'phone'
    assigned_to              TEXT,                            -- persona del equipo asignada en el dashboard
    summary                  TEXT,                            -- resumen del agente para el staff
    raw_body                 TEXT,                            -- texto original del email (para el panel "fuente")
    confirmation_sent_at     TIMESTAMPTZ                      -- cuándo se envió la confirmación al cliente
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries (tracker_status);
CREATE INDEX IF NOT EXISTS idx_inquiries_received   ON inquiries (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_school     ON inquiries (school_name);

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
    -- Las fechas pueden ir vacías: la IA a veces da el rango en texto libre
    -- (p.ej. "Mitte Oktober"). Guardamos el texto original y las fechas
    -- concretas cuando se pueden parsear.
    start_date      DATE,
    end_date        DATE,
    date_range_text TEXT,
    number_of_people INTEGER,
    group_label     TEXT,
    contact_person  TEXT,
    program_type    TEXT,
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
-- Equipo de recepción. Antes estaba hardcodeado en lib/team.js del
-- dashboard; ahora vive aquí para poder editarlo sin tocar código.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
    key        TEXT PRIMARY KEY,           -- identificador corto, p.ej. 'vanessa'
    name       TEXT NOT NULL,
    short      TEXT NOT NULL,              -- iniciales para el avatar
    area       TEXT,                       -- área que atiende (para sugerir asignación)
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Seed data: las dos casas ZUK y el equipo inicial.
-- ----------------------------------------------------------------
INSERT INTO houses (name, description) VALUES
    ('Jugendherberge', 'Youth hostel with shared bathrooms on each floor'),
    ('Aktionszentrum', 'Educational center with private bathrooms in rooms')
ON CONFLICT (name) DO NOTHING;

INSERT INTO staff (key, name, short, area) VALUES
    ('vanessa', 'Vanessa Berger', 'VB', 'Jugendherberge'),
    ('andrea',  'Andrea Sturm',   'AS', 'Aktionszentrum'),
    ('steffi',  'Steffi Lang',    'SL', 'Seminare & Web')
ON CONFLICT (key) DO NOTHING;
