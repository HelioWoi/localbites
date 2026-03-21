/**
 * MP4 FastStart - Move moov atom before mdat for instant video playback
 * 
 * When moov is at the end of the file, the browser must download the entire
 * file before it can start playing. Moving moov to the beginning allows
 * progressive playback (starts playing after just a few KB).
 * 
 * This is a LOSSLESS operation - no re-encoding, just rearranging atoms.
 * Runs entirely in the browser, no server/ffmpeg needed.
 */

interface MP4Atom {
  type: string;
  offset: number;
  size: number;
}

/**
 * Read a 32-bit big-endian unsigned integer from a DataView
 */
function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, false); // big-endian
}

/**
 * Write a 32-bit big-endian unsigned integer to a DataView
 */
function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, false); // big-endian
}

/**
 * Read a 64-bit big-endian unsigned integer from a DataView
 */
function readUint64(view: DataView, offset: number): bigint {
  const high = BigInt(view.getUint32(offset, false));
  const low = BigInt(view.getUint32(offset + 4, false));
  return (high << 32n) | low;
}

/**
 * Write a 64-bit big-endian unsigned integer to a DataView
 */
function writeUint64(view: DataView, offset: number, value: bigint): void {
  view.setUint32(offset, Number(value >> 32n), false);
  view.setUint32(offset + 4, Number(value & 0xFFFFFFFFn), false);
}

/**
 * Parse top-level MP4 atoms from an ArrayBuffer
 */
function parseAtoms(buffer: ArrayBuffer): MP4Atom[] {
  const view = new DataView(buffer);
  const atoms: MP4Atom[] = [];
  let offset = 0;

  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) break;

    let size = readUint32(view, offset);
    const typeBytes = new Uint8Array(buffer, offset + 4, 4);
    const type = String.fromCharCode(...typeBytes);

    // Handle 64-bit extended size
    if (size === 1 && offset + 16 <= buffer.byteLength) {
      size = Number(readUint64(view, offset + 8));
    } else if (size === 0) {
      // Atom extends to end of file
      size = buffer.byteLength - offset;
    }

    if (size < 8 || offset + size > buffer.byteLength) break;

    atoms.push({ type, offset, size });
    offset += size;
  }

  return atoms;
}

/**
 * Find and update stco (32-bit chunk offset) atoms inside moov
 * These offsets point to mdat chunks and need adjusting when moov moves
 */
function updateChunkOffsets(moovBuffer: ArrayBuffer, delta: number): void {
  const view = new DataView(moovBuffer);
  const bytes = new Uint8Array(moovBuffer);

  for (let i = 0; i < moovBuffer.byteLength - 8; i++) {
    // Look for 'stco' atom (32-bit chunk offsets)
    if (bytes[i] === 0x73 && bytes[i + 1] === 0x74 &&
        bytes[i + 2] === 0x63 && bytes[i + 3] === 0x6F) {
      // stco format: type(4) + version(1) + flags(3) + entry_count(4) + entries(4 each)
      const entryCount = readUint32(view, i + 8);
      for (let j = 0; j < entryCount; j++) {
        const entryOffset = i + 12 + (j * 4);
        if (entryOffset + 4 > moovBuffer.byteLength) break;
        const oldOffset = readUint32(view, entryOffset);
        writeUint32(view, entryOffset, oldOffset + delta);
      }
    }

    // Look for 'co64' atom (64-bit chunk offsets)
    if (bytes[i] === 0x63 && bytes[i + 1] === 0x6F &&
        bytes[i + 2] === 0x36 && bytes[i + 3] === 0x34) {
      // co64 format: type(4) + version(1) + flags(3) + entry_count(4) + entries(8 each)
      const entryCount = readUint32(view, i + 8);
      for (let j = 0; j < entryCount; j++) {
        const entryOffset = i + 12 + (j * 8);
        if (entryOffset + 8 > moovBuffer.byteLength) break;
        const oldOffset = readUint64(view, entryOffset);
        writeUint64(view, entryOffset, oldOffset + BigInt(delta));
      }
    }
  }
}

/**
 * Process an MP4 file to ensure moov atom is before mdat (faststart).
 * Returns the original file if already optimized or not an MP4.
 * Returns a new File with moov moved to the beginning if needed.
 */
export async function ensureFaststart(file: File): Promise<File> {
  // Only process MP4 files
  if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
    return file;
  }

  const buffer = await file.arrayBuffer();
  const atoms = parseAtoms(buffer);

  // Find key atoms
  const ftyp = atoms.find(a => a.type === 'ftyp');
  const moov = atoms.find(a => a.type === 'moov');
  const mdat = atoms.find(a => a.type === 'mdat');

  // If we can't find the essential atoms, return original
  if (!ftyp || !moov || !mdat) {
    console.log('[FastStart] Could not find ftyp/moov/mdat atoms, skipping');
    return file;
  }

  // If moov is already before mdat, no work needed
  if (moov.offset < mdat.offset) {
    console.log('[FastStart] Already optimized, skipping');
    return file;
  }

  console.log('[FastStart] Moving moov atom before mdat...');

  // Extract atom data
  const ftypData = new Uint8Array(buffer, ftyp.offset, ftyp.size);
  const moovData = new Uint8Array(buffer.slice(moov.offset, moov.offset + moov.size));

  // Collect everything between ftyp and mdat (could be 'free' atoms, etc.)
  const betweenAtoms: Uint8Array[] = [];
  let betweenSize = 0;
  for (const atom of atoms) {
    if (atom.offset > ftyp.offset + ftyp.size && atom.offset < mdat.offset && atom.type !== 'moov') {
      betweenAtoms.push(new Uint8Array(buffer, atom.offset, atom.size));
      betweenSize += atom.size;
    }
  }

  const mdatData = new Uint8Array(buffer, mdat.offset, mdat.size);

  // Calculate delta: how much mdat moves forward (moov inserted before it)
  // New layout: ftyp + moov + [between atoms] + mdat
  // Old mdat was at mdat.offset, new mdat will be at ftyp.size + moov.size + betweenSize
  const newMdatOffset = ftyp.size + moov.size + betweenSize;
  const delta = newMdatOffset - mdat.offset;

  // Update chunk offsets in moov to reflect new mdat position
  updateChunkOffsets(moovData.buffer, delta);

  // Build new file: ftyp + moov + [between] + mdat
  const totalSize = ftyp.size + moov.size + betweenSize + mdat.size;
  const output = new Uint8Array(totalSize);
  let pos = 0;

  output.set(ftypData, pos);
  pos += ftyp.size;

  output.set(new Uint8Array(moovData.buffer), pos);
  pos += moov.size;

  for (const between of betweenAtoms) {
    output.set(between, pos);
    pos += between.length;
  }

  output.set(mdatData, pos);

  console.log(`[FastStart] Done! moov moved from offset ${moov.offset} to ${ftyp.size}`);

  return new File([output], file.name, { type: file.type || 'video/mp4' });
}
