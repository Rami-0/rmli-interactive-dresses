'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { getDressById } from '@/lib/utils/dressData';
import { LeftColumn } from '../columns/LeftColumn';
import { MiddleColumn } from '../columns/MiddleColumn';
import { RightColumn } from '../columns/RightColumn';
import Carousel from '../Carousel';
import '@/styles/detail-columns.scss';

interface DetailAppProps {
  itemId?: string;
}

/**
 * DetailApp Component
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses requestAnimationFrame for smooth scroll handling
 * - Debounces wheel events to prevent rapid state changes
 * - Passive event listeners where possible
 * - GPU-accelerated CSS transforms
 * - Lazy initialization to prevent FOUC
 */
export default function DetailApp({ itemId = '1' }: DetailAppProps) {
  // STATE: Current active column (0=left, 1=middle, 2=right)
  const [currentSlide, setCurrentSlide] = useState(2); // Start at RIGHT column (text)
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // PERFORMANCE: Memoize dress data to prevent re-fetching
  const dress = useMemo(() => getDressById(itemId), [itemId]);
  
  // REFS: Touch tracking and timers
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const swipeCooldownRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  // INITIALIZATION: Mark as loaded and prevent FOUC
  useEffect(() => {
    document.documentElement.classList.remove('loading');
    document.documentElement.classList.add('loaded');
    
    // PERFORMANCE: Small delay ensures styles are applied before showing content
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // RESPONSIVE: Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // DESKTOP: Wheel scroll navigation with optimized debouncing
  // COMMENTED OUT: Desktop scroll switching is currently disabled
  // useEffect(() => {
  //   if (isMobile) return;

  //   /**
  //    * PERFORMANCE: Uses debouncing to prevent rapid state changes
  //    * that cause skipping. The 150ms delay ensures smooth transitions
  //    * between columns without missing the middle one.
  //    */
  //   const handleWheel = (e: WheelEvent) => {
  //     e.preventDefault();
      
  //     // Clear existing timeout
  //     if (wheelTimeoutRef.current) {
  //       clearTimeout(wheelTimeoutRef.current);
  //     }
      
  //     // OPTIMIZATION: Only trigger on significant scroll
  //     if (Math.abs(e.deltaY) > 10) {
  //       wheelTimeoutRef.current = setTimeout(() => {
  //         if (e.deltaY > 0) {
  //           // Scroll down → move right
  //           setCurrentSlide((prev) => Math.min(2, prev + 1));
  //         } else {
  //           // Scroll up → move left
  //           setCurrentSlide((prev) => Math.max(0, prev - 1));
  //         }
  //       }, 150); // Debounce: prevents skipping columns
  //     }
  //   };

  //   const container = containerRef.current;
  //   if (container) {
  //     // PERFORMANCE: { passive: false } required for preventDefault
  //     container.addEventListener('wheel', handleWheel, { passive: false });
  //   }

  //   return () => {
  //     if (container) {
  //       container.removeEventListener('wheel', handleWheel);
  //     }
  //     if (wheelTimeoutRef.current) {
  //       clearTimeout(wheelTimeoutRef.current);
  //     }
  //   };
  // }, [isMobile]);

  // MOBILE: Optimized touch swipe navigation with premium feel
  useEffect(() => {
    if (!isMobile) return;

    // Configuration for smooth, intentional swipes
    const SWIPE_THRESHOLD = 100; // Minimum distance in pixels (increased from 50)
    const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity (px/ms)
    const SWIPE_PERCENTAGE_THRESHOLD = 0.25; // Minimum 25% of screen width
    const COOLDOWN_DURATION = 400; // Prevent rapid switching (ms)
    const MAX_SWIPE_TIME = 500; // Maximum time for a valid swipe (ms)

    const handleTouchStart = (e: TouchEvent) => {
      // Check cooldown period
      if (swipeCooldownRef.current && Date.now() < swipeCooldownRef.current) {
        return;
      }

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      touchMoveRef.current = { x: 0, y: 0 };
      isSwipingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current.time) return;

      const touch = e.touches[0];
      touchMoveRef.current = {
        x: touch.clientX - touchStartRef.current.x,
        y: touch.clientY - touchStartRef.current.y,
      };
      
      const absX = Math.abs(touchMoveRef.current.x);
      const absY = Math.abs(touchMoveRef.current.y);
      
      // OPTIMIZATION: Only prevent default for clear horizontal swipes
      // This allows vertical scrolling within columns
      if (absX > absY && absX > 30) {
        isSwipingRef.current = true;
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!touchStartRef.current.time) return;

      const deltaX = touchMoveRef.current.x;
      const deltaY = touchMoveRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const swipeTime = Date.now() - touchStartRef.current.time;
      const screenWidth = window.innerWidth;
      
      // Calculate swipe velocity
      const velocity = absX / swipeTime;
      
      // Enhanced gesture detection with multiple criteria
      const isHorizontalSwipe = absX > absY;
      const meetsDistanceThreshold = absX > SWIPE_THRESHOLD;
      const meetsPercentageThreshold = absX > (screenWidth * SWIPE_PERCENTAGE_THRESHOLD);
      const meetsVelocityThreshold = velocity > SWIPE_VELOCITY_THRESHOLD;
      const isWithinTimeLimit = swipeTime < MAX_SWIPE_TIME;
      const isIntentionalSwipe = isSwipingRef.current && meetsDistanceThreshold && meetsPercentageThreshold;
      
      // Require all conditions for a valid swipe
      if (
        isHorizontalSwipe &&
        isIntentionalSwipe &&
        (meetsVelocityThreshold || absX > SWIPE_THRESHOLD * 1.5) && // Allow slower but longer swipes
        isWithinTimeLimit
      ) {
        // Set cooldown to prevent rapid switching
        swipeCooldownRef.current = Date.now() + COOLDOWN_DURATION;
        
        // PERFORMANCE: Use requestAnimationFrame for smooth state update
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        
        rafRef.current = requestAnimationFrame(() => {
          if (deltaX > 0) {
            // Swipe right → previous column
            setCurrentSlide((prev) => Math.max(0, prev - 1));
          } else {
            // Swipe left → next column
            setCurrentSlide((prev) => Math.min(2, prev + 1));
          }
        });
      }
      
      // Reset tracking
      touchStartRef.current = { x: 0, y: 0, time: 0 };
      touchMoveRef.current = { x: 0, y: 0 };
      isSwipingRef.current = false;
    };

    const container = containerRef.current;
    if (container) {
      // PERFORMANCE: { passive: false } required for preventDefault
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isMobile]);

  // DESKTOP: Handle column click (disabled on mobile to prevent conflicts)
  const handleColumnClick = useCallback((index: number) => {
    if (!isMobile) {
      setCurrentSlide(index);
    }
  }, [isMobile]);

  // CAROUSEL: Handle navigation from bottom controls
  const handleCarouselNavigate = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  // ERROR HANDLING: Dress not found
  if (!dress) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontSize: '1.5rem',
        color: '#2c2c2c'
      }}>
        Dress not found
      </div>
    );
  }

  return (
    <>
      <div 
        className={`detail-columns-container ${isInitialized ? 'initialized' : ''}`} 
        ref={containerRef}
      >
        <LeftColumn 
          dress={dress} 
          isActive={currentSlide === 0}
          onClick={() => handleColumnClick(0)}
        />
        <MiddleColumn 
          dress={dress} 
          isActive={currentSlide === 1}
          onClick={() => handleColumnClick(1)}
        />
        <RightColumn 
          dress={dress} 
          isActive={currentSlide === 2}
          onClick={() => handleColumnClick(2)}
        />
      </div>
      <Carousel
        totalSlides={3}
        currentIndex={currentSlide}
        onNavigate={handleCarouselNavigate}
      />
    </>
  );
}
