'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { 
      href: '/dashboard', 
      label: '대시보드', 
      icon: '📊',
      category: 'main'
    },
    { 
      href: '/workflow', 
      label: '시작 가이드', 
      icon: '📖',
      category: 'main',
      highlight: true
    },
    
    // 크롤링 섹션
    { 
      href: '/crawl', 
      label: '키워드 검색', 
      icon: '🔍',
      description: '20개 빠르게',
      category: 'crawl'
    },
    { 
      href: '/crawler', 
      label: 'URL 등록', 
      icon: '🎯',
      description: '1개씩 정확하게',
      category: 'crawl'
    },
    { 
      href: '/domemae-crawler', 
      label: '도매매 전용', 
      icon: '🚀',
      description: 'API 크롤링',
      category: 'crawl'
    },
    
    // 상품 관리 섹션
    { 
      href: '/sourced', 
      label: '수집된 상품', 
      icon: '🌸',
      category: 'products'
    },
    { 
      href: '/products', 
      label: '등록된 상품', 
      icon: '📦',
      category: 'products'
    },
    
    { 
      href: '/settings', 
      label: '설정', 
      icon: '⚙️',
      category: 'main'
    },
  ];

  // 카테고리별 그룹화
  const crawlItems = navItems.filter(item => item.category === 'crawl');
  const productItems = navItems.filter(item => item.category === 'products');
  const mainItems = navItems.filter(item => item.category === 'main');

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* 로고 */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition">
              <span className="text-2xl">🌸</span>
              <span className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                꽃틔움 가든
              </span>
            </Link>
          </div>

          {/* 데스크톱 메뉴 */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                      : item.highlight
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'text-gray-700 hover:bg-pink-50 hover:text-pink-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className={item.description ? 'text-base' : 'text-lg'}>
                      {item.icon}
                    </span>
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap">{item.label}</span>
                      {item.description && !isActive && (
                        <span className="text-xs text-gray-500 group-hover:text-pink-600">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 하이라이트 배지 */}
                  {item.highlight && !isActive && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
              aria-label="메뉴 열기/닫기"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-3">
            
            {/* 메인 섹션 */}
            {mainItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <MobileMenuItem 
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  onClick={() => setIsMenuOpen(false)}
                />
              );
            })}

            {/* 크롤링 섹션 */}
            <div className="pt-2 pb-1 border-t border-gray-200">
              <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase">
                상품 수집
              </div>
              {crawlItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <MobileMenuItem 
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    onClick={() => setIsMenuOpen(false)}
                  />
                );
              })}
            </div>

            {/* 상품 관리 섹션 */}
            <div className="pt-2 pb-1 border-t border-gray-200">
              <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase">
                상품 관리
              </div>
              {productItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <MobileMenuItem 
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    onClick={() => setIsMenuOpen(false)}
                  />
                );
              })}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}

// 모바일 메뉴 아이템 컴포넌트
function MobileMenuItem({ 
  item, 
  isActive, 
  onClick 
}: { 
  item: any; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`block px-4 py-3 rounded-lg text-base font-medium transition-all relative ${
        isActive
          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
          : item.highlight
          ? 'bg-yellow-100 text-yellow-800'
          : 'text-gray-700 hover:bg-pink-50 hover:text-pink-700'
      }`}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{item.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {item.label}
            {item.highlight && !isActive && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                NEW
              </span>
            )}
          </div>
          {item.description && (
            <div className={`text-xs mt-1 ${
              isActive ? 'text-pink-100' : 'text-gray-500'
            }`}>
              {item.description}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
