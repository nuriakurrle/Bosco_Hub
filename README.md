# Bosco Hub — ZUK Staff Dashboard (Next.js)

Dashboard del equipo de recepción de Don Bosco / Kloster Benediktbeuern.
Muestra las **inquiries** (anfragen) que el agente de **n8n** extrae automáticamente
de los emails, para que el equipo las revise, asigne y convierta en reservas.

> Hecho a partir del prototipo de diseño de la compañera (carpeta
> `design-reference/`), portado a Next.js manteniendo **exactamente el mismo UI**.

## Cómo encaja todo (la conexión con n8n)

```
   Outlook (emails)
        │
        ▼
   ┌─────────────┐   extrae con IA      ┌──────────────┐   lee/escribe   ┌────────────────┐
   │    n8n      │ ───────────────────▶ │  Postgres    │ ◀────────────── │  Dashboard     │
   │  workflow   │   INSERT inquiries   │  (tabla      │                 │  Next.js       │
   │             │                      │  inquiries)  │   este repo     │  (Bosco_Hub)   │
   └─────────────┘                      └──────────────┘                 └────────────────┘
```

La **tabla `inquiries` de Postgres es el punto de unión**: n8n escribe ahí lo que
extrae de cada email, y este dashboard lee de la misma tabla y escribe de vuelta
(asignaciones, edición de campos, estado "reserva creada").

El workflow de n8n, el `docker-compose` y el `init.sql` viven en la carpeta
[`n8n/`](./n8n) de este mismo repo.

## Requisitos

- Node.js 18+ (probado con Node 25)
- Docker Desktop (para Postgres + n8n)

## Arrancar en local

**1. Levanta Postgres (y n8n) — desde la carpeta del workflow:**

```bash
cd n8n
docker compose up -d
```

Postgres queda en `localhost:5434`, n8n en `localhost:5678`.

**2. (Opcional) datos de demo para ver el dashboard poblado sin emails reales:**

```bash
PGPASSWORD=zuk_prototype_2026 psql -h localhost -p 5434 -U zuk -d zuk -f db/seed.sql
```

> El dashboard normalmente se llena solo con lo que n8n extrae de los emails.
> Este seed es solo para demos. Para quitarlo:
> `DELETE FROM inquiries WHERE conversation_id LIKE 'demo-%';`

**3. Instala dependencias y arranca el dashboard:**

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

La conexión a la base de datos está en `.env.local` (`DATABASE_URL`). Si cambias
las credenciales del docker, ajusta ese archivo.

## Estructura

```
app/
  page.js                  Página principal — el Team-Posteingang (lee Postgres)
  inquiry/[id]/page.js     Detalle de una anfrage (o vista "split" si la email tenía varias)
  buchungen/page.js        Vista "Buchungen / Hausmanager" (reservas por casa)
  api/inquiries/route.js                   GET lista de inquiries
  api/inquiries/[id]/route.js              GET una / PATCH (asignar, editar campo)
  api/inquiries/[id]/booking/route.js      POST crear reserva real en `bookings`
  api/inquiries/[id]/confirmation/route.js POST confirmación al cliente (→ webhook n8n)
  globals.css              Estilos (copiados tal cual del prototipo)
  layout.js                Layout raíz + fuentes
components/
  Inbox.js, Detail.js, SplitDetail.js   Las pantallas de anfragen (client)
  BookingsView.js          Lista de reservas por casa (Hausmanager)
  ConfirmationPanel.js     Borrador editable + enviar confirmación al cliente
  Header.js, AssignControl.js, UserSwitcher.js
  ui.js, icons.js          Componentes base portados de shared.jsx
lib/
  db.js                    Pool de conexión a Postgres
  inquiries.js             Consultas + mapeo fila DB → forma de la UI + crear reserva
  bookings.js              Lectura de reservas para la vista Buchungen
  confirmation.js          Genera el borrador de confirmación (plantilla)
  staff.js                 Equipo (tabla `staff`) y usuario actual (cookie)
  team.js                  Colores de área y regla de "persona sugerida"
db/
  seed.sql                 Datos de demostración (los ejemplos en alemán)
n8n/
  docker-compose.yml       Levanta Postgres (5434) + n8n (5678). name: zuk_proto
  init.sql                 Esquema de la base de datos
  zuk_email_agent_prototype_v1.json   El workflow importable en n8n
  README-n8n.md            Guía detallada de n8n (credenciales Outlook/OpenAI/Postgres)
design-reference/          El prototipo original (HTML/JSX) — solo referencia
```

## Cómo fluye un dato

1. n8n recibe un email, la IA extrae los campos y hace `INSERT` en `inquiries`
   (con `tracker_status` = `ready_for_review` o `needs_info`).
2. El dashboard lee esas filas en `app/page.js` (Server Component) → `lib/inquiries.js`.
3. Cada fila se traduce a la "forma" que esperan los componentes (`rowToItem`).
4. El equipo asigna / edita / crea reserva → `PATCH /api/inquiries/:id` → `UPDATE` en Postgres.

## Columnas añadidas a `inquiries` para el dashboard

Sobre el esquema original de n8n se agregaron (ya reflejadas en `init.sql`):

| columna       | para qué |
|---------------|----------|
| `channel`     | `'email'` o `'phone'` (riel de color en la bandeja) |
| `assigned_to` | persona del equipo asignada desde el dashboard |
| `summary`     | resumen del agente para el staff |
| `raw_body`    | texto original del email (panel "fuente" del detalle) |

El workflow de n8n (`zuk_email_agent_prototype_v1.json`) ya rellena `channel`,
`summary` y `raw_body` en sus nodos de INSERT.

## ¿Dónde se cambia cada cosa? (3 lugares)

El proyecto tiene **3 piezas** y cada una se edita en un lugar distinto:

| Pieza | Qué es | Dónde se cambia |
|-------|--------|-----------------|
| **Postgres** (base de datos) | Donde viven los datos: `inquiries`, `staff`, `bookings`, `houses`. Tanto n8n como el dashboard leen/escriben aquí. | Con SQL: `psql` (o editando `n8n/init.sql` para un arranque limpio). |
| **n8n** (`localhost:5678`) | El "robot" que lee los emails de Outlook, los entiende con IA y los mete a Postgres. Corre en Docker, aparte del dashboard. | En su interfaz visual (arrastrar/editar nodos) o re-importando `n8n/zuk_email_agent_prototype_v1.json`. |
| **Dashboard** (este repo, `localhost:3000`) | La interfaz que ve el equipo. | Editando el código (`app/`, `components/`, `lib/`). |

Ejemplos:

- **Agregar/editar una persona del equipo** → SQL en la tabla `staff`:
  ```bash
  PGPASSWORD=zuk_prototype_2026 psql -h localhost -p 5434 -U zuk -d zuk \
    -c "INSERT INTO staff (key,name,short,area) VALUES ('mara','Mara Vogel','MV','Seminare & Web');"
  ```
- **Cambiar cómo la IA entiende los emails** → nodo "Extract Booking Requests" en n8n.
- **Cambiar el aspecto/comportamiento del dashboard** → código en `components/`.

## Próximos pasos (v2)

- Verificación de disponibilidad real contra `rooms` / `bookings` (los veredictos
  "Platz frei / eng / voll" de la vista split).
- Transcripción de llamadas (Whisper) → mismas `inquiries` con `channel = 'phone'`.
- Borrador de "Rückfrage" disparado desde el dashboard hacia n8n (webhook).
- Login real del equipo (hoy el usuario está fijo en `lib/team.js`).
