'use client';

import { type Dress } from '@/lib/constants/characters';

interface RightColumnProps {
  dress: Dress;
  isActive: boolean;
  onClick: () => void;
}

export function RightColumn({ dress, isActive, onClick }: RightColumnProps) {
  return (
    <div 
      className={`detail-column detail-column--right ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="column-content">
        <div className="text-container">
          {dress.paragraphs.map((paragraph, index) => (
            <p key={index} className="paragraph">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

