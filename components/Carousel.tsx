'use client';

import { useEffect, useState } from 'react';
import '../styles/carousel.scss';

interface CarouselProps {
  totalSlides: number;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function Carousel({ totalSlides, currentIndex, onNavigate }: CarouselProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalSlides - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div className="carousel">
      <button
        className="carousel__arrow carousel__arrow--left"
        onClick={handlePrevious}
        disabled={currentIndex === 0}
        aria-label="Previous slide"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="carousel__dots">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            className={`carousel__dot ${index === currentIndex ? 'carousel__dot--active' : ''}`}
            onClick={() => onNavigate(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentIndex ? 'true' : 'false'}
          />
        ))}
      </div>

      <button
        className="carousel__arrow carousel__arrow--right"
        onClick={handleNext}
        disabled={currentIndex === totalSlides - 1}
        aria-label="Next slide"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

