import { saveState } from "./state.js";
import { deepClone } from "./utils.js";

export const BACKUP_FORMAT = "bitacora.backup.v1";
export const MAX_BACKUP_BYTES = 2_000_000;

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const REQUIRED_ARRAYS = [
  "alarms",
  "events",
  "lifeCheckins",
  "projects",
  "attentionItems",
  "activityEvents",
  "connections"
];
const OPTIONAL_ARRAYS = ["quickCaptures"];

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} debe ser un objeto.`);
  }
}

function validateSafeTree(value, path = "respaldo", depth = 0, budget = { nodes: 0 }) {
  if (depth > 40) throw new Error(`${path} excede la profundidad permitida.`);
  budget.nodes += 1;
  if (budget.nodes > 50_000) throw new Error("El respaldo contiene demasiados elementos.");
  if (!value || typeof value !== "object") return;

  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`Clave no permitida en ${path}: ${key}`);
    validateSafeTree(value[key], `${path}.${key}`, depth + 1, budget);
  }
}

function validateStateShape(state) {
  assertObject(state, "data");
  assertObject(state.meta, "data.meta");
  if (state.meta.schemaVersion !== 1) {
    throw new Error(`Versión de datos no compatible: ${state.meta.schemaVersion ?? "sin versión"}.`);
  }

  assertObject(state.profile, "data.profile");
  assertObject(state.discovery, "data.discovery");
  assertObject(state.finance, "data.finance");

  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(state[key])) throw new Error(`data.${key} debe ser una lista.`);
    if (state[key].length > 5_000) throw new Error(`data.${key} excede el máximo permitido.`);
  }
  for (const key of OPTIONAL_ARRAYS) {
    if (state[key] !== undefined && !Array.isArray(state[key])) throw new Error(`data.${key} debe ser una lista.`);
    if (Array.isArray(state[key]) && state[key].length > 5_000) throw new Error(`data.${key} excede el máximo permitido.`);
  }

  if (typeof state.profile.displayName !== "string" || !state.profile.displayName.trim()) {
    throw new Error("El perfil no contiene un nombre visible válido.");
  }

  return state;
}

function byteLength(text) {
  return new TextEncoder().encode(text).byteLength;
}

export function createBackupEnvelope(state, exportedAt = new Date().toISOString()) {
  validateSafeTree(state);
  validateStateShape(state);
  const timestamp = new Date(exportedAt);
  if (Number.isNaN(timestamp.getTime())) throw new Error("Fecha de exportación inválida.");

  return {
    format: BACKUP_FORMAT,
    product: "Bitácora",
    instance: state.profile.displayName,
    schemaVersion: 1,
    exportedAt: timestamp.toISOString(),
    summary: {
      alarms: state.alarms.length,
      events: state.events.length,
      lifeCheckins: state.lifeCheckins.length,
      quickCaptures: state.quickCaptures?.length ?? 0,
      projects: state.projects.length,
      attentionItems: state.attentionItems.length,
      activityEvents: state.activityEvents.length
    },
    data: deepClone(state)
  };
}

export function serializeBackup(state, exportedAt) {
  const text = `${JSON.stringify(createBackupEnvelope(state, exportedAt), null, 2)}\n`;
  if (byteLength(text) > MAX_BACKUP_BYTES) {
    throw new Error("El respaldo excede el límite local de 2 MB.");
  }
  return text;
}

export function parseBackup(text) {
  if (typeof text !== "string" || !text.trim()) throw new Error("El archivo de respaldo está vacío.");
  if (byteLength(text) > MAX_BACKUP_BYTES) throw new Error("El archivo excede el límite local de 2 MB.");

  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error("El archivo no contiene JSON válido.");
  }

  validateSafeTree(envelope);
  assertObject(envelope, "respaldo");
  if (envelope.format !== BACKUP_FORMAT) {
    throw new Error("El archivo no es un respaldo compatible de Bitácora.");
  }
  if (envelope.schemaVersion !== 1) {
    throw new Error(`Versión de respaldo no compatible: ${envelope.schemaVersion ?? "sin versión"}.`);
  }
  if (typeof envelope.exportedAt !== "string" || Number.isNaN(new Date(envelope.exportedAt).getTime())) {
    throw new Error("El respaldo no contiene una fecha de exportación válida.");
  }

  validateStateShape(envelope.data);
  return deepClone(envelope.data);
}

export function restoreBackupText(text) {
  return saveState(parseBackup(text));
}

export function backupFilename(date = new Date()) {
  const timestamp = new Date(date);
  if (Number.isNaN(timestamp.getTime())) throw new Error("Fecha inválida para el nombre del respaldo.");
  const compact = timestamp.toISOString().replace(/[:.]/g, "-");
  return `Bitacora-respaldo-${compact}.json`;
}
