// Font cache to avoid loading the same font multiple times
const fontCache: Map<string, any> = new Map();

export async function loadFont(fontPath: string): Promise<any> {
  if (fontCache.has(fontPath)) {
    return fontCache.get(fontPath);
  }

  try {
    const response = await fetch(fontPath);
    const font = await response.json();
    fontCache.set(fontPath, font);
    return font;
  } catch (error) {
    console.error(`Failed to load font from ${fontPath}:`, error);
    throw error;
  }
}

// Preload fonts
export async function preloadFonts() {
  const fonts = ['/fonts/freight.json', '/fonts/forma.json'];
  await Promise.all(fonts.map((font) => loadFont(font).catch(() => null)));
}

