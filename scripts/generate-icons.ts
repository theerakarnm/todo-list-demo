// Renders public/favicon.svg (the JotList "J" mark) into the PNG icons used by
// the PWA manifest and iOS. Run after changing the SVG: `bun run icons:generate`.
import sharp from "sharp";

const source = "public/favicon.svg";

const icons = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  // The mark sits inside the maskable safe zone (centre 80%), so the same art works.
  { file: "public/icons/icon-maskable-512.png", size: 512 },
  { file: "public/icons/apple-touch-icon.png", size: 180 },
];

for (const { file, size } of icons) {
  await sharp(source, { density: 300 }).resize(size, size).png().toFile(file);
  console.log(`wrote ${file}`);
}
