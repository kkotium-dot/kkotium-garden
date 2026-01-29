'use client';

import { useState } from 'react';

interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">📷</div>
        <p className="text-gray-500">등록된 이미지가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 메인 이미지 */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
        <img
          src={images[selectedIndex]}
          alt="상품 이미지"
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => setShowLightbox(true)}
        />

        {/* 확대 아이콘 */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
            🔍 확대보기
          </div>
        </div>

        {/* 이전/다음 버튼 */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white px-3 py-2 rounded hover:bg-opacity-70 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ◀
            </button>
            <button
              onClick={() => setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white px-3 py-2 rounded hover:bg-opacity-70 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ▶
            </button>
          </>
        )}

        {/* 이미지 카운터 */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* 썸네일 리스트 */}
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`aspect-square rounded overflow-hidden border-2 transition-all ${
                idx === selectedIndex
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <img
                src={url}
                alt={`썸네일 ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* 라이트박스 */}
      {showLightbox && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
          >
            ✕
          </button>

          <img
            src={images[selectedIndex]}
            alt="확대 이미지"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 text-white px-4 py-3 rounded hover:bg-opacity-30 text-xl"
              >
                ◀
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-20 text-white px-4 py-3 rounded hover:bg-opacity-30 text-xl"
              >
                ▶
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
