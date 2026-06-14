// components/icons.js — Simple stroke SVG icons (ported from shared.jsx).
// Single color via currentColor; size and stroke width passed as props.

export const Icon = ({ d, size = 14, stroke = 1.6, fill = "none", style }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

export const I = {
  inbox: "M3 13l3-8h12l3 8M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6M3 13h5l1 3h6l1-3h5",
  mail: "M4 6h16v12H4zM4 6l8 7 8-7",
  search: ["M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l5 5"],
  alert: ["M12 3l10 17H2L12 3z", "M12 10v5", "M12 18.5v.01"],
  check: "M5 12l5 5 9-10",
  x: "M6 6l12 12M18 6L6 18",
  clock: ["M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z", "M12 7v5l3.5 2"],
  house: "M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10z",
  users: ["M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M2 21a7 7 0 0 1 14 0", "M14 21h8a5 5 0 0 0-5-5"],
  doc: ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5z", "M14 3v5h5", "M9 13h6M9 17h6"],
  bell: ["M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2z", "M10 21a2 2 0 0 0 4 0"],
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  link: ["M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1", "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"],
  filter: "M4 5h16l-6 8v6l-4-2v-4L4 5z",
  bed: ["M3 18V8h7a4 4 0 0 1 4 4v2h7v4", "M3 18h18", "M7 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  refresh: ["M21 12a9 9 0 1 1-3-6.7", "M21 4v5h-5"],
  more: "M5 12h.01M12 12h.01M19 12h.01",
  chevron: "M9 6l6 6-6 6",
  chevDown: "M6 9l6 6 6-6",
  attach: "M21 11l-9 9a5 5 0 1 1-7-7l9-9a3 3 0 1 1 4 4l-9 9a1 1 0 1 1-2-2l8-8",
  send: "M4 12l16-8-4 16-4-6-8-2z",
  pencil: ["M4 20h4l10-10-4-4L4 16v4z", "M14 6l4 4"],
  spark: "M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z",
  euro: ["M19 5a8 8 0 1 0 0 14", "M4 10h10M4 14h10"],
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  meal: ["M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z", "M16 9h2a2 2 0 0 1 0 4h-2", "M7 3v2M10 3v2M13 3v2"],
  flag: ["M5 21V4h11l-1.5 4L16 12H5", "M5 4v17"],
  calendar: ["M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z", "M4 10h16", "M8 3v4M16 3v4"],
  play: "M7 5l12 7-12 7z",
  pause: ["M8 5v14", "M16 5v14"],
  restart: ["M3 12a9 9 0 1 0 3-6.7", "M3 4v5h5"],
};
