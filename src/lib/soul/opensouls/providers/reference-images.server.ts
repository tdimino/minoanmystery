/**
 * Server-only reference image loader
 *
 * This file should ONLY be imported from server-side code (API routes).
 * It uses Node.js fs/path modules which are not available in the browser.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Load Minoan reference images for style matching
 * Returns base64 data URLs that can be passed to Gemini's generate()
 *
 * @returns Array of base64 data URLs (e.g., "data:image/jpeg;base64,...")
 */
export function loadMinoanReferenceImages(): string[] {
  const referenceImages: string[] = [];

  try {
    // Reference images are stored relative to project root
    const referenceDir = path.join(
      process.cwd(),
      'src/lib/soul/opensouls/reference'
    );

    // 8 reference images for robust visual memory (matching Gemini Resonance)
    // - minoan_tarot: Original Minoan tarot cards
    // - frame_*: Minoan fresco-style frames and borders
    // - zoom_*: Detail shots of Minoan color palettes and textures
    const files = [
      'minoan_tarot_01.jpg',
      'minoan_tarot_05.jpg',
      'frame_1.jpg',
      'frame_2.jpg',
      'frame_3.jpg',
      'frame_4.jpg',
      'zoom_1.jpg',
      'zoom_2.jpg',
    ];

    for (const file of files) {
      const filePath = path.join(referenceDir, file);

      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        const base64 = data.toString('base64');
        const mimeType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
        referenceImages.push(`data:${mimeType};base64,${base64}`);
        console.log(`[ReferenceImages] Loaded: ${file}`);
      } else {
        console.warn(`[ReferenceImages] Not found: ${filePath}`);
      }
    }

    console.log(`[ReferenceImages] Loaded ${referenceImages.length} images for visual memory`);
  } catch (error) {
    console.error('[ReferenceImages] Failed to load reference images:', error);
  }

  return referenceImages;
}
