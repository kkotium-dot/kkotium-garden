// src/lib/storage/zip-store.ts
// ============================================================================
// Minimal dependency-free ZIP writer (STORE method, no compression). Used by the
// per-product asset export (authority §4.2: "1 product = 1 zip"). Product assets
// are PNG/JPEG — already compressed — so STORE adds no size penalty and avoids
// pulling in a zip dependency. UTF-8 filenames (general-purpose bit 11) so the
// {stage}/{file} entry paths survive non-ASCII. Node runtime only (Buffer).
// ============================================================================

// CRC-32 (IEEE) table, built once.
const CRC_TABLE: number[] = (() => {
  const t: number[] = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Convert a JS Date to DOS time/date (ZIP stores mod time in this packed form).
function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
  const date = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time: time & 0xffff, date: date & 0xffff };
}

interface ZipEntry {
  name: string;
  data: Buffer;
  crc: number;
  time: number;
  date: number;
  offset: number;
}

const FLAG_UTF8 = 0x0800; // general-purpose bit 11 — filename is UTF-8.

export class ZipStore {
  private entries: ZipEntry[] = [];
  private chunks: Buffer[] = [];
  private offset = 0;

  /** Add a file at `name` (forward-slash path, e.g. 'composite/foo.jpg'). */
  add(name: string, data: Buffer, modified?: Date): void {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const { time, date } = dosDateTime(modified ?? new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(FLAG_UTF8, 6); // flags
    local.writeUInt16LE(0, 8); // method = store
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length

    this.entries.push({ name, data, crc, time, date, offset: this.offset });
    this.chunks.push(local, nameBuf, data);
    this.offset += local.length + nameBuf.length + data.length;
  }

  /** Serialize the full archive (local headers + central directory + EOCD). */
  build(): Buffer {
    const central: Buffer[] = [];
    let cdSize = 0;
    for (const e of this.entries) {
      const nameBuf = Buffer.from(e.name, 'utf8');
      const rec = Buffer.alloc(46);
      rec.writeUInt32LE(0x02014b50, 0); // central directory header signature
      rec.writeUInt16LE(20, 4); // version made by
      rec.writeUInt16LE(20, 6); // version needed
      rec.writeUInt16LE(FLAG_UTF8, 8); // flags
      rec.writeUInt16LE(0, 10); // method = store
      rec.writeUInt16LE(e.time, 12);
      rec.writeUInt16LE(e.date, 14);
      rec.writeUInt32LE(e.crc, 16);
      rec.writeUInt32LE(e.data.length, 20); // compressed size
      rec.writeUInt32LE(e.data.length, 24); // uncompressed size
      rec.writeUInt16LE(nameBuf.length, 28);
      rec.writeUInt16LE(0, 30); // extra length
      rec.writeUInt16LE(0, 32); // comment length
      rec.writeUInt16LE(0, 34); // disk number start
      rec.writeUInt16LE(0, 36); // internal attributes
      rec.writeUInt32LE(0, 38); // external attributes
      rec.writeUInt32LE(e.offset, 42); // local header offset
      central.push(rec, nameBuf);
      cdSize += rec.length + nameBuf.length;
    }
    const cdOffset = this.offset;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk with central directory
    eocd.writeUInt16LE(this.entries.length, 8); // entries this disk
    eocd.writeUInt16LE(this.entries.length, 10); // total entries
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdOffset, 16);
    eocd.writeUInt16LE(0, 20); // comment length

    return Buffer.concat([...this.chunks, ...central, eocd]);
  }
}
