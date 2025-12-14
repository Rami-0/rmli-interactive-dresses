'use client';

import { useEffect, useState } from 'react';
import '../styles/carousel.scss';

interface CarouselProps {
  totalSlides: number;
  currentIndex: number;
  onNavigate: (index: number) => void;
  infiniteLoop?: boolean;
}

export default function Carousel({ totalSlides, currentIndex, onNavigate, infiniteLoop = false }: CarouselProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) return null;

  const handlePrevious = () => {
    if (infiniteLoop) {
      // With infinite loop, wrap around
      const prevIndex = currentIndex === 0 ? totalSlides - 1 : currentIndex - 1;
      onNavigate(prevIndex);
    } else {
      if (currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
    }
  };

  const handleNext = () => {
    if (infiniteLoop) {
      // With infinite loop, wrap around
      const nextIndex = currentIndex === totalSlides - 1 ? 0 : currentIndex + 1;
      onNavigate(nextIndex);
    } else {
      if (currentIndex < totalSlides - 1) {
        onNavigate(currentIndex + 1);
      }
    }
  };

  return (
    <div className="carousel">
      <button
        className="carousel__arrow carousel__arrow--left"
        onClick={handlePrevious}
        disabled={!infiniteLoop && currentIndex === 0}
        aria-label="Previous slide"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="carousel__dots">
        {Array.from({ length: totalSlides }).map((_, index) => {
          // Calculate gap after this dot based on distance from active
          // The gap between two dots is determined by the minimum distance of either dot from active
          const distanceFromActive = Math.abs(index - currentIndex);
          const nextIndex = index + 1;
          const nextDistance = nextIndex < totalSlides ? Math.abs(nextIndex - currentIndex) : Infinity;
          
          // Gap is larger when at least one dot is close to active
          // Use the minimum distance to determine gap size
          const minDistance = Math.min(distanceFromActive, nextDistance);
          
          // Calculate gap: larger for dots closer to active, smaller for dots further away
          // Desktop: base gap is 1.85rem, decreases by 0.35rem for each unit of distance
          // Mobile: base gap is 0.75rem, decreases by 0.15rem for each unit of distance
          const baseGap = isMobile ? 0.75 : 1;
          const decreaseRate = isMobile ? 0.15 : 0.35;
          const minGap = isMobile ? 0.2 : 0.3;
          
          const gap = index < totalSlides - 1 
            ? Math.max(minGap, baseGap - (minDistance * decreaseRate))
            : 0; // No gap after last dot
          
          return (
            <button
              key={index}
              className={`carousel__dot ${index === currentIndex ? 'carousel__dot--active' : ''}`}
              onClick={() => onNavigate(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
              style={{ '--gap': `${gap}rem` } as React.CSSProperties}
            />
          );
        })}
      </div>

      <button
        className="carousel__arrow carousel__arrow--right"
        onClick={handleNext}
        disabled={!infiniteLoop && currentIndex === totalSlides - 1}
        aria-label="Next slide"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

