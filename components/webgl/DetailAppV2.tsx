'use client';

import { useState, useMemo, useCallback } from 'react';
import { useWebGLCarouselV2 } from './hooks/useWebGLCarouselV2';
import Carousel from '../Carousel';

export default function DetailAppV2() {
  const [currentSlide, setCurrentSlide] = useState(0); // Start at first item (which is now 03)

  // Prepare image data for the carousel - using 3 images from v2 folder (no infinite scroll)
  // Reversed order: 03, 02, 01 for right-to-left display
  const mediasImages = useMemo(() => {
    return [
      {
        image: '/images/v2/image-01.png',
        text: 'Image 01',
        id: 1,
      },
      {
        image: '/images/v2/image-02.png',
        text: 'Image 02',
        id: 2,
      },
      {
        image: '/images/v2/image-03.png',
        text: 'Image 03',
        id: 3,
      },
    ];
  }, []);

  // Handle slide changes from scrolling
  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const { containerRef, navigateToSlide, getScrollInfo } = useWebGLCarouselV2({
    mediasImages,
    onSlideChange: handleSlideChange,
  });

  // Handle navigation from carousel controls
  const handleCarouselNavigate = useCallback((targetIndex: number) => {
    navigateToSlide(targetIndex);
    setCurrentSlide(targetIndex);
  }, [navigateToSlide]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          background: '#ffffff'
        }}
      />
      <Carousel
        totalSlides={3}
        currentIndex={currentSlide}
        onNavigate={handleCarouselNavigate}
        infiniteLoop={false}
      />
    </>
  );
}
