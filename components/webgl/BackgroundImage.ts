import { Mesh, Plane, Program, Texture } from 'ogl';

import fragment from '@/shaders/background-image-fragment.glsl';
import vertex from '@/shaders/background-image-vertex.glsl';

const backgroundImagePath = '/images/main-background.png';
// TODO: Change this number to adjust scroll intensity (1.0 = same speed as items)
const scrollSpeed = 0.6;

interface BackgroundMesh extends Mesh {
  x: number;
  xExtra: number;
  isBefore?: boolean;
  isAfter?: boolean;
}

export default class BackgroundImage {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  scene: any;
  viewport: { width: number; height: number };
  meshes: BackgroundMesh[];
  program: Program;
  imageWidth: number = 0;
  imageHeight: number = 0;
  imageAspectRatio: number = 0;
  private imageLoadPromise: Promise<void>;

  /**
   * Preload background image before initializing WebGL context
   * This prevents context loss on mobile devices
   */
  static async preloadImage(): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = backgroundImagePath;
      
      console.log('[BackgroundImage] Starting preload...');
      
      image.onload = () => {
        console.log('[BackgroundImage] Preload complete:', {
          width: image.naturalWidth,
          height: image.naturalHeight,
          src: backgroundImagePath
        });
        resolve(image);
      };
      
      image.onerror = (error) => {
        console.error('[BackgroundImage] Preload failed:', error);
        reject(error);
      };
    });
  }

  constructor({ gl, scene, viewport, preloadedImage }: { 
    gl: WebGLRenderingContext | WebGL2RenderingContext; 
    scene: any; 
    viewport: { width: number; height: number };
    preloadedImage?: HTMLImageElement;
  }) {
    this.gl = gl;
    this.scene = scene;
    this.viewport = viewport;

    // Create texture
    const texture = new Texture(this.gl, {
      generateMipmaps: false,
    });

    // Initialize image loading
    if (preloadedImage) {
      // Use preloaded image immediately
      console.log('[BackgroundImage] Using preloaded image');
      texture.image = preloadedImage;
      this.imageWidth = preloadedImage.naturalWidth;
      this.imageHeight = preloadedImage.naturalHeight;
      this.imageAspectRatio = this.imageWidth / this.imageHeight;
      this.imageLoadPromise = Promise.resolve();
    } else {
      // Fallback: Load the image if not preloaded
      console.log('[BackgroundImage] Loading image as fallback...');
      this.imageLoadPromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.src = backgroundImagePath;
        
        image.onload = () => {
          texture.image = image;
          this.imageWidth = image.naturalWidth;
          this.imageHeight = image.naturalHeight;
          this.imageAspectRatio = this.imageWidth / this.imageHeight;
          
          console.log('[BackgroundImage] Image loaded:', {
            width: this.imageWidth,
            height: this.imageHeight,
            aspectRatio: this.imageAspectRatio,
            viewport: this.viewport
          });
          
          resolve();
        };
        
        image.onerror = (error) => {
          console.error('[BackgroundImage] Fallback load failed:', error);
          // Resolve anyway - app should continue without background
          resolve();
        };
      });
    }

    // Create geometry - a plane for each copy
    const geometry = new Plane(this.gl, {
      heightSegments: 1,
      widthSegments: 1,
    });

    // Create shader program
    this.program = new Program(this.gl, {
      vertex,
      fragment,
      uniforms: {
        tMap: { value: texture },
        uImageSizes: { value: [this.imageWidth, this.imageHeight] },
        uPlaneSizes: { value: [viewport.width, viewport.height] },
      },
      depthTest: false,
      depthWrite: false,
      transparent: false,
    });

    // Create 3 copies of the background
    this.meshes = [];
    
    for (let i = 0; i < 3; i++) {
      const mesh = new Mesh(this.gl, {
        geometry,
        program: this.program,
      }) as BackgroundMesh;

      // Position further back so it doesn't overlap media items
      // z: -10 means it's 30 units from camera (camera at z:20)
      mesh.position.z = -10;
      mesh.x = 0;
      mesh.xExtra = 0;

      this.meshes.push(mesh);
      this.scene.addChild(mesh);
    }
    
    // Wait for image to load before initial resize
    this.imageLoadPromise.then(() => {
      if (this.program) {
        this.program.uniforms.uImageSizes.value = [this.imageWidth, this.imageHeight];
        console.log('[BackgroundImage] Updated uImageSizes uniform');
      }
      this.resize();
    });
  }

  /**
   * Wait for background image to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    return this.imageLoadPromise;
  }

  resize() {
    // CRITICAL FIX: Perspective scaling compensation
    // Camera is at z:20, background is at z:-10, distance = 30 units
    // Media items are at z:~0, distance = 20 units
    // Scale factor = 30 / 20 = 1.5x to compensate for perspective
    
    const cameraZ = 20; // From App.tsx
    const backgroundZ = -10;
    const distance = cameraZ - backgroundZ; // 30
    const referenceDistance = cameraZ; // 20 (distance to z:0 plane)
    const perspectiveScale = distance / referenceDistance; // 1.5
    
    // Reduce multiplier to show image at better quality without stretching
    // For 4096×2136 image, using 3x to show more content while preserving detail
    const widthMultiplier = 2.1;
    const scaleX = this.viewport.width * perspectiveScale * widthMultiplier;
    const scaleY = this.viewport.height * perspectiveScale;
    
    const planeAspect = scaleX / scaleY;
    const imageAspect = this.imageWidth && this.imageHeight ? this.imageWidth / this.imageHeight : 0;
    
    console.log('[BackgroundImage] Resize:', {
      viewport: this.viewport,
      perspectiveScale,
      widthMultiplier,
      planeSize: [scaleX, scaleY],
      planeAspect: planeAspect,
      imageSize: [this.imageWidth, this.imageHeight],
      imageAspect: imageAspect,
      widthRatio: imageAspect / planeAspect,
      strategy: 'Reduced multiplier for better detail'
    });
    
    const backgroundWidth = scaleX;
    
    this.meshes.forEach((mesh, index) => {
      mesh.scale.x = scaleX;
      mesh.scale.y = scaleY;
      
      // Position planes side by side for infinite scrolling
      const offset = (index - 1) * backgroundWidth;
      mesh.x = offset;
      mesh.position.x = offset + mesh.xExtra;
      mesh.position.y = 0;
    });
    
    // Update shader uniforms
    if (this.program && this.meshes.length > 0) {
      this.program.uniforms.uPlaneSizes.value = [scaleX, scaleY];
    }
  }

  update(scroll: { current: number; last: number }, direction: 'left' | 'right') {
    if (!this.program || this.meshes.length === 0) return;
    
    const backgroundWidth = this.meshes[0].scale.x;
    // Increase buffer to 2x viewport width to reduce snappy transitions
    const viewportOffset = this.viewport.width * 2;
    const halfWidth = backgroundWidth * 0.5;
    
    this.meshes.forEach((mesh) => {
      mesh.position.x = mesh.x - (scroll.current * scrollSpeed) + mesh.xExtra;
      
      // Only mark for swap when completely off screen (with large buffer)
      mesh.isBefore = (mesh.position.x + halfWidth) < -viewportOffset;
      mesh.isAfter = (mesh.position.x - halfWidth) > viewportOffset;
    });
    
    if (direction === 'right') {
      this.meshes.forEach((mesh) => {
        if (mesh.isBefore) {
          const rightmostMesh = this.meshes.reduce((max, m) => 
            m.position.x > max.position.x ? m : max
          );
          
          const rightmostBaseX = rightmostMesh.x + rightmostMesh.xExtra;
          mesh.xExtra = rightmostBaseX + backgroundWidth - mesh.x;
          mesh.position.x = mesh.x - (scroll.current * scrollSpeed) + mesh.xExtra;
          mesh.isBefore = false;
          mesh.isAfter = false;
        }
      });
    }
    
    if (direction === 'left') {
      this.meshes.forEach((mesh) => {
        if (mesh.isAfter) {
          const leftmostMesh = this.meshes.reduce((min, m) => 
            m.position.x < min.position.x ? m : min
          );
          
          const leftmostBaseX = leftmostMesh.x + leftmostMesh.xExtra;
          mesh.xExtra = leftmostBaseX - backgroundWidth - mesh.x;
          mesh.position.x = mesh.x - (scroll.current * scrollSpeed) + mesh.xExtra;
          mesh.isBefore = false;
          mesh.isAfter = false;
        }
      });
    }
  }

  onResize(viewport: { width: number; height: number }) {
    this.viewport = viewport;
    this.resize();
  }
}