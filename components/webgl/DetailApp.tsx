'use client';

import { Renderer, Camera, Transform, Plane } from 'ogl';
import NormalizeWheel from 'normalize-wheel';
import { useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';

import { lerp } from '@/lib/utils/math';
import Column from './Column';
import Background from './Background';

interface ScrollState {
  ease: number;
  current: number;
  target: number;
  last: number;
  position?: number;
}

interface DetailAppProps {
  itemId?: string;
}

export default function DetailApp({ itemId = '0' }: DetailAppProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<{
    renderer?: Renderer;
    gl?: WebGLRenderingContext | WebGL2RenderingContext;
    camera?: Camera;
    scene?: Transform;
    planeGeometry?: Plane;
    columns?: Column[];
    background?: Background;
    scroll?: ScrollState;
    direction?: 'left' | 'right';
    screen?: { width: number; height: number };
    viewport?: { width: number; height: number };
    maxScroll?: number;
    minScroll?: number;
    columnsData?: Array<{ type: 'left' | 'middle' | 'right'; content: { text: string } }>;
    carousel?: HTMLDivElement;
    dots?: HTMLButtonElement[];
    isDown?: boolean;
    start?: number;
    animationFrameId?: number;
  }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    const initApp = () => {
      // Wait for container to be mounted
      if (!containerRef.current) {
        // Retry after a short delay if container isn't ready
        setTimeout(() => initApp(), 10);
        return;
      }

      const app = appRef.current;
      document.documentElement.classList.remove('no-js');

    const scroll: ScrollState = {
      ease: 0.05,
      current: 0,
      target: 0,
      last: 0,
    };

    app.scroll = scroll;

    // Create renderer
    const renderer = new Renderer();
    const gl = renderer.gl;
    gl.clearColor(0.79607843137, 0.79215686274, 0.74117647058, 1);

    // Append canvas to container instead of body
    if (containerRef.current && !canvasRef.current) {
      const canvas = gl.canvas as HTMLCanvasElement;
      containerRef.current.appendChild(canvas);
      canvasRef.current = canvas;
    }

    app.renderer = renderer;
    app.gl = gl;

    // Create camera
    const camera = new Camera(gl);
    camera.fov = 45;
    camera.position.z = 20;
    app.camera = camera;

    // Create scene
    const scene = new Transform();
    app.scene = scene;

    // Define clampScroll before onResize since onResize uses it
    const clampScroll = () => {
      if (app.maxScroll === undefined || app.minScroll === undefined) return;

      if (scroll.target > app.maxScroll) {
        scroll.target = app.maxScroll;
      } else if (scroll.target < app.minScroll) {
        scroll.target = app.minScroll;
      }
    };

    // Handle resize
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

      if (app.columns && app.columns.length > 0) {
        app.columns.forEach((column) =>
          column.onResize({
            screen,
            viewport,
          })
        );

        // Recalculate scroll bounds after resize
        const { width: columnWidth } = app.columns[0];
        if (columnWidth && columnWidth > 0) {
          app.maxScroll = columnWidth * (app.columns.length - 1);
          app.minScroll = 0;

          // Set initial scroll to start at last column
          if (scroll.target === 0 && scroll.current === 0) {
            scroll.target = app.maxScroll;
            scroll.current = app.maxScroll;
          }

          clampScroll();
        }
      }
    };

    onResize();

    // Create geometry
    const planeGeometry = new Plane(gl, {
      heightSegments: 50,
      widthSegments: 100,
    });
    app.planeGeometry = planeGeometry;

    // Create columns
    const columnsData = [
      {
        type: 'left' as const,
        content: {
          text: 'Left column - Dress illustration',
        },
      },
      {
        type: 'middle' as const,
        content: {
          text: 'Middle column - Metadata (map, colors, fabric types, dress name)',
        },
      },
      {
        type: 'right' as const,
        content: {
          text: 'Right column - Descriptive text about the traditional dress. This section contains detailed information about the cultural significance, design elements, and historical context of the dress.',
        },
      },
    ];

    app.columnsData = columnsData;

    const columns = columnsData.map(({ type, content }, index) => {
      const column = new Column({
        geometry: planeGeometry,
        gl,
        index,
        length: columnsData.length,
        renderer,
        scene,
        screen: app.screen!,
        viewport: app.viewport!,
        content,
        type,
      });

      return column;
    });

    app.columns = columns;

    // Initialize scroll bounds
    app.maxScroll = undefined;
    app.minScroll = undefined;

    // Create background
    const background = new Background({
      gl,
      scene,
      viewport: app.viewport!,
    });
    app.background = background;

    // Create carousel
    const carousel = document.createElement('div');
    carousel.className = 'carousel';

    const leftArrow = document.createElement('button');
    leftArrow.className = 'carousel__arrow carousel__arrow--left';
    leftArrow.innerHTML = '←';
    leftArrow.addEventListener('click', () => {
      const currentIndex = getCurrentColumnIndex();
      navigateToColumn(currentIndex - 1);
    });

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel__dots';

    const dots: HTMLButtonElement[] = [];
    for (let i = 0; i < columnsData.length; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel__dot';
      if (i === columnsData.length - 1) dot.classList.add('carousel__dot--active');
      dot.setAttribute('data-index', i.toString());
      dot.addEventListener('click', () => navigateToColumn(i));
      dotsContainer.appendChild(dot);
      dots.push(dot);
    }

    const rightArrow = document.createElement('button');
    rightArrow.className = 'carousel__arrow carousel__arrow--right';
    rightArrow.innerHTML = '→';
    rightArrow.addEventListener('click', () => {
      const currentIndex = getCurrentColumnIndex();
      navigateToColumn(currentIndex + 1);
    });

    carousel.appendChild(leftArrow);
    carousel.appendChild(dotsContainer);
    carousel.appendChild(rightArrow);

    document.body.appendChild(carousel);
    app.carousel = carousel;
    app.dots = dots;

    // Preloader
    setTimeout(() => {
      document.documentElement.classList.remove('loading');
      document.documentElement.classList.add('loaded');
    }, 100);

    // Navigation functions
    const getCurrentColumnIndex = (): number => {
      if (!app.columns || app.columns.length === 0) return 2;

      const { width } = app.columns[0];
      if (!width || width === 0) return 2;

      const index = Math.round(scroll.current / width);
      return Math.max(0, Math.min(index, app.columns.length - 1));
    };

    const navigateToColumn = (index: number) => {
      if (index < 0 || index >= (app.columns?.length || 0)) return;

      const { width } = app.columns![0];
      scroll.target = width * index;
      onCheck();
    };

    const updateCarousel = () => {
      if (!app.carousel || !app.dots || !app.columns) return;

      const currentIndex = getCurrentColumnIndex();

      app.dots.forEach((dot, index) => {
        if (index === currentIndex) {
          dot.classList.add('carousel__dot--active');
        } else {
          dot.classList.remove('carousel__dot--active');
        }
      });

      const leftArrowEl = app.carousel.querySelector('.carousel__arrow--left') as HTMLButtonElement;
      const rightArrowEl = app.carousel.querySelector('.carousel__arrow--right') as HTMLButtonElement;

      if (leftArrowEl) leftArrowEl.disabled = currentIndex === 0;
      if (rightArrowEl) rightArrowEl.disabled = currentIndex === app.columns.length - 1;
    };

    const onCheck = () => {
      clampScroll();

      if (!app.columns || app.columns.length === 0) {
        updateCarousel();
        return;
      }

      const { width } = app.columns[0];
      if (!width || width === 0) {
        updateCarousel();
        return;
      }

      const itemIndex = Math.round(scroll.target / width);
      const clampedIndex = Math.max(0, Math.min(itemIndex, app.columns.length - 1));
      scroll.target = width * clampedIndex;

      clampScroll();
      updateCarousel();
    };

    const onCheckDebounce = debounce(onCheck, 200);

    const onTouchDown = (event: MouseEvent | TouchEvent) => {
      app.isDown = true;
      scroll.position = scroll.current;
      app.start = 'touches' in event ? event.touches[0].clientX : event.clientX;
    };

    const onTouchMove = (event: MouseEvent | TouchEvent) => {
      if (!app.isDown) return;

      const x = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const distance = ((app.start! - x) * 0.01) as number;

      scroll.target = scroll.position! - distance;
      clampScroll();
    };

    const onTouchUp = () => {
      app.isDown = false;
      onCheck();
    };

    const onWheel = (event: WheelEvent) => {
      const normalized = NormalizeWheel(event);
      const speed = normalized.pixelY;

      scroll.target -= speed * 0.005;
      clampScroll();
      onCheckDebounce();
    };

    // Add event listeners
    window.addEventListener('resize', onResize);
    window.addEventListener('mousewheel', onWheel as EventListener);
    window.addEventListener('wheel', onWheel);
    window.addEventListener('mousedown', onTouchDown as EventListener);
    window.addEventListener('mousemove', onTouchMove as EventListener);
    window.addEventListener('mouseup', onTouchUp as EventListener);
    window.addEventListener('touchstart', onTouchDown as EventListener);
    window.addEventListener('touchmove', onTouchMove as EventListener);
    window.addEventListener('touchend', onTouchUp as EventListener);

    // Set initial scroll position after columns are created
    if (app.columns && app.columns.length > 0) {
      const { width } = app.columns[0];
      if (width && width > 0) {
        app.maxScroll = width * (app.columns.length - 1);
        app.minScroll = 0;
        scroll.target = app.maxScroll;
        scroll.current = app.maxScroll;
      }
    }

    // Update loop
    const update = () => {
      if (!app.scroll || !app.renderer || !app.camera || !app.scene) return;

      if (app.maxScroll !== undefined && app.minScroll !== undefined) {
        clampScroll();
      }

      scroll.current = lerp(scroll.current, scroll.target, scroll.ease);

      if (app.maxScroll !== undefined && app.minScroll !== undefined) {
        if (scroll.current > app.maxScroll) {
          scroll.current = app.maxScroll;
        } else if (scroll.current < app.minScroll) {
          scroll.current = app.minScroll;
        }
      }

      if (scroll.current > scroll.last) {
        app.direction = 'right';
      } else {
        app.direction = 'left';
      }

      if (app.columns) {
        app.columns.forEach((column) => column.update(scroll, app.direction!));
      }

      if (app.background) {
        app.background.update(scroll, app.direction!);
      }

      updateCarousel();

      app.renderer.render({
        scene: app.scene,
        camera: app.camera,
      });

      scroll.last = scroll.current;

      app.animationFrameId = window.requestAnimationFrame(update);
    };

      update();

      // Set up cleanup function
      cleanup = () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousewheel', onWheel as EventListener);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('mousedown', onTouchDown as EventListener);
        window.removeEventListener('mousemove', onTouchMove as EventListener);
        window.removeEventListener('mouseup', onTouchUp as EventListener);
        window.removeEventListener('touchstart', onTouchDown as EventListener);
        window.removeEventListener('touchmove', onTouchMove as EventListener);
        window.removeEventListener('touchend', onTouchUp as EventListener);

        if (app.animationFrameId) {
          window.cancelAnimationFrame(app.animationFrameId);
        }

        if (app.carousel && app.carousel.parentNode) {
          app.carousel.parentNode.removeChild(app.carousel);
        }

        if (canvasRef.current && canvasRef.current.parentNode) {
          canvasRef.current.parentNode.removeChild(canvasRef.current);
          canvasRef.current = null;
        }
      };
    };

    initApp();

    // Return cleanup function
    return () => {
      if (cleanup) cleanup();
    };
  }, [itemId]);

  return <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />;
}

