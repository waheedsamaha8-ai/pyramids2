import html2canvas from 'html2canvas';

// Helper canvas for parsing modern CSS color functions (oklch, oklab, lab, lch, hwb, etc.) to standard RGB/RGBA strings
const colorCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (colorCanvas) {
  colorCanvas.width = 1;
  colorCanvas.height = 1;
}
const colorCtx = colorCanvas ? colorCanvas.getContext('2d', { willReadFrequently: true }) : null;

// Regex matching modern CSS color functions that html2canvas cannot parse natively
const MODERN_COLOR_REGEX = /(oklch|oklab|lab|lch|hwb|color)\([^)]+\)/gi;

/**
 * Converts any CSS color string (including modern oklch, oklab, hwb, lab, etc.) into standard rgb()/rgba() format
 * using the browser's native 2D Canvas parser.
 */
export function parseCssColorToRgb(colorStr: string): string {
  if (!colorStr || typeof colorStr !== 'string') {
    return colorStr;
  }

  // Check if string contains any modern color function
  if (!/(oklch|oklab|lab|lch|hwb|color)\(/i.test(colorStr)) {
    return colorStr;
  }

  try {
    if (colorCtx) {
      colorCtx.clearRect(0, 0, 1, 1);
      colorCtx.fillStyle = colorStr;
      colorCtx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data;
      if (a === 255) {
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
      }
    }
  } catch (e) {
    // Ignore fallback
  }

  return '#334155'; // Safe slate fallback
}

/**
 * Sanitizes stylesheet text or style attributes by replacing all oklch, oklab, etc. with standard rgb() strings.
 */
export function sanitizeStyleText(cssText: string): string {
  if (!cssText || !/(oklch|oklab|lab|lch|hwb|color)\(/i.test(cssText)) {
    return cssText;
  }
  return cssText.replace(MODERN_COLOR_REGEX, (match) => parseCssColorToRgb(match));
}

/**
 * Ultra-fast client-side image generator for printable areas with full oklch/oklab color parsing fix.
 */
export async function generateElementImage(elementId: string, fileName: string): Promise<void> {
  const elem = document.getElementById(elementId);
  if (!elem) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Save original styles
  const prevDisplay = elem.style.display;
  const prevPosition = elem.style.position;
  const prevLeft = elem.style.left;
  const prevTop = elem.style.top;
  const prevWidth = elem.style.width;
  const prevZIndex = elem.style.zIndex;
  const prevBg = elem.style.backgroundColor;

  // Render offscreen at fixed 850px width for clean paper document layout
  elem.style.display = 'block';
  elem.style.position = 'fixed';
  elem.style.left = '-9999px';
  elem.style.top = '0';
  elem.style.width = '850px';
  elem.style.zIndex = '-9999';
  elem.style.backgroundColor = '#ffffff';

  try {
    const canvas = await html2canvas(elem, {
      scale: 2, // High resolution Retina capture
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850,
      onclone: (clonedDoc) => {
        // 1. Sanitize all <style> tags in cloned document to remove/replace oklch, oklab, etc.
        const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
        styleTags.forEach((styleTag) => {
          if (styleTag.textContent && /(oklch|oklab|lab|lch|hwb|color)\(/i.test(styleTag.textContent)) {
            styleTag.textContent = sanitizeStyleText(styleTag.textContent);
          }
        });

        // 2. Sanitize all inline style attributes across cloned document
        const allClonedElements = Array.from(clonedDoc.querySelectorAll('*'));
        allClonedElements.forEach((node) => {
          const htmlEl = node as HTMLElement;
          const styleAttr = htmlEl.getAttribute('style');
          if (styleAttr && /(oklch|oklab|lab|lch|hwb|color)\(/i.test(styleAttr)) {
            htmlEl.setAttribute('style', sanitizeStyleText(styleAttr));
          }
        });

        // 3. Sanitize computed styles for all elements in the target printable container
        const origElem = document.getElementById(elementId);
        const clonedElem = clonedDoc.getElementById(elementId);

        if (origElem && clonedElem) {
          const origNodes = [origElem, ...Array.from(origElem.querySelectorAll('*'))] as HTMLElement[];
          const clonedNodes = [clonedElem, ...Array.from(clonedElem.querySelectorAll('*'))] as HTMLElement[];

          const colorProps = [
            'color',
            'backgroundColor',
            'borderColor',
            'borderTopColor',
            'borderRightColor',
            'borderBottomColor',
            'borderLeftColor',
            'outlineColor',
            'fill',
            'stroke',
            'boxShadow',
          ];

          for (let i = 0; i < origNodes.length; i++) {
            const origNode = origNodes[i];
            const clonedNode = clonedNodes[i];
            if (!origNode || !clonedNode) continue;

            try {
              const computed = window.getComputedStyle(origNode);
              colorProps.forEach((prop) => {
                const val = (computed as any)[prop];
                if (val && typeof val === 'string' && /(oklch|oklab|lab|lch|hwb|color)\(/i.test(val)) {
                  const rgbVal = sanitizeStyleText(val);
                  (clonedNode.style as any)[prop] = rgbVal;
                }
              });
            } catch (e) {
              // Ignore node style lookup errors
            }
          }
        }
      },
    });

    // Download PNG
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Always restore original element styles
    elem.style.display = prevDisplay;
    elem.style.position = prevPosition;
    elem.style.left = prevLeft;
    elem.style.top = prevTop;
    elem.style.width = prevWidth;
    elem.style.zIndex = prevZIndex;
    elem.style.backgroundColor = prevBg;
  }
}
