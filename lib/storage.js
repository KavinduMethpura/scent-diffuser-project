import fs from 'fs';
import path from 'path';

let vercelKv = null;
const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;

if (kvUrl && kvToken && !kvUrl.includes('...') && kvUrl.startsWith('https://')) {
  try {
    const { kv } = require('@vercel/kv');
    vercelKv = kv;
  } catch (e) {
    vercelKv = null;
  }
}

// Fallback local file storage for seamless local development
const localFile = path.join(process.cwd(), '.local_kv_store.json');

function readStore() {
  try {
    if (fs.existsSync(localFile)) {
      return JSON.parse(fs.readFileSync(localFile, 'utf8'));
    }
  } catch (err) {
    console.warn('[STORAGE] Local store read error:', err.message);
  }
  return {};
}

function writeStore(data) {
  try {
    fs.writeFileSync(localFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[STORAGE] Local store write error:', err.message);
  }
}

export const storage = {
  async get(key) {
    if (vercelKv) {
      return await vercelKv.get(key);
    }
    const store = readStore();
    return store[key] !== undefined ? store[key] : null;
  },

  async set(key, value) {
    if (vercelKv) {
      return await vercelKv.set(key, value);
    }
    const store = readStore();
    store[key] = value;
    writeStore(store);
    return 'OK';
  },
};
