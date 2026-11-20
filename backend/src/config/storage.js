// Supabase Storage configuration for evidence documents.
//
// Evidence files live as objects in a private Supabase Storage bucket and the
// database stores only the object key. When the storage environment is not
// configured (local development, or a deployment that has not been switched
// over yet) the app falls back to storing the data URL on the record, so
// behaviour never changes silently.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const BUCKET = process.env.DOCUMENTS_BUCKET || 'documents';

let cachedClient = null;
let resolved = false;

function getSupabaseClient() {
  if (resolved) return cachedClient;
  resolved = true;

  const url = process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceRoleKey) {
    cachedClient = null;
    return null;
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    cachedClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (err) {
    console.error('Supabase Storage unavailable:', err.message);
    cachedClient = null;
  }
  return cachedClient;
}

function isStorageConfigured() {
  return getSupabaseClient() !== null;
}

module.exports = { BUCKET, getSupabaseClient, isStorageConfigured };
