import { useState, useEffect, useRef, useCallback } from 'react';

const PROXY = '/api/firestore-proxy';

type Listener<T> = (data: T[]) => void;

/* ---------- raw HTTP helpers ---------- */

async function req<T>(method: string, collection: string, id?: string, body?: unknown): Promise<T> {
  const params = new URLSearchParams({ collection });
  if (id) params.set('id', id);
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && (method === 'POST' || method === 'PATCH')) opts.body = JSON.stringify(body);
  const res = await fetch(`${PROXY}?${params}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ---------- public CRUD API ---------- */

export async function addDoc<T>(collection: string, data: T): Promise<{ id: string }> {
  return req<{ id: string }>('POST', collection, undefined, data);
}

export async function setDoc(collection: string, id: string, data: unknown): Promise<void> {
  await req('POST', collection, id, data);
}

export async function getDocs<T>(collection: string): Promise<(T & { id: string })[]> {
  return req<(T & { id: string })[]>('GET', collection);
}

export async function getDoc<T>(collection: string, id: string): Promise<T & { id: string }> {
  return req<T & { id: string }>('GET', collection, id);
}

export async function deleteDoc(collection: string, id: string): Promise<void> {
  await req('DELETE', collection, id);
}

/* ---------- real-time polling hook ---------- */

let globalListeners: Map<string, Set<Listener<unknown>>> = new Map();
let pollTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
let pollCache: Map<string, unknown[]> = new Map();

function startPolling(collection: string) {
  if (pollTimers.has(collection)) return;
  const poll = async () => {
    try {
      const docs = await req<unknown[]>('GET', collection);
      pollCache.set(collection, docs);
      const listeners = globalListeners.get(collection);
      if (listeners) listeners.forEach(fn => fn(docs));
    } catch {
      // poll will retry next interval
    }
  };
  poll();
  pollTimers.set(collection, setInterval(poll, 2500));
}

function stopPollingIfEmpty(collection: string) {
  const listeners = globalListeners.get(collection);
  if (!listeners || listeners.size === 0) {
    const timer = pollTimers.get(collection);
    if (timer) { clearInterval(timer); pollTimers.delete(collection); }
  }
}

export function useRealtimeCollection<T>(collection: string) {
  const [data, setData] = useState<T[]>(() => (pollCache.get(collection) || []) as T[]);
  const [connected, setConnected] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    const handler = (docs: unknown[]) => {
      setData(docs as T[]);
      setConnected(true);
      syncedRef.current = true;
    };

    if (!globalListeners.has(collection)) globalListeners.set(collection, new Set());
    globalListeners.get(collection)!.add(handler);

    const cached = pollCache.get(collection);
    if (cached) setData(cached as T[]);

    startPolling(collection);

    const connTimer = setTimeout(() => {
      if (!syncedRef.current) setConnected(false);
    }, 5000);

    return () => {
      clearTimeout(connTimer);
      const listeners = globalListeners.get(collection);
      if (listeners) { listeners.delete(handler); }
      stopPollingIfEmpty(collection);
    };
  }, [collection]);

  return { data, connected };
}

/* ---------- sync status hook ---------- */

export function useSyncStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'syncing'>('syncing');
  const [lastSync, setLastSync] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      let anyConnected = false;
      for (const [, listeners] of globalListeners) {
        if (listeners.size > 0) { anyConnected = true; break; }
      }
      const hasCache = pollCache.size > 0;
      if (anyConnected && hasCache) {
        setStatus('connected');
        setLastSync(new Date().toLocaleTimeString());
      } else if (!hasCache) {
        setStatus('syncing');
      } else {
        setStatus('disconnected');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return { status, lastSync };
}

/* ---------- force a re-fetch ---------- */

export function refetchCollection(collection: string): Promise<void> {
  const doFetch = async () => {
    const docs = await req<unknown[]>('GET', collection);
    pollCache.set(collection, docs);
    const listeners = globalListeners.get(collection);
    if (listeners) listeners.forEach(fn => fn(docs));
  };
  return doFetch().catch(() => {});
}
