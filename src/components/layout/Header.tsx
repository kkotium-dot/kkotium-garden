'use client';
// Header — KKOTIUM v7
// - Circle logo, PNG with mix-blend-mode:screen
// - Wave divider: stroke ONLY (no fill), proper sine, connects naturally to header bottom

import Link from 'next/link';
import Image from 'next/image';
import { Search, User } from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 flex flex-col"
      style={{ background: '#ffffff' }}
    >
      {/* ── Main header row ── */}
      <div className="h-[56px] flex items-center w-full px-5 gap-4">

        {/* ── Logo ── */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 shrink-0 group"
          style={{ textDecoration: 'none' }}
        >
          {/* Circle: red bg + PNG logo centered via mix-blend-mode */}
          <div
            style={{
              width: 38,
              height: 38,
              background: '#e62310',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s',
            }}
            className="group-hover:scale-105"
          >
            <Image
              src="/kkotium-symbol-white.png"
              alt="KKOTIUM"
              width={38}
              height={38}
              style={{
                objectFit: 'contain',
                width: '100%',
                height: '100%',
                
              }}
            />
          </div>
          <div className="leading-tight">
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#e62310', fontFamily: "'Arial Black', Impact, sans-serif", letterSpacing: '-0.5px', display: 'block', lineHeight: 1 }}>
              KKOTIUM
            </span>
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#FF6B8A', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block' }}>
              GARDEN
            </span>
          </div>
        </Link>

        {/* ── Search ── */}
        <div className="flex-1 max-w-[380px] mx-5">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#D4B0BC' }} />
            <input
              type="text"
              placeholder="상품명, SKU 검색..."
              className="w-full transition-all"
              style={{ paddingLeft: '38px', paddingRight: '14px', paddingTop: '8px', paddingBottom: '8px', fontSize: '14px', background: '#FFF5F8', border: '1.5px solid #F8DCE5', borderRadius: '12px', color: '#1A1A1A', outline: 'none' }}
              onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#FF6B8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,138,0.13)'; }}
              onBlur={e => { e.currentTarget.style.background = '#FFF5F8'; e.currentTarget.style.borderColor = '#F8DCE5'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationCenter />
          <button
            className="flex items-center gap-2 font-semibold transition-all"
            style={{ padding: '6px 14px 6px 8px', fontSize: '14px', borderRadius: '99px', border: '1.5px solid #F8DCE5', color: '#1A1A1A', background: '#fff' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF0F5'; (e.currentTarget as HTMLElement).style.borderColor = '#FFB3CE'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#F8DCE5'; }}
          >
            <div style={{ width: 26, height: 26, background: '#e62310', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={13} className="text-white" strokeWidth={2.5} />
            </div>
            <span>꽃티움</span>
          </button>
        </div>
      </div>

      {/* ── Wave divider: stroke ONLY, no fill, proper sine wave ── */}
      {/* The SVG background matches header white so no color bleed below */}
      <div style={{ lineHeight: 0, background: 'transparent', overflow: 'visible', height: 20, position: 'relative' }}>
        <svg
          viewBox="0 0 1440 20"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block', width: '100%', height: 20, position: 'absolute', top: 0, left: 0 }}
          preserveAspectRatio="none"
        >
          {/* Stroke-only wave — no fill, just a clean pink line */}
          <path
            d="M0,10 C60,0 120,20 180,10 C240,0 300,20 360,10 C420,0 480,20 540,10 C600,0 660,20 720,10 C780,0 840,20 900,10 C960,0 1020,20 1080,10 C1140,0 1200,20 1260,10 C1320,0 1380,20 1440,10"
            stroke="#FFB3CE"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </header>
  );
}
