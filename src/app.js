import { decideCandidate, candidateDisplayValue } from "./discovery.js";
import {
  addLifeCheckin,
  completeDiscovery,
  deleteAlarm,
  deleteEvent,
  initializeState,
  loadState,
  reopenDiscovery,
  resetState,
  resolveAttention,
  snoozeAlarm,
  toggleAlarm,
  upsertAlarm,
  upsertEvent
} from "./state.js";
import { renderApp } from "./ui.js";
import { fromDateTimeLocal } from "./utils.js";

const root = document.querySelector("#app");
let state = await initializeState();
let ui = {
  currentDoor: "today",
  modal: null,
  discoveryOpen: !state.discovery.receipt,
  discoveryStep: "welcome",
  discoveryConsent: false,
  discoveryConsentedAt: null,
  toast: ""
};
let toastTimer = null;

function render() { root.innerHTML = renderApp(state, ui); }

function setToast(message) {
  ui.toast = message;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = ""; render(); }, 2600);
}

function reloadState(detail = {}) {
  state = loadState();
  if (detail.door) ui.currentDoor = detail.door;
  if (detail.closeModal !== false) ui.modal = null;
  render();
}

function openDoor(door) { ui.currentDoor = door; ui.modal = null; render(); }
function openModal(type, id = null) { ui.modal = { type, id }; render(); }
function closeModal() { ui.modal = null; render(); }
function formValues(form) { return Object.fromEntries(new FormData(form).entries()); }

function handleAlarmSubmit(form) {
  const values = formValues(form);
  if (!values.title || !values.scheduledAt) return;
  state = upsertAlarm(state, {
    id: values.id, title: values.title, scheduledAt: fromDateTimeLocal(values.scheduledAt),
    recurrence: values.recurrence, area: values.area, projectId: values.projectId || null, status: "active"
  });
  ui.modal = null;
  setToast(values.id ? "Alarma actualizada" : "Alarma creada");
}

function handleEventSubmit(form) {
  const values = formValues(form);
  if (!values.title || !values.startsAt) return;
  state = upsertEvent(state, {
    id: values.id, title: values.title, startsAt: fromDateTimeLocal(values.startsAt),
    endsAt: values.endsAt ? fromDateTimeLocal(values.endsAt) : null, type: values.type,
    area: values.area, projectId: values.projectId || null, priority: values.priority,
    notes: values.notes, status: "scheduled"
  });
  ui.modal = null;
  setToast(values.id ? "Evento actualizado" : "Evento creado");
}

function handleLifeSubmit(form) {
  state = addLifeCheckin(state, formValues(form));
  ui.modal = null;
  setToast("Check-in guardado localmente");
}

root.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.id === "alarm-form") handleAlarmSubmit(form);
  if (form.id === "event-form") handleEventSubmit(form);
  if (form.id === "life-form") handleLifeSubmit(form);
});

root.addEventListener("input", event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
  if (target.id === "discovery-consent") {
    ui.discoveryConsent = target.checked;
    if (target.checked && !ui.discoveryConsentedAt) ui.discoveryConsentedAt = new Date().toISOString();
    render();
    return;
  }
  const candidateKey = target.dataset.candidateInput;
  if (candidateKey) {
    state.discovery.candidates = decideCandidate(state.discovery.candidates, candidateKey, "edited", target.value);
    return;
  }
  const outputKey = target.dataset.rangeOutput;
  if (outputKey) {
    const output = document.querySelector(`#out-${CSS.escape(outputKey)}`);
    if (output) output.value = target.value;
  }
});

root.addEventListener("click", event => {
  const origin = event.target instanceof Element ? event.target : null;
  const button = origin?.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "nav" || action === "open-door") return openDoor(button.dataset.door);
  if (action === "open-modal") return openModal(button.dataset.modal);
  if (action === "close-modal") return closeModal();
  if (action === "submit-form") return document.querySelector(`#${CSS.escape(button.dataset.form)}`)?.requestSubmit();
  if (action === "edit-alarm") return openModal("alarm", button.dataset.id);
  if (action === "edit-event") return openModal("event", button.dataset.id);
  if (action === "show-project") return openModal("project", button.dataset.id);

  if (action === "toggle-alarm") {
    state = toggleAlarm(state, button.dataset.id);
    return setToast("Estado de alarma actualizado");
  }
  if (action === "snooze-alarm") {
    state = snoozeAlarm(state, button.dataset.id, 10);
    return setToast("Alarma pospuesta 10 minutos");
  }
  if (action === "delete-alarm") {
    if (window.confirm("¿Eliminar esta alarma local?")) {
      state = deleteAlarm(state, button.dataset.id);
      return setToast("Alarma eliminada");
    }
    return;
  }
  if (action === "delete-event") {
    if (window.confirm("¿Eliminar este evento local?")) {
      state = deleteEvent(state, button.dataset.id);
      return setToast("Evento eliminado");
    }
    return;
  }
  if (action === "resolve-attention") {
    state = resolveAttention(state, button.dataset.id);
    return setToast("Elemento marcado como resuelto");
  }
  if (action === "ecosystem-placeholder") {
    return setToast(`${button.dataset.name}: conexión read-only pendiente de una fase futura`);
  }
  if (action === "discovery-next") {
    const nextStep = button.dataset.step;
    if (nextStep === "review" && !ui.discoveryConsent) return;
    if (nextStep === "review" && !ui.discoveryConsentedAt) ui.discoveryConsentedAt = new Date().toISOString();
    ui.discoveryStep = nextStep;
    return render();
  }
  if (action === "candidate-decision") {
    const key = button.dataset.key;
    const decision = button.dataset.decision;
    const candidate = state.discovery.candidates.find(item => item.key === key);
    state.discovery.candidates = decideCandidate(state.discovery.candidates, key, decision, candidate ? candidateDisplayValue(candidate) : "");
    return render();
  }
  if (action === "discovery-confirm") {
    state = completeDiscovery(state, ui.discoveryConsentedAt ?? new Date().toISOString());
    ui.discoveryOpen = false;
    ui.discoveryStep = "welcome";
    ui.discoveryConsent = false;
    return setToast("Tu perfil inicial quedó guardado en este navegador");
  }
  if (action === "discovery-manual") {
    state.discovery.candidates = state.discovery.candidates.map(candidate => ({
      ...candidate,
      decision: candidate.key === "displayName" || candidate.key === "productInstance" ? "accepted" : "rejected",
      editedValue: undefined
    }));
    state = completeDiscovery(state, new Date().toISOString());
    ui.discoveryOpen = false;
    return setToast("Configuración manual iniciada con datos mínimos");
  }
  if (action === "rerun-discovery") {
    state = reopenDiscovery(state);
    ui.discoveryOpen = true;
    ui.discoveryStep = "welcome";
    ui.discoveryConsent = false;
    ui.discoveryConsentedAt = null;
    return render();
  }
  if (action === "reset-app") {
    if (window.confirm("Esto eliminará todos los datos locales de Bitácora en este navegador. ¿Continuar?")) {
      state = resetState();
      ui = { currentDoor: "today", modal: null, discoveryOpen: true, discoveryStep: "welcome", discoveryConsent: false, discoveryConsentedAt: null, toast: "" };
      return setToast("Bitácora local fue restablecida");
    }
  }
});

window.addEventListener("bitacora:state-changed", event => reloadState(event.detail ?? {}));
window.addEventListener("bitacora:toast", event => {
  const message = event.detail?.message;
  if (message) setToast(message);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && ui.modal) closeModal();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("../sw.js", import.meta.url);
    navigator.serviceWorker.register(serviceWorkerUrl, { scope: "../" })
      .catch(error => console.warn("No se pudo registrar el service worker.", error));
  });
}

render();
