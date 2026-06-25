# Arquitectura — Bosco Hub

Mapa del sistema: qué piezas hay, dónde está la IA y dónde son reglas, y qué está
hecho vs. pendiente. Pensado también como guion para presentar el proyecto.

> Filosofía (lo que pidió el cliente): **"agent assisting staff, not replacing"**.
> La IA hace lo difícil de parsear (lenguaje → datos); las reglas hacen la lógica
> determinista; **el humano decide**. Aumentar, no automatizar.

---

## 1. Piezas en ejecución

```
                       ┌──────────────────────────────┐
   E-mails (Outlook) ─►│  n8n  (workflow)             │─┐
                       │  IA: gpt-4o + output parser   │ │ INSERT
                       └──────────────────────────────┘ │
                                                         ▼
                                            ┌────────────────────┐
                                            │  Postgres          │◄──┐
                                            │  tabla `inquiries` │   │ lee / escribe
                                            └────────────────────┘   │
                                                         ▲           │
                       ┌──────────────────────────────┐ │ INSERT    │
   Llamadas (Twilio) ─►│  live-call (microservicio)   │─┘ (phone)   │
                       │  IA: Realtime STT + gpt-4o    │             │
                       └──────────────────────────────┘             │
                                                         ┌───────────┴────────┐
                                                         │  Dashboard Next.js │
                                                         │  reglas + UI (HITL)│
                                                         └────────────────────┘
```

| Pieza | Qué es | Tecnología |
|-------|--------|------------|
| **n8n** | Lee los e-mails de Outlook, extrae los datos con IA e inserta en `inquiries`. Tambien envía e-mails salientes. | n8n + LangChain + OpenAI |
| **Dashboard** | La interfaz del equipo: Posteingang, detalle, capacidad, contratos, calendario, consola de llamada. | Next.js (App Router) |
| **live-call** | Microservicio que transcribe llamadas en vivo y extrae campos. | Node + WebSocket + OpenAI |
| **Postgres** | Punto de encuentro: e-mail y teléfono acaban en la misma tabla `inquiries`. | PostgreSQL |

La **tabla `inquiries` es el centro**: una llamada termina exactamente donde termina
un e-mail (una fila). El dashboard, el flujo de reserva y el de confirmación tratan
ambos canales igual.

---

## 2. Las 3 capas (cómo encajan los "11 agentes")

La tabla de 11 agentes del cliente es el **mapa conceptual**. En la práctica viven
en tres capas según lo que realmente hacen:

```
┌─ Capa 1 · IA (lenguaje → datos) ─────────────────── LLM
│   E-Mail Intake · Phone Transcription · (generación de texto)
├─ Capa 2 · Motor de reglas (lógica → decisión asistida) ─ determinista
│   Duplicates · Customer Lookup · Capacity · Bedroom ·
│   Program · Suggestion · Contract · Watchdog
└─ Capa 3 · Aprobación humana (quien decide) ──────── HITL
    "Anfrage anlegen" · "Vertrag freigeben" · enviar confirmación
```

**Por qué la lógica son reglas y no LLM:** determinismo (27 camas son 27 camas),
coste y latencia (se ejecutan constantemente), auditabilidad (se puede explicar el
porqué) y DSGVO (menos datos sensibles a un modelo externo).

---

## 3. Dónde está la IA (solo 3 puntos LLM, todo OpenAI)

| # | Dónde | Modelo | Para qué |
|---|-------|--------|----------|
| 1 | **n8n** (`n8n/zuk_email_agent_prototype_v1.json`) | gpt-4o + structured output | E-mail → campos de la Anfrage |
| 2 | **live-call** (`live-call/server.js`, `extract.js`) | Realtime STT (`gpt-realtime-whisper`) + gpt-4o | Llamada en vivo → transcripción + campos |
| 3 | **lib/transcribe.js** (`/api/live-call/transcribe`) | Whisper + gpt-4o | Archivo de audio → transcripción + campos |

Todo lo demás es lógica determinista en `lib/`.

> **Fuente única de la extracción de llamada.** El prompt + esquema de extracción
> de campos de una llamada viven en UN solo sitio: `live-call/extract.js`. El
> microservicio lo usa directo y el dashboard lo re-exporta desde `lib/transcribe.js`.
> (El agente de e-mail en n8n usa otro esquema —varias reservas, columnas de BD— a
> propósito, porque su canal y su salida son distintos.)

---

## 4. Mapa de los 11 agentes → implementación real

| Fase / Agente | Implementación | ¿LLM? |
|---|---|---|
| **Analyze** · E-Mail Intake | n8n gpt-4o | ✅ |
| Phone Transcription | live-call Realtime/Whisper | ✅ |
| Duplicate Detection | `lib/duplicates.js` (similitud Jaccard + fechas) | ❌ reglas |
| Customer Lookup | `lib/history.js`, `lib/related.js` (SQL) | ❌ reglas |
| **Decide/Reason** · Capacity | `lib/availability.js` (camas/cupos) | ❌ reglas |
| Bedroom Logic | `lib/availability.js` `parseGender` (parcial) | ❌ reglas |
| Program Compatibility | `lib/availability.js` `seasonRuleFor` | ❌ reglas |
| Suggestion | `lib/availability.js` `suggestInSeason/Shift` | ❌ reglas |
| **Generate** · Contract | `lib/contract.js` (plantilla con huecos) | ❌ plantilla |
| Reminder / Follow-up | `lib/followup.js` (plantilla) | ❌ plantilla |
| **Support** · Watchdog | `lib/inquiries.js` `waitingDays` + orden por urgencia | ❌ reglas |

---

## 5. Flujos de e-mail saliente (estado actual)

| Flujo | Estado | Detalle |
|-------|--------|---------|
| **Confirmación** | ✅ Cableado | `ConfirmationPanel` → `POST /api/inquiries/[id]/confirmation` → webhook n8n `zuk-send-email` → Outlook. Requiere el workflow *"ZUK - Send Confirmation Email"* activo y la credencial de Outlook autorizada en n8n. |
| **Rückfrage / follow-up** (datos faltantes) | ✅ Cableado | `FollowUpPanel` → `POST /api/inquiries/[id]/followup` → mismo webhook `zuk-send-email`. Mismas condiciones que la confirmación (workflow activo + Outlook). |
| **Contrato (PDF)** | ✅ Cableado | `ContractsView` "versenden" → `POST /api/bookings/[id]/contract/send` → genera PDF (`lib/pdf.js`) → webhook n8n `zuk-send-contract` (adjunta y envía por Outlook) → marca "sent". Requiere el workflow *"ZUK - Send Contract"* activo. |
| **Sugerencia de fechas / Rückfrage de sexos** | ❌ Solo toast | Marcado como v2. |

---

## 6. Despliegue

- **Producción:** Hetzner (`boscohub.duckdns.org`), todo detrás de **Caddy** (HTTPS
  automático): dashboard (con login), `n8n.boscohub…`, `live.boscohub…`.
- **Orquestación:** `docker-compose.prod.yml` (postgres, n8n, dashboard, live-call, caddy).
- **CI/CD:** push a `main` → GitHub Actions reconstruye y levanta los contenedores,
  reaplica `n8n/init.sql` y reimporta los workflows.
- **Local:** `npm run dev` levanta el dashboard **y** el microservicio. n8n se usa
  en prod; para llamadas reales en local ver `live-call/README.md` (túnel).

---

## 7. Pendientes (gaps que mencionó el cliente)

1. Lógica de habitaciones real (sexo/edad/planta, profes cerca).
2. Control de acceso a datos sensibles ("locked system", roles).
3. Pantalla de transparencia de la IA (mostrar el flujo a los jóvenes).
4. Gestión de crisis (referente enfermo → reprogramar/cancelar).
5. Tercer canal: formulario web.
6. Buzón de voz / fuera de horario.
7. (hecho) Envío del contrato como PDF adjunto — ver §5.

Ver también [`CALL-TRANSCRIPTION.md`](./CALL-TRANSCRIPTION.md) para el detalle del
lado telefónico.
