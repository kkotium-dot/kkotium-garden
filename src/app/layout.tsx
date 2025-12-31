import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '꽃틔움 가든 - 스토어 관리',
  description: '네이버 스마트스토어 관리 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">꽃틔움 가든</h1>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
