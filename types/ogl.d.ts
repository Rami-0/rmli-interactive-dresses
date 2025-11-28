// Type definitions for OGL library
// These are basic types - you may need to extend them based on actual OGL API

declare module 'ogl' {
  export class Renderer {
    gl: WebGLRenderingContext | WebGL2RenderingContext;
    canvas: HTMLCanvasElement;
    isWebgl2: boolean;
    constructor();
    setSize(width: number, height: number): void;
    render(options: { scene: any; camera: any }): void;
  }

  export class Camera {
    fov: number;
    aspect: number;
    position: { x: number; y: number; z: number };
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext);
    perspective(options: { aspect: number }): void;
  }

  export class Transform {
    addChild(child: any): void;
    removeChild(child: any): void;
  }

  export class Plane {
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, options?: { heightSegments?: number; widthSegments?: number });
  }

  export class Mesh {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    program: Program;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, options: { geometry: any; program: Program });
    setParent(parent: any): void;
  }

  export class Program {
    uniforms: Record<string, { value: any }>;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, options: any);
  }

  export class Texture {
    image: HTMLImageElement | HTMLCanvasElement | null;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, options?: { generateMipmaps?: boolean });
  }

  export class Color {
    constructor(color: string);
  }

  export class Geometry {
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, options: any);
    computeBoundingBox(): void;
  }

  export class Text {
    buffers: {
      position: Float32Array;
      uv: Float32Array;
      id: Float32Array;
      index: Uint16Array;
    };
    constructor(options: {
      align?: string;
      font: any;
      letterSpacing?: number;
      size?: number;
      text: string;
      wordSpacing?: number;
    });
  }
}

