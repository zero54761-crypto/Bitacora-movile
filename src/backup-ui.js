import {
  MAX_BACKUP_BYTES,
  backupFilename,
  parseBackup,
  restoreBackupText,
  serializeBackup
} from "./backup.js";
import { loadState } from "./state.js";

const root = document.querySelector("#app");
const nativeBridge = () => window.BitacoraNative;

function setStatus(message, kind = "info") {
  const status = root?.querySelector("[data-backup-status]");
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

function summarize(state) {
  return [
    `${state.alarms.length} alarmas`,
    `${state.events.length} eventos`,
    `${state.lifeCheckins.length} check-ins`,
    `${state.projects.length} proyectos`
  ].join(" · ");
}

function downloadInBrowser(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

async function exportBackup() {
  try {
    const state = loadState();
    const text = serializeBackup(state);
    const filename = backupFilename();

    if (nativeBridge()?.saveBackup) {
      setStatus("Elige dónde guardar el respaldo en tu teléfono…");
      nativeBridge().saveBackup(filename, text);
      return;
    }

    downloadInBrowser(filename, text);
    setStatus(`Respaldo preparado: ${summarize(state)}.`, "success");
  } catch (error) {
    console.error("No se pudo exportar el respaldo.", error);
    setStatus(error.message || "No se pudo exportar el respaldo.", "error");
  }
}

async function restoreFromText(text, sourceLabel = "archivo seleccionado") {
  try {
    const candidate = parseBackup(text);
    const confirmed = window.confirm(
      `Restaurar ${sourceLabel} reemplazará los datos locales actuales.\n\n` +
      `${summarize(candidate)}\n\n¿Continuar?`
    );
    if (!confirmed) {
      setStatus("Restauración cancelada; no se modificó ningún dato.");
      return;
    }

    restoreBackupText(text);
    setStatus("Respaldo restaurado. Reiniciando Bitácora…", "success");
    window.setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    console.error("No se pudo restaurar el respaldo.", error);
    setStatus(error.message || "No se pudo restaurar el respaldo.", "error");
  }
}

function requestImport(card) {
  if (nativeBridge()?.openBackup) {
    setStatus("Selecciona un respaldo de Bitácora…");
    nativeBridge().openBackup();
    return;
  }
  card.querySelector("[data-backup-file]")?.click();
}

function bindCard(card) {
  card.querySelector("[data-backup-export]")?.addEventListener("click", exportBackup);
  card.querySelector("[data-backup-import]")?.addEventListener("click", () => requestImport(card));
  card.querySelector("[data-backup-file]")?.addEventListener("change", async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setStatus("El archivo excede el límite local de 2 MB.", "error");
      return;
    }
    await restoreFromText(await file.text(), file.name);
  });
}

function ensureBackupCard() {
  const settingsHeading = [...(root?.querySelectorAll(".door-header h2") ?? [])]
    .find(element => element.textContent?.trim() === "Configuración");
  const panel = settingsHeading?.closest(".door-view")?.querySelector(".panel-scroll");
  if (!panel || panel.querySelector("[data-backup-card]")) return;

  const card = document.createElement("div");
  card.className = "card";
  card.dataset.backupCard = "true";
  card.innerHTML = `
    <h3>Respaldo local</h3>
    <p>Guarda alarmas, eventos, check-ins, proyectos, preferencias y actividad en un archivo JSON validado.</p>
    <div class="notice warning">El archivo no está cifrado. Guárdalo en una ubicación privada y no lo compartas.</div>
    <div class="actions" style="margin-top:10px">
      <button type="button" class="button primary" data-backup-export>Exportar respaldo</button>
      <button type="button" class="button" data-backup-import>Restaurar respaldo</button>
    </div>
    <input type="file" accept="application/json,.json" hidden data-backup-file />
    <p class="muted" data-backup-status>Sincronización remota desactivada; el respaldo queda bajo tu control.</p>
  `;

  const localDataCard = [...panel.querySelectorAll(".card")]
    .find(element => element.querySelector("h3")?.textContent?.trim() === "Datos locales");
  panel.insertBefore(card, localDataCard ?? null);
  bindCard(card);
}

window.addEventListener("bitacora:native-backup-result", event => {
  const detail = event.detail ?? {};
  setStatus(detail.message || (detail.ok ? "Respaldo guardado." : "No se guardó el respaldo."), detail.ok ? "success" : "error");
});

window.addEventListener("bitacora:native-backup-import", async event => {
  const detail = event.detail ?? {};
  if (!detail.ok) {
    setStatus(detail.message || "No se seleccionó un respaldo.", "error");
    return;
  }
  await restoreFromText(detail.content, detail.name || "respaldo seleccionado");
});

if (root) {
  const observer = new MutationObserver(ensureBackupCard);
  observer.observe(root, { childList: true, subtree: true });
  ensureBackupCard();
}
