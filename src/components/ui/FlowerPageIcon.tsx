'use client';
// FlowerPageIcon — shared page header icon component
// Replaces red rounded-rect boxes with flower-shaped SVG container
// Usage: <FlowerPageIcon size={38}><YourIcon /></FlowerPageIcon>

import React from 'react';

interface FlowerPageIconProps {
  children: React.ReactNode;
  size?: number;       // outer container size (default 40)
  color?: string;      // fill color (default #e62310)
}

export function FlowerPageIcon({ children, size = 52, color = '#e62310' }: FlowerPageIconProps) {
  const c = size / 2;
  // 6-petal flower — round chubby petals (ry close to rx = rounder)
  const petalOffset = size * 0.22;
  const petalRx     = size * 0.27;  // petal width
  const petalRy     = size * 0.20;  // petal height — closer to rx = rounder petals
  const centerR     = size * 0.28;  // large center covers petal bases

  return (
    <div style={{
      position: 'relative', width: size, height: size,
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none"
        style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* 6 petals at 60deg intervals */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const cx = c + Math.cos(rad) * petalOffset;
          const cy = c + Math.sin(rad) * petalOffset;
          return (
            <ellipse key={i} cx={cx} cy={cy} rx={petalRx} ry={petalRy}
              transform={`rotate(${deg} ${cx} ${cy})`} fill={color} />
          );
        })}
        {/* Center circle covers petal overlaps */}
        <circle cx={c} cy={c} r={centerR} fill={color} />
      </svg>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}
