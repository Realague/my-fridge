import sharp from 'sharp';
import decodeIco from 'decode-ico';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Use favicon.ico as source
const faviconPath = join(publicDir, 'favicon.ico');

const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  console.log('Generating PWA icons from favicon.ico...');
  
  // Decode ICO file
  const icoBuffer = readFileSync(faviconPath);
  const images = decodeIco(icoBuffer);
  
  // Find the largest image in the ICO
  const largestImage = images.reduce((prev, curr) => 
    (curr.width > prev.width) ? curr : prev
  );
  
  console.log(`  Using ${largestImage.width}x${largestImage.height} ${largestImage.type} image from favicon as source`);
  
  let sourceBuffer;
  
  if (largestImage.type === 'png') {
    // If it's PNG encoded, use the data directly
    sourceBuffer = Buffer.from(largestImage.data);
  } else {
    // If it's BMP/raw RGBA, convert it
    sourceBuffer = await sharp(Buffer.from(largestImage.data), {
      raw: {
        width: largestImage.width,
        height: largestImage.height,
        channels: 4
      }
    }).png().toBuffer();
  }
  
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(sourceBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ Generated ${size}x${size}`);
  }

  // Generate apple-touch-icon (180x180)
  const appleTouchIconPath = join(iconsDir, 'apple-touch-icon.png');
  await sharp(sourceBuffer)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(appleTouchIconPath);
  console.log('  ✓ Generated apple-touch-icon.png');

  console.log('\nAll icons generated successfully from favicon!');
}

generateIcons().catch(console.error);

