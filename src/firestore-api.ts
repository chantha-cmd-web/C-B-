import { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  getDocs as fsGetDocs,
  setDoc as fsSetDoc,
  deleteDoc as fsDeleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

function snapshotToArray<T>(snapshot: any): (T & { id: string })[] {
  const arr: (T & { id: string })[] = [];
  snapshot.forEach((d: any) => {
    arr.push({ id: d.id, ...d.data() } as T & { id: string });
  });
  return arr;
}

/* ---------- public CRUD API ---------- */

export async function setDoc(collectionName: string, id: string, data: unknown): Promise<void> {
  await fsSetDoc(doc(db, collectionName, id), {
    ...(data as Record<string, unknown>),
    timestamp: Timestamp.now().toMillis(),
  });
}

export async function getDocs<T>(collectionName: string): Promise<(T & { id: string })[]> {
  const snapshot = await fsGetDocs(collection(db, collectionName), { source: 'server' });
  return snapshotToArray<T>(snapshot);
}

export async function deleteDoc(collectionName: string, id: string): Promise<void> {
  await fsDeleteDoc(doc(db, collectionName, id));
}

/* ---------- reactive collection hook with shared polling ---------- */

type CollectionState<T> = { data: T[]; connected: boolean };

const store = new Map<string, CollectionState<any>>();
const listeners = new Map<string, Set<() => void>>();
const pollTimers = new Map<string, ReturnType<typeof setInterval>>();
function notify(collectionName: string) {
  const set = listeners.get(collectionName);
  if (set) set.forEach((fn) => fn());
}

function subscribe(collectionName: string, fn: () => void) {
  if (!listeners.has(collectionName)) listeners.set(collectionName, new Set());
  listeners.get(collectionName)!.add(fn);
  return () => {
    const s = listeners.get(collectionName);
    if (s) s.delete(fn);
    if (s && s.size === 0) listeners.delete(collectionName);
  };
}

async function fetchAndSet(collectionName: string) {
  try {
    const docs = await getDocs(collectionName);
    store.set(collectionName, { data: docs, connected: true });
  } catch (err) {
    console.error(`Firestore fetch error [${collectionName}]:`, err);
    const existing = store.get(collectionName);
    store.set(collectionName, { data: existing?.data || [], connected: false });
  }
  notify(collectionName);
}

function startPolling(collectionName: string) {
  if (pollTimers.has(collectionName)) return;
  fetchAndSet(collectionName);
  pollTimers.set(collectionName, setInterval(() => fetchAndSet(collectionName), 3000));
}

function stopPollingIfEmpty(collectionName: string) {
  const set = listeners.get(collectionName);
  if (!set || set.size === 0) {
    const timer = pollTimers.get(collectionName);
    if (timer) { clearInterval(timer); pollTimers.delete(collectionName); }
  }
}

export function useRealtimeCollection<T>(collectionName: string) {
  const [state, setState] = useState<CollectionState<T>>(
    () => store.get(collectionName) || { data: [], connected: false }
  );

  useEffect(() => {
    if (!store.has(collectionName)) {
      store.set(collectionName, { data: [], connected: false });
    }

    const unsubStore = subscribe(collectionName, () => {
      setState({ ...(store.get(collectionName) as CollectionState<T>) });
    });

    startPolling(collectionName);

    const unsubSnapshot = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const docs = snapshotToArray<T>(snapshot);
        store.set(collectionName, { data: docs, connected: true });
        setState({ data: docs, connected: true });
      },
      (err) => {
        console.error(`Firestore onSnapshot error [${collectionName}]:`, err);
      }
    );

    return () => {
      unsubStore();
      unsubSnapshot();
      stopPollingIfEmpty(collectionName);
    };
  }, [collectionName]);

  return state;
}

/* ---------- sync status hook ---------- */

export function useSyncStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'syncing'>('syncing');
  const [lastSync, setLastSync] = useState('');

  useEffect(() => {
    const check = () => {
      const collections = ['resignations', 'nssf', 'donations', 'users', 'telegramSettings'];
      const allConnected = collections.every((c) => store.get(c)?.connected);
      const anyData = collections.some((c) => (store.get(c)?.data.length ?? 0) > 0);
      if (allConnected) {
        setStatus('connected');
        setLastSync(new Date().toLocaleTimeString());
      } else if (anyData) {
        setStatus('connected');
      } else {
        setStatus('syncing');
      }
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  return { status, lastSync };
}

/* ---------- force re-fetch ---------- */

export function refetchCollection(collectionName: string): Promise<void> {
  return fetchAndSet(collectionName);
}
