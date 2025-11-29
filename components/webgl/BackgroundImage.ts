import { Mesh, Plane, Program, Texture } from 'ogl';

import fragment from '@/shaders/background-image-fragment.glsl';
import vertex from '@/shaders/background-image-vertex.glsl';

const backgroundImagePath = '/images/main-background.png';
// TODO: Change this number to adjust scroll intensity (1.0 = same speed as items)
const scrollSpeed = 0.5;

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

  constructor({ gl, scene, viewport }: { gl: WebGLRenderingContext | WebGL2RenderingContext; scene: any; viewport: { width: number; height: number } }) {
    this.gl = gl;
    this.scene = scene;
    this.viewport = viewport;

    // Create texture
    const texture = new Texture(this.gl, {
      generateMipmaps: false,
    });

    // Load the background image
    const image = new Image();
    image.src = backgroundImagePath;
    image.onload = () => {
      texture.image = image;
      this.imageWidth = image.naturalWidth;
      this.imageHeight = image.naturalHeight;
      this.imageAspectRatio = this.imageWidth / this.imageHeight;
      
      // Update uniforms with image dimensions for all meshes
      if (this.program) {
        this.program.uniforms.uImageSizes.value = [this.imageWidth, this.imageHeight];
      }
      
      // Recalculate positions after image loads
      this.resize();
    };

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
        uImageSizes: { value: [0, 0] }, // Will be updated when image loads
        uPlaneSizes: { value: [viewport.width, viewport.height] },
      },
      depthTest: false,
      depthWrite: false,
      transparent: false,
    });

    // Create 3 copies of the background (dubl-1, dubl-2, dubl-3)
    this.meshes = [];
    
    for (let i = 0; i < 3; i++) {
      const mesh = new Mesh(this.gl, {
        geometry,
        program: this.program,
      }) as BackgroundMesh;

      // Position the plane behind everything (further back in Z)
      mesh.position.z = -10;
      
      // Initial x position will be set in resize()
      mesh.x = 0;
      mesh.xExtra = 0;

      this.meshes.push(mesh);
      this.scene.addChild(mesh);
    }
    
    // Scale to cover the entire viewport (full screen)
    this.resize();
  }

  resize() {
    // Calculate scale to fill screen height while maintaining aspect ratio
    // The width will be determined by the image aspect ratio
    const scaleY = this.viewport.height;
    const scaleX = this.viewport.height * (this.imageAspectRatio || 16/9); // Default aspect if image not loaded
    
    // Calculate the width of one background image in viewport units
    const backgroundWidth = scaleX;
    
    // Position the 3 copies side by side with no gaps
    // Each mesh center is positioned exactly one backgroundWidth apart
    // dubl-1 at -backgroundWidth, dubl-2 at 0, dubl-3 at +backgroundWidth
    this.meshes.forEach((mesh, index) => {
      mesh.scale.x = scaleX;
      mesh.scale.y = scaleY;
      
      // Position: -1, 0, +1 (relative to center)
      // Each mesh center is positioned exactly one backgroundWidth apart
      // This ensures edges touch: mesh at -width touches mesh at 0, etc.
      const offset = (index - 1) * backgroundWidth;
      mesh.x = offset;
      // Update position including any extra offset from swapping
      mesh.position.x = offset + mesh.xExtra;
      mesh.position.y = 0; // Center vertically
    });
    
    // Update plane sizes uniform
    if (this.program && this.meshes.length > 0) {
      this.program.uniforms.uPlaneSizes.value = [this.meshes[0].scale.x, this.meshes[0].scale.y];
    }
  }

  update(scroll: { current: number; last: number }, direction: 'left' | 'right') {
    if (!this.program || this.meshes.length === 0) return;
    
    // Calculate background width in viewport units
    const backgroundWidth = this.meshes[0].scale.x;
    const viewportOffset = this.viewport.width * 0.5;
    const halfWidth = backgroundWidth * 0.5;
    
    // Update position of each mesh based on scroll (with scrollSpeed multiplier)
    this.meshes.forEach((mesh) => {
      mesh.position.x = mesh.x - (scroll.current * scrollSpeed) + mesh.xExtra;
      
      // Check boundaries for swapping - swap BEFORE mesh goes completely off-screen
      // A mesh is "before" if its right edge is about to go off the left side of viewport
      // A mesh is "after" if its left edge is about to go off the right side of viewport
      mesh.isBefore = (mesh.position.x + halfWidth) < -viewportOffset;
      mesh.isAfter = (mesh.position.x - halfWidth) > viewportOffset;
    });
    
    // Swap logic: when scrolling right, move leftmost mesh to the right
    // [dubl-1, dubl-2, dubl-3] -> [dubl-2, dubl-3, dubl-1]
    if (direction === 'right') {
      this.meshes.forEach((mesh) => {
        if (mesh.isBefore) {
          // Find the rightmost mesh (highest position.x)
          const rightmostMesh = this.meshes.reduce((max, m) => 
            m.position.x > max.position.x ? m : max
          );
          
          // Calculate the base position of the rightmost mesh (without scroll offset)
          const rightmostBaseX = rightmostMesh.x + rightmostMesh.xExtra;
          
          // Move this mesh to the right of the rightmost one
          // Position it exactly one backgroundWidth to the right of the rightmost mesh's base position
          mesh.xExtra = rightmostBaseX + backgroundWidth - mesh.x;
          
          // Update position immediately
          mesh.position.x = mesh.x - (scroll.current * scrollSpeed) + mesh.xExtra;
          mesh.isBefore = false;
          mesh.isAfter = false;
        }
      });
    }
    
    // Swap logic: when scrolling left, move rightmost mesh to the left
    // [dubl-1, dubl-2, dubl-3] -> [dubl-3, dubl-1, dubl-2]
    if (direction === 'left') {
      this.meshes.forEach((mesh) => {
        if (mesh.isAfter) {
          // Find the leftmost mesh (lowest position.x)
          const leftmostMesh = this.meshes.reduce((min, m) => 
            m.position.x < min.position.x ? m : min
          );
          
          // Calculate the base position of the leftmost mesh (without scroll offset)
          const leftmostBaseX = leftmostMesh.x + leftmostMesh.xExtra;
          
          // Move this mesh to the left of the leftmost one
          // Position it exactly one backgroundWidth to the left of the leftmost mesh's base position
          mesh.xExtra = leftmostBaseX - backgroundWidth - mesh.x;
          
          // Update position immediately
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

