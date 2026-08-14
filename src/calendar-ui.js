import { buildIcsEvent, calendarFilename } from "./calendar-export.js";
import { loadState } from "./state.js";

const root = document.querySelector("#app");

function announce(message) {
  window.dispatchEvent(new CustomEvent("bitacora:toast", { detail: { message } }));
}

function downloadCalendar(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
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

async function shareCalendar(event) {
  const content = buildIcsEvent(event);
  const filename = calendarFilename(event);
  const file = typeof File !== "undefined"
    ? new File([content], filename, { type: "text/calendar;charset=utf-8" })
    : null;

  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: event.title,
      text: "Agregar evento de Bitácora al calendario del teléfono",
      files: [file]
    });
    return "Evento enviado al calendario o aplicación elegida";
  }

  downloadCalendar(filename, content);
  return "Archivo de calendario preparado";
}

function ensureCalendarButtons() {
  const cards = root?.querySelectorAll(".list-card") ?? [];
  for (const card of cards) {
    const editButton = card.querySelector('[data-action="edit-event"][data-id]');
    const actions = editButton?.closest(".actions");
    if (!editButton || !actions || actions.querySelector("[data-calendar-export]")) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button calendar-share-button";
    button.dataset.calendarExport = editButton.dataset.id;
    button.textContent = "Añadir al calendario";
    actions.insertBefore(button, actions.firstChild);
  }
}

document.addEventListener("click", async event => {
  const target = event.target instanceof Element ? event.target.closest("[data-calendar-export]") : null;
  if (!target) return;

  target.disabled = true;
  try {
    const state = loadState();
    const calendarEvent = state.events.find(item => item.id === target.dataset.calendarExport);
    if (!calendarEvent) throw new Error("El evento ya no existe.");
    announce(await shareCalendar(calendarEvent));
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("No se pudo preparar el evento para el calendario.", error);
      announce(error.message || "No se pudo preparar el evento");
    }
  } finally {
    target.disabled = false;
  }
});

if (root) {
  const observer = new MutationObserver(ensureCalendarButtons);
  observer.observe(root, { childList: true, subtree: true });
  ensureCalendarButtons();
}
