const PROJECT_ID = 'project-0b4113c8-b2dc-4744-aea';
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 120000) return cachedToken;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Token refresh failed: ' + err);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function firestoreRequest(method, path, body) {
  const token = await getAccessToken();
  const url = BASE + path;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body && (method === 'POST' || method === 'PATCH')) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore API error ${res.status}: ${err}`);
  }
  return res.json();
}

function decodeValue(value) {
  if (value === null || value === undefined) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== null && value.nullValue !== undefined) return null;
  if (value.timestampValue) return value.timestampValue;
  if (value.mapValue && value.mapValue.fields) return decodeFields(value.mapValue.fields);
  if (value.arrayValue && value.arrayValue.values) return value.arrayValue.values.map(decodeValue);
  return null;
}

function decodeFields(fields) {
  if (!fields) return {};
  const obj = {};
  for (const key of Object.keys(fields)) {
    obj[key] = decodeValue(fields[key]);
  }
  return obj;
}

function encodeValue(value) {
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

function encodeFields(obj) {
  const fields = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined && val !== null) fields[key] = encodeValue(val);
  }
  return fields;
}

function docPath(col, id) { return `/${col}/${id}`; }

function extractId(name) {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

function docToObject(doc) {
  return { id: extractId(doc.name), ...decodeFields(doc.fields), _update: doc.updateTime };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return res.status(503).json({ error: 'GOOGLE_REFRESH_TOKEN not configured' });
  }
  try {
    const col = req.query.collection;
    const id = req.query.id;
    if (!col) return res.status(400).json({ error: 'collection query param required' });

    if (req.method === 'GET') {
      if (id) {
        const doc = await firestoreRequest('GET', docPath(col, id));
        return res.json(docToObject(doc));
      }
      const result = await firestoreRequest('POST', ':runQuery', {
        structuredQuery: { from: [{ collectionId: col }] },
      });
      const docs = result
        .filter(r => r.document)
        .map(r => docToObject(r.document));
      return res.json(docs);
    }

    if (req.method === 'POST') {
      const data = req.body || {};
      if (id) {
        const doc = await firestoreRequest('PATCH', docPath(col, id), { fields: encodeFields(data) });
        return res.json({ id, ...docToObject(doc) });
      }
      const doc = await firestoreRequest('POST', `/${col}`, { fields: encodeFields(data) });
      return res.json({ id: extractId(doc.name), ...docToObject(doc) });
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'id required for PATCH' });
      const data = req.body || {};
      const doc = await firestoreRequest('PATCH', docPath(col, id), { fields: encodeFields({ ...data }) });
      return res.json({ id, ...docToObject(doc) });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required for DELETE' });
      await firestoreRequest('DELETE', docPath(col, id));
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('firestore-proxy error:', err);
    res.status(500).json({ error: err.message });
  }
}
