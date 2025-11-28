import { Mesh, Program, Texture } from 'ogl';

import fragment from '@/shaders/image-fragment.glsl';
import vertex from '@/shaders/image-vertex.glsl';

interface ColumnProps {
  geometry: any;
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  index: number;
  length: number;
  renderer: any;
  scene: any;
  screen: { width: number; height: number };
  viewport: { width: number; height: number };
  content: { text?: string };
  type: 'left' | 'middle' | 'right';
}

export default class Column {
  extra: number;
  geometry: any;
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  index: number;
  length: number;
  renderer: any;
  scene: any;
  screen: { width: number; height: number };
  viewport: { width: number; height: number };
  content: { text?: string };
  type: 'left' | 'middle' | 'right';
  program!: Program;
  plane!: Mesh;
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D | null;
  speed: number = 0;
  scale: number = 0;
  baseScaleY: number = 0;
  baseScaleX: number = 0;
  padding: number = 0;
  width: number = 0;
  widthTotal: number = 0;
  x: number = 0;

  constructor({ geometry, gl, index, length, renderer, scene, screen, viewport, content, type }: ColumnProps) {
    this.extra = 0;

    this.geometry = geometry;
    this.gl = gl;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.viewport = viewport;
    this.content = content;
    this.type = type;

    this.createShader();
    this.createMesh();
    this.createColumnContent();

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

    // Create a canvas to render column content as texture
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 1200;
    this.ctx = this.canvas.getContext('2d');

    // Render content to canvas
    this.renderContentToCanvas();

    // Use canvas as texture
    texture.image = this.canvas;
    this.program.uniforms.uImageSizes.value = [this.canvas.width, this.canvas.height];
  }

  renderContentToCanvas() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(0, 0, width, height);

    // Render column content based on type
    if (this.type === 'left') {
      this.renderLeftColumn(ctx, width, height);
    } else if (this.type === 'middle') {
      this.renderMiddleColumn(ctx, width, height);
    } else if (this.type === 'right') {
      this.renderRightColumn(ctx, width, height);
    }
  }

  renderLeftColumn(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Render dress illustration placeholder
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dress Illustration', width / 2, height / 2);

    // Add placeholder rectangle for image
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.7);
  }

  renderMiddleColumn(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Render metadata content
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Metadata', width / 2, 50);
    const text = this.content?.text || 'Descriptive text about the traditional dress...';
    const lines = this.wrapText(ctx, text, width * 0.8);

    let y = 50;
    lines.forEach((line) => {
      ctx.fillText(line, width * 0.1, y);
      y += 25;
    });

    ctx.font = '16px sans-serif';
    ctx.fillText('Map, Colors, Fabric Types', width / 2, 100);
    ctx.fillText('Dress Name', width / 2, 150);
  }

  renderRightColumn(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Render descriptive text
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';

    const text = this.content?.text || 'Descriptive text about the traditional dress in the Right column...';
    const lines = this.wrapText(ctx, text, width * 0.8);

    let y = 100;
    lines.forEach((line) => {
      ctx.fillText(line, width * 0.1, y);
      y += 25;
    });
    ctx.fillText('Map, Colors, Fabric Types', width / 2, 100);
    ctx.fillText('Dress Name', width / 2, 150);
  }

  wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program,
    });

    this.plane.setParent(this.scene);
  }

  createColumnContent() {
    // Column content will be rendered to canvas texture
    // This can be extended to render actual HTML content
  }

  update(scroll: { current: number; last: number }, direction: 'left' | 'right') {
    // LAYOUT CUSTOMIZATION:
    // 1. Horizontal positioning - controls spacing along X axis
    this.plane.position.x = this.x - scroll.current - this.extra;

    // 2. CYLINDRICAL LAYOUT - creates a true 3D cylinder
    //    Calculate angle based on X position relative to viewport center
    //    Use viewport center as reference for proper alignment
    const viewportCenter = 0;
    const relativeX = this.plane.position.x - viewportCenter;
    const angle = (relativeX / this.viewport.width) * Math.PI * 2 + Math.PI / 2;

    //    CYLINDER RADIUS - adjust this value to make cylinder wider/narrower
    const cylinderRadius = 0.5;

    //    Y position - vertical circle (cos for up/down)
    //    Centered on horizontal axis (y = 0 when item is at front center)
    this.plane.position.y = Math.cos(angle) * cylinderRadius;

    //    Z position - depth circle (sin for front/back) - THIS CREATES THE CYLINDER!
    this.plane.position.z = Math.sin(angle) * cylinderRadius;

    // 3. Rotation - make columns face the center of the cylinder
    //    Z rotation - keep at 0 for no tilt
    this.plane.rotation.z = 0;

    //    Y rotation - rotate around vertical axis to face center
    const rotationIntensity = 3;
    const normalizedX = this.plane.position.x / (this.viewport.width * 1.5);
    this.plane.rotation.y = -normalizedX * rotationIntensity;

    // 3.5. SCALE EFFECT - make center column bigger, side columns smaller
    const scaleIntensity = 1;
    const scaleDistance = Math.abs(normalizedX);
    const scaleFactor = 1.0 - scaleDistance * scaleIntensity;

    if (this.baseScaleX && this.baseScaleY) {
      this.plane.scale.x = this.baseScaleX * scaleFactor;
      this.plane.scale.y = this.baseScaleY * scaleFactor;
      this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    }

    // 4. OPACITY FADE - Center column is fully visible, others fade based on distance
    const distanceFromCenter = Math.abs(this.plane.position.x);
    const focusWidth = this.viewport.width * 0.3;
    const normalizedDistance = Math.min(distanceFromCenter / focusWidth, 1);
    const minOpacity = 0.5;
    const opacity = 1.0 - (1.0 - minOpacity) * (normalizedDistance * normalizedDistance);

    this.program.uniforms.uOpacity.value = opacity;

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    // Removed infinite scrolling logic - columns are now bounded
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

    // LAYOUT CUSTOMIZATION - Column Sizing:
    this.scale = this.screen.height / 1700;

    // Column dimensions - wider than image items to accommodate content
    this.baseScaleY = (this.viewport.height * (1000 * this.scale)) / this.screen.height;
    this.baseScaleX = (this.viewport.width * (800 * this.scale)) / this.screen.width;

    // Apply base scale (will be modified in update() based on position)
    this.plane.scale.y = this.baseScaleY;
    this.plane.scale.x = this.baseScaleX;

    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];

    // LAYOUT CUSTOMIZATION - Spacing:
    this.padding = 0;

    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;

    // Simple left-to-right positioning
    // Column 0 at x=0, Column 1 at x=width, Column 2 at x=2*width
    this.x = this.width * this.index;
  }
}

