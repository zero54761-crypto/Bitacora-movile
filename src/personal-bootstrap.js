import { clearIndexedSnapshot } from "./persistence.js";
import { STORAGE_KEY } from "./state.js";

const EDITION_MARKER_KEY = "bitacora.personal.edition.marker";
const EDITION_REVISION = "bitacora-personal-v1";
const LEGACY_STORAGE_KEY = "bitacora.u1.state.v1";
const LEGACY_DATABASE_NAME = "bitacora-local";

function deleteLegacyDatabase() {
  if (typeof indexedDB === "undefined") return Promise.resolve(false);
  return new Promise(resolve => {
    const request = indexedDB.deleteDatabase(LEGACY_DATABASE_NAME);
    request.addEventListener("success", () => resolve(true), { once: true });
    request.addEventListener("error", () => resolve(false), { once: true });
    request.addEventListener("blocked", () => resolve(false), { once: true });
  });
}

/**
 * Removes the former public demo snapshot once. Future data created in the
 * generic edition is kept under its own storage key and IndexedDB database.
 */
export async function ensurePersonalEdition() {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (localStorage.getItem(EDITION_MARKER_KEY) === EDITION_REVISION) return;

  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);

  await Promise.allSettled([
    clearIndexedSnapshot(),
    deleteLegacyDatabase()
  ]);

  localStorage.setItem(EDITION_MARKER_KEY, EDITION_REVISION);
}
