import { deepClone } from "./utils.js";

export const INDEXED_DB_NAME = "bitacora-local";
export const INDEXED_DB_VERSION = 1;
export const INDEXED_STATE_KEY = "current-state";

const STORE_NAME = "snapshots";
let databasePromise = null;
let writeQueue = Promise.resolve();

export function isIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB falló.")), { once: true });
  });
}

function openDatabase() {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    });

    request.addEventListener("success", () => {
      const database = request.result;
      database.addEventListener("versionchange", () => database.close());
      resolve(database);
    }, { once: true });

    request.addEventListener("error", () => {
      databasePromise = null;
      reject(request.error ?? new Error("No se pudo abrir IndexedDB."));
    }, { once: true });

    request.addEventListener("blocked", () => {
      databasePromise = null;
      reject(new Error("IndexedDB está bloqueado por otra pestaña de Bitácora."));
    }, { once: true });
  });

  return databasePromise;
}

async function withStore(mode, operation) {
  const database = await openDatabase();
  if (!database) return null;

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let operationResult;

    try {
      operationResult = operation(store);
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }

    transaction.addEventListener("complete", () => resolve(operationResult), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("Transacción IndexedDB cancelada.")), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error ?? new Error("Transacción IndexedDB falló.")), { once: true });
  });
}

export async function readIndexedSnapshot() {
  if (!isIndexedDbAvailable()) return null;
  const database = await openDatabase();
  if (!database) return null;
  const transaction = database.transaction(STORE_NAME, "readonly");
  const record = await requestAsPromise(transaction.objectStore(STORE_NAME).get(INDEXED_STATE_KEY));
  return record?.value ? deepClone(record.value) : null;
}

export async function writeIndexedSnapshot(state) {
  if (!isIndexedDbAvailable()) return false;
  const snapshot = deepClone(state);
  await withStore("readwrite", store => {
    store.put({
      key: INDEXED_STATE_KEY,
      value: snapshot,
      updatedAt: snapshot.meta?.updatedAt ?? new Date().toISOString()
    });
  });
  return true;
}

export function queueIndexedSnapshot(state) {
  const snapshot = deepClone(state);
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => writeIndexedSnapshot(snapshot))
    .catch(error => {
      console.warn("No se pudo guardar el espejo IndexedDB de Bitácora.", error);
      return false;
    });
  return writeQueue;
}

export async function clearIndexedSnapshot() {
  if (!isIndexedDbAvailable()) return false;
  await withStore("readwrite", store => store.delete(INDEXED_STATE_KEY));
  return true;
}

function timestampOf(snapshot) {
  const value = snapshot?.meta?.updatedAt ?? snapshot?.meta?.createdAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function chooseNewestSnapshot(indexedSnapshot, localSnapshot) {
  if (!indexedSnapshot && !localSnapshot) return null;
  if (!indexedSnapshot) return deepClone(localSnapshot);
  if (!localSnapshot) return deepClone(indexedSnapshot);
  return deepClone(timestampOf(localSnapshot) > timestampOf(indexedSnapshot) ? localSnapshot : indexedSnapshot);
}

export async function getStorageStatus() {
  const storageManager = typeof navigator !== "undefined" ? navigator.storage : null;
  const estimate = storageManager?.estimate ? await storageManager.estimate() : {};
  const persisted = storageManager?.persisted ? await storageManager.persisted() : false;
  return {
    indexedDb: isIndexedDbAvailable(),
    persistenceApi: Boolean(storageManager?.persist),
    persisted: Boolean(persisted),
    usage: Number(estimate.usage ?? 0),
    quota: Number(estimate.quota ?? 0)
  };
}

export async function requestPersistentStorage() {
  const storageManager = typeof navigator !== "undefined" ? navigator.storage : null;
  if (!storageManager?.persist) {
    return { granted: false, supported: false, status: await getStorageStatus() };
  }
  const granted = await storageManager.persist();
  return { granted: Boolean(granted), supported: true, status: await getStorageStatus() };
}
