'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('에러 발생:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold text-gray-900">
          오류가 발생했습니다
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {error.message || '알 수 없는 오류가 발생했습니다'}
        </p>
        <div className="mt-6 flex gap-4">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  )
}
