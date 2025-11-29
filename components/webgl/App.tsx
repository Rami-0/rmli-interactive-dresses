'use client';

import { useState, useMemo, useCallback } from 'react';
import { characterData } from '@/lib/constants/characters';
import { useWebGLCarousel } from './hooks/useWebGLCarousel';
import HoverTooltip from '../HoverTooltip';
import Carousel from '../Carousel';
import Media from './Media';

export default function App() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
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

  // Memoize the hover handler to prevent re-renders
  const handleHover = useCallback((media: Media | null) => {
    if (media) {
      setHoveredItem(media.text);
    } else {
      setHoveredItem(null);
    }
  }, []);

  // Handle slide changes from scrolling
  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const { containerRef, navigateToSlide, getScrollInfo } = useWebGLCarousel({ 
    mediasImages, 
    onHover: handleHover,
    onSlideChange: handleSlideChange
  });

  // Handle navigation from carousel controls
  const handleCarouselNavigate = useCallback((targetIndex: number) => {
    // Find the closest occurrence of the target dress in the duplicated array
    const { currentItemIndex, width } = getScrollInfo();
    
    if (!width) return;
    
    // Find all occurrences of the target index in the duplicated array
    const dressCount = characterData.length;
    const occurrences: number[] = [];
    
    for (let i = 0; i < mediasImages.length; i++) {
      if (i % dressCount === targetIndex) {
        occurrences.push(i);
      }
    }
    
    // Find the closest occurrence to current position
    let closestIndex = occurrences[0];
    let minDistance = Math.abs(currentItemIndex - closestIndex);
    
    occurrences.forEach(index => {
      const distance = Math.abs(currentItemIndex - index);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    navigateToSlide(closestIndex);
    setCurrentSlide(targetIndex);
  }, [navigateToSlide, getScrollInfo, mediasImages.length]);

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
      <HoverTooltip text={hoveredItem} />
      <Carousel
        totalSlides={characterData.length}
        currentIndex={currentSlide}
        onNavigate={handleCarouselNavigate}
        infiniteLoop={true}
      />
    </>
  );
}

