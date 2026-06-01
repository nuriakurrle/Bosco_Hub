// intake-app.jsx — Beginner prototype: E-Mail & Telefon intake only.
// Flow: Posteingang (both channels in one list) → open → review extracted data → Buchung anlegen.

const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
const LS_KEY = "donbosco_intake_created_v1";
const ASSIGN_KEY = "donbosco_intake_assigned_v1";

// ── Team (shared inbox) ─────────────────────────────────────
const TEAM = {
  vanessa: { name: "Vanessa Berger", short: "VB", area: "Jugendherberge" },
  andrea:  { name: "Andrea Sturm",   short: "AS", area: "Aktionszentrum" },
  steffi:  { name: "Steffi Lang",    short: "SL", area: "Seminare & Web" },
};
const ME = "vanessa";   // logged-in user

const AREA_COLOR = {
  "Jugendherberge": "#6B1E2D",
  "Aktionszentrum": "#7A8F7A",
  "Seminare & Web": "#3d6b8a",
  "—":              "#9a958c",
};

// ── Auto-routing: which area + suggested person, and why ────
const ROUTING = {
  "0412": { mailbox: "info@jugendherberge-bb.de", area: "Jugendherberge", reason: "Anfrageart: Freizeit",       suggest: "vanessa" },
  "0411": { mailbox: "info@jugendherberge-bb.de", area: "Jugendherberge", reason: "an JH-Adresse",              suggest: "vanessa" },
  "0410": { mailbox: "info@jugendherberge-bb.de", area: "—",              reason: "Schule unbekannt — prüfen",  suggest: null },
  "0409": { mailbox: "info@aktionszentrum-bb.de", area: "Aktionszentrum", reason: "Anfrageart: Orientierungstage", suggest: "andrea" },
  "0408": { mailbox: "info@aktionszentrum-bb.de", area: "Aktionszentrum", reason: "Anfrageart: Schulung",       suggest: "andrea" },
  "0407": { mailbox: "info@jugendherberge-bb.de", area: "Jugendherberge", reason: "Bestandsvorgang",            suggest: "vanessa" },
};
// some requests already have an owner; the rest are unassigned
const DEFAULT_ASSIGNED = { "0409": "andrea", "0408": "andrea" };

// ── Multi-request: one e-mail that contains several bookings ─
const MULTI = {
  "0411": [
    { n: 1, group: "Klasse 8a", dates: "15.–17.02.2026", persons: "27 + 2", verdict: "ok",    cap: "Platz frei · 60/150 belegt" },
    { n: 2, group: "Klasse 8b", dates: "15.–17.02.2026", persons: "26 + 2", verdict: "ok",    cap: "Platz frei · zeitgleich möglich" },
    { n: 3, group: "Klasse 9a", dates: "18.–20.02.2026", persons: "29 + 2", verdict: "tight", cap: "Eng · nur 31 Betten frei" },
    { n: 4, group: "Klasse 9b", dates: "18.–20.02.2026", persons: "28 + 2", verdict: "full",  cap: "Kein Platz · Alternative nötig" },
  ],
};

// ── Sample data — mix of email + phone, German ──────────────
const ITEMS = [
  {
    id: "0412", channel: "phone",
    from: "Lukas Brunner", school: "Pfarrjugend St. Michael, Augsburg",
    summary: "Sommerfreizeit 12.–17. Juli, ca. 28 Jugendliche",
    received: "vor 12 Min.", receivedAbs: "01.06.2026 · 09:46", duration: 96,
    transcript: [
      { t: 0,  spk: "staff",  parts: ["Don Bosco Buchungsbüro, guten Morgen."] },
      { t: 4,  spk: "caller", parts: ["Guten Morgen, hier ist ", { h: "Lukas Brunner" }, " von der ", { h: "Pfarrjugend St. Michael in Augsburg" }, "."] },
      { t: 12, spk: "caller", parts: ["Wir würden gern eine Sommerfreizeit machen, vom ", { h: "zwölften bis siebzehnten Juli" }, "."] },
      { t: 22, spk: "staff",  parts: ["Sehr schön. Für wie viele Personen?"] },
      { t: 26, spk: "caller", parts: ["Wir wären ", { h: "28 Jugendliche" }, " und ", { h: "3 Begleitpersonen" }, "."] },
      { t: 36, spk: "staff",  parts: ["Und Verpflegung?"] },
      { t: 39, spk: "caller", parts: [{ h: "Vollpension" }, " wäre super. Vegetarier muss ich noch nachfragen."] },
    ],
    fields: [
      { id: "schule",  label: "Gruppe / Schule", value: "Pfarrjugend St. Michael", status: "review" },
      { id: "kontakt", label: "Kontakt",         value: "Lukas Brunner",           status: "review" },
      { id: "anreise", label: "Anreise",         value: "12.07.2026",              status: "review" },
      { id: "abreise", label: "Abreise",         value: "17.07.2026",              status: "review" },
      { id: "personen",label: "Personen",        value: "28 + 3 Leitung",          status: "review" },
      { id: "verpfl",  label: "Verpflegung",     value: "Vollpension",             status: "review" },
      { id: "veggie",  label: "Vegetarisch",     value: "",                        status: "missing" },
    ],
  },
  {
    id: "0411", channel: "email",
    from: "Sabine Baggi", school: "Realschule Bruckmühl",
    summary: "4 Klassen · 15.–20. Februar (Schullandheim)",
    received: "vor 1 Std.", receivedAbs: "01.06.2026 · 08:54",
    emailBody: [
      ["Sehr geehrte Damen und Herren,"],
      ["zunächst möchte ich mich für die schönen Tage im letzten Jahr bedanken. Wir würden gern erneut mit ", { h: "vier Klassen" }, " kommen:"],
      ["Klasse ", { h: "8a und 8b" }, " gemeinsam vom ", { h: "15.–17. Februar" }, ", je rund ", { h: "27 Schüler" }, " + 2 Begleitungen; Klasse ", { h: "9a und 9b" }, " vom ", { h: "18.–20. Februar" }, ", ebenfalls je ca. 28 Schüler."],
      ["Ist das bei Ihnen möglich? Vollpension wäre wie immer super."],
      ["Herzliche Grüße", "Sabine Baggi · Realschule Bruckmühl"],
    ],
    fields: [
      { id: "schule",  label: "Gruppe / Schule", value: "Realschule Bruckmühl", status: "review" },
      { id: "kontakt", label: "Kontakt",         value: "Sabine Baggi",         status: "review" },
      { id: "anreise", label: "Anreise",         value: "15.02.2026",           status: "review" },
      { id: "abreise", label: "Abreise",         value: "17.02.2026",           status: "review" },
      { id: "personen",label: "Personen",        value: "27 + 2 Lehrkräfte",    status: "review" },
      { id: "verpfl",  label: "Verpflegung",     value: "Vollpension",          status: "review" },
      { id: "mw",      label: "m / w Aufteilung",value: "",                     status: "missing" },
    ],
  },
  {
    id: "0410", channel: "phone",
    from: "Max Mustermann", school: "— Schule unbekannt —",
    summary: "Allgemeine Anfrage Sommer, Schule nicht genannt",
    received: "vor 2 Std.", receivedAbs: "01.06.2026 · 07:40", duration: 41,
    transcript: [
      { t: 0,  spk: "staff",  parts: ["Don Bosco Buchungsbüro, guten Tag."] },
      { t: 3,  spk: "caller", parts: ["Hallo, ich bin ", { h: "Max Mustermann" }, ". Wir würden gern mal im Sommer vorbeikommen."] },
      { t: 11, spk: "staff",  parts: ["Gern. Um welche Gruppe oder Schule handelt es sich?"] },
      { t: 15, spk: "caller", parts: ["Ach, das sage ich Ihnen später, ich muss los — ich melde mich nochmal."] },
    ],
    fields: [
      { id: "kontakt", label: "Kontakt",         value: "Max Mustermann", status: "review" },
      { id: "schule",  label: "Gruppe / Schule", value: "",               status: "missing" },
      { id: "anreise", label: "Zeitraum",        value: "Sommer (unklar)",status: "review" },
      { id: "personen",label: "Personen",        value: "",               status: "missing" },
    ],
  },
  {
    id: "0409", channel: "email",
    from: "Thomas Wieland", school: "Gymnasium Holzkirchen",
    summary: "Orientierungstage Herbst, 9. Jahrgangsstufe",
    received: "gestern", receivedAbs: "31.05.2026 · 16:20",
    emailBody: [
      ["Hallo zusammen,"],
      ["wir sind eine ", { h: "9. Jahrgangsstufe" }, " und interessieren uns für ", { h: "Orientierungstage" }, " im Herbst, am liebsten ", { h: "Mitte Oktober" }, ". Es wären rund ", { h: "60 Schüler" }, " in zwei Klassen."],
      ["Können Sie uns mögliche Termine nennen?"],
      ["Beste Grüße", "Thomas Wieland"],
    ],
    fields: [
      { id: "schule",  label: "Gruppe / Schule", value: "Gymnasium Holzkirchen", status: "review" },
      { id: "kontakt", label: "Kontakt",         value: "Thomas Wieland",        status: "review" },
      { id: "anreise", label: "Wunschtermin",    value: "Mitte Oktober 2026",    status: "review" },
      { id: "personen",label: "Personen",        value: "ca. 60 (2 Klassen)",    status: "review" },
      { id: "art",     label: "Art",             value: "Orientierungstage",     status: "review" },
      { id: "tage",    label: "Anzahl Nächte",   value: "",                      status: "missing" },
    ],
  },
  {
    id: "0408", channel: "phone",
    from: "Theresa Aigner", school: "KJG Sankt Anna, Regensburg",
    summary: "Schulungswochenende August, 22 Personen",
    received: "gestern", receivedAbs: "31.05.2026 · 11:05", duration: 58,
    transcript: [
      { t: 0,  spk: "staff",  parts: ["Don Bosco Buchungsbüro."] },
      { t: 3,  spk: "caller", parts: ["Hallo, ", { h: "Theresa Aigner" }, " von der ", { h: "KJG Sankt Anna" }, ". Wir bräuchten ein Schulungswochenende."] },
      { t: 11, spk: "caller", parts: ["Vom ", { h: "3. bis 7. August" }, ", wir sind ", { h: "22 Personen" }, "."] },
      { t: 20, spk: "staff",  parts: ["Verpflegung?"] },
      { t: 23, spk: "caller", parts: [{ h: "Vollpension" }, ", bitte. Einen Seminarraum bräuchten wir auch."] },
    ],
    fields: [
      { id: "schule",  label: "Gruppe / Schule", value: "KJG Sankt Anna",   status: "review" },
      { id: "kontakt", label: "Kontakt",         value: "Theresa Aigner",   status: "review" },
      { id: "anreise", label: "Anreise",         value: "03.08.2026",       status: "review" },
      { id: "abreise", label: "Abreise",         value: "07.08.2026",       status: "review" },
      { id: "personen",label: "Personen",        value: "22",               status: "review" },
      { id: "verpfl",  label: "Verpflegung",     value: "Vollpension",      status: "review" },
      { id: "raum",    label: "Seminarraum",     value: "1× benötigt",      status: "review" },
    ],
  },
  {
    id: "0407", channel: "email",
    from: "Verena Hofstetter", school: "Mittelschule Miesbach",
    summary: "Finale Bettenzahlen + Allergien für Aufenthalt 03.06.",
    received: "vor 2 Tagen", receivedAbs: "30.05.2026 · 14:12",
    emailBody: [
      ["Guten Tag,"],
      ["anbei wie gewünscht die finalen Zahlen: ", { h: "24 Schüler (14 w / 10 m)" }, " und ", { h: "2 Begleitungen" }, "."],
      ["Es gibt ", { h: "2 vegetarische" }, " Teilnehmer und eine ", { h: "Nussallergie" }, ". Anreise wie geplant am 3. Juni gegen 11 Uhr."],
      ["Vielen Dank", "Verena Hofstetter"],
    ],
    fields: [
      { id: "schule",  label: "Gruppe / Schule", value: "Mittelschule Miesbach", status: "review" },
      { id: "kontakt", label: "Kontakt",         value: "Verena Hofstetter",     status: "review" },
      { id: "personen",label: "Personen",        value: "24 + 2",                status: "review" },
      { id: "mw",      label: "m / w Aufteilung",value: "14 w / 10 m",           status: "review" },
      { id: "veggie",  label: "Vegetarisch",     value: "2",                     status: "review" },
      { id: "allerg",  label: "Allergien",       value: "Nussallergie",          status: "review" },
      { id: "zeit",    label: "Anreise-Uhrzeit", value: "ca. 11:00",             status: "review" },
    ],
  },
];

// ── App ─────────────────────────────────────────────────────
function App() {
  const [view, setView] = React.useState("inbox");       // 'inbox' | itemId
  const [filter, setFilter] = React.useState("all");
  const [created, setCreated] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
  });
  const [assigned, setAssigned] = React.useState(() => {
    try { return { ...DEFAULT_ASSIGNED, ...(JSON.parse(localStorage.getItem(ASSIGN_KEY)) || {}) }; }
    catch { return { ...DEFAULT_ASSIGNED }; }
  });
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(created)); }, [created]);
  React.useEffect(() => { localStorage.setItem(ASSIGN_KEY, JSON.stringify(assigned)); }, [assigned]);

  const onAssign = (id, who) => setAssigned(a => ({ ...a, [id]: who }));

  function createBooking(id, msg) {
    setCreated(c => ({ ...c, [id]: true }));
    setView("inbox");
    setToast(msg || "Buchung angelegt — Status: Anfrage. Sie können Details später ergänzen.");
    setTimeout(() => setToast(null), 4000);
  }

  const item = ITEMS.find(i => i.id === view);

  return (
    <div className="db-app" style={{ fontSize: 13 }}>
      <header className="db-header">
        <div className="db-brand"><span className="mark">DB</span>Intake</div>
        <div className="db-search" style={{ maxWidth: 320 }}>
          <Icon d={I.search} size={14} /><span>Schule, Kontakt, Anfrage suchen…</span>
        </div>
        <span className="spacer" />
        <span className="db-chip"><Icon d={I.users} size={13} /> Team (3)</span>
        <span className="db-chip"><Icon d={I.bell} size={13} /> Posteingang</span>
        <span className="db-user">{TEAM[ME].short}</span>
      </header>

      {view === "inbox"
        ? <Inbox filter={filter} setFilter={setFilter} created={created} assigned={assigned} onAssign={onAssign} onOpen={setView} />
        : MULTI[item.id]
          ? <SplitDetail item={item} created={!!created[item.id]} assigned={assigned[item.id]} onAssign={onAssign} onBack={() => setView("inbox")} onCreate={createBooking} />
          : <Detail item={item} created={!!created[item.id]} assigned={assigned[item.id]} onAssign={onAssign} onBack={() => setView("inbox")} onCreate={createBooking} />}

      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 50,
          background: "var(--db-primary)", color: "#fbf6e9", padding: "12px 18px", borderRadius: 10,
          boxShadow: "0 8px 24px -6px rgba(40,20,25,.4)", display: "flex", alignItems: "center", gap: 10, fontSize: 13, maxWidth: 460 }}>
          <Icon d={I.check} size={16} stroke={2.2} /> {toast}
        </div>
      )}
    </div>
  );
}

// ── Assignment control ──────────────────────────────────────
function AssignControl({ id, who, suggest, onAssign, compact }) {
  if (who) {
    const m = TEAM[who];
    return (
      <span className="assignee" title={`${m.name} · ${m.area}`} onClick={() => onAssign(id, null)}>
        <span className="assignee-av" style={{ background: "#d9b89a" }}>{m.short}</span>
        {m.name.split(" ")[0]}{who === ME ? " · Sie" : ""}
      </span>
    );
  }
  const target = suggest || ME;
  return (
    <span className="assignee unassigned" title={suggest ? `Vorschlag: ${TEAM[suggest].name}` : "Mir zuweisen"}
      onClick={() => onAssign(id, target)}>
      <Icon d={I.users} size={12} />
      {suggest ? `${TEAM[suggest].name.split(" ")[0]}?` : "Zuweisen"}{!compact && " →"}
    </span>
  );
}

// ── Inbox ───────────────────────────────────────────────────
function Inbox({ filter, setFilter, created, assigned, onAssign, onOpen }) {
  let rows = ITEMS;
  if (filter === "email")      rows = rows.filter(i => i.channel === "email");
  if (filter === "phone")      rows = rows.filter(i => i.channel === "phone");
  if (filter === "unassigned") rows = rows.filter(i => !assigned[i.id]);
  if (filter === "mine")       rows = rows.filter(i => assigned[i.id] === ME);

  const nEmail = ITEMS.filter(i => i.channel === "email").length;
  const nPhone = ITEMS.filter(i => i.channel === "phone").length;
  const nUnassigned = ITEMS.filter(i => !assigned[i.id]).length;
  const nMine = ITEMS.filter(i => assigned[i.id] === ME).length;

  const chips = [
    ["all",        "Alle",             ITEMS.length],
    ["unassigned", "Nicht zugewiesen", nUnassigned],
    ["mine",       "Mir zugewiesen",   nMine],
    ["email",      "E-Mail",           nEmail],
    ["phone",      "Telefon",          nPhone],
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      <div style={{ padding: "20px 26px 14px", maxWidth: 1000, width: "100%", margin: "0 auto" }}>
        <div className="db-kicker" style={{ color: "var(--db-primary)" }}>Schritt 1 — Anfragen sammeln &amp; zuteilen</div>
        <h1 className="db-h1" style={{ fontSize: 22, marginTop: 2 }}>Team-Posteingang</h1>
        <p className="db-muted" style={{ fontSize: 13, margin: "4px 0 0", maxWidth: "62ch" }}>
          E-Mail und Telefon landen hier zusammen. Das System liest jede Anfrage, schlägt einen Bereich und eine zuständige Person vor — Sie bestätigen die Zuteilung und legen die Buchung an.
        </p>

        {nUnassigned > 0 && (
          <div className="await-banner" style={{ marginTop: 14 }}>
            <span className="pulse" />
            <span><b>{nUnassigned} Anfrage{nUnassigned > 1 ? "n sind" : " ist"} noch niemandem zugewiesen.</b> Bitte zuteilen, damit nichts liegen bleibt.</span>
          </div>
        )}

        <div className="filter-chips" style={{ marginTop: 14 }}>
          {chips.map(([k, l, n]) => (
            <button key={k} className={`filter-chip ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>
              {k === "email" && <Icon d={I.mail} size={12} />}
              {k === "phone" && <Icon d={I.clock} size={12} />}
              {k === "unassigned" && <Icon d={I.alert} size={12} />}
              {l} <span className="fc-count">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "0 26px 26px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(i => {
            const isDone = created[i.id];
            const missing = i.fields.filter(f => f.status === "missing").length;
            const r = ROUTING[i.id] || {};
            const multi = MULTI[i.id];
            return (
              <div key={i.id} className="db-card" style={{ padding: 0, cursor: "pointer", overflow: "hidden" }} onClick={() => onOpen(i.id)}>
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  {/* channel rail */}
                  <div style={{ width: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: i.channel === "phone" ? "var(--db-primary-tint)" : "var(--db-info-tint)",
                    color: i.channel === "phone" ? "var(--db-primary)" : "var(--db-info)" }}>
                    <Icon d={i.channel === "phone" ? I.clock : I.mail} size={18} />
                  </div>
                  {/* main */}
                  <div style={{ flex: 1, minWidth: 0, padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                        color: i.channel === "phone" ? "var(--db-primary)" : "var(--db-info)" }}>
                        {i.channel === "phone" ? "Telefon" : "E-Mail"}
                      </span>
                      <span className="db-faint" style={{ fontSize: 11 }}>· {i.received}</span>
                      <span style={{ marginLeft: "auto" }}>
                        {isDone
                          ? <Pill tone="success">Buchung angelegt</Pill>
                          : multi
                            ? <Pill tone="burgundy" dot={false}>{multi.length} Anfragen erkannt</Pill>
                            : missing > 0
                              ? <Pill tone="warn">{missing} Feld{missing > 1 ? "er" : ""} fehlt</Pill>
                              : <Pill tone="info">Neu · bereit</Pill>}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{i.school}</div>
                    <div className="db-muted" style={{ fontSize: 12.5, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {i.from} — {i.summary}
                    </div>
                  </div>
                  {/* routing + assignment */}
                  <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, width: 196, borderLeft: "1px solid var(--db-line)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                    <span className="route-chip" title={r.reason}>
                      <span className="route-area-dot" style={{ background: AREA_COLOR[r.area] || "#999" }} />
                      <span className="rc-house">{r.area || "—"}</span>
                    </span>
                    <div style={{ fontSize: 9.5, color: "var(--db-text-faint)", fontFamily: "var(--db-font-mono)", lineHeight: 1.3 }}>{r.reason}</div>
                    <AssignControl id={i.id} who={assigned[i.id]} suggest={r.suggest} onAssign={onAssign} />
                  </div>
                  {/* chevron */}
                  <div style={{ display: "flex", alignItems: "center", padding: "0 12px", color: "var(--db-text-faint)" }}>
                    <Icon d={I.chevron} size={16} />
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="db-muted" style={{ textAlign: "center", padding: 40 }}>Keine Anfragen in diesem Filter.</div>}
        </div>
      </div>
    </div>
  );
}

// ── Detail ──────────────────────────────────────────────────
function Detail({ item, created, assigned, onAssign, onBack, onCreate }) {
  const [fields, setFields] = React.useState(item.fields);
  const [editing, setEditing] = React.useState(null);

  React.useEffect(() => { setFields(item.fields); setEditing(null); }, [item.id]);

  const review = fields.filter(f => f.status === "review");
  const verified = fields.filter(f => f.status === "verified");
  const missing = fields.filter(f => f.status === "missing");
  const allConfirmed = review.length === 0 && verified.length > 0;

  function verify(id) { setFields(fs => fs.map(f => f.id === id ? { ...f, status: "verified" } : f)); }
  function verifyAll() { setFields(fs => fs.map(f => f.status === "review" ? { ...f, status: "verified" } : f)); }
  function save(id, val) {
    setFields(fs => fs.map(f => f.id === id ? { ...f, value: val, status: val ? "verified" : "missing" } : f));
    setEditing(null);
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      {/* sub-header */}
      <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 14 }}>
        <button className="db-btn db-btn-ghost db-btn-sm" onClick={onBack}>
          <Icon d={I.chevron} size={13} style={{ transform: "rotate(180deg)" }} /> Posteingang
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`db-pill ${item.channel === "phone" ? "db-pill-burgundy" : "db-pill-info"}`}>
              <Icon d={item.channel === "phone" ? I.clock : I.mail} size={11} />
              {item.channel === "phone" ? "Telefon" : "E-Mail"}
            </span>
            <span className="db-faint" style={{ fontSize: 11 }} >empfangen {item.receivedAbs}</span>
          </div>
          <h1 className="serif" style={{ margin: "3px 0 0", fontSize: 21, fontWeight: 500, color: "var(--db-primary-ink)" }}>{item.school}</h1>
        </div>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--db-text-muted)" }}>
            Zuständig:
            <AssignControl id={item.id} who={assigned} suggest={ROUTING[item.id]?.suggest} onAssign={onAssign} compact />
          </span>
          {created && <Pill tone="success">Buchung angelegt</Pill>}
        </span>
      </div>

      {/* split */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* SOURCE */}
        <section className="db-scroll" style={{ flex: "1 1 52%", minWidth: 0, padding: 22, borderRight: "1px solid var(--db-line)" }}>
          {item.channel === "phone"
            ? <CallSource item={item} />
            : <EmailSource item={item} />}
        </section>

        {/* EXTRACTED */}
        <section style={{ flex: "1 1 48%", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--db-paper)" }}>
          <div style={{ padding: "16px 18px 10px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              <div className="db-card-title">Automatisch erkannte Daten</div>
              <div className="db-muted" style={{ fontSize: 11.5, marginTop: 2 }}>{verified.length}/{fields.length} bestätigt · {missing.length} fehlen</div>
            </div>
            {review.length > 0 && <button className="ex-verify-btn" style={{ marginLeft: "auto" }} onClick={verifyAll}><Icon d={I.check} size={12} /> Alle bestätigen</button>}
          </div>

          <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: "8px 14px 14px" }}>
            {fields.map(f => (
              <div key={f.id} className="ex-field" style={{ gridTemplateColumns: "18px 130px 1fr auto" }}>
                <span className={`ex-state ${f.status === "verified" ? "verified" : f.status === "missing" ? "missing" : "review"}`}>
                  <Icon d={f.status === "verified" ? I.check : f.status === "missing" ? I.x : I.clock} size={11} stroke={2.2} />
                </span>
                <span className="ex-label">{f.label}</span>
                <span className={`ex-value ${f.status === "missing" ? "missing" : ""}`}>
                  {editing === f.id
                    ? <input autoFocus defaultValue={f.value} placeholder="Wert eingeben…"
                        onBlur={e => save(f.id, e.target.value.trim())}
                        onKeyDown={e => { if (e.key === "Enter") save(f.id, e.target.value.trim()); if (e.key === "Escape") setEditing(null); }} />
                    : <span onClick={() => setEditing(f.id)} style={{ cursor: "text" }}>{f.value || "— fehlt —"}</span>}
                </span>
                <span style={{ display: "flex", gap: 4 }}>
                  {f.status === "review" && <button className="ex-verify-btn" onClick={() => verify(f.id)} title="Bestätigen"><Icon d={I.check} size={12} /></button>}
                  {f.status === "missing" && <button className="ex-verify-btn" onClick={() => setEditing(f.id)} title="Ergänzen"><Icon d={I.pencil} size={11} /></button>}
                  {f.status === "verified" && <button className="ex-verify-btn" onClick={() => setEditing(f.id)} title="Ändern"><Icon d={I.pencil} size={11} /></button>}
                </span>
              </div>
            ))}

            {missing.length > 0 && (
              <div className="followup" style={{ marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon d={I.alert} size={14} style={{ color: "var(--db-warn)" }} />
                  <b style={{ fontSize: 12.5, color: "#7a4a14" }}>{missing.length} Angabe{missing.length > 1 ? "n" : ""} fehlt</b>
                </div>
                <div className="db-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  Fehlt: {missing.map(m => m.label).join(", ")}. Sie können trotzdem schon eine Buchung mit Status „Anfrage" anlegen und später ergänzen.
                </div>
                <Btn kind="sage" size="sm" icon="send">Rückfrage an {item.from.split(" ")[0]} senden</Btn>
              </div>
            )}
          </div>

          {/* action bar */}
          <div className="db-approve-bar">
            {created
              ? <Pill tone="success">Buchung angelegt · Status Anfrage</Pill>
              : allConfirmed
                ? <Pill tone="success">Alle Daten bestätigt</Pill>
                : <Pill tone="warn">{review.length} ungeprüft{missing.length ? ` · ${missing.length} fehlt` : ""}</Pill>}
            <span className="db-muted" style={{ fontSize: 11.5 }}>
              {created ? "Erscheint im Hausmanager." : "Prüfen Sie die Felder, dann anlegen."}
            </span>
            <span style={{ marginLeft: "auto" }}>
              <Btn kind="primary" iconR="arrowRight" disabled={created}
                style={created ? { opacity: .5, cursor: "default" } : undefined}
                onClick={() => !created && onCreate(item.id)}>
                {created ? "Angelegt" : "Buchung anlegen"}
              </Btn>
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Email source ────────────────────────────────────────────
function EmailSource({ item }) {
  return (
    <Card title="E-Mail" kicker={item.receivedAbs}>
      <div className="db-email">
        <p style={{ fontFamily: "var(--db-font-mono)", fontSize: 11, fontStyle: "normal", color: "var(--db-text-faint)" }}>
          Von: {item.from}
        </p>
        {item.emailBody.map((para, i) => (
          <p key={i}>{para.map((p, j) => typeof p === "string"
            ? (j > 0 && i === item.emailBody.length - 1 ? <React.Fragment key={j}><br />{p}</React.Fragment> : <span key={j}>{p}</span>)
            : <span key={j} className="db-highlight">{p.h}</span>)}</p>
        ))}
      </div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--db-line)", display: "flex", gap: 6 }}>
        <Btn kind="secondary" size="sm" icon="mail">Antworten</Btn>
        <span className="db-faint" style={{ marginLeft: "auto", fontSize: 11, alignSelf: "center" }}>
          <Icon d={I.spark} size={12} style={{ verticalAlign: -2 }} /> gelb = automatisch erkannt
        </span>
      </div>
    </Card>
  );
}

// ── Call source (transcript + simple player) ────────────────
function CallSource({ item }) {
  const dur = item.duration;
  const [time, setTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => { setTime(0); setPlaying(false); }, [item.id]);
  React.useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setTime(t => { if (t >= dur) { setPlaying(false); return dur; } return t + 0.4; }), 200);
    return () => clearInterval(iv);
  }, [playing, dur]);

  let curIdx = 0;
  item.transcript.forEach((s, i) => { if (s.t <= time) curIdx = i; });
  const wave = React.useMemo(() => Array.from({ length: 56 }, (_, i) => 5 + Math.round(13 * Math.abs(Math.sin(i * 0.6) * Math.cos(i * 0.31)))), [item.id]);

  return (
    <Card title="Telefonat · Transkript" kicker={item.receivedAbs} noBody>
      <div style={{ padding: 12, borderBottom: "1px solid var(--db-line)" }}>
        <div className="audio-player">
          <button className="audio-play-btn" onClick={() => setPlaying(p => !p)}>
            {playing
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>}
          </button>
          <div className="waveform" onClick={e => {
            const r = e.currentTarget.getBoundingClientRect();
            setTime(Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur)));
          }}>
            {wave.map((h, i) => {
              const barT = (i / wave.length) * dur;
              return <span key={i} className={`bar ${barT <= time ? "played" : ""}`} style={{ height: h * 1.6 }} />;
            })}
          </div>
          <span className="audio-time">{fmt(time)} / {fmt(dur)}</span>
        </div>
        <div className="db-faint" style={{ fontSize: 10.5, marginTop: 8, fontFamily: "var(--db-font-mono)" }}>
          Auto-Transkription · Deutsch · gelb = automatisch erkannt
        </div>
      </div>
      <div style={{ padding: 8 }}>
        <div className="transcript">
          {item.transcript.map((s, i) => (
            <div key={i} className={`tr-seg ${i === curIdx ? "current" : ""}`} onClick={() => { setTime(s.t); setPlaying(false); }}>
              <div className="tr-meta">
                <div className="tr-time">{fmt(s.t)}</div>
                <div className={`tr-spk ${s.spk}`}>{s.spk === "staff" ? "DB" : "Anrufer"}</div>
              </div>
              <div className="tr-text">
                {s.parts.map((p, j) => typeof p === "string" ? <span key={j}>{p}</span> : <span key={j} className="tr-mark">{p.h}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── SplitDetail: one e-mail → several bookings ──────────────
function SplitDetail({ item, created, assigned, onAssign, onBack, onCreate }) {
  const reqs = MULTI[item.id];
  const [doneReqs, setDoneReqs] = React.useState({});
  const bookable = reqs.filter(r => r.verdict !== "full");
  const okCount = reqs.filter(r => r.verdict === "ok").length;
  const tightCount = reqs.filter(r => r.verdict === "tight").length;
  const fullCount = reqs.filter(r => r.verdict === "full").length;

  function createOne(n) {
    const next = { ...doneReqs, [n]: true };
    setDoneReqs(next);
    if (bookable.every(r => next[r.n])) onCreate(item.id, `${bookable.length} Buchungen angelegt — je Status „Anfrage".`);
  }
  function createAll() {
    const d = {}; bookable.forEach(r => d[r.n] = true);
    setDoneReqs(d);
    onCreate(item.id, `${bookable.length} Buchungen angelegt — je Status „Anfrage".`);
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--db-bg)" }}>
      {/* sub-header */}
      <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 14 }}>
        <button className="db-btn db-btn-ghost db-btn-sm" onClick={onBack}>
          <Icon d={I.chevron} size={13} style={{ transform: "rotate(180deg)" }} /> Posteingang
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="db-pill db-pill-info"><Icon d={I.mail} size={11} /> E-Mail</span>
            <Pill tone="burgundy" dot={false}>{reqs.length} Anfragen in 1 E-Mail</Pill>
          </div>
          <h1 className="serif" style={{ margin: "3px 0 0", fontSize: 21, fontWeight: 500, color: "var(--db-primary-ink)" }}>{item.school}</h1>
        </div>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--db-text-muted)" }}>
            Zuständig:
            <AssignControl id={item.id} who={assigned} suggest={ROUTING[item.id]?.suggest} onAssign={onAssign} compact />
          </span>
          {created && <Pill tone="success">Angelegt</Pill>}
        </span>
      </div>

      {/* split body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* left: email */}
        <section className="db-scroll" style={{ flex: "1 1 44%", minWidth: 0, padding: 22, borderRight: "1px solid var(--db-line)" }}>
          <EmailSource item={item} />
          <div style={{ marginTop: 12 }} className="await-banner">
            <Icon d={I.spark} size={16} />
            <span>Das System hat <b>{reqs.length} getrennte Buchungsanfragen</b> erkannt und je Termin die Belegung geprüft — Sie müssen nicht {reqs.length}× nachrechnen.</span>
          </div>
        </section>

        {/* right: split requests */}
        <section style={{ flex: "1 1 56%", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--db-paper)" }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--db-line)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="db-card-title">Erkannte Anfragen · {reqs.length}</div>
            {okCount > 0 && <Pill tone="success" dot={false}>{okCount}× Platz</Pill>}
            {tightCount > 0 && <Pill tone="warn" dot={false}>{tightCount}× eng</Pill>}
            {fullCount > 0 && <Pill tone="error" dot={false}>{fullCount}× kein Platz</Pill>}
          </div>

          <div className="db-scroll" style={{ flex: 1, minHeight: 0, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
            {reqs.map(s => {
              const done = doneReqs[s.n];
              return (
                <div key={s.n} className={`split-req ${s.verdict}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="split-num">{s.n}</span>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{s.group}</span>
                    <span style={{ marginLeft: "auto" }}>
                      {s.verdict === "ok" ? <Pill tone="success">Platz frei</Pill>
                        : s.verdict === "tight" ? <Pill tone="warn">Eng</Pill>
                        : <Pill tone="error">Kein Platz</Pill>}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div className="split-kv"><span className="k">Termin</span><span className="mono">{s.dates}</span></div>
                    <div className="split-kv"><span className="k">Personen</span><span>{s.persons}</span></div>
                    <div className="split-kv"><span className="k">Belegung</span><span style={{ color: s.verdict === "full" ? "var(--db-error)" : s.verdict === "tight" ? "#7a4a14" : "#2e5430" }}>{s.cap}</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 4 }}>
                    {done
                      ? <span className="db-pill db-pill-success" style={{ height: 26 }}><Icon d={I.check} size={12} /> Angelegt</span>
                      : s.verdict === "full"
                        ? <Btn kind="secondary" size="sm" icon="clock">Alternative vorschlagen</Btn>
                        : <Btn kind="primary" size="sm" icon="check" onClick={() => createOne(s.n)}>Buchung anlegen</Btn>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="db-approve-bar">
            <span className="db-muted" style={{ fontSize: 11.5 }}>
              Jede Buchung startet als Status <b>Anfrage</b>. Für „Kein Platz" schlägt das System eine Alternative vor.
            </span>
            <span style={{ marginLeft: "auto" }}>
              <Btn kind="primary" size="sm" iconR="arrowRight" disabled={created}
                style={created ? { opacity: .5, cursor: "default" } : undefined}
                onClick={() => !created && createAll()}>
                {created ? "Angelegt" : `${bookable.length} buchbare anlegen`}
              </Btn>
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
