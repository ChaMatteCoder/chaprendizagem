// Deterministic 8-bit grayscale PNG (stored deflate blocks). The same pixels always
// produce the same bytes, so a round image can be identified by its SHA-256.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodeGrayPng(pixels, width = 28, height = 28) {
  if (!(pixels instanceof Uint8Array) || pixels.length !== width * height) throw new TypeError("Pixels devem ser uint8 em largura × altura.");
  const raw = new Uint8Array(height * (width + 1));
  for (let y = 0; y < height; y++) raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1); // filter 0
  const blocks = [];
  for (let offset = 0; offset < raw.length; offset += 65535) {
    const part = raw.subarray(offset, Math.min(raw.length, offset + 65535));
    const header = new Uint8Array(5);
    header[0] = offset + 65535 >= raw.length ? 1 : 0;
    header[1] = part.length & 0xff;
    header[2] = part.length >>> 8;
    header[3] = ~part.length & 0xff;
    header[4] = (~part.length >>> 8) & 0xff;
    blocks.push(header, part);
  }
  const deflateLength = blocks.reduce((sum, item) => sum + item.length, 0);
  const zlib = new Uint8Array(2 + deflateLength + 4);
  zlib[0] = 0x78;
  zlib[1] = 0x01;
  let cursor = 2;
  for (const item of blocks) {
    zlib.set(item, cursor);
    cursor += item.length;
  }
  new DataView(zlib.buffer).setUint32(cursor, adler32(raw));
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr.set([8, 0, 0, 0, 0], 8); // 8-bit, grayscale, deflate, filter, no interlace
  const parts = [Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), chunk("IHDR", ihdr), chunk("IDAT", zlib), chunk("IEND", new Uint8Array(0))];
  const png = new Uint8Array(parts.reduce((sum, item) => sum + item.length, 0));
  cursor = 0;
  for (const item of parts) {
    png.set(item, cursor);
    cursor += item.length;
  }
  return png;
}
