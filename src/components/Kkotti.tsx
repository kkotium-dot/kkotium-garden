'use client';
// src/components/Kkotti.tsx
// Kkotti floating character widget — framer-motion replaced with CSS animations
// No external animation library required

import { useState, useEffect } from 'react';

interface KkottiProps {
  mood?: 'neutral' | 'happy' | 'sad' | 'working' | 'thinking';
  message?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right';
  autoClose?: boolean;
}

export default function Kkotti({
  mood = 'neutral',
  message,
  position = 'bottom-right',
  autoClose = false,
}: KkottiProps) {
  const [isOpen, setIsOpen]       = useState(false);
  const [currentMood, setCurrentMood] = useState(mood);
  const [visible, setVisible]     = useState(false);

  useEffect(() => { setCurrentMood(mood); }, [mood]);

  useEffect(() => {
    if (message && autoClose) {
      setIsOpen(true);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setIsOpen(false), 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, autoClose]);

  const handleToggle = () => {
    if (isOpen) {
      setVisible(false);
      setTimeout(() => setIsOpen(false), 200);
    } else {
      setIsOpen(true);
      setTimeout(() => setVisible(true), 10);
    }
  };

  const positionStyle: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 24, right: 24 },
    'bottom-left':  { bottom: 24, left: 24 },
    'top-right':    { top: 24, right: 24 },
  };

  const faces: Record<string, string> = {
    neutral:  '/kkotti/face-neutral.svg',
    happy:    '/kkotti/face-happy.svg',
    sad:      '/kkotti/face-sad.svg',
    working:  '/kkotti/face-working.svg',
    thinking: '/kkotti/face-thinking.svg',
  };

  return (
    <div style={{ position: 'fixed', zIndex: 50, ...positionStyle[position] }}>
      {/* Speech bubble */}
      {isOpen && message && (
        <div style={{
          position: 'absolute',
          bottom: 96,
          right: 0,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          padding: '12px 16px',
          width: 256,
          marginBottom: 8,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(8px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 }}>{message}</p>
          {/* Tail */}
          <div style={{
            position: 'absolute',
            bottom: -6,
            right: 28,
            width: 14,
            height: 14,
            background: '#fff',
            transform: 'rotate(45deg)',
            boxShadow: '2px 2px 4px rgba(0,0,0,0.06)',
          }} />
          {!autoClose && (
            <button
              onClick={() => { setVisible(false); setTimeout(() => setIsOpen(false), 200); }}
              style={{ position: 'absolute', top: 6, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14 }}
            >
              x
            </button>
          )}
        </div>
      )}

      {/* Kkotti character button */}
      <button
        onClick={handleToggle}
        style={{
          position: 'relative',
          width: 80,
          height: 80,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          outline: 'none',
          animation: 'kkotti-float 2s ease-in-out infinite',
        }}
      >
        {/* Background circle */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #fff0f5, #ffe0e8)',
          borderRadius: '50%',
          boxShadow: '0 4px 20px rgba(255,68,88,0.25)',
        }} />
        {/* Body */}
        <img src="/kkotti/body.svg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        {/* Face */}
        <img
          key={currentMood}
          src={faces[currentMood]}
          alt="꼬띠"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        {/* Boots */}
        <img src="/kkotti/boots.svg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </button>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes kkotti-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
