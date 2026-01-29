'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-beige sticky top-0 z-50 shadow-sm">
      <div className="h-full px-6 flex items-center justify-between max-w-full">

        {/* 로고 */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-xl text-white">🌸</span>
          </div>
          <span className="text-xl bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            꽃틔움 가든
          </span>
        </Link>

        {/* 검색 영역 */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="상품 검색..."
              className="w-full pl-10 pr-4 py-2 border border-beige rounded-lg focus:outline-none focus:border-pink-main focus:ring-2 focus:ring-pink-100 font-pretendard bg-white transition"
            />
          </div>
        </div>

        {/* 우측 영역 */}
        <div className="flex items-center gap-4">
          {/* 알림 센터 (신규!) */}
          <NotificationCenter />

          {/* 사용자 프로필 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg cursor-pointer hover:from-pink-100 hover:to-purple-100 transition border border-pink-200">
            <span className="text-xl">👤</span>
            <span className="text-sm font-pretendard font-semibold text-gray-800">
              꽃티움
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
