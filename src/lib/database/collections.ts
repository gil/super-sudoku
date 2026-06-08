import {t} from "i18next";

export enum BaseCollection {
  Easy = "easy",
  Medium = "medium",
  Hard = "hard",
  Expert = "expert",
  Evil = "evil",
}

export function translateCollectionName(collectionName: string) {
  // TODO: Find better place for this.
  const BASE_COLLECTION_TRANSLATION: Record<BaseCollection, string> = {
    [BaseCollection.Easy]: t("difficulty_easy"),
    [BaseCollection.Medium]: t("difficulty_medium"),
    [BaseCollection.Hard]: t("difficulty_hard"),
    [BaseCollection.Expert]: t("difficulty_expert"),
    [BaseCollection.Evil]: t("difficulty_evil"),
  };
  // TODO: We should also pass the collection id, not just the name.
  if (collectionName in BASE_COLLECTION_TRANSLATION) {
    return BASE_COLLECTION_TRANSLATION[collectionName as BaseCollection];
  }
  return collectionName;
}

export interface CollectionIndex {
  id: string;
  name: string;
}

export interface Collection extends CollectionIndex {
  sudokusRaw: string;
}

interface CollectionRepository {
  getCollections(): CollectionIndex[];
  getCollection(collectionId: string): Collection;
  // Reads are synchronous (served from cache); writes update the cache synchronously and the
  // returned promise resolves once the change is persisted to IndexedDB (or rejects, e.g. on
  // a quota error, so callers can surface it).
  saveCollection(collection: Collection): Promise<void>;
  removeCollection(collectionId: string): Promise<void>;
}

// Collections are persisted in IndexedDB so we are not bound by the ~5MB localStorage
// quota and can hold large imported datasets. To keep the rest of the app synchronous
// (state initialisation, useMemo selectors, paginated parsing) we mirror IndexedDB in an
// in-memory cache that is hydrated once at startup via `hydrateCollections`. Reads hit the
// cache synchronously; writes update the cache synchronously and are flushed to IndexedDB
// asynchronously through a serialized queue.

const DB_NAME = "super-sudoku";
const DB_VERSION = 2;
const STORE_NAME = "collections";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {keyPath: "id"});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGetAll(): Promise<Collection[]> {
  const db = await openDB();
  const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
  return promisifyRequest(store.getAll() as IDBRequest<Collection[]>);
}

async function idbPut(collection: Collection): Promise<void> {
  const db = await openDB();
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  await promisifyRequest(store.put(collection));
}

async function idbDelete(collectionId: string): Promise<void> {
  const db = await openDB();
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  await promisifyRequest(store.delete(collectionId));
}

const cache = new Map<string, Collection>();

// Serializes writes so concurrent saves keep order. Returns the promise for this specific
// operation (which may reject) while keeping the shared chain alive regardless of failures.
let persistQueue: Promise<unknown> = Promise.resolve();
function enqueuePersist(op: () => Promise<void>): Promise<void> {
  const run = persistQueue.then(op);
  persistQueue = run.catch(() => {});
  return run;
}

// Loads all collections into the in-memory cache. Must be awaited before the app renders.
export async function hydrateCollections(): Promise<void> {
  cache.clear();
  try {
    const stored = await idbGetAll();
    for (const collection of stored) {
      cache.set(collection.id, collection);
    }
  } catch (error) {
    // IndexedDB can be unavailable (e.g. private browsing). The app still works with the
    // bundled base collections; user collections just won't persist this session.
    console.error("Failed to hydrate collections from IndexedDB", error);
  }
}

export const collectionRepository: CollectionRepository = {
  getCollections(): CollectionIndex[] {
    return [...cache.values()].map(({id, name}) => ({id, name}));
  },
  getCollection(collectionId: string): Collection {
    const collection = cache.get(collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }
    return collection;
  },
  saveCollection(collection: Collection): Promise<void> {
    cache.set(collection.id, collection);
    return enqueuePersist(() => idbPut(collection));
  },
  removeCollection(collectionId: string): Promise<void> {
    cache.delete(collectionId);
    return enqueuePersist(() => idbDelete(collectionId));
  },
};
