'use client';

import { useState, useMemo, useCallback } from 'react';
import { characterData } from '@/lib/constants/characters';
import { useWebGLCarousel } from './hooks/useWebGLCarousel';
import HoverTooltip from '../HoverTooltip';
import Media from './Media';

export default function App() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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

  const containerRef = useWebGLCarousel({ 
    mediasImages, 
    onHover: handleHover 
  });

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
    </>
  );
}

