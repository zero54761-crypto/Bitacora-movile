import { addQuickCapture, archiveQuickCapture, loadState } from "./state.js";
import { escapeHtml } from "./utils.js";

const root = document.querySelector("#app");
let backdrop = null;

const captureTypes = [
  ["task", "Tarea"],
  ["idea", "Idea"],
  ["decision", "Decisión"],
  ["blocker", "Bloqueo"],
  ["event", "Evento"],
  ["alarm", "Alarma"],
  ["expense", "Gasto"],
  ["note", "Nota"]
];

function announce(message) {
  window.dispatchEvent(new CustomEvent("bitacora:toast", { detail: { message } }));
}

function ensureLauncher() {
  if (document.querySelector("[data-quick-capture-open]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quick-capture-fab";
  button.dataset.quickCaptureOpen = "true";
  button.setAttribute("aria-label", "Abrir captura rápida");
  button.innerHTML = `<span aria-hidden="true">＋</span><strong>Captura</strong><em data-capture-count hidden></em>`;
  document.body.append(button);
  updateLauncherCount();
}

function updateLauncherCount() {
  const count = loadState().quickCaptures.filter(item => item.status === "inbox").length;
  const node = document.querySelector("[data-capture-count]");
  if (!node) return;
  node.textContent = String(count);
  node.hidden = count === 0;
}

function captureTypeLabel(type) {
  return captureTypes.find(([value]) => value === type)?.[1] ?? "Nota";
}

function ensureCaptureInbox() {
  const heading = [...(root?.querySelectorAll(".door-header h2") ?? [])]
    .find(element => element.textContent?.trim() === "Actividad");
  const panel = heading?.closest(".door-view")?.querySelector(".panel-scroll");
  if (!panel || panel.querySelector("[data-capture-inbox]")) return;

  const captures = loadState().quickCaptures.filter(item => item.status === "inbox").slice(0, 20);
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.captureInbox = "true";
  card.innerHTML = `
    <div class="list-card-top"><div><h3>Bandeja de capturas</h3><p>${captures.length} pendientes de clasificar</p></div><span class="badge ${captures.length ? "pending" : "pass"}">${captures.length}</span></div>
    ${captures.length ? `<div class="capture-inbox-list">${captures.map(capture => `
      <article class="capture-inbox-item">
        <div><span class="badge info">${escapeHtml(captureTypeLabel(capture.type))}</span><p>${escapeHtml(capture.text)}</p></div>
        <button type="button" class="button ghost" data-capture-archive="${escapeHtml(capture.id)}">Archivar</button>
      </article>`).join("")}</div>` : `<p class="muted">No hay capturas pendientes.</p>`}
  `;
  panel.insertBefore(card, panel.firstChild);
}

function projectOptions(state) {
  return `<option value="">Sin proyecto</option>${state.projects
    .map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`)
    .join("")}`;
}

function openCapture() {
  if (backdrop) return;
  const state = loadState();
  backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop quick-capture-backdrop";
  backdrop.dataset.quickCaptureBackdrop = "true";
  backdrop.innerHTML = `
    <section class="modal quick-capture-modal" role="dialog" aria-modal="true" aria-labelledby="quick-capture-title">
      <header class="modal-header">
        <div class="list-card-top">
          <div><p class="eyebrow">Entrada universal</p><h2 id="quick-capture-title">Captura rápida</h2></div>
          <button type="button" class="icon-button" data-quick-capture-close aria-label="Cerrar">×</button>
        </div>
      </header>
      <div class="modal-body">
        <div class="notice">Guárdalo ahora y clasifícalo después. La entrada original quedará registrada en Actividad.</div>
        <form id="quick-capture-form" class="form-grid" style="margin-top:10px">
          <div class="field">
            <label for="capture-text">¿Qué necesitas recordar?</label>
            <textarea id="capture-text" name="text" maxlength="2000" required autofocus placeholder="Escribe la tarea, decisión, idea, bloqueo o nota…"></textarea>
          </div>
          <div class="quick-capture-grid">
            <div class="field">
              <label for="capture-type">Tipo</label>
              <select id="capture-type" name="type">${captureTypes.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select>
            </div>
            <div class="field">
              <label for="capture-priority">Prioridad</label>
              <select id="capture-priority" name="priority">
                <option value="low">Baja</option>
                <option value="medium" selected>Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="capture-project">Proyecto</label>
            <select id="capture-project" name="projectId">${projectOptions(state)}</select>
          </div>
          <div class="field">
            <label for="capture-due">Fecha objetivo opcional</label>
            <input id="capture-due" type="datetime-local" name="dueAt" value="" />
          </div>
          <label class="capture-owner-toggle">
            <input type="checkbox" name="needsOwner" value="yes" />
            <span><strong>Necesita de mí</strong><small>Envíala también a Atención porque requiere una decisión o acción real.</small></span>
          </label>
        </form>
      </div>
      <footer class="modal-footer">
        <button type="button" class="button ghost" data-quick-capture-close>Cancelar</button>
        <button type="submit" form="quick-capture-form" class="button gold">Guardar captura</button>
      </footer>
    </section>`;
  document.body.append(backdrop);
  window.setTimeout(() => backdrop?.querySelector("#capture-text")?.focus(), 50);
}

function closeCapture() {
  backdrop?.remove();
  backdrop = null;
}

function submitCapture(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const state = loadState();
  addQuickCapture(state, {
    text: values.text,
    type: values.type,
    priority: values.priority,
    projectId: values.projectId || null,
    dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
    needsOwner: values.needsOwner === "yes"
  });
  closeCapture();
  window.dispatchEvent(new CustomEvent("bitacora:state-changed", { detail: { door: "today" } }));
  announce("Captura guardada en la bandeja local");
}

document.addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("[data-quick-capture-open]")) {
    openCapture();
    return;
  }
  if (target?.closest("[data-quick-capture-close]")) {
    closeCapture();
    return;
  }
  const archiveButton = target?.closest("[data-capture-archive]");
  if (archiveButton) {
    archiveQuickCapture(loadState(), archiveButton.dataset.captureArchive);
    window.dispatchEvent(new CustomEvent("bitacora:state-changed", { detail: { door: "activity" } }));
    announce("Captura archivada");
    return;
  }
  if (target === backdrop) closeCapture();
});

document.addEventListener("submit", event => {
  if (!(event.target instanceof HTMLFormElement) || event.target.id !== "quick-capture-form") return;
  event.preventDefault();
  try {
    submitCapture(event.target);
  } catch (error) {
    console.error("No se pudo guardar la captura rápida.", error);
    announce(error.message || "No se pudo guardar la captura");
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && backdrop) closeCapture();
});

if (root) {
  const observer = new MutationObserver(() => {
    ensureLauncher();
    ensureCaptureInbox();
    updateLauncherCount();
  });
  observer.observe(root, { childList: true, subtree: true });
  ensureLauncher();
  ensureCaptureInbox();
}
