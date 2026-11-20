// Idempotent bootstrap for the private evidence document bucket.
//
// Run with Node 20+ after setting SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
//   node scripts/ensure-document-bucket.js
const { BUCKET, getSupabaseClient, isStorageConfigured } = require('../src/config/storage');
const { ALLOWED_MIME_TYPES, MAX_BYTES } = require('../src/utils/documentUpload');

async function main() {
  if (!isStorageConfigured()) {
    console.error('Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = getSupabaseClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`Could not list storage buckets: ${listError.message}`);
    process.exit(1);
  }

  const existing = (buckets || []).find((bucket) => bucket.name === BUCKET);
  if (existing) {
    console.log(`Bucket "${BUCKET}" already exists (public: ${existing.public}).`);
    return;
  }

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES
  });
  if (error) {
    console.error(`Could not create bucket "${BUCKET}": ${error.message}`);
    process.exit(1);
  }

  console.log(`Created private bucket "${BUCKET}" (${MAX_BYTES} bytes, ${ALLOWED_MIME_TYPES.length} mime types).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
