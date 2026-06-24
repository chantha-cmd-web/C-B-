import { useState, useEffect } from 'react';
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

/* ---------- per-collection error tracking ---------- */
const _collectionErrors: Record<string, string> = {};
export function getAllErrors(): Record<string, string> { return { ..._collectionErrors }; }
function setColError(coll: string, msg: string) {
  _collectionErrors[coll] = msg;
}
export function getCombinedError(): string {
  const msgs = Object.values(_collectionErrors).filter(Boolean);
  return msgs.length > 0 ? msgs.join(' | ') : '';
}

/* ---------- public CRUD API ---------- */

export async function setDoc(collectionName: string, id: string, data: unknown): Promise<void> {
  await fsSetDoc(doc(db, collectionName, id), {
    ...(data as Record<string, unknown>),
    timestamp: Timestamp.now().toMillis(),
  });
}

export async function getDocs<T>(collectionName: string): Promise<(T & { id: string })[]> {
  const snapshot = await fsGetDocs(collection(db, collectionName));
  return snapshotToArray<T>(snapshot);
}

export async function deleteDoc(collectionName: string, id: string): Promise<void> {
  await fsDeleteDoc(doc(db, collectionName, id));
}

/* ---------- reactive collection hook ---------- */

export function useRealtimeCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getDocs<T>(collectionName)
      .then((docs) => {
        if (cancelled) return;
        console.log(`FIRESTORE_OK [${collectionName}]: ${docs.length} docs`);
        setData(docs);
        setConnected(true);
        setColError(collectionName, '');
      })
      .catch((err: any) => {
        if (cancelled) return;
        const msg = err?.message || err?.code || String(err);
        console.error(`FIRESTORE_ERR [${collectionName}]`, err);
        setColError(collectionName, msg);
        setConnected(false);
      });

    const unsub = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        if (cancelled) return;
        const docs = snapshotToArray<T>(snapshot);
        console.log(`SNAP_OK [${collectionName}]: ${docs.length} docs`);
        setData(docs);
        setConnected(true);
        setColError(collectionName, '');
      },
      (err: any) => {
        if (cancelled) return;
        const msg = err?.message || err?.code || String(err);
        console.error(`SNAP_ERR [${collectionName}]`, err);
        setColError(collectionName, msg);
        setConnected(false);
      }
    );

    return () => { cancelled = true; unsub(); };
  }, [collectionName]);

  return { data, connected };
}

/* ---------- sync status hook ---------- */

export function useSyncStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'syncing'>('syncing');
  const [lastSync, setLastSync] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let tick = 0;
    const check = () => {
      tick++;
      const combined = getCombinedError();
      setError(combined);
      if (combined) {
        setStatus('disconnected');
      } else if (tick > 1) {
        setStatus('connected');
      }
      setLastSync(new Date().toLocaleTimeString());
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  return { status, lastSync, error };
}

/* ---------- force re-fetch ---------- */

export async function refetchCollection(collectionName: string): Promise<void> {
  try {
    const docs = await getDocs(collectionName);
    console.log(`REFETCH_OK [${collectionName}]: ${docs.length} docs`);
    setColError(collectionName, '');
  } catch (err: any) {
    const msg = err?.message || err?.code || String(err);
    console.error(`REFETCH_ERR [${collectionName}]`, err);
    setColError(collectionName, msg);
  }
}
