import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const publicDir = path.resolve('public');

// 1. Standard App Icon SVG
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#1e40af" />
      <stop offset="100%" stop-color="#172554" />
    </linearGradient>
    <linearGradient id="highlightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Base Rounded Squircle -->
  <rect x="16" y="16" width="480" height="480" rx="104" ry="104" fill="url(#bgGrad)" stroke="#3b82f6" stroke-width="4" stroke-opacity="0.4" />
  <rect x="20" y="20" width="472" height="230" rx="100" ry="100" fill="url(#highlightGrad)" />

  <!-- Centered White Building Icon from Login Page -->
  <g transform="translate(116, 106) scale(11.666)" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" fill="#ffffff" fill-opacity="0.12" />
    <path d="M9 22v-4h6v4" fill="#ffffff" fill-opacity="0.25" />
    <path d="M8 6h.01" />
    <path d="M12 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
  </g>
</svg>`;

// 2. Maskable Icon SVG (Full bleed background, safe zone inside 80% circle)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#1e40af" />
      <stop offset="100%" stop-color="#172554" />
    </linearGradient>
  </defs>

  <!-- Full Bleed Background for Android Adaptive Masking -->
  <rect x="0" y="0" width="512" height="512" fill="url(#bgGradFull)" />

  <!-- Centered Safe Zone Building Icon -->
  <g transform="translate(136, 126) scale(10.0)" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" fill="#ffffff" fill-opacity="0.12" />
    <path d="M9 22v-4h6v4" fill="#ffffff" fill-opacity="0.25" />
    <path d="M8 6h.01" />
    <path d="M12 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
  </g>
</svg>`;

function renderPng(svgString, width, height, outputPath) {
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated: ${outputPath} (${width}x${height})`);
}

// Ensure public dir exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate files
renderPng(standardSvg, 192, 192, path.join(publicDir, 'pwa-192x192.png'));
renderPng(standardSvg, 512, 512, path.join(publicDir, 'pwa-512x512.png'));
renderPng(standardSvg, 180, 180, path.join(publicDir, 'apple-touch-icon.png'));
renderPng(maskableSvg, 512, 512, path.join(publicDir, 'pwa-maskable-512x512.png'));

fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);
console.log('All PWA icon assets generated successfully!');
