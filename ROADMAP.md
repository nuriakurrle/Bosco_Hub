# Roadmap — Bosco Hub

Prioridad por **valor × esfuerzo**. Esfuerzo: S (horas), M (1–2 días), L (días+).
Tipo: 🤖 IA · ⚙️ reglas/código · 🎨 UX · 🔌 integración.

Principio rector (cliente): *"agent assisting staff, not replacing"* — IA donde hay
lenguaje/ambigüedad/volumen, reglas donde hay lógica dura, **humano aprueba** lo que
sale al cliente. Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## ✅ Hecho

| Pieza | Tipo |
|-------|------|
| Intake de e-mail → `inquiries` (extracción gpt-4o) | 🤖 |
| Transcripción de llamada en vivo (STT + extracción) + historial (Verlauf) | 🤖 |
| Detección de datos sensibles (Art. 9 DSGVO, solo cantidad/tipo) | 🤖 |
| Capacidad / temporada / sugerencia de fechas | ⚙️ |
| E-mail de **confirmación**, **follow-up** y **contrato (PDF adjunto)** vía n8n | 🔌 |
| Popup de llamada en curso · leyenda + clic en entidad | 🎨 |
| Resaltado de entidades con cita y confianza | 🤖🎨 |

---

## 🎯 Fase 1 — Demo / presentación (impacto alto, esfuerzo bajo)

| # | Qué | Tipo | Esfuerzo | Por qué |
|---|-----|------|----------|---------|
| 1 | **Pantalla de transparencia de la IA** (diagrama vivo de 3 capas + 11 agentes; flujo de una Anfrage en tiempo real) | 🎨 | M | El cliente lo pidió expresamente para educar a los jóvenes ("responsible AI use"). Mayor efecto "wow". |
| 2 | ✅ **Emails redactados por IA** (follow-up y confirmación con LLM, editable antes de enviar) — botón "✨ mit KI verfassen" | 🤖 | S–M | Hecho. Plantilla = fallback; IA = botón. Reusa el envío de n8n. |
| 3 | ✅ **Resumen inteligente del cliente** ("Stammkunde, immer vegetarisch, bevorzugt Aktionszentrum…") — botón "✨ KI-Zusammenfassung" en Stammkunde | 🤖 | S | Hecho. `lib/aiSummary.js` + `/api/schools/summary`. |

---

## 🛠️ Fase 2 — Producción / robustez (lo que el cliente recalcó)

| # | Qué | Tipo | Esfuerzo | Por qué |
|---|-----|------|----------|---------|
| 4 | **Control de acceso a datos sensibles** ("locked system", roles: quién ve salud/alergias) | ⚙️🔌 | M–L | Punto legal más delicado; el cliente lo subrayó (Art. 9). |
| 5 | **Lógica de habitaciones** (híbrido: IA interpreta requisitos → solver asigna sexo/edad/planta/profes cerca) | 🤖⚙️ | L | El agente "Bedroom Logic" más pedido; hoy solo detecta sexo. |
| 6 | **Matching semántico de duplicados** (embeddings: misma escuela/contacto pese a grafía o canal distinto) | 🤖 | M | Mejora real sobre la similitud Jaccard actual. |
| 7 | **Razonamiento explicado en Decide & Reason** (cálculo determinista + LLM que explica la recomendación) | 🤖⚙️ | M | Hace el copiloto "inteligente" sin perder el determinismo. |

---

## 🔭 Fase 3 — Ampliaciones del producto completo

| # | Qué | Tipo | Esfuerzo | Por qué |
|---|-----|------|----------|---------|
| 8 | **Buzón de voz / fuera de horario** → transcripción al mismo pipeline | 🤖🔌 | M | Captura llamadas perdidas; el cliente lo mencionó. |
| 9 | **Tercer canal: formulario web** (intake + normalización con IA del texto libre) | 🔌🤖 | M | Tercer canal que ya usan, hoy ausente. |
| 10 | **Idiomas** (traducir el correo del cliente para el equipo; responder en su idioma) | 🤖 | S–M | Grupos internacionales y voluntarios europeos. |
| 11 | **Triage del Watchdog con IA** (prioriza con matiz: fecha + recurrencia + tamaño) | 🤖⚙️ | M | Más fino que ordenar por días de espera. |
| 12 | **Gestión de crisis** (referente enfermo → reprogramar/cancelar en cascada) | ⚙️ | L | Mencionado en la entrevista; flujo aún inexistente. |
| 13 | **Contrato como Word/PDF profesional** (plantilla con logo/diseño en n8n) | 🔌 | M | Hoy el PDF es texto plano; subir el acabado. |

---

## 🚫 Dónde NO va IA (decisión, no pendiente)

- **Texto del contrato** → plantilla determinista (es legal).
- **Cálculo de capacidad / fechas** → reglas auditables (sin alucinaciones).
- **Agente que conteste al cliente solo** → la IA se queda interna y asistente;
  el "contacto personal" es valor central del cliente.

---

## Orden recomendado

1. **#1 + #2 + #3** (Fase 1) — para la presentación: máximo impacto, poco esfuerzo.
2. **#4** (acceso a datos sensibles) — antes de cualquier piloto real con datos reales.
3. **#5, #6, #7** — el salto de "reglas" a "copiloto inteligente".
4. Fase 3 según prioridad del cliente.
