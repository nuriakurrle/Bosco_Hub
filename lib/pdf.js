// lib/pdf.js — Generador minimalista de PDF de texto monoespaciado, SIN dependencias.
// Pensado para el contrato/Buchungsbestätigung (texto plano). Fuente Courier con
// WinAnsiEncoding (soporta ä ö ü ß €). Devuelve el PDF en base64, listo para
// adjuntarlo en el e-mail vía n8n. Una página A4; si el texto es muy largo se
// recorta a las líneas que caben (el contrato cabe de sobra).
function escapePdf(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textToPdfBase64(text, { fontSize = 9, leading = 12 } = {}) {
  const x = 50;          // margen izquierdo
  const top = 800;       // línea base de la primera línea (A4 = 842 pt de alto)
  const maxLines = Math.floor((top - 40) / leading);
  const lines = String(text).replace(/\t/g, "    ").split("\n").slice(0, maxLines);

  // Stream de contenido: una línea por Tj, saltando con T* (usa el leading TL).
  let stream = `BT /F1 ${fontSize} Tf ${leading} TL ${x} ${top} Td\n`;
  lines.forEach((ln, i) => {
    stream += `(${escapePdf(ln)}) Tj\n`;
    if (i < lines.length - 1) stream += "T*\n";
  });
  stream += "ET";

  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
    "/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>";
  objs[4] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>";

  // Ensamblar con tabla xref correcta (offsets en bytes latin1).
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return Buffer.from(pdf, "latin1").toString("base64");
}
