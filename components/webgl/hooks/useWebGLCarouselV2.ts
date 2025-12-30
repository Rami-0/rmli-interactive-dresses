import { useEffect, useRef, useCallback } from 'react';
import { Renderer, Camera, Transform, Plane } from 'ogl';
import NormalizeWheel from 'normalize-wheel';
import debounce from 'lodash/debounce';

import { lerp } from '@/lib/utils/math';
import MediaV2 from '../MediaV2';
import { TOUCH_SENSITIVITY } from '@/lib/constants';

interface ScrollState {
  ease: number;
  current: number;
  target: number;
  last: number;
  position?: number;
}

interface MediaImage {
  image: string;
  text: string;
  id: number;
}

interface UseWebGLCarouselV2Props {
  mediasImages: MediaImage[];
  onSlideChange?: (index: number) => void;
}

export function useWebGLCarouselV2({ mediasImages, onSlideChange }: UseWebGLCarouselV2Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onSlideChangeRef = useRef(onSlideChange);
  const appRef = useRef<{
    renderer?: Renderer;
    gl?: WebGLRenderingContext | WebGL2RenderingContext;
    camera?: Camera;
    scene?: Transform;
    planeGeometry?: Plane;
    medias?: MediaV2[];
    scroll?: ScrollState;
    direction?: 'left' | 'right';
    screen?: { width: number; height: number };
    viewport?: { width: number; height: number };
    loaded?: number;
    mediasImages?: MediaImage[];
    isDown?: boolean;
    start?: number;
    startY?: number;
    animationFrameId?: number;
  }>({});

  // Keep onSlideChange ref up to date
  useEffect(() => {
    onSlideChangeRef.current = onSlideChange;
  }, [onSlideChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    const initApp = () => {
      if (!containerRef.current) {
        setTimeout(() => {
          initApp();
        }, 10);
        return;
      }

      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
        canvasRef.current = null;
      }

      const app = appRef.current;
      
      if (app.animationFrameId) {
        window.cancelAnimationFrame(app.animationFrameId);
        app.animationFrameId = undefined;
      }

      if (app.scene) {
        if (app.medias) {
          app.medias.forEach((media) => {
            if (media.plane) {
              app.scene!.removeChild(media.plane);
            }
          });
          app.medias = undefined;
        }
      }

      document.documentElement.classList.remove('no-js');

      // Initialize scroll to start at the last item (right-to-left)
      const initialScroll = 0; // Will be set after medias are created
      
      const scroll: ScrollState = {
        ease: 0.06, // Slightly faster for snappier feel while maintaining smoothness
        current: initialScroll,
        target: initialScroll,
        last: initialScroll,
      };

      app.scroll = scroll;

      const renderer = new Renderer();
      const gl = renderer.gl;
      // Set white background
      gl.clearColor(1, 1, 1, 1);
      
      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      if (containerRef.current) {
        const canvas = gl.canvas as HTMLCanvasElement;
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        containerRef.current.appendChild(canvas);
        canvasRef.current = canvas;
        
        // Ensure canvas is properly positioned and visible
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'auto';
        // Start visible - we'll hide during loading if needed
        canvas.style.opacity = '1';
        canvas.style.visibility = 'visible';
      }

      app.renderer = renderer;
      app.gl = gl;

      const camera = new Camera(gl);
      camera.fov = 45;
      camera.position.z = 20;
      app.camera = camera;

      const scene = new Transform();
      app.scene = scene;

      const onResize = () => {
        const screen = {
          height: window.innerHeight,
          width: window.innerWidth,
        };

        app.screen = screen;
        
        // Account for device pixel ratio on mobile devices
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
        renderer.setSize(screen.width * dpr, screen.height * dpr);
        
        // Set canvas CSS size to match screen (not pixel size)
        if (canvasRef.current) {
          canvasRef.current.style.width = `${screen.width}px`;
          canvasRef.current.style.height = `${screen.height}px`;
        }

        camera.perspective({
          aspect: gl.canvas.width / gl.canvas.height,
        });

        const fov = camera.fov * (Math.PI / 180);
        const height = 2 * Math.tan(fov / 2) * camera.position.z;
        const width = height * camera.aspect;

        const viewport = {
          height,
          width,
        };

        app.viewport = viewport;

        if (app.medias) {
          app.medias.forEach((media) =>
            media.onResize({
              screen,
              viewport,
            })
          );
        }
      };

      onResize();

      const planeGeometry = new Plane(gl, {
        heightSegments: 50,
        widthSegments: 100,
      });
      app.planeGeometry = planeGeometry;

      app.mediasImages = mediasImages;

      // Define scale multipliers for each image (index-based)
      // Image 01 (index 0): too small - make larger
      // Image 02 (index 1): too large - make smaller  
      // Image 03 (index 2): perfect - keep at 1.0
      const scaleMultipliers = [1.15, 0.9, 1.0]; // Adjust these values as needed
      
      const medias = mediasImages.map(({ image, text, id }, index) => {
        const media = new MediaV2({
          geometry: planeGeometry,
          gl,
          image,
          index,
          length: mediasImages.length,
          renderer,
          scene,
          screen: app.screen!,
          text,
          viewport: app.viewport!,
          onClick: () => {}, // No click action on detail page
          reverseX: true,
          scaleMultiplier: scaleMultipliers[index] || 1.0,
        });

        return media;
      });

      app.medias = medias;

      // Start at the first item (index 0, which is now image-03)
      scroll.current = 0;
      scroll.target = 0;
      scroll.last = 0;
      
      // Force initial update of all media items to ensure they're positioned
      // This is critical for mobile - items must be positioned before first render
      if (app.medias.length > 0) {
        app.medias.forEach((media) => {
          if (media.plane) {
            media.update(scroll, 'left');
          }
        });
      }

      let loaded = 0;
      app.loaded = 0;
      let loadTimeout: NodeJS.Timeout | null = null;

      // Safety timeout: show content even if some images fail to load
      loadTimeout = setTimeout(() => {
        document.documentElement.classList.remove('loading');
        document.documentElement.classList.add('loaded');
        
        // Force canvas to be visible - critical for mobile
        if (canvasRef.current) {
          canvasRef.current.style.opacity = '1';
          canvasRef.current.style.visibility = 'visible';
          canvasRef.current.style.display = 'block';
        }
        
        // Force an initial render even if images aren't loaded
        if (app.renderer && app.scene && app.camera && app.medias) {
          app.medias.forEach((media) => {
            if (app.scroll) {
              media.update(app.scroll, 'left');
            }
          });
          app.renderer.render({
            scene: app.scene,
            camera: app.camera,
          });
        }
      }, 10000); // 10 second timeout

      // Preload all images to prevent context loss on mobile
      mediasImages.forEach(({ image: source }) => {
        const image = new Image();
        // Set crossOrigin to prevent CORS issues
        image.crossOrigin = 'anonymous';
        image.src = source;
        
        image.onload = () => {
          loaded += 1;
          app.loaded = loaded;

          if (loaded === mediasImages.length) {
            if (loadTimeout) clearTimeout(loadTimeout);
            document.documentElement.classList.remove('loading');
            document.documentElement.classList.add('loaded');
            
            // Force canvas to be visible - critical for mobile
            if (canvasRef.current) {
              canvasRef.current.style.opacity = '1';
              canvasRef.current.style.visibility = 'visible';
              canvasRef.current.style.display = 'block';
            }
            
            // Force multiple render cycles after all images are loaded
            // This ensures all textures are fully initialized in GPU memory
            // Critical for preventing context loss on mobile
            if (app.renderer && app.scene && app.camera && app.medias) {
              // Update all media positions first
              app.medias.forEach((media) => {
                if (app.scroll) {
                  media.update(app.scroll, 'left');
                }
              });
              
              // Force several render cycles to ensure textures are bound
              for (let i = 0; i < 3; i++) {
                requestAnimationFrame(() => {
                  if (app.renderer && app.scene && app.camera) {
                    app.renderer.render({
                      scene: app.scene,
                      camera: app.camera,
                    });
                  }
                });
              }
            }
          }
        };
        
        // Handle individual image load failures
        image.onerror = (error) => {
          console.error('[useWebGLCarouselV2] Failed to load image:', source, error);
          loaded += 1; // Count as loaded to prevent blocking
          app.loaded = loaded;
          
          if (loaded === mediasImages.length) {
            if (loadTimeout) clearTimeout(loadTimeout);
            document.documentElement.classList.remove('loading');
            document.documentElement.classList.add('loaded');
            
            // Force canvas to be visible - critical for mobile
            if (canvasRef.current) {
              canvasRef.current.style.opacity = '1';
              canvasRef.current.style.visibility = 'visible';
              canvasRef.current.style.display = 'block';
            }
          }
        };
      });

      const onCheck = () => {
        if (!app.medias || app.medias.length === 0) return;
        const { width } = app.medias[0];
        const maxScroll = width * (mediasImages.length - 1);
        
        // Clamp scroll to valid range (0 to maxScroll) - no infinite scroll
        if (scroll.target < 0) {
          scroll.target = 0;
        } else if (scroll.target > maxScroll) {
          scroll.target = maxScroll;
        } else {
          // Snap to nearest item
          const itemIndex = Math.round(scroll.target / width);
          scroll.target = width * itemIndex;
        }
      };

      const onCheckDebounce = debounce(onCheck, 200);

      const onTouchDown = (event: MouseEvent | TouchEvent) => {
        app.isDown = true;
        scroll.position = scroll.current;
        app.start = 'touches' in event ? event.touches[0].clientX : event.clientX;
        app.startY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      };

      const onTouchMove = (event: MouseEvent | TouchEvent) => {
        if (!app.isDown) return;

        const x = 'touches' in event ? event.touches[0].clientX : event.clientX;
        const y = 'touches' in event ? event.touches[0].clientY : event.clientY;
        
        // Calculate horizontal distance with better sensitivity for touch
        const distanceX = app.start! - x;
        const distanceY = Math.abs(app.startY! - y);
        
        const sensitivity = TOUCH_SENSITIVITY;
        const distance = distanceX * sensitivity;

        const newTarget = scroll.position! + distance;
        
        // Clamp to valid range (no infinite scroll)
        if (app.medias && app.medias.length > 0) {
          const { width } = app.medias[0];
          const maxScroll = width * (mediasImages.length - 1);
          scroll.target = Math.max(0, Math.min(newTarget, maxScroll));
        } else {
          scroll.target = newTarget;
        }
        
        // Prevent default scrolling if horizontal swipe is dominant
        if (Math.abs(distanceX) > distanceY && Math.abs(distanceX) > 10) {
          event.preventDefault();
        }
      };

      const onTouchUp = () => {
        app.isDown = false;
        onCheck();
      };

      const onWheel = (event: WheelEvent) => {
        const normalized = NormalizeWheel(event);
        const speed = normalized.pixelY;

        const newTarget = scroll.target + speed * 0.005;
        
        // Clamp to valid range (no infinite scroll)
        if (app.medias && app.medias.length > 0) {
          const { width } = app.medias[0];
          const maxScroll = width * (mediasImages.length - 1);
          scroll.target = Math.max(0, Math.min(newTarget, maxScroll));
        } else {
          scroll.target = newTarget;
        }

        onCheckDebounce();
      };

      window.addEventListener('resize', onResize);
      window.addEventListener('mousewheel', onWheel as EventListener);
      window.addEventListener('wheel', onWheel);
      window.addEventListener('mousedown', onTouchDown as EventListener);
      window.addEventListener('mouseup', onTouchUp as EventListener);
      window.addEventListener('touchstart', onTouchDown as EventListener);
      window.addEventListener('touchmove', onTouchMove as EventListener);
      window.addEventListener('touchend', onTouchUp as EventListener);

      let lastReportedIndex = -1;

      const update = () => {
        if (!app.scroll || !app.renderer || !app.camera || !app.scene || !app.medias || app.medias.length === 0) {
          app.animationFrameId = window.requestAnimationFrame(update);
          return;
        }

        // Smooth scroll interpolation
        scroll.current = lerp(scroll.current, scroll.target, scroll.ease);

        // Determine direction
        app.direction = scroll.current > scroll.last ? 'right' : 'left';

        // Clamp scroll to valid range (0 to maxScroll) - no infinite scroll
        const { width } = app.medias[0];
        if (width) {
          const maxScroll = width * (mediasImages.length - 1);
          scroll.current = Math.max(0, Math.min(scroll.current, maxScroll));
          scroll.target = Math.max(0, Math.min(scroll.target, maxScroll));
        }

        // Update all media items - simple positioning, no wrapping
        app.medias.forEach((media) => {
          media.update(scroll, app.direction!);
        });

        // Track current slide for carousel indicator
        if (width) {
          const maxScroll = width * (mediasImages.length - 1);
          const reversedScroll = maxScroll - scroll.current;
          const currentItemIndex = Math.round(reversedScroll / width);
          const actualIndex = Math.max(0, Math.min(currentItemIndex, mediasImages.length - 1));

          if (actualIndex !== lastReportedIndex) {
            lastReportedIndex = actualIndex;
            if (onSlideChangeRef.current) {
              onSlideChangeRef.current(actualIndex);
            }
          }
        }

        // Render
        app.renderer.render({
          scene: app.scene,
          camera: app.camera,
        });

        scroll.last = scroll.current;
        app.animationFrameId = window.requestAnimationFrame(update);
      };

      // Start update loop immediately
      update();

      cleanup = () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousewheel', onWheel as EventListener);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('mousedown', onTouchDown as EventListener);
        window.removeEventListener('mouseup', onTouchUp as EventListener);
        window.removeEventListener('touchstart', onTouchDown as EventListener);
        window.removeEventListener('touchmove', onTouchMove as EventListener);
        window.removeEventListener('touchend', onTouchUp as EventListener);

        if (app.animationFrameId) {
          window.cancelAnimationFrame(app.animationFrameId);
        }

        if (canvasRef.current && canvasRef.current.parentNode) {
          canvasRef.current.parentNode.removeChild(canvasRef.current);
          canvasRef.current = null;
        }
      };
    };

    initApp();

    return () => {
      if (cleanup) cleanup();
      if (canvasRef.current) {
        if (canvasRef.current.parentNode) {
          canvasRef.current.parentNode.removeChild(canvasRef.current);
        }
        canvasRef.current = null;
      }
    };
  }, [mediasImages]); // Only depend on mediasImages

  // Navigation function for carousel
  // With reverseX, we need to reverse the scroll position
  const navigateToSlide = useCallback((index: number) => {
    const app = appRef.current;
    if (!app.medias || app.medias.length === 0) return;

    const { width } = app.medias[0];
    if (!width || width === 0) return;

    if (app.scroll) {
      // Reverse the index: index 0 should be at maxScroll, index 2 at 0
      const maxScroll = width * (app.medias.length - 1);
      const targetScroll = maxScroll - (width * index);
      
      // Restore smooth animation - only set target, let lerp handle the transition
      app.scroll.target = targetScroll;
      
      // Ensure textures are ready for the target item before navigation
      // This prevents context loss on mobile
      const targetMedia = app.medias[index];
      if (targetMedia && targetMedia.program && targetMedia.program.uniforms.tMap) {
        const texture = targetMedia.program.uniforms.tMap.value;
        // If texture image exists and is loaded, ensure it's ready
        if (texture && texture.image) {
          // Force a render cycle to ensure texture is bound
          // This helps prevent context loss on mobile
          requestAnimationFrame(() => {
            if (app.renderer && app.scene && app.camera) {
              app.renderer.render({
                scene: app.scene,
                camera: app.camera,
              });
            }
          });
        }
      }
    }
  }, []);

  // Get current scroll info for smarter navigation
  // With reverseX, we need to reverse the index calculation
  const getScrollInfo = useCallback(() => {
    const app = appRef.current;
    if (!app.medias || app.medias.length === 0 || !app.scroll) {
      return { currentItemIndex: 0, width: 0 };
    }

    const { width } = app.medias[0];
    const maxScroll = width * (app.medias.length - 1);
    // Reverse the index: when scroll is at max, we're showing index 0 visually
    const reversedScroll = maxScroll - (app.scroll.current || 0);
    const currentItemIndex = Math.round(reversedScroll / width);
    
    return { currentItemIndex, width };
  }, []);

  return { containerRef, navigateToSlide, getScrollInfo };
}
