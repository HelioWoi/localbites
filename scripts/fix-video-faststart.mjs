#!/usr/bin/env node
/**
 * ============================================================================
 * FIX VIDEO FASTSTART - Migration Script
 * ============================================================================
 * 
 * Root cause: Videos uploaded via browser have moov atom at END of file.
 * This means the browser must download the ENTIRE file before playing.
 * 
 * Fix: ffmpeg -c copy -movflags +faststart moves moov to the beginning.
 * This is a LOSSLESS operation (no re-encoding, just remuxing).
 * 
 * Usage:
 *   node scripts/fix-video-faststart.mjs
 * 
 * Requirements:
 *   - ffmpeg installed (brew install ffmpeg)
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY env vars (or .env file)
 * ============================================================================
 */

import { execSync } from 'child_process';
import { mkdtempSync, unlinkSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Load .env file manually
function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    console.error('❌ .env file not found. Run this script from project root.');
    process.exit(1);
  }
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const BUCKET = 'menu-videos';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

// Check ffmpeg is installed
try {
  execSync('ffmpeg -version', { stdio: 'pipe' });
} catch {
  console.error('❌ ffmpeg not found. Install with: brew install ffmpeg');
  process.exit(1);
}

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      ...options.headers,
    },
  });
  return res;
}

async function getVideoMenuItems() {
  const res = await supabaseRequest(
    '/rest/v1/menu_items?select=id,name,video_url,partner_id&video_url=neq.&is_active=eq.true&deleted_at=is.null',
    { headers: { 'Content-Type': 'application/json' } }
  );
  const data = await res.json();
  return data.filter(item => item.video_url && item.video_url.includes('/menu-videos/'));
}

function getStoragePath(videoUrl) {
  // Extract path after /menu-videos/
  const match = videoUrl.match(/\/menu-videos\/(.+)$/);
  return match ? match[1] : null;
}

function checkMoovPosition(filePath) {
  try {
    const output = execSync(
      `python3 -c "
import struct
with open('${filePath}', 'rb') as f:
    pos = 0
    moov_pos = -1
    mdat_pos = -1
    while True:
        header = f.read(8)
        if len(header) < 8: break
        size = struct.unpack('>I', header[:4])[0]
        atom_type = header[4:8].decode('ascii', errors='replace')
        if atom_type == 'moov': moov_pos = pos
        if atom_type == 'mdat': mdat_pos = pos
        if size == 0: break
        if size == 1:
            ext = f.read(8)
            size = struct.unpack('>Q', ext)[0]
        pos += size
        f.seek(pos)
print('BEFORE' if moov_pos < mdat_pos and moov_pos >= 0 else 'AFTER')
"`, { encoding: 'utf-8' }
    ).trim();
    return output; // 'BEFORE' or 'AFTER'
  } catch {
    return 'UNKNOWN';
  }
}

async function downloadFile(storagePath, destPath) {
  const res = await supabaseRequest(
    `/storage/v1/object/${BUCKET}/${storagePath}`
  );
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const { writeFileSync } = await import('fs');
  writeFileSync(destPath, buffer);
  return buffer.length;
}

async function uploadFile(storagePath, filePath) {
  const { readFileSync: readSync } = await import('fs');
  const fileBuffer = readSync(filePath);
  
  const res = await supabaseRequest(
    `/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: fileBuffer,
    }
  );
  
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed: ${res.status} ${body}`);
  }
  return fileBuffer.length;
}

async function processVideo(item, index, total) {
  const storagePath = getStoragePath(item.video_url);
  if (!storagePath) {
    console.log(`  ⚠️  [${index + 1}/${total}] "${item.name}" - Could not parse storage path, skipping`);
    return { status: 'skipped', reason: 'bad_path' };
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'faststart-'));
  const inputPath = join(tmpDir, 'input.mp4');
  const outputPath = join(tmpDir, 'output.mp4');

  try {
    // Download
    console.log(`  ⬇️  [${index + 1}/${total}] "${item.name}" - Downloading...`);
    const downloadSize = await downloadFile(storagePath, inputPath);
    console.log(`      Size: ${(downloadSize / 1024 / 1024).toFixed(2)} MB`);

    // Check moov position
    const moovPos = checkMoovPosition(inputPath);
    if (moovPos === 'BEFORE') {
      console.log(`  ✅ [${index + 1}/${total}] "${item.name}" - Already has faststart, skipping`);
      return { status: 'already_ok' };
    }

    // Fix with ffmpeg (lossless remux)
    console.log(`  🔧 [${index + 1}/${total}] "${item.name}" - Fixing moov atom position...`);
    execSync(
      `ffmpeg -y -i "${inputPath}" -c copy -movflags +faststart "${outputPath}" 2>/dev/null`,
      { timeout: 60000 }
    );

    // Verify fix
    const fixedMoov = checkMoovPosition(outputPath);
    if (fixedMoov !== 'BEFORE') {
      console.log(`  ❌ [${index + 1}/${total}] "${item.name}" - Fix failed, moov still at ${fixedMoov}`);
      return { status: 'fix_failed' };
    }

    // Upload fixed file (overwrite original)
    console.log(`  ⬆️  [${index + 1}/${total}] "${item.name}" - Uploading fixed version...`);
    const uploadSize = await uploadFile(storagePath, outputPath);
    console.log(`  ✅ [${index + 1}/${total}] "${item.name}" - FIXED! (${(uploadSize / 1024 / 1024).toFixed(2)} MB)`);
    
    return { status: 'fixed', sizeBefore: downloadSize, sizeAfter: uploadSize };

  } catch (err) {
    console.error(`  ❌ [${index + 1}/${total}] "${item.name}" - Error: ${err.message}`);
    return { status: 'error', error: err.message };
  } finally {
    // Cleanup temp files
    try { unlinkSync(inputPath); } catch {}
    try { unlinkSync(outputPath); } catch {}
    try { const { rmdirSync } = await import('fs'); rmdirSync(tmpDir); } catch {}
  }
}

async function main() {
  console.log('');
  console.log('🎬 MenuLove Video FastStart Migration');
  console.log('=====================================');
  console.log('');
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET}`);
  console.log('');

  // Get all video items
  console.log('📋 Fetching video items from database...');
  const items = await getVideoMenuItems();
  console.log(`   Found ${items.length} videos to check`);
  console.log('');

  if (items.length === 0) {
    console.log('No videos found. Nothing to do.');
    return;
  }

  // Process each video
  const results = { fixed: 0, already_ok: 0, skipped: 0, error: 0 };
  
  for (let i = 0; i < items.length; i++) {
    const result = await processVideo(items[i], i, items.length);
    results[result.status] = (results[result.status] || 0) + 1;
  }

  // Summary
  console.log('');
  console.log('📊 Migration Summary');
  console.log('====================');
  console.log(`  ✅ Fixed:      ${results.fixed}`);
  console.log(`  ✅ Already OK:  ${results.already_ok}`);
  console.log(`  ⚠️  Skipped:    ${results.skipped || 0}`);
  console.log(`  ❌ Errors:     ${results.error || 0}`);
  console.log('');
  
  if (results.fixed > 0) {
    console.log('🚀 Videos fixed! The Bunny CDN cache may take up to 1 hour to update.');
    console.log('   To force CDN refresh, purge the cache in your Bunny dashboard.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
