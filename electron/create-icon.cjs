const fs = require('fs');
const path = require('path');

const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#0f0f0f"/>
  <path d="M140 160h240" stroke="#ffffff" stroke-width="32" stroke-linecap="round" fill="none"/>
  <path d="M100 250h320" stroke="#ffffff" stroke-width="30" stroke-linecap="round" fill="none"/>
  <path d="M100 340h320" stroke="#ffffff" stroke-width="30" stroke-linecap="round" fill="none"/>
  <path d="M256 120v230" stroke="#ffffff" stroke-width="32" stroke-linecap="round" fill="none"/>
  <circle cx="350" cy="410" r="38" fill="#ffffff"/>
</svg>`;

const resourcesDir = path.join(__dirname, '..', 'resources');
const electronDir = path.join(__dirname);

fs.mkdirSync(resourcesDir, { recursive: true });
fs.writeFileSync(path.join(resourcesDir, 'icon.svg'), svgIcon);
fs.writeFileSync(path.join(electronDir, 'icon.svg'), svgIcon);

console.log('Created resources/icon.svg and electron/icon.svg');
