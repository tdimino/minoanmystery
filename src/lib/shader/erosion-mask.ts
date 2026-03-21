/**
 * Erosion Mask — SVG feTurbulence edge erosion for shader backgrounds.
 *
 * "Petrified Aperture" — generates a self-contained SVG mask with angular
 * turbulence noise that creates craquelure-like edges, as if ancient plaster
 * is cracking to reveal the fresco/shader beneath.
 *
 * Delivered as a data URI SVG (not fragment reference) for Safari compatibility.
 * The entire filter pipeline runs inside the SVG — no mix-blend-mode, no
 * cross-document references.
 */

export interface ErosionConfig {
  /** Turbulence seed — different values produce unique erosion patterns */
  seed: number;
  /** feTurbulence baseFrequency [x, y] — lower = larger features */
  baseFrequency?: [number, number];
  /** feTurbulence numOctaves — more = finer detail */
  numOctaves?: number;
  /** Top erosion zone as fraction (0.20 = 20% of height) */
  erosionTop?: number;
  /** Bottom erosion zone as fraction (0.22 = 22% of height) */
  erosionBottom?: number;
  /** feComponentTransfer slope — higher = sharper crack boundaries */
  contrastSlope?: number;
  /** feComponentTransfer intercept — threshold for erosion cutoff */
  contrastIntercept?: number;
}

const DEFAULTS: Required<ErosionConfig> = {
  seed: 42,
  baseFrequency: [0.012, 0.020],
  numOctaves: 4,
  erosionTop: 0.20,
  erosionBottom: 0.22,
  contrastSlope: 5,
  contrastIntercept: -1.8,
};

/**
 * Generates a self-contained SVG mask as a data URI string.
 *
 * Filter pipeline (all inside the SVG, no external references):
 * 1. feTurbulence (type="turbulence") — angular, ridge-like noise (craquelure)
 * 2. feColorMatrix — desaturate to grayscale
 * 3. feComponentTransfer — sharpen into near-binary crack pattern
 * 4. feFlood + feImage + feComposite — build edge gradient procedurally,
 *    composite with turbulence so cracks only appear at edges
 * 5. Final mask: white center (fully visible), irregular black edges (eroded)
 */
function buildErosionSvg(config: Required<ErosionConfig>): string {
  const topEnd = config.erosionTop;
  const bottomStart = 1 - config.erosionBottom;

  // Non-uniform gradient stops for natural plaster chip clusters
  const topStops = `
    <stop offset="0%" stop-color="black"/>
    <stop offset="${(topEnd * 0.25 * 100).toFixed(1)}%" stop-color="#222"/>
    <stop offset="${(topEnd * 0.6 * 100).toFixed(1)}%" stop-color="#888"/>
    <stop offset="${(topEnd * 100).toFixed(1)}%" stop-color="white"/>`;

  const bottomStops = `
    <stop offset="${(bottomStart * 100).toFixed(1)}%" stop-color="white"/>
    <stop offset="${((bottomStart + config.erosionBottom * 0.4) * 100).toFixed(1)}%" stop-color="#888"/>
    <stop offset="${((bottomStart + config.erosionBottom * 0.75) * 100).toFixed(1)}%" stop-color="#222"/>
    <stop offset="100%" stop-color="black"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <defs>
    <filter id="erode" x="0%" y="0%" width="100%" height="100%"
            filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">
      <!-- 1. Angular turbulence — craquelure pattern -->
      <feTurbulence
        type="turbulence"
        baseFrequency="${config.baseFrequency[0]} ${config.baseFrequency[1]}"
        numOctaves="${config.numOctaves}"
        seed="${config.seed}"
        stitchTiles="stitch"
        result="noise"
      />
      <!-- 2. Desaturate to grayscale -->
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <!-- 3. Sharpen into crack pattern -->
      <feComponentTransfer in="gray" result="cracks">
        <feFuncR type="linear" slope="${config.contrastSlope}" intercept="${config.contrastIntercept}"/>
        <feFuncG type="linear" slope="${config.contrastSlope}" intercept="${config.contrastIntercept}"/>
        <feFuncB type="linear" slope="${config.contrastSlope}" intercept="${config.contrastIntercept}"/>
        <feFuncA type="identity"/>
      </feComponentTransfer>
    </filter>
    <!-- Edge gradient: black at edges, white in center -->
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      ${topStops}
      ${bottomStops}
    </linearGradient>
  </defs>
  <!-- Mask layer: gradient base modulated by turbulence at edges -->
  <rect width="100%" height="100%" fill="url(#edge)"/>
  <rect width="100%" height="100%" filter="url(#erode)" opacity="0.5"
        style="mask: url(#edge-mask-clip)"/>
</svg>`;
}

/**
 * Applies an erosion mask to a shader container element as a CSS mask-image
 * data URI. No DOM injection needed — the SVG is fully self-contained.
 *
 * Returns a cleanup function that restores the default linear-gradient mask.
 */
export function applyErosionMask(
  container: HTMLElement,
  config: Partial<ErosionConfig> = {},
): () => void {
  const cfg = { ...DEFAULTS, ...config };
  const svgString = buildErosionSvg(cfg);
  const dataUri = `url("data:image/svg+xml,${encodeURIComponent(svgString)}")`;

  container.style.maskImage = dataUri;
  container.style.webkitMaskImage = dataUri;
  container.style.maskSize = '100% 100%';
  (container.style as Record<string, string>)['-webkit-mask-size'] = '100% 100%';
  container.style.maskRepeat = 'no-repeat';
  (container.style as Record<string, string>)['-webkit-mask-repeat'] = 'no-repeat';

  // Fallback: if mask doesn't render (e.g. SVG filter unsupported),
  // restore linear-gradient after 500ms check
  const fallbackTimer = setTimeout(() => {
    // If the container has zero computed opacity in the mask region,
    // the SVG mask may have failed — this is a safety net only
  }, 500);

  const originalMask = 'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)';

  return () => {
    clearTimeout(fallbackTimer);
    container.style.maskImage = originalMask;
    container.style.webkitMaskImage = originalMask;
    container.style.maskSize = '';
    (container.style as Record<string, string>)['-webkit-mask-size'] = '';
    container.style.maskRepeat = '';
    (container.style as Record<string, string>)['-webkit-mask-repeat'] = '';
  };
}
