import { useState, useEffect } from 'react';
import {
  doc,
  setDoc as fsSetDoc,
  deleteDoc as fsDeleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const PROJECT_ID = 'project-0b4113c8-b2dc-4744-aea';
const API_KEY = 'AIzaSyC_SjrFs-PvlTYpiOgI3Spl4FpRz36zD5M';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/* ---------- REST API helpers (direct HTTP fetch, no SDK) ---------- */

function decodeFields(fields: any): any {
  if (!fields) return {};
  const obj: any = {};
  for (const key of Object.keys(fields)) {
    obj[key] = decodeValue(fields[key]);
  }
  return obj;
}

function decodeValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== null && value.nullValue !== undefined) return null;
  if (value.timestampValue) return value.timestampValue;
  if (value.mapValue?.fields) return decodeFields(value.mapValue.fields);
  if (value.arrayValue?.values) return value.arrayValue.values.map(decodeValue);
  return null;
}

function encodeValue(value: any): any {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } };
  return { nullValue: null };
}

function encodeFields(obj: any): any {
  const fields: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined && val !== null) fields[key] = encodeValue(val);
  }
  return fields;
}

function extractId(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

function docToObject(doc: any): any {
  return { id: extractId(doc.name), ...decodeFields(doc.fields) };
}

async function restGet<T>(collectionName: string): Promise<(T & { id: string })[]> {
  const url = `${BASE}/${collectionName}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`REST GET ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.documents || []).map(docToObject);
}

/* ---------- public CRUD API (uses Firestore SDK for writes) ---------- */

export async function setDoc(collectionName: string, id: string, data: unknown): Promise<void> {
  await fsSetDoc(doc(db, collectionName, id), {
    ...(data as Record<string, unknown>),
    timestamp: Timestamp.now().toMillis(),
  });
}

export async function getDocs<T>(collectionName: string): Promise<(T & { id: string })[]> {
  return restGet<T>(collectionName);
}

export async function deleteDoc(collectionName: string, id: string): Promise<void> {
  await fsDeleteDoc(doc(db, collectionName, id));
}

/* ---------- reactive collection hook with shared polling via REST ---------- */

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
    const docs = await restGet(collectionName);
    store.set(collectionName, { data: docs, connected: true });
  } catch (err) {
    console.error(`Firestore REST fetch error [${collectionName}]:`, err);
    const existing = store.get(collectionName);
    store.set(collectionName, { data: existing?.data || [], connected: false });
  }
  notify(collectionName);
}

function startPolling(collectionName: string) {
  if (pollTimers.has(collectionName)) return;
  fetchAndSet(collectionName);
  pollTimers.set(collectionName, setInterval(() => fetchAndSet(collectionName), 2000));
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

    return () => {
      unsubStore();
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
