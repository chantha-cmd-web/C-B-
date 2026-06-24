import { useState, useEffect, useRef, useCallback } from 'react';
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

export async function setDoc(collectionName: string, id: string, data: unknown): Promise<void> {
  console.log(`FIREBASE: setDoc ${collectionName}/${id}`, data);
  await fsSetDoc(doc(db, collectionName, id), {
    ...(data as Record<string, unknown>),
    timestamp: Timestamp.now().toMillis(),
  });
  console.log(`FIREBASE: setDoc ${collectionName}/${id} SUCCESS`);
}

export async function getDocs<T>(collectionName: string): Promise<(T & { id: string })[]> {
  console.log(`FIREBASE: getDocs ${collectionName}`);
  const snapshot = await fsGetDocs(collection(db, collectionName), { source: 'server' });
  const result = snapshotToArray<T>(snapshot);
  console.log(`FIREBASE: getDocs ${collectionName} returned ${result.length} docs`);
  return result;
}

export async function deleteDoc(collectionName: string, id: string): Promise<void> {
  console.log(`FIREBASE: deleteDoc ${collectionName}/${id}`);
  await fsDeleteDoc(doc(db, collectionName, id));
}

export function useRealtimeCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    console.log(`FIREBASE: useRealtimeCollection mount ${collectionName}`);

    getDocs<T>(collectionName)
      .then((docs) => {
        if (cancelled) return;
        console.log(`FIREBASE: initial fetch ${collectionName} got ${docs.length} docs`);
        setData(docs);
        setConnected(true);
        setError('');
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error(`FIREBASE: initial fetch ERROR ${collectionName}:`, err);
        setError(String(err));
        setConnected(false);
      });

    const unsub = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        if (cancelled) return;
        const docs = snapshotToArray<T>(snapshot);
        console.log(`FIREBASE: onSnapshot ${collectionName} got ${docs.length} docs`);
        setData(docs);
        setConnected(true);
        setError('');
      },
      (err: any) => {
        if (cancelled) return;
        console.error(`FIREBASE: onSnapshot ERROR ${collectionName}:`, err);
        setError(String(err));
        setConnected(false);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [collectionName]);

  return { data, connected, error };
}

export function useSyncStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'syncing'>('syncing');
  const [lastSync, setLastSync] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const check = () => {
      const state = (window as any).__FIRESTORE_ERRORS;
      if (state && state.length > 0) {
        setError(state[state.length - 1]);
      }
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  return { status, lastSync, error };
}

export async function refetchCollection(collectionName: string): Promise<void> {
  console.log(`FIREBASE: refetchCollection ${collectionName}`);
  try {
    const docs = await getDocs(collectionName);
    console.log(`FIREBASE: refetchCollection ${collectionName} got ${docs.length} docs`);
  } catch (err) {
    console.error(`FIREBASE: refetchCollection error ${collectionName}:`, err);
  }
}
