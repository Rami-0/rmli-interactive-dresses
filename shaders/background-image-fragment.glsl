precision highp float;

uniform sampler2D tMap;
uniform vec2 uImageSizes;
uniform vec2 uPlaneSizes;

varying vec2 vUv;

void main() {
  // FIT HEIGHT strategy with wider planes
  // Scale image to fit plane HEIGHT, let width extend naturally
  // With 8x wider planes, we show much more of the 10k-wide artwork
  
  float planeAspect = uPlaneSizes.x / uPlaneSizes.y;
  float imageAspect = uImageSizes.x / uImageSizes.y;
  
  vec2 uv = vUv;
  
  // Scale to fit height (show full height, crop width if needed)
  float widthRatio = imageAspect / planeAspect;
  
  if (widthRatio > 1.0) {
    // Image is still wider than our 8x plane - crop the sides to show center
    float visiblePortion = 1.0 / widthRatio;
    float offset = (1.0 - visiblePortion) * 0.5;
    uv.x = offset + vUv.x * visiblePortion;
  }
  // If widthRatio <= 1.0, entire image width fits in the plane
  
  gl_FragColor = texture2D(tMap, uv);
}