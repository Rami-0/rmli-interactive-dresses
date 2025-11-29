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
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchMoveRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);

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
  useEffect(() => {
    if (isMobile) return;

    /**
     * PERFORMANCE: Uses debouncing to prevent rapid state changes
     * that cause skipping. The 150ms delay ensures smooth transitions
     * between columns without missing the middle one.
     */
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Clear existing timeout
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      
      // OPTIMIZATION: Only trigger on significant scroll
      if (Math.abs(e.deltaY) > 10) {
        wheelTimeoutRef.current = setTimeout(() => {
          if (e.deltaY > 0) {
            // Scroll down → move right
            setCurrentSlide((prev) => Math.min(2, prev + 1));
          } else {
            // Scroll up → move left
            setCurrentSlide((prev) => Math.max(0, prev - 1));
          }
        }, 150); // Debounce: prevents skipping columns
      }
    };

    const container = containerRef.current;
    if (container) {
      // PERFORMANCE: { passive: false } required for preventDefault
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [isMobile]);

  // MOBILE: Touch swipe navigation with gesture detection
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      touchMoveRef.current = { x: 0, y: 0 };
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchMoveRef.current = {
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      };
      
      // OPTIMIZATION: Prevent default only for horizontal swipes
      // This allows vertical scrolling within columns
      if (Math.abs(touchMoveRef.current.x) > Math.abs(touchMoveRef.current.y)) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      const deltaX = touchMoveRef.current.x;
      const deltaY = touchMoveRef.current.y;
      
      // GESTURE DETECTION: Only trigger if horizontal swipe is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
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
      touchStartRef.current = { x: 0, y: 0 };
      touchMoveRef.current = { x: 0, y: 0 };
    };

    const container = containerRef.current;
    if (container) {
      // PERFORMANCE: { passive: false } required for preventDefault
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
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
