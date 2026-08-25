function assertDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} no contiene una fecha válida.`);
  return date;
}

export function escapeIcsText(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

export function formatIcsDate(value) {
  return assertDate(value, "Evento")
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function stableUid(event) {
  const base = String(event.id || event.title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "event";
  return `${base}@bitacora-personal.local`;
}

export function buildIcsEvent(event, generatedAt = new Date().toISOString()) {
  if (!event || typeof event !== "object") throw new Error("No se recibió un evento válido.");
  const title = String(event.title ?? "").trim();
  if (!title) throw new Error("El evento necesita título.");
  const start = assertDate(event.startsAt, "Inicio");
  const end = event.endsAt ? assertDate(event.endsAt, "Fin") : new Date(start.getTime() + 30 * 60 * 1000);
  if (end.getTime() < start.getTime()) throw new Error("El fin del evento no puede ser anterior al inicio.");

  const description = [event.notes, event.area ? `Área: ${event.area}` : ""]
    .filter(Boolean)
    .join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bitacora Personal//Local First//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(stableUid(event))}`,
    `DTSTAMP:${formatIcsDate(generatedAt)}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : null,
    event.type ? `CATEGORIES:${escapeIcsText(event.type)}` : null,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].filter(Boolean).join("\r\n");
}

export function calendarFilename(event) {
  const safe = String(event?.title || "evento-bitacora")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "evento-bitacora";
  return `${safe}.ics`;
}
