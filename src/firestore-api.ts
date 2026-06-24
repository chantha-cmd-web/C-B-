import { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  getDocs as fsGetDocs,
  setDoc as fsSetDoc,
  deleteDoc as fsDeleteDoc,
  Timestamp,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

function snapshotToArray<T>(snapshot: QuerySnapshot<DocumentData>): (T & { id: string })[] {
  const arr: (T & { id: string })[] = [];
  snapshot.forEach((d) => {
    arr.push({ id: d.id, ...d.data() } as T & { id: string });
  });
  return arr;
}

export async function addDoc<T>(_collection: string, _data: T): Promise<{ id: string }> {
  throw new Error('Use setDoc with a generated id instead');
}

export async function setDoc(collectionName: string, id: string, data: unknown): Promise<void> {
  await fsSetDoc(doc(db, collectionName, id), { ...(data as Record<string, unknown>), timestamp: Timestamp.now().toMillis() });
}

export async function getDocs<T>(collectionName: string): Promise<(T & { id: string })[]> {
  const snapshot = await fsGetDocs(collection(db, collectionName));
  return snapshotToArray<T>(snapshot);
}

export async function getDoc<T>(collectionName: string, id: string): Promise<T & { id: string }> {
  const d = await fsGetDocs(collection(db, collectionName));
  const found = snapshotToArray<T>(d).find((item) => item.id === id);
  if (!found) throw new Error('Document not found');
  return found;
}

export async function deleteDoc(collectionName: string, id: string): Promise<void> {
  await fsDeleteDoc(doc(db, collectionName, id));
}

export function useRealtimeCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        setData(snapshotToArray<T>(snapshot) as unknown as T[]);
        setConnected(true);
        syncedRef.current = true;
      },
      () => {
        setConnected(false);
      }
    );

    const connTimer = setTimeout(() => {
      if (!syncedRef.current) setConnected(false);
    }, 5000);

    return () => {
      unsub();
      clearTimeout(connTimer);
    };
  }, [collectionName]);

  return { data, connected };
}

export function useSyncStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'syncing'>('syncing');
  const [lastSync, setLastSync] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus('connected');
      setLastSync(new Date().toLocaleTimeString());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return { status, lastSync };
}

export function refetchCollection(_collection: string): Promise<void> {
  return Promise.resolve();
}
