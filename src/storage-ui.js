import { getStorageStatus, requestPersistentStorage } from "./persistence.js";

const root = document.querySelector("#app");

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function announce(message) {
  window.dispatchEvent(new CustomEvent("bitacora:toast", { detail: { message } }));
}

async function refreshStatus(card) {
  const statusNode = card.querySelector("[data-storage-status]");
  const button = card.querySelector("[data-storage-persist]");
  try {
    const status = await getStorageStatus();
    const indexedLabel = status.indexedDb ? "IndexedDB activo" : "IndexedDB no disponible";
    const persistenceLabel = status.persisted ? "protección persistente activa" : "protección persistente pendiente";
    const quotaLabel = status.quota
      ? `${formatBytes(status.usage)} usados de ${formatBytes(status.quota)}`
      : "cuota no informada por el navegador";
    statusNode.textContent = `${indexedLabel} · ${persistenceLabel} · ${quotaLabel}.`;
    statusNode.dataset.kind = status.persisted ? "success" : "info";
    button.disabled = status.persisted || !status.persistenceApi;
    button.textContent = status.persisted
      ? "Almacenamiento protegido"
      : status.persistenceApi
        ? "Proteger almacenamiento"
        : "Protección no disponible";
  } catch (error) {
    console.error("No se pudo consultar el almacenamiento.", error);
    statusNode.textContent = "No se pudo consultar el estado; el respaldo manual continúa disponible.";
    statusNode.dataset.kind = "error";
  }
}

async function requestProtection(card) {
  const button = card.querySelector("[data-storage-persist]");
  button.disabled = true;
  try {
    const result = await requestPersistentStorage();
    announce(result.granted
      ? "El navegador protegió el almacenamiento local"
      : result.supported
        ? "El navegador no concedió protección automática; conserva respaldos"
        : "Este navegador no ofrece protección persistente");
  } catch (error) {
    console.error("No se pudo solicitar almacenamiento persistente.", error);
    announce("No se pudo solicitar protección; conserva respaldos manuales");
  } finally {
    await refreshStatus(card);
  }
}

function bindCard(card) {
  if (card.dataset.storageBound === "true") return;
  card.dataset.storageBound = "true";
  card.querySelector("[data-storage-persist]")?.addEventListener("click", () => requestProtection(card));
  void refreshStatus(card);
}

function ensureStorageCard() {
  const settingsHeading = [...(root?.querySelectorAll(".door-header h2") ?? [])]
    .find(element => element.textContent?.trim() === "Configuración");
  const panel = settingsHeading?.closest(".door-view")?.querySelector(".panel-scroll");
  if (!panel) return;

  let card = panel.querySelector("[data-storage-card]");
  if (!card) {
    card = document.createElement("div");
    card.className = "card";
    card.dataset.storageCard = "true";
    card.innerHTML = `
      <h3>Almacenamiento resistente</h3>
      <p>Bitácora conserva un espejo de recuperación y usa IndexedDB para soportar más actividad sin depender de un servidor.</p>
      <div class="actions">
        <button type="button" class="button primary" data-storage-persist>Proteger almacenamiento</button>
      </div>
      <p class="muted" data-storage-status>Consultando almacenamiento…</p>
      <div class="notice warning">La protección del navegador reduce el riesgo de limpieza automática, pero no sustituye el respaldo JSON.</div>
    `;

    const backupCard = panel.querySelector("[data-backup-card]");
    panel.insertBefore(card, backupCard ?? panel.firstChild);
  }
  bindCard(card);
}

if (root) {
  const observer = new MutationObserver(ensureStorageCard);
  observer.observe(root, { childList: true, subtree: true });
  ensureStorageCard();
}
