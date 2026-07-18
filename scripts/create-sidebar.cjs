const fs = require('fs');
const path = require('path');

const w = 164, h = 314;
const rowSize = Math.floor((w * 24 + 31) / 32) * 4;
const pixelDataSize = rowSize * h;
const fileSize = 54 + pixelDataSize;

const buf = Buffer.alloc(fileSize);
buf.write('BM', 0, 2, 'ascii');
buf.writeUInt32LE(fileSize, 2);
buf.writeUInt32LE(54, 10);
buf.writeUInt32LE(40, 14);
buf.writeInt32LE(w, 18);
buf.writeInt32LE(-h, 22);
buf.writeUInt16LE(1, 26);
buf.writeUInt16LE(24, 28);
buf.writeUInt32LE(pixelDataSize, 34);

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = 54 + y * rowSize + x * 3;
    const r = Math.floor(15 + (y/h) * 11);
    const g = Math.floor(15 + (y/h) * 5);
    const b = Math.floor(15 + (y/h) * 31);
    buf[i] = b;
    buf[i+1] = g;
    buf[i+2] = r;
  }
}

fs.writeFileSync(path.join(__dirname, '..', 'resources', 'installerSidebar.bmp'), buf);
console.log('Created clean sidebar BMP');
