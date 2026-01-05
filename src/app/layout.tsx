import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '꽃티움 가든 - 상품 관리',
  description: '네이버 스마트스토어 상품 관리 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
