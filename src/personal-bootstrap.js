import { clearIndexedSnapshot } from "./persistence.js";
import { STORAGE_KEY } from "./state.js";

const EDITION_MARKER_KEY = "bitacora.personal.edition.marker";
const EDITION_REVISION = "bitacora-personal-v1";

/**
 * Clears the former public demo snapshot once so Bitácora Personal starts
 * without Orlando, ORVA or example business data. Future user data is kept.
 */
export async function ensurePersonalEdition() {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (localStorage.getItem(EDITION_MARKER_KEY) === EDITION_REVISION) return;

  localStorage.removeItem(STORAGE_KEY);
  try {
    await clearIndexedSnapshot();
  } catch (error) {
    console.warn("No se pudo eliminar el snapshot anterior de IndexedDB.", error);
  }

  localStorage.setItem(EDITION_MARKER_KEY, EDITION_REVISION);
}
