import { Mesh, Program, Texture } from 'ogl';

import fragment from '@/shaders/image-fragment.glsl';
import vertex from '@/shaders/image-vertex.glsl';

import { map } from '@/lib/utils/math';

import Number from './Number';
import Title from './Title';

interface MediaProps {
  geometry: any;
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  image: string;
  index: number;
  length: number;
  renderer: any;
  scene: any;
  screen: { width: number; height: number };
  text: string;
  viewport: { width: number; height: number };
  onClick?: (media: Media) => void;
}

export default class Media {
  extra: number;
  geometry: any;
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  image: string;
  index: number;
  length: number;
  renderer: any;
  scene: any;
  screen: { width: number; height: number };
  text: string;
  viewport: { width: number; height: number };
  onClick?: (media: Media) => void;
  program!: Program;
  plane!: Mesh;
  number!: Number;
  title!: Title;
  speed: number = 0;
  isBefore: boolean = false;
  isAfter: boolean = false;
  scale: number = 0;
  baseScaleY: number = 0;
  baseScaleX: number = 0;
  padding: number = 0;
  width: number = 0;
  widthTotal: number = 0;
  x: number = 0;

  constructor({ geometry, gl, image, index, length, renderer, scene, screen, text, viewport, onClick }: MediaProps) {
    this.extra = 0;

    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.onClick = onClick;

    this.createShader();
    this.createMesh();
    this.createTitle();

    this.onResize();
  }

  createShader() {
    const texture = new Texture(this.gl, {
      generateMipmaps: false,
    });

    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      fragment,
      vertex,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uViewportSizes: { value: [this.viewport.width, this.viewport.height] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uOpacity: { value: 1.0 },
      },
      transparent: true,
    });

    const image = new Image();

    image.src = this.image;
    image.onload = () => {
      texture.image = image;
      this.program.uniforms.uImageSizes.value = [image.naturalWidth, image.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program,
    });

    this.plane.setParent(this.scene);
  }

  createTitle() {
    this.number = new Number({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.index % (this.length / 2),
    });

    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
    });
  }

  update(scroll: { current: number; last: number; target: number }, direction: 'left' | 'right') {
    // LAYOUT CUSTOMIZATION:
    // 1. Horizontal positioning - controls spacing along X axis
    this.plane.position.x = this.x - scroll.current - this.extra;

    // 2. CYLINDRICAL LAYOUT - creates a true 3D cylinder
    //    Calculate angle based on X position (normalized to 0-2π)
    //    Offset by π/2 so center item (x=0) is at y=0 (horizontal center)
    const angle = (this.plane.position.x / this.widthTotal) * Math.PI * 2 + Math.PI / 2;

    //    CYLINDER RADIUS - adjust this value to make cylinder wider/narrower
    const cylinderRadius = 0.5;

    //    Y position - vertical circle (cos for up/down)
    //    Centered on horizontal axis (y = 0 when item is at front center, x = 0)
    //    Adjust cylinderRadius to change cylinder size
    //    Add an offset (e.g., -10) if you need to shift the entire cylinder up/down
    this.plane.position.y = Math.cos(angle) * cylinderRadius;

    //    Z position - depth circle (sin for front/back) - THIS CREATES THE CYLINDER!
    //    Adjust cylinderRadius to match Y radius for perfect circle
    this.plane.position.z = Math.sin(angle) * cylinderRadius;

    // 3. Rotation - make items face the center of the cylinder
    //    Items on the right rotate left (negative), items on the left rotate right (positive)
    //    This creates the cylindrical illusion where items face inward

    //    Z rotation - keep at 0 for no tilt
    this.plane.rotation.z = 0;

    //    Y rotation - rotate around vertical axis to face center
    //    Calculate rotation based on X position (normalized to viewport)
    //    ROTATION INTENSITY - adjust this multiplier to control how much items rotate
    //    Larger value = more rotation, smaller = less rotation
    const rotationIntensity = 4;

    //    Normalize X position to -1 to 1 range (relative to viewport)
    const normalizedX = this.plane.position.x / (this.viewport.width * 1.5);

    //    Invert so: right side (positive x) rotates left (negative), left side rotates right (positive)
    this.plane.rotation.y = -normalizedX * rotationIntensity;

    // 3.5. SCALE EFFECT - make center items bigger, side items smaller
    //    Creates depth illusion where center items appear closer
    //    SCALE INTENSITY - adjust this to control how much size varies
    //    Larger value = more size difference, smaller = subtle effect
    const scaleIntensity = -1;

    //    Calculate scale factor: 1.0 at center, decreasing toward edges
    //    Using absolute value of normalizedX so both sides scale down equally
    const scaleDistance = Math.abs(normalizedX);
    const scaleFactor = 0.9 - scaleDistance * scaleIntensity;

    //    Apply scale multiplier to base scale (only if base scales exist)
    if (this.baseScaleX && this.baseScaleY) {
      this.plane.scale.x = this.baseScaleX * scaleFactor;
      this.plane.scale.y = this.baseScaleY * scaleFactor;

      // Update shader uniforms with new scale
      this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    }

    // 4. OPACITY FADE - Center item is fully visible, others fade based on distance
    //    Calculate distance from center (x = 0 is the center of viewport)
    const distanceFromCenter = Math.abs(this.plane.position.x);

    //    FOCUS AREA - adjust this to control how wide the focus zone is
    //    Larger value = more items stay visible, smaller = sharper focus
    const focusWidth = this.viewport.width * 0.2;

    //    Calculate opacity: 1.0 at center, fading to minimum opacity at edges
    //    Using smooth falloff for better visual effect
    const normalizedDistance = Math.min(distanceFromCenter / focusWidth, 1);

    //    MINIMUM OPACITY - adjust this (0.0 to 1.0) to control how faded distant items are
    //    0.0 = completely invisible, 0.3 = slightly visible, etc.
    const minOpacity = 0.4;

    //    Smooth fade using ease-out curve
    const opacity = 1.0 - (1.0 - minOpacity) * (normalizedDistance * normalizedDistance);

    this.program.uniforms.uOpacity.value = opacity;

    this.speed = scroll.current - scroll.last;

    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width;

    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;

    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;

      this.isBefore = false;
      this.isAfter = false;
    }

    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;

      this.isBefore = false;
      this.isAfter = false;
    }
  }

  /**
   * Check if a 2D point (mouse/touch position) intersects with this media item.
   * @param x - Normalized x position (-1 to 1)
   * @param y - Normalized y position (-1 to 1)
   * @returns True if the point intersects with this item
   */
  checkIntersection(x: number, y: number): boolean {
    // Convert normalized coordinates to viewport coordinates
    const viewportX = (x * this.viewport.width) / 2;
    const viewportY = (-y * this.viewport.height) / 2;

    // Check if point is within the bounds of this plane
    const planeLeft = this.plane.position.x - this.plane.scale.x / 2;
    const planeRight = this.plane.position.x + this.plane.scale.x / 2;
    const planeTop = this.plane.position.y + this.plane.scale.y / 2;
    const planeBottom = this.plane.position.y - this.plane.scale.y / 2;

    return viewportX >= planeLeft && viewportX <= planeRight && viewportY >= planeBottom && viewportY <= planeTop;
  }

  /**
   * Events.
   */
  onResize({ screen, viewport }: { screen?: { width: number; height: number }; viewport?: { width: number; height: number } } = {}) {
    if (screen) {
      this.screen = screen;
    }

    if (viewport) {
      this.viewport = viewport;

      this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height];
    }

    // LAYOUT CUSTOMIZATION - Item Sizing:
    // Reduced scale for smaller dresses on screen
    this.scale = this.screen.height / 1500;

    // Item dimensions - adjusted for portrait dress images with fixed height 1000px
    // Make plane accommodate widest images (450px) at 1000px height
    // This prevents stretching or cutting of any dress images
    this.baseScaleY = (this.viewport.height * (1000 * this.scale)) / this.screen.height;

    // Increased width to accommodate widest images (450px) without stretching
    // Using 500px to give some breathing room for all images (300-450px range)
    this.baseScaleX = (this.viewport.width * (500 * this.scale)) / this.screen.width;

    // Apply base scale (will be modified in update() based on position)
    this.plane.scale.y = this.baseScaleY;
    this.plane.scale.x = this.baseScaleX;

    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];

    // LAYOUT CUSTOMIZATION - Spacing:
    // Adjusted padding for smaller items
    this.padding = 2;

    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;

    this.x = this.width * this.index;
  }
}

