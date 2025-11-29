'use client';

import { type Dress } from '@/lib/constants/characters';
import Image from 'next/image';

interface MiddleColumnProps {
  dress: Dress;
  isActive: boolean;
  onClick: () => void;
}

export function MiddleColumn({ dress, isActive, onClick }: MiddleColumnProps) {
  return (
    <div
      className={`detail-column detail-column--middle ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="column-content">
        <div className="metadata-container">
          {/* Region section */}
          <div className="metadata-section">
            <div className="metadata-content">
              <p className="metadata-label">ينتمي هذا الثوب إلى منطقة</p>
              <h2 className="region-title">{dress.region}</h2>
            </div>

            {/* Region map */}
            <div className="region-map">
              <Image
                src={`/${dress.regionImage}`}
                alt={`${dress.region} map`}
                width={150}
                height={150}
                className="map-image"
              />
            </div>
          </div>

          {/* Colors section */}
          <div className="metadata-content">
            <h3 className="section-title">ألوان الأقمشة</h3>
            <div className="color-circles">
              {dress.colors.map((color, index) => (
                <div
                  key={index}
                  className="color-circle"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Fabrics section */}
          <div className="metadata-content">
            <h3 className="section-title">أنواع الأقمشة</h3>
            <div className="fabric-tags">
              {dress.fabrics.map((fabric, index) => (
                <span key={index} className="fabric-tag">
                  {fabric}
                </span>
              ))}
            </div>
          </div>

          {/* Dress name */}
          <div className="metadata-content">
            <h3 className="section-title">اسم القطعة</h3>
            <h1 className="dress-name">{dress.name}</h1>
          </div>
        </div>
      </div>
    </div>
  );
}

