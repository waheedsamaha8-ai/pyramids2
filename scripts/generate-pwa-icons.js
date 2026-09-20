import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

function generatePng(width, height, outputPath) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated ${outputPath} (${width}x${height})`);
}

generatePng(192, 192, path.resolve('public/pwa-192x192.png'));
generatePng(512, 512, path.resolve('public/pwa-512x512.png'));
generatePng(180, 180, path.resolve('public/apple-touch-icon.png'));
generatePng(512, 512, path.resolve('public/pwa-maskable-512x512.png'));
