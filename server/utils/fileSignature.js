// imports
const fs = require('fs/promises');

// magic bytes (first bytes of the file) for each format family
const SIGNATURES = {
  pdf: [[0x25, 0x50, 0x44, 0x46, 0x2d]],                         // %PDF-
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  jpeg: [[0xff, 0xd8, 0xff]],
  ole: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],       // legacy .doc
  zip: [[0x50, 0x4b, 0x03, 0x04]],                               // .docx is a zip
};

// which signature family each allowed extension must have
const EXT_TO_TYPE = {
  '.pdf': 'pdf',
  '.doc': 'ole',
  '.docx': 'zip',
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
};

// returns true only if the file's real first bytes match its extension
async function matchesSignature(filePath, ext) {
  const type = EXT_TO_TYPE[ext];
  if (!type) return false;

  const handle = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buf, 0, 8, 0);

    return SIGNATURES[type].some(
      (sig) => sig.length <= bytesRead && sig.every((byte, i) => buf[i] === byte)
    );
  } finally {
    await handle.close();
  }
}

// export
module.exports = { matchesSignature };