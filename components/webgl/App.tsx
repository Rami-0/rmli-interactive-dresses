'use client';

import { useState, useMemo, useCallback } from 'react';
import { characterData } from '@/lib/constants/characters';
import { useWebGLCarousel } from './hooks/useWebGLCarousel';
import Carousel from '../Carousel';
import { DressLabel } from '../DressLabel';
import '@/styles/dress-label.scss';

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Prepare dress data for the carousel - duplicate for infinite scroll
  const mediasImages = useMemo(() => {
    const dresses = characterData.map((dress) => ({
      image: `/${dress.image}`,
      text: dress.name,
      id: dress.id,
    }));
    
    // Duplicate the array for seamless infinite scrolling
    return [...dresses, ...dresses];
  }, []);

  // Handle slide changes from scrolling
  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const { containerRef, navigateToSlide, getScrollInfo } = useWebGLCarousel({ 
    mediasImages, 
    onSlideChange: handleSlideChange
  });

  // Handle navigation from carousel controls
  const handleCarouselNavigate = useCallback((targetIndex: number) => {
    const { currentItemIndex, width } = getScrollInfo();
    
    if (!width) return;
    
    const dressCount = characterData.length;
    
    // Get current logical position (which dress we're showing, 0 to dressCount-1)
    const currentLogicalIndex = currentItemIndex % dressCount;
    
    // Calculate the shortest circular distance to target
    const forwardDistance = (targetIndex - currentLogicalIndex + dressCount) % dressCount;
    const backwardDistance = (currentLogicalIndex - targetIndex + dressCount) % dressCount;
    
    // If already on target, do nothing
    if (forwardDistance === 0 && backwardDistance === 0) {
      return;
    }
    
    // Move in the shortest direction by adjusting scroll.target relatively
    // Don't set absolute position - let the infinite scroll handle wrapping
    if (forwardDistance <= backwardDistance) {
      // Move forward (right)
      navigateToSlide(currentItemIndex + forwardDistance);
    } else {
      // Move backward (left)
      navigateToSlide(currentItemIndex - backwardDistance);
    }
    
    setCurrentSlide(targetIndex);
  }, [navigateToSlide, getScrollInfo]);

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
          background: 'linear-gradient(135deg, #f5f5f0 0%, #e8e6d9 50%, #d4d2c5 100%)'
        }} 
      />
      <DressLabel name={characterData[currentSlide]?.name || ''} />
      <Carousel
        totalSlides={characterData.length}
        currentIndex={currentSlide}
        onNavigate={handleCarouselNavigate}
        infiniteLoop={true}
      />
    </>
  );
}

