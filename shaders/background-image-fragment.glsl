precision highp float;

uniform sampler2D tMap;
uniform vec2 uImageSizes;
uniform vec2 uPlaneSizes;

varying vec2 vUv;

void main() {
  // Calculate aspect ratios
  float imageAspect = uImageSizes.x / uImageSizes.y;
  float planeAspect = uPlaneSizes.x / uPlaneSizes.y;
  
  vec2 uv = vUv;
  
  // Fill screen: scale to cover entire plane while maintaining aspect ratio
  // The plane is sized to match image aspect ratio, so we scale to fill
  if (planeAspect > imageAspect) {
    // Plane is wider than image - scale Y to fill height, crop X sides
    float scaleY = planeAspect / imageAspect;
    uv.y = (uv.y - 0.5) * scaleY + 0.5;
    // Keep X centered - this will crop the sides but fill height
  } else {
    // Plane is taller than image - scale X to fill width, crop Y top/bottom
    float scaleX = imageAspect / planeAspect;
    uv.x = (uv.x - 0.5) * scaleX + 0.5;
    // Keep Y centered - this will crop top/bottom but fill width
  }
  
  // Sample the texture - if UV goes outside 0-1, it will show black/transparent
  // But we want to fill the screen, so we clamp to ensure we always sample valid texture
  uv.x = clamp(uv.x, 0.0, 1.0);
  uv.y = clamp(uv.y, 0.0, 1.0);
  
  gl_FragColor = texture2D(tMap, uv);
}

