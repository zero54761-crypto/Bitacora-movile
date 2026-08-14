import { createDefaultState, createProfileCandidates } from "./data.js";
import { deepClone, uid } from "./utils.js";
import { applyCandidatesToProfile, buildDiscoveryReceipt } from "./discovery.js";
import { chooseNewestSnapshot, queueIndexedSnapshot, readIndexedSnapshot } from "./persistence.js";

export const STORAGE_KEY = "bitacora.u1.state.v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocalSnapshot() {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("No se pudo leer el estado local de Bitácora.", error);
    return null;
  }
}

export function normalizeState(value) {
  const fallback = createDefaultState();
  if (!value || typeof value !== "object") return fallback;
  if (value.meta?.schemaVersion !== 1) return fallback;
  return {
    ...fallback,
    ...value,
    meta: {
      ...fallback.meta,
      ...value.meta,
      persistenceBackend: "indexeddb-with-local-mirror"
    },
    profile: { ...fallback.profile, ...value.profile },
    discovery: {
      receipt: value.discovery?.receipt ?? null,
      candidates: Array.isArray(value.discovery?.candidates) ? value.discovery.candidates : createProfileCandidates()
    },
    alarms: Array.isArray(value.alarms) ? value.alarms : fallback.alarms,
    events: Array.isArray(value.events) ? value.events : fallback.events,
    lifeCheckins: Array.isArray(value.lifeCheckins) ? value.lifeCheckins : fallback.lifeCheckins,
    quickCaptures: Array.isArray(value.quickCaptures) ? value.quickCaptures : [],
    projects: Array.isArray(value.projects) ? value.projects : fallback.projects,
    attentionItems: Array.isArray(value.attentionItems) ? value.attentionItems : fallback.attentionItems,
    activityEvents: Array.isArray(value.activityEvents) ? value.activityEvents : fallback.activityEvents,
    connections: Array.isArray(value.connections) ? value.connections : fallback.connections,
    finance: { ...fallback.finance, ...value.finance }
  };
}

export function loadState() {
  return normalizeState(readLocalSnapshot() ?? createDefaultState());
}

export async function initializeState() {
  const localSnapshot = readLocalSnapshot();
  let indexedSnapshot = null;
  try {
    indexedSnapshot = await readIndexedSnapshot();
  } catch (error) {
    console.warn("IndexedDB no estuvo disponible durante el arranque; se usará el espejo local.", error);
  }
  return saveState(normalizeState(chooseNewestSnapshot(indexedSnapshot, localSnapshot) ?? createDefaultState()));
}

export function saveState(state) {
  const next = normalizeState(deepClone(state));
  next.meta.updatedAt = new Date().toISOString();
  if (isBrowser()) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  void queueIndexedSnapshot(next);
  return next;
}

export function resetState() {
  return saveState(createDefaultState());
}

export function completeDiscovery(state, consentedAt) {
  const next = deepClone(state);
  next.profile = applyCandidatesToProfile(next.profile, next.discovery.candidates);
  next.discovery.receipt = buildDiscoveryReceipt(next.discovery.candidates, consentedAt);
  const attention = next.attentionItems.find(item => item.sourceUrl === "local://profile-discovery");
  if (attention) {
    attention.status = "resolved";
    attention.resolvedAt = new Date().toISOString();
  }
  next.activityEvents.unshift({
    id: uid("activity"), projectId: "project-bitacora", source: "manual", type: "PROFILE",
    title: "Perfil inicial confirmado", summary: `${next.profile.displayName} revisó y aprobó los datos guardados por Conocerme.`,
    sourceUrl: "local://profile-discovery", occurredAt: new Date().toISOString()
  });
  return saveState(next);
}

export function reopenDiscovery(state) {
  const next = deepClone(state);
  next.discovery.receipt = null;
  next.discovery.candidates = createProfileCandidates();
  return saveState(next);
}

export function upsertAlarm(state, input) {
  const next = deepClone(state);
  const now = new Date().toISOString();
  const alarm = {
    id: input.id || uid("alarm"), title: String(input.title).trim(), scheduledAt: input.scheduledAt,
    recurrence: input.recurrence || "none", area: input.area || "Personal", projectId: input.projectId || null,
    status: input.status || "active", createdAt: input.createdAt || now, updatedAt: now
  };
  const index = next.alarms.findIndex(item => item.id === alarm.id);
  if (index >= 0) next.alarms[index] = { ...next.alarms[index], ...alarm };
  else next.alarms.push(alarm);
  next.activityEvents.unshift({
    id: uid("activity"), projectId: alarm.projectId, source: "manual",
    type: index >= 0 ? "ALARM_UPDATED" : "ALARM_CREATED", title: alarm.title,
    summary: index >= 0 ? "Alarma actualizada." : "Alarma creada.", sourceUrl: "local://alarms", occurredAt: now
  });
  return saveState(next);
}

export function toggleAlarm(state, id) {
  const next = deepClone(state);
  const alarm = next.alarms.find(item => item.id === id);
  if (alarm) alarm.status = alarm.status === "active" ? "inactive" : "active";
  return saveState(next);
}

export function snoozeAlarm(state, id, minutes = 10) {
  const next = deepClone(state);
  const alarm = next.alarms.find(item => item.id === id);
  if (alarm) {
    alarm.scheduledAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    alarm.status = "snoozed";
  }
  return saveState(next);
}

export function deleteAlarm(state, id) {
  const next = deepClone(state);
  next.alarms = next.alarms.filter(item => item.id !== id);
  return saveState(next);
}

export function upsertEvent(state, input) {
  const next = deepClone(state);
  const now = new Date().toISOString();
  const event = {
    id: input.id || uid("event"), title: String(input.title).trim(), startsAt: input.startsAt,
    endsAt: input.endsAt || null, type: input.type || "Evento", area: input.area || "Personal",
    projectId: input.projectId || null, priority: input.priority || "medium", notes: input.notes || "",
    status: input.status || "scheduled", createdAt: input.createdAt || now, updatedAt: now
  };
  const index = next.events.findIndex(item => item.id === event.id);
  if (index >= 0) next.events[index] = { ...next.events[index], ...event };
  else next.events.push(event);
  next.activityEvents.unshift({
    id: uid("activity"), projectId: event.projectId, source: "manual",
    type: index >= 0 ? "EVENT_UPDATED" : "EVENT_CREATED", title: event.title,
    summary: index >= 0 ? "Evento actualizado." : "Evento creado.", sourceUrl: "local://calendar", occurredAt: now
  });
  return saveState(next);
}

export function deleteEvent(state, id) {
  const next = deepClone(state);
  next.events = next.events.filter(item => item.id !== id);
  return saveState(next);
}

export function addLifeCheckin(state, input) {
  const next = deepClone(state);
  const now = new Date().toISOString();
  const checkin = {
    id: uid("life"), date: now, energy: Number(input.energy), focus: Number(input.focus),
    sleep: Number(input.sleep), movement: Number(input.movement), discipline: Number(input.discipline),
    learning: Number(input.learning), personalPriority: input.personalPriority || "", note: input.note || ""
  };
  next.lifeCheckins.unshift(checkin);
  next.profile.energy = checkin.energy;
  next.profile.focus = checkin.focus;
  if (checkin.personalPriority) next.profile.priorityAction = checkin.personalPriority;
  next.activityEvents.unshift({
    id: uid("activity"), projectId: null, source: "manual", type: "LIFE_CHECKIN",
    title: "Check-in de vida registrado", summary: `Energía ${checkin.energy}/10 · Foco ${checkin.focus}/10`,
    sourceUrl: "local://life", occurredAt: now
  });
  return saveState(next);
}

const QUICK_CAPTURE_TYPES = new Set(["task", "idea", "decision", "expense", "event", "alarm", "blocker", "note"]);
const QUICK_CAPTURE_PRIORITIES = new Set(["low", "medium", "high"]);

export function addQuickCapture(state, input) {
  const next = deepClone(state);
  const text = String(input.text ?? "").trim();
  if (!text) throw new Error("La captura rápida necesita contenido.");

  const now = new Date().toISOString();
  const capture = {
    id: uid("capture"),
    type: QUICK_CAPTURE_TYPES.has(input.type) ? input.type : "note",
    text: text.slice(0, 2_000),
    priority: QUICK_CAPTURE_PRIORITIES.has(input.priority) ? input.priority : "medium",
    projectId: input.projectId || null,
    dueAt: input.dueAt || null,
    needsOwner: Boolean(input.needsOwner),
    status: "inbox",
    capturedAt: now,
    updatedAt: now
  };

  next.quickCaptures.unshift(capture);
  next.quickCaptures = next.quickCaptures.slice(0, 5_000);
  next.activityEvents.unshift({
    id: uid("activity"),
    projectId: capture.projectId,
    source: "manual",
    type: "QUICK_CAPTURE",
    title: `Captura rápida · ${capture.type}`,
    summary: capture.text.slice(0, 180),
    sourceUrl: `local://captures/${capture.id}`,
    occurredAt: now
  });
  next.activityEvents = next.activityEvents.slice(0, 5_000);

  if (capture.needsOwner) {
    next.attentionItems.unshift({
      id: uid("attention"),
      projectId: capture.projectId,
      area: "Captura rápida",
      title: capture.text.slice(0, 100),
      reason: "Don Orlando marcó esta captura como una dependencia real.",
      impact: "Debe revisarse o decidirse antes de cerrar la captura.",
      urgency: capture.priority,
      status: "open",
      sourceUrl: `local://captures/${capture.id}`,
      createdAt: now
    });
  }

  return saveState(next);
}

export function archiveQuickCapture(state, id) {
  const next = deepClone(state);
  const capture = next.quickCaptures.find(item => item.id === id);
  if (capture) {
    capture.status = "archived";
    capture.updatedAt = new Date().toISOString();
  }
  return saveState(next);
}

export function resolveAttention(state, id) {
  const next = deepClone(state);
  const item = next.attentionItems.find(entry => entry.id === id);
  if (item) {
    item.status = "resolved";
    item.resolvedAt = new Date().toISOString();
  }
  return saveState(next);
}
