export type RememberedImageSet = {
  id: string;
  label: string;
  files: File[];
};

const DATABASE = "personal-sommelier";
const STORE = "conversation-images";
const KEY = "current";

export async function loadRememberedImageSets(): Promise<RememberedImageSet[]> {
  return run("readonly", (store) => store.get(KEY), []);
}

export async function saveRememberedImageSets(sets: RememberedImageSet[]): Promise<void> {
  await run("readwrite", (store) => store.put(sets, KEY), undefined);
}

export async function clearRememberedImageSets(): Promise<void> {
  await run("readwrite", (store) => store.delete(KEY), undefined);
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest, fallback: T): Promise<T> {
  if (typeof indexedDB === "undefined") return Promise.resolve(fallback);
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DATABASE, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const transaction = open.result.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      request.onsuccess = () => resolve((request.result ?? fallback) as T);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => open.result.close();
    };
  });
}
