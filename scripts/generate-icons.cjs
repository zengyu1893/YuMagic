const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
async function getPngToIco() { const m = await import('png-to-ico'); return m.default; }

async function main() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="40" fill="#0f0f0f"/>
  <path d="M70 80h120" stroke="#ffffff" stroke-width="16" stroke-linecap="round" fill="none"/>
  <path d="M50 125h160" stroke="#ffffff" stroke-width="15" stroke-linecap="round" fill="none"/>
  <path d="M50 170h160" stroke="#ffffff" stroke-width="15" stroke-linecap="round" fill="none"/>
  <path d="M128 60v115" stroke="#ffffff" stroke-width="16" stroke-linecap="round" fill="none"/>
  <circle cx="175" cy="205" r="19" fill="#ffffff"/>
</svg>`;

  // Convert SVG to PNG at each size
  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
    pngBuffers.push(buf);
  }

  // Write the 256x256 PNG
  fs.writeFileSync(path.join(__dirname, '..', 'resources', 'icon.png'), pngBuffers[5]);
  fs.writeFileSync(path.join(__dirname, '..', 'electron', 'icon.png'), pngBuffers[5]);

  // Create ICO from all sizes
  const icoFn = await getPngToIco();
  const icoBuffer = await icoFn(pngBuffers);
  fs.writeFileSync(path.join(__dirname, '..', 'resources', 'icon.ico'), icoBuffer);

  console.log('Icons generated successfully!');
}

main().catch(e => { console.error(e); process.exit(1); });

