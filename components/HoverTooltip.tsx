'use client';

import { useEffect, useState, memo } from 'react';
import '../styles/hover-tooltip.scss';

interface HoverTooltipProps {
  text: string | null;
}

function HoverTooltip({ text }: HoverTooltipProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    setIsVisible(!!text);
  }, [text]);

  if (!text || !isVisible) return null;

  return (
    <div
      className="hover-tooltip"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {text}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(HoverTooltip);

