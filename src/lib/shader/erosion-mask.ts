/**
 * Erosion Mask — Blob URL SVG edge erosion for shader backgrounds.
 *
 * Two modes:
 *   "craquelure" (default) — angular turbulence cracks like ancient plaster
 *   "diffusion" — feDisplacementMap warps a smooth gradient for watercolor bleed
 *
 * Uses Blob URL SVG (not data URI) to avoid encoding and dimension issues.
 *
 * CRITICAL: Explicitly sets mask-mode: luminance. Chrome defaults to alpha
 * mode for SVG mask-images, which makes fully-opaque pixels produce no
 * visible erosion.
 */

export type ErosionMode = 'craquelure' | 'diffusion';

export interface ErosionConfig {
  /** Turbulence seed — different values produce unique erosion patterns */
  seed: number;
  /** Erosion mode: "craquelure" (cracked plaster) or "diffusion" (watercolor bleed) */
  mode?: ErosionMode;
  /** feTurbulence baseFrequency [x, y] — lower = larger features */
  baseFrequency?: [number, number];
  /** feTurbulence numOctaves — more = finer detail */
  numOctaves?: number;
  /** Top erosion zone as fraction (0.20 = 20% of height) */
  erosionTop?: number;
  /** Bottom erosion zone as fraction (0.22 = 22% of height) */
  erosionBottom?: number;
  /** feComponentTransfer slope — higher = sharper crack boundaries (craquelure only) */
  contrastSlope?: number;
  /** feComponentTransfer intercept — threshold for erosion cutoff (craquelure only) */
  contrastIntercept?: number;
}

const DEFAULTS: Required<ErosionConfig> = {
  seed: 42,
  mode: 'craquelure',
  baseFrequency: [0.012, 0.020],
  numOctaves: 4,
  erosionTop: 0.20,
  erosionBottom: 0.22,
  contrastSlope: 5,
  contrastIntercept: -1.8,
};

/** Minimum dimension change (px) to trigger mask regeneration */
const RESIZE_THRESHOLD = 20;
/** Debounce delay (ms) for resize-triggered regeneration */
const RESIZE_DEBOUNCE = 200;

/**
 * Craquelure mode — angular turbulence cracks like ancient plaster.
 *
 * Two-layer compositing:
 * 1. Bottom rect: white fill + turbulence filter → black/white crack pattern
 * 2. Top rect: gradient overlay → opaque white center, transparent edges
 */
function buildCraquelureSvg(
  w: number,
  h: number,
  config: Required<ErosionConfig>,
): string {
  const topEnd = config.erosionTop;
  const bottomStart = 1 - config.erosionBottom;

  const topStops = `
      <stop offset="0%" stop-color="white" stop-opacity="0"/>
      <stop offset="${(topEnd * 0.25 * 100).toFixed(1)}%" stop-color="white" stop-opacity="0.13"/>
      <stop offset="${(topEnd * 0.6 * 100).toFixed(1)}%" stop-color="white" stop-opacity="0.53"/>
      <stop offset="${(topEnd * 100).toFixed(1)}%" stop-color="white" stop-opacity="1"/>`;

  const bottomStops = `
      <stop offset="${(bottomStart * 100).toFixed(1)}%" stop-color="white" stop-opacity="1"/>
      <stop offset="${((bottomStart + config.erosionBottom * 0.4) * 100).toFixed(1)}%" stop-color="white" stop-opacity="0.53"/>
      <stop offset="${((bottomStart + config.erosionBottom * 0.75) * 100).toFixed(1)}%" stop-color="white" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="erode" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
      <feTurbulence
        type="turbulence"
        baseFrequency="${config.baseFrequency[0]} ${config.baseFrequency[1]}"
        numOctaves="${config.numOctaves}"
        seed="${config.seed}"
        stitchTiles="stitch"
        result="noise"
      />
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray" result="cracks">
        <feFuncR type="linear" slope="${config.contrastSlope}" intercept="${config.contrastIntercept}"/>
        <feFuncG type="linear" slope="${config.contrastSlope}" intercept="${config.contrastIntercept}"/>
        <feFuncB type="linear" slope="${config.contrastSlope}" intercept="${config.contrastIntercept}"/>
        <feFuncA type="identity"/>
      </feComponentTransfer>
    </filter>
    <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
      ${topStops}
      ${bottomStops}
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" fill="white" filter="url(#erode)"/>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#gf)"/>
</svg>`;
}

/**
 * Diffusion mode — feDisplacementMap warps a smooth gradient for watercolor bleed.
 *
 * Instead of overlaying noise on a gradient, uses noise to DISPLACE the
 * gradient boundary organically. Single rect, no binary cracks, no blotches.
 * Uses fractalNoise (smooth clouds) instead of turbulence (angular ridges).
 */
function buildDiffusionSvg(
  w: number,
  h: number,
  config: Required<ErosionConfig>,
): string {
  const topEnd = config.erosionTop;
  const bottomStart = 1 - config.erosionBottom;

  // Filter region needs padding for displacement overflow
  const pad = 40;

  // Scale baseFrequency down for broader, flowing displacement features
  const freqX = (config.baseFrequency[0] * 0.6).toFixed(4);
  const freqY = (config.baseFrequency[1] * 0.6).toFixed(4);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <filter id="warpEdge" filterUnits="userSpaceOnUse"
            x="${-pad}" y="${-pad}" width="${w + pad * 2}" height="${h + pad * 2}"
            color-interpolation-filters="sRGB">
      <!-- 1. Smooth cloud noise for organic displacement -->
      <feTurbulence
        type="fractalNoise"
        baseFrequency="${freqX} ${freqY}"
        numOctaves="3"
        seed="${config.seed}"
        stitchTiles="stitch"
        result="warpField"
      />
      <!-- 2. Blur the displacement field for smoother warping -->
      <feGaussianBlur in="warpField" stdDeviation="8" result="smoothField"/>
      <!-- 3. Displace the gradient (SourceGraphic) by the noise -->
      <feDisplacementMap
        in="SourceGraphic"
        in2="smoothField"
        scale="35"
        xChannelSelector="R"
        yChannelSelector="G"
        result="displaced"
      />
      <!-- 4. Feather the displaced edges -->
      <feGaussianBlur in="displaced" stdDeviation="4" result="feathered"/>
    </filter>
    <!-- Smooth gradient: the underlying edge shape that gets warped -->
    <!-- Uses stop-opacity on white (not dark colors) to avoid gamma linearization -->
    <!-- under mask-mode: luminance — #333 would be ~4% not ~20% after linearization -->
    <linearGradient id="edgeFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0"/>
      <stop offset="${(topEnd * 0.5 * 100).toFixed(1)}%" stop-color="white" stop-opacity="0.13"/>
      <stop offset="${(topEnd * 100).toFixed(1)}%" stop-color="white" stop-opacity="1"/>
      <stop offset="${(bottomStart * 100).toFixed(1)}%" stop-color="white" stop-opacity="1"/>
      <stop offset="${((bottomStart + config.erosionBottom * 0.5) * 100).toFixed(1)}%" stop-color="white" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Single rect: smooth gradient warped by noise displacement -->
  <rect x="0" y="0" width="${w}" height="${h}"
        fill="url(#edgeFade)" filter="url(#warpEdge)"/>
</svg>`;
}

/**
 * Applies an erosion mask to a shader container element.
 *
 * Creates a Blob URL from a pixel-accurate SVG and applies it as CSS mask-image
 * with explicit luminance mode. Handles resize via debounced ResizeObserver.
 *
 * Returns a cleanup function that disconnects the observer, revokes the
 * Blob URL, and restores the original linear-gradient mask.
 */
export function applyErosionMask(
  container: HTMLElement,
  config: Partial<ErosionConfig> = {},
): () => void {
  const cfg = { ...DEFAULTS, ...config };
  const buildSvg = cfg.mode === 'diffusion' ? buildDiffusionSvg : buildCraquelureSvg;

  let currentBlobUrl: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastW = 0;
  let lastH = 0;

  function apply(): void {
    const rect = container.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // Skip if container has no dimensions (not yet laid out)
    if (w === 0 || h === 0) return;

    // Skip if dimensions haven't changed enough (resize threshold)
    if (
      currentBlobUrl &&
      Math.abs(w - lastW) < RESIZE_THRESHOLD &&
      Math.abs(h - lastH) < RESIZE_THRESHOLD
    ) {
      return;
    }

    // Build SVG and create new Blob URL
    const svgString = buildSvg(w, h, cfg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const newBlobUrl = URL.createObjectURL(blob);
    const maskValue = `url("${newBlobUrl}")`;

    // Apply new mask BEFORE revoking old URL (prevents single-frame flash)
    container.style.setProperty('mask-image', maskValue);
    container.style.setProperty('-webkit-mask-image', maskValue);
    container.style.setProperty('mask-mode', 'luminance');
    container.style.setProperty('-webkit-mask-mode', 'luminance');
    container.style.setProperty('mask-size', '100% 100%');
    container.style.setProperty('-webkit-mask-size', '100% 100%');
    container.style.setProperty('mask-repeat', 'no-repeat');
    container.style.setProperty('-webkit-mask-repeat', 'no-repeat');

    // NOW revoke old URL (safe — new URL is already applied)
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = newBlobUrl;
    lastW = w;
    lastH = h;
  }

  // Initial application
  apply();

  // ResizeObserver with debounce for dimension tracking
  const observer = new ResizeObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(apply, RESIZE_DEBOUNCE);
  });
  observer.observe(container);

  const originalMask = 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)';

  return () => {
    // Disconnect observer
    observer.disconnect();

    // Cancel any pending debounced regeneration
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    // Revoke Blob URL
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }

    // Restore original gradient mask
    container.style.setProperty('mask-image', originalMask);
    container.style.setProperty('-webkit-mask-image', originalMask);
    container.style.removeProperty('mask-mode');
    container.style.removeProperty('-webkit-mask-mode');
    container.style.removeProperty('mask-size');
    container.style.removeProperty('-webkit-mask-size');
    container.style.removeProperty('mask-repeat');
    container.style.removeProperty('-webkit-mask-repeat');
  };
}
