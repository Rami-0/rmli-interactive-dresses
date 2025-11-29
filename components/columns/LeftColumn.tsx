'use client';

import { type Dress } from '@/lib/constants/characters';
import Image from 'next/image';

interface LeftColumnProps {
  dress: Dress;
  isActive: boolean;
  onClick: () => void;
}

export function LeftColumn({ dress, isActive, onClick }: LeftColumnProps) {
  return (
    <div 
      className={`detail-column detail-column--left ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="column-content">
        <div className="dress-image-container">
          <Image
            src={`/${dress.image}`}
            alt={dress.name}
            width={500}
            height={800}
            className="dress-image"
            priority
          />
        </div>
      </div>
    </div>
  );
}

