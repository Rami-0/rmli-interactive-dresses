precision highp float;

uniform vec2 uImageSizes;
uniform vec2 uPlaneSizes;
uniform sampler2D tMap;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  // Calculate the actual size the image should be displayed at
  // We want to show the image at its natural aspect ratio without scaling up
  
  float imageAspect = uImageSizes.x / uImageSizes.y;
  float planeAspect = uPlaneSizes.x / uPlaneSizes.y;
  
  // Calculate how much of the plane the image should actually occupy
  // This ensures the image is never scaled UP beyond its natural size
  vec2 scale = vec2(1.0);
  
  if (planeAspect > imageAspect) {
    // Plane is wider - image should only take up part of the width
    scale.x = imageAspect / planeAspect;
  } else {
    // Plane is taller - image should only take up part of the height  
    scale.y = planeAspect / imageAspect;
  }
  
  // Apply the scale and center the image
  vec2 uv = (vUv - 0.5) / scale + 0.5;
  
  // If UV is outside [0,1], we're outside the image - make it transparent
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }
  
  vec4 texture = texture2D(tMap, uv);
  gl_FragColor = vec4(texture.rgb, texture.a * uOpacity);
}