import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Renderer, Camera, Transform, Plane } from 'ogl';
import NormalizeWheel from 'normalize-wheel';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

import { lerp } from '@/lib/utils/math';
import { preloadFonts } from '@/lib/utils/fontLoader';
import Media from '../Media';
import BackgroundImage from '../BackgroundImage';

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

interface UseWebGLCarouselProps {
  mediasImages: MediaImage[];
  onHover?: (mediaItem: Media | null) => void;
}

export function useWebGLCarousel({ mediasImages, onHover }: UseWebGLCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onHoverRef = useRef(onHover);
  const appRef = useRef<{
    renderer?: Renderer;
    gl?: WebGLRenderingContext | WebGL2RenderingContext;
    camera?: Camera;
    scene?: Transform;
    planeGeometry?: Plane;
    medias?: Media[];
    background?: BackgroundImage;
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
  const router = useRouter();

  // Keep onHover ref up to date without causing re-renders
  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    const initApp = async () => {
      if (!containerRef.current) {
        setTimeout(() => {
          initApp().catch(console.error);
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

        if (app.background) {
          app.background.meshes.forEach((mesh) => {
            app.scene!.removeChild(mesh);
          });
          app.background = undefined;
        }
      }

      document.documentElement.classList.remove('no-js');

      const scroll: ScrollState = {
        ease: 0.05,
        current: 0,
        target: 0,
        last: 0,
      };

      app.scroll = scroll;

      const renderer = new Renderer();
      const gl = renderer.gl;
      // Set transparent background
      gl.clearColor(0, 0, 0, 0);
      
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
        canvas.style.opacity = '0';
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
        renderer.setSize(screen.width, screen.height);

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

        if (app.background) {
          app.background.onResize(viewport);
        }
      };

      onResize();

      const planeGeometry = new Plane(gl, {
        heightSegments: 50,
        widthSegments: 100,
      });
      app.planeGeometry = planeGeometry;

      app.mediasImages = mediasImages;

      await preloadFonts();

      const medias = mediasImages.map(({ image, text, id }, index) => {
        const media = new Media({
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
          onClick: (mediaItem) => {
            router.push(`/detail/${id}`);
          },
        });

        return media;
      });

      app.medias = medias;

      const background = new BackgroundImage({
        gl,
        scene,
        viewport: app.viewport!,
      });
      app.background = background;

      let loaded = 0;
      app.loaded = 0;

      mediasImages.forEach(({ image: source }) => {
        const image = new Image();
        image.src = source;
        image.onload = () => {
          loaded += 1;
          app.loaded = loaded;

          if (loaded === mediasImages.length) {
            document.documentElement.classList.remove('loading');
            document.documentElement.classList.add('loaded');
            if (canvasRef.current) {
              canvasRef.current.style.opacity = '1';
            }
          }
        };
      });

      const onCheck = () => {
        if (!app.medias || app.medias.length === 0) return;
        const { width } = app.medias[0];
        const itemIndex = Math.round(Math.abs(scroll.target) / width);
        const item = width * itemIndex;

        if (scroll.target < 0) {
          scroll.target = -item;
        } else {
          scroll.target = item;
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
        const distance = ((app.start! - x) * 0.01) as number;

        scroll.target = scroll.position! + distance;
      };

      const handleHover = throttle((clientX: number, clientY: number) => {
        if (!app.medias || !app.gl?.canvas) return;

        const rect = (app.gl.canvas as HTMLCanvasElement).getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

        for (let i = app.medias.length - 1; i >= 0; i--) {
          const media = app.medias[i];
          if (media.checkIntersection(x, y)) {
            if (onHoverRef.current) {
              onHoverRef.current(media);
            }
            return;
          }
        }
        
        if (onHoverRef.current) {
          onHoverRef.current(null);
        }
      }, 50); // Throttle to max 20 times per second

      const handleClick = (clientX: number, clientY: number) => {
        if (!app.medias || !app.gl?.canvas) return;

        const rect = (app.gl.canvas as HTMLCanvasElement).getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

        for (let i = app.medias.length - 1; i >= 0; i--) {
          const media = app.medias[i];
          if (media.checkIntersection(x, y)) {
            if (media.onClick) {
              media.onClick(media);
            }
            break;
          }
        }
      };

      const onMouseMove = (event: MouseEvent) => {
        if (!app.isDown) {
          handleHover(event.clientX, event.clientY);
        }
      };

      const onTouchUp = (event: MouseEvent | TouchEvent) => {
        app.isDown = false;

        if (app.start !== undefined && app.startY !== undefined) {
          const endX = 'changedTouches' in event ? event.changedTouches[0].clientX : event.clientX;
          const endY = 'changedTouches' in event ? event.changedTouches[0].clientY : event.clientY;

          const deltaX = Math.abs(app.start - endX);
          const deltaY = Math.abs(app.startY - endY);

          if (deltaX < 5 && deltaY < 5) {
            handleClick(endX, endY);
          }
        }

        onCheck();
      };

      const onWheel = (event: WheelEvent) => {
        const normalized = NormalizeWheel(event);
        const speed = normalized.pixelY;

        scroll.target += speed * 0.005;

        onCheckDebounce();
      };

      window.addEventListener('resize', onResize);
      window.addEventListener('mousewheel', onWheel as EventListener);
      window.addEventListener('wheel', onWheel);
      window.addEventListener('mousedown', onTouchDown as EventListener);
      window.addEventListener('mousemove', onMouseMove as EventListener);
      window.addEventListener('mouseup', onTouchUp as EventListener);
      window.addEventListener('touchstart', onTouchDown as EventListener);
      window.addEventListener('touchmove', onTouchMove as EventListener);
      window.addEventListener('touchend', onTouchUp as EventListener);

      const update = () => {
        if (!app.scroll || !app.renderer || !app.camera || !app.scene) return;

        scroll.current = lerp(scroll.current, scroll.target, scroll.ease);

        if (scroll.current > scroll.last) {
          app.direction = 'right';
        } else {
          app.direction = 'left';
        }

        if (app.medias) {
          app.medias.forEach((media) => media.update(scroll, app.direction!));
        }

        if (app.background) {
          app.background.update(scroll, app.direction!);
        }

        app.renderer.render({
          scene: app.scene,
          camera: app.camera,
        });

        scroll.last = scroll.current;

        app.animationFrameId = window.requestAnimationFrame(update);
      };

      update();

      cleanup = () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousewheel', onWheel as EventListener);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('mousedown', onTouchDown as EventListener);
        window.removeEventListener('mousemove', onMouseMove as EventListener);
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

    initApp().catch(console.error);

    return () => {
      if (cleanup) cleanup();
      if (canvasRef.current) {
        if (canvasRef.current.parentNode) {
          canvasRef.current.parentNode.removeChild(canvasRef.current);
        }
        canvasRef.current = null;
      }
    };
  }, [router, mediasImages]); // Removed onHover from dependencies

  return containerRef;
}

