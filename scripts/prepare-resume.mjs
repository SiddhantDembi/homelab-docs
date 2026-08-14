import fs from 'node:fs/promises';
import path from 'node:path';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const root = process.cwd();
const inputPath = path.join(root, 'public/resume/SiddhantDembi.pdf');
const previewDir = path.join(root, 'public/resume/preview');
const generatedDir = path.join(root, 'src/data');
const linksPath = path.join(generatedDir, 'resume-links.json');
const renderScale = 2.5;

const toViewportPoint = (viewport, x, y) => {
  const [a, b, c, d, e, f] = viewport.transform;
  return [a * x + c * y + e, b * x + d * y + f];
};

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;

await fs.access(inputPath);
await fs.rm(previewDir, { recursive: true, force: true });
await fs.mkdir(previewDir, { recursive: true });
await fs.mkdir(generatedDir, { recursive: true });

const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await fs.readFile(inputPath)), disableWorker: true }).promise;
const pages = [];

for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: renderScale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  await fs.writeFile(path.join(previewDir, `page-${pageNumber}.png`), canvas.toBuffer('image/png'));

  const links = (await page.getAnnotations({ intent: 'display' }))
    .map((annotation) => {
      const href = annotation.url || annotation.unsafeUrl;
      if (!href || !annotation.rect) return null;
      const [x1, y1] = toViewportPoint(viewport, annotation.rect[0], annotation.rect[1]);
      const [x2, y2] = toViewportPoint(viewport, annotation.rect[2], annotation.rect[3]);
      return {
        href,
        label: annotation.overlaidText || annotation.contents || href,
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      };
    })
    .filter(Boolean);

  pages.push({
    image: `/resume/preview/page-${pageNumber}.png`,
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height),
    links,
  });
}

await fs.writeFile(linksPath, `${JSON.stringify({ pages }, null, 2)}\n`);
console.log(`Prepared ${pages.length} resume page(s) and ${pages.reduce((count, page) => count + page.links.length, 0)} link(s).`);
